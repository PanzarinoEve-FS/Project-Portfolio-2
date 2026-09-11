import express from 'express';

const router = express.Router();

// Nominatim policy: 1 request/sec, identifying User-Agent, no bulk geocoding.
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
// Category search boxed around the caller, so the home page needs no typing.
router.get('/nearby', async (req, res) => {
  const { lat, lng, category = 'cafe', radius = 2, limit = 12 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  const asked = Number(radius);

  if ([latitude, longitude, asked].some(Number.isNaN)) {
    return res.status(400).json({ error: 'lat, lng and radius must be numbers' });
  }

  // Past ~1200km Nominatim ignores the viewbox and matches the query as a name,
  // so "gas" returns the one business called Gas. 1200 answers, 1600 does not.
  const MAX_VIEWBOX_KM = 1200;
  const km = Math.min(MAX_VIEWBOX_KM, asked);

  // km to degrees; longitude degrees shrink towards the poles.
  const latOffset = km / 111;
  const lngOffset = km / (111 * Math.cos((latitude * Math.PI) / 180) || 1);

  // A thousand-mile box runs off the globe, which Nominatim rejects.
  const clampLat = (v) => Math.max(-90, Math.min(90, v));
  const clampLng = (v) => Math.max(-180, Math.min(180, v));

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
        clampLng(longitude - lngOffset),
        clampLat(latitude + latOffset),
        clampLng(longitude + lngOffset),
        clampLat(latitude - latOffset),
      ].join(',')
    );
    url.searchParams.set('bounded', '1');

    const key = `nearby|${latitude.toFixed(3)}|${longitude.toFixed(3)}|${category}|${km}|${limit}`;
    const found = await queryNominatim(url, key);

    res.json({
      ...found,
      ...(asked > km ? { cappedAtKm: km, askedKm: asked } : {}),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/places/lookup?osmId=way-710692552
// Resolves an OSM id back into a place, so a profile works from a bare URL.
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
