import express from 'express';

const router = express.Router();

// Nominatim's usage policy is strict: max 1 request per second, an
// identifying User-Agent, and no bulk geocoding. Both rules are enforced
// here so a busy client can never get the app IP-banned.
// https://operations.osmfoundation.org/policies/nominatim/

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const MIN_REQUEST_GAP_MS = 1100;

let lastRequestAt = 0;

// Serialises calls so two overlapping requests still go out ~1s apart.
let queue = Promise.resolve();

function throttled(task) {
  const run = queue.then(async () => {
    const waitFor = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (waitFor > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitFor));
    }
    lastRequestAt = Date.now();
    return task();
  });

  // Keep the chain alive even if this task rejects.
  queue = run.catch(() => {});
  return run;
}

function normalise(place) {
  return {
    osmId: `${place.osm_type}-${place.osm_id}`,
    name: place.name || place.display_name.split(',')[0],
    address: place.display_name,
    category: place.type,
    lat: Number(place.lat),
    lng: Number(place.lon),
  };
}

// Runs a throttled, cached Nominatim query and returns normalised places.
async function queryNominatim(url, cacheKey) {
  const hit = cache.get(cacheKey);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { cached: true, results: hit.results };
  }

  const response = await throttled(() =>
    fetch(url, {
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'LGBTQIA-Safety-App/1.0',
        'Accept-Language': 'en',
      },
    })
  );

  if (!response.ok) {
    const error = new Error('Nominatim request failed');
    error.status = response.status;
    throw error;
  }

  const results = (await response.json()).map(normalise);

  cache.set(cacheKey, { at: Date.now(), results });
  return { cached: false, results };
}

// GET /api/places/search?q=coffee&city=Chicago
router.get('/search', async (req, res) => {
  const { q, city, limit = 20 } = req.query;

  if (!q && !city) {
    return res.status(400).json({ error: 'q or city is required' });
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', limit);
    if (q) url.searchParams.set('q', city ? `${q}, ${city}` : q);
    else url.searchParams.set('city', city);

    res.json(await queryNominatim(url, `search|${q || ''}|${city || ''}|${limit}`));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/places/nearby?lat=&lng=&category=cafe&radius=2
// Restricts a category search to a box around the caller, so the home page
// can show local businesses without the visitor typing anything.
router.get('/nearby', async (req, res) => {
  const { lat, lng, category = 'cafe', radius = 2, limit = 12 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  const km = Number(radius);

  if ([latitude, longitude, km].some(Number.isNaN)) {
    return res.status(400).json({ error: 'lat, lng and radius must be numbers' });
  }

  // Convert the radius in km to degrees. Longitude degrees shrink towards
  // the poles, so scale them by cos(latitude).
  const latOffset = km / 111;
  const lngOffset = km / (111 * Math.cos((latitude * Math.PI) / 180) || 1);

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', limit);
    url.searchParams.set('q', category);
    // viewbox is left,top,right,bottom; bounded=1 discards anything outside it.
    url.searchParams.set(
      'viewbox',
      [
        longitude - lngOffset,
        latitude + latOffset,
        longitude + lngOffset,
        latitude - latOffset,
      ].join(',')
    );
    url.searchParams.set('bounded', '1');

    const key = `nearby|${latitude.toFixed(3)}|${longitude.toFixed(3)}|${category}|${km}|${limit}`;
    res.json(await queryNominatim(url, key));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/places/lookup?osmId=way-710692552
// Resolves a single OSM id back into a place. This is what lets a profile
// page work from a bare URL -- a shared link, a refresh, or a result that
// was never saved to MongoDB.
const OSM_PREFIX = { node: 'N', way: 'W', relation: 'R' };

router.get('/lookup', async (req, res) => {
  const { osmId } = req.query;

  if (!osmId) {
    return res.status(400).json({ error: 'osmId is required' });
  }

  const [type, id] = String(osmId).split('-');
  const prefix = OSM_PREFIX[type];

  if (!prefix || !/^\d+$/.test(id || '')) {
    return res.status(400).json({ error: 'osmId must look like way-12345' });
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/lookup');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('osm_ids', `${prefix}${id}`);

    const { results } = await queryNominatim(url, `lookup|${osmId}`);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Place not found in OpenStreetMap' });
    }

    res.json(results[0]);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
