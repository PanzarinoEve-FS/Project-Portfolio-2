import express from 'express';

const router = express.Router();

// Overpass queries OpenStreetMap by tag, which Nominatim's free-text search
// cannot do well -- "nail salon" returns almost nothing there, while
// shop=beauty returns dozens. Overpass is free and needs no key, but it is a
// shared community service, so requests are throttled and cached here.

// Whitelist. The client sends category names, never Overpass query language,
// so nothing user-supplied is ever interpolated into the query.
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
};

// Overpass enforces per-IP slots and answers with an HTML error page rather
// than JSON when a caller is over budget. Mirrors share the same data, so
// falling through to one recovers from a busy primary.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
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
  const metres = Math.min(50000, Math.round(Number(radius)) * 1000);

  if ([latitude, longitude, metres].some(Number.isNaN)) {
    return res.status(400).json({ error: 'lat, lng and radius must be numbers' });
  }

  const key = `${latitude.toFixed(3)}|${longitude.toFixed(3)}|${metres}|${wanted.sort().join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.json({ cached: true, results: hit.results });
  }

  const around = `(around:${metres},${latitude},${longitude})`;
  const body = `[out:json][timeout:40];(${wanted
    .map((c) => `nwr${CATEGORIES[c]}${around};`)
    .join('')});out tags center ${limit};`;

  // Overpass can answer 200 with an HTML error page, so the body is parsed
  // defensively rather than trusting the status code.
  async function ask(endpoint) {
    const response = await throttled(() =>
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': process.env.NOMINATIM_USER_AGENT || 'LGBTQIA-Safety-App/1.0',
        },
        body: new URLSearchParams({ data: body }),
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

    // Two passes over the endpoints: Overpass slots usually free up within a
    // few seconds, so a single retry turns most "busy" answers into results.
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
      .filter((p) => p.lat !== undefined && p.lng !== undefined);

    cache.set(key, { at: Date.now(), results });
    res.json({ cached: false, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
