import express from 'express';
import mongoose from 'mongoose';

import Zcta from '../models/Zcta.js';
import { queryNominatim } from '../lib/nominatim.js';

const router = express.Router();

// GET /api/geo/me -> approximate location from the caller's IP address.
// Proxied through the server so the browser never talks to GeoJS directly.
router.get('/me', async (req, res) => {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/geo.json');

    if (!response.ok) {
      return res.status(response.status).json({ error: 'GeoJS request failed' });
    }

    const data = await response.json();

    res.json({
      lat: Number(data.latitude),
      lng: Number(data.longitude),
      city: data.city,
      region: data.region,
      country: data.country,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Somewhere a search can be anchored on: a settlement, a district, a ZIP.
// A business name must never match, or typing one would move the whole map.
// jsonv2 answers with `type` and `addresstype` and carries no `class` field at
// all, so the match is made on those two alone.
const PLACE_TYPES = new Set([
  'postcode', 'city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood',
  'quarter', 'borough', 'municipality', 'county', 'state', 'province', 'region',
  'locality', 'city_district', 'district',
  // Address-shaped answers. A business never comes back as one of these: shops
  // answer `store` or `retail`, cafes `amenity`, offices `office`. `building`
  // is deliberately absent -- it let named premises through, so "Kaiser
  // Permanente" resolved as a place. House numbers are handled by falling back
  // to the street instead.
  'road', 'house', 'residential',
]);

const placeLike = (row) => PLACE_TYPES.has(row.addresstype) || PLACE_TYPES.has(row.type);

async function findPlace(text) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  url.searchParams.set('q', text);

  const { results } = await queryNominatim(url, `place|${text.toLowerCase()}`, (row) => row);
  return results.find(placeLike) ?? null;
}

// GET /api/geo/place?q=32803 -> a point to anchor a search on.
// 404 means "not a place", which lets the caller treat the text as a business
// name instead.
router.get('/place', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) return res.status(400).json({ error: 'q is required' });

  // A five-digit ZIP resolves against the Census areas already stored here, so
  // the commonest case costs no external request and no rate limit at all.
  if (/^\d{5}$/.test(q) && mongoose.connection.readyState === 1) {
    try {
      const zcta = await Zcta.findOne({ zip: q }, { zip: 1, w: 1, s: 1, e: 1, n: 1, _id: 0 }).lean();

      if (zcta) {
        return res.json({
          lat: (zcta.s + zcta.n) / 2,
          lng: (zcta.w + zcta.e) / 2,
          city: zcta.zip,
          label: `ZIP ${zcta.zip}`,
          kind: 'postcode',
          source: 'census',
        });
      }
    } catch {
      // Fall through to Nominatim rather than failing the lookup outright.
    }
  }

  try {
    let match = await findPlace(q);

    // A house number ranks the businesses at that address above the street
    // itself, and those must never match. Dropping the number asks for the
    // road, which is well inside any radius worth setting.
    if (!match) {
      const street = q.replace(/^\s*\d+[a-z]?\s+/i, '');
      if (street !== q && street.length > 2) match = await findPlace(street);
    }

    if (!match) return res.status(404).json({ error: `No place called "${q}"` });

    const short = match.name || match.display_name.split(',')[0];

    res.json({
      lat: Number(match.lat),
      lng: Number(match.lon),
      city: short,
      label: match.display_name,
      kind: match.addresstype || match.type,
      source: 'nominatim',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
