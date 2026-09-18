import express from 'express';

const router = express.Router();

// Overpass queries OSM by tag, which Nominatim's text search cannot do:
// "nail salon" finds little, shop=beauty finds dozens. Free, no key, but a
// shared service -- so throttled and cached here.

// Whitelist: the client sends category names, never query language.
const CATEGORIES = {
  // Gender-affirming services
  nails: '["beauty"="nails"]',
  beauty: '["shop"="beauty"]',
  hairdresser: '["shop"="hairdresser"]',
  massage: '["shop"="massage"]',
  spa: '["leisure"="spa"]',
  tattoo: '["shop"="tattoo"]',

  // Medical
  clinic: '["healthcare"="clinic"]',
  doctors: '["amenity"="doctors"]',
  hospital: '["amenity"="hospital"]',

  // Every named business nearby, whatever it sells. Expanded below.
  all: 'all',
};

// What "all" stands for. Named only: a broad tag search returns mostly nameless
// nodes, which would spend the element budget before reaching real businesses.
// Seven broad tags at once runs past Overpass's budget: it answers 200 with
// "runtime error: Query timed out" and no elements at all, so the filter showed
// nothing whatsoever. These three cover shops, food, services and venues, and
// measured against the live service they come back in about five seconds.
const ALL_BUSINESSES = ['["shop"]["name"]', '["amenity"]["name"]', '["leisure"]["name"]'];

// Over budget, Overpass answers HTML rather than JSON. Mirrors share the
// same data, so falling through recovers from a busy primary.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
// Overpass can accept a request and then never answer. Without a deadline that
// request sits in the queue below forever and every later search waits behind
// it, so the whole page hangs rather than falling through to the next mirror.
// A working broad query answers in about five seconds, so a minute of waiting
// only delays falling through to the next mirror when the first one stalls.
const REQUEST_TIMEOUT_MS = 25000;
const MIN_REQUEST_GAP_MS = 5000;

let lastRequestAt = 0;
let queue = Promise.resolve();

function throttled(task) {
  const run = queue.then(async () => {
    const waitFor = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (waitFor > 0) await new Promise((r) => setTimeout(r, waitFor));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => {});
  return run;
}

function metresApart(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function addressOf(tags) {
  return [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'],
    tags['addr:state'],
  ]
    .filter(Boolean)
    .join(', ');
}

// GET /api/osm?lat=&lng=&radius=&categories=nails,beauty
router.get('/', async (req, res) => {
  const { lat, lng, radius = 8, categories = '', limit = 60 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const wanted = String(categories)
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c in CATEGORIES);

  if (wanted.length === 0) {
    return res.status(400).json({
      error: `categories must include at least one of: ${Object.keys(CATEGORIES).join(', ')}`,
    });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  // Snap to whole kilometres so near-identical radii share a cache entry --
  // 6 mi is 9.656 km, which otherwise missed the cache on every load.
  // A wide radius on a broad tag can time out, so it is capped and reported.
  const asked = Math.round(Number(radius)) * 1000;
  // "all" asks Overpass for seven broad tags at once. Over a wide circle that
  // runs past its budget and comes back as an HTML error page rather than
  // results, so the whole search fails. Nearest-first is the point of the
  // filter, so it searches a tighter circle than a single named category does.
  const ceiling = wanted.includes('all') ? 4000 : 400000;
  const metres = Math.min(ceiling, asked);

  if ([latitude, longitude, metres].some(Number.isNaN)) {
    return res.status(400).json({ error: 'lat, lng and radius must be numbers' });
  }

  // Overpass is always asked for a generous set and the cache holds all of it,
  // so one upstream request can serve any limit. Keying the cache on the limit
  // instead would mean a caller asking for 200 got a cached 60 -- which is
  // exactly what used to happen.
  // `out ... N` caps RAW elements, and the unnamed ones are discarded below --
  // most OSM beauty nodes carry no name. A cap of 500 therefore spent its whole
  // budget on nameless nodes in a wide search, so the handful of named matches
  // fell outside it and widening the radius could LOSE a result. Asking for
  // plenty of raw elements is both complete and, measured against the live
  // service, about twice as fast as making Overpass intersect with ["name"].
  const FETCH_CAP = 3000;
  // A broad search is capped far lower. Its filters already require a name, so
  // there are no nameless elements to spend the budget on, and the large cap is
  // what tipped this query over the time limit.
  const ALL_FETCH_CAP = 500;
  const want = Math.max(1, Math.min(FETCH_CAP, Number(limit) || 60));

  const key = `${latitude.toFixed(3)}|${longitude.toFixed(3)}|${metres}|${wanted.sort().join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.json({ cached: true, results: hit.results.slice(0, want) });
  }

  const around = `(around:${metres},${latitude},${longitude})`;
  const filters = wanted.flatMap((c) => (c === 'all' ? ALL_BUSINESSES : [CATEGORIES[c]]));
  const body = `[out:json][timeout:50];(${filters
    .map((filter) => `nwr${filter}${around};`)
    .join('')});out tags center ${wanted.includes('all') ? ALL_FETCH_CAP : FETCH_CAP};`;

  // Overpass can answer 200 with an HTML error page, so parse defensively.
  async function ask(endpoint) {
    const response = await throttled(() =>
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': process.env.NOMINATIM_USER_AGENT || 'LGBTQIA-Safety-App/1.0',
        },
        body: new URLSearchParams({ data: body }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    );

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      const busy = /rate_limit|too many requests|slot available/i.test(text);
      const err = new Error(busy ? 'busy' : `Overpass returned ${response.status}`);
      err.busy = busy || response.status === 429 || response.status === 504;
      throw err;
    }
  }

  try {
    let data;
    let lastError;

    // Slots free up within seconds, so one retry clears most "busy" answers.
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      for (const endpoint of ENDPOINTS) {
        try {
          data = await ask(endpoint);
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!data && attempt === 0) await new Promise((r) => setTimeout(r, 3000));
    }

    if (!data) {
      return res.status(lastError?.busy ? 503 : 502).json({
        error: lastError?.busy
          ? 'OpenStreetMap search is busy right now. Try again in a few seconds.'
          : 'Could not reach OpenStreetMap search.',
      });
    }

    const results = (data.elements || [])
      .filter((el) => el.tags?.name)
      .map((el) => ({
        osmId: `${el.type}-${el.id}`,
        name: el.tags.name,
        address: addressOf(el.tags),
        category: el.tags.beauty || el.tags.shop || el.tags.healthcare || el.tags.amenity || 'place',
        lat: el.lat ?? el.center?.lat,
        lng: el.lon ?? el.center?.lon,
        phone: el.tags.phone || el.tags['contact:phone'] || null,
        website: el.tags.website || el.tags['contact:website'] || null,
      }))
      .filter((p) => p.lat !== undefined && p.lng !== undefined)
      // Nearest first: Overpass answers in its own order, so a limit applied to
      // it would drop places next door in favour of ones across town.
      .sort((a, b) => metresApart({ lat: latitude, lng: longitude }, a) - metresApart({ lat: latitude, lng: longitude }, b));

    cache.set(key, { at: Date.now(), results });
    res.json({
      cached: false,
      results: results.slice(0, want),
      ...(asked > metres ? { cappedAtKm: metres / 1000, askedKm: asked / 1000 } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
