import express from 'express';

const router = express.Router();

import { queryNominatim } from '../lib/nominatim.js';

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
// Category search 
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
