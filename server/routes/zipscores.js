import express from 'express';
import mongoose from 'mongoose';

import Zcta from '../models/Zcta.js';
import ZipScore from '../models/ZipScore.js';
import { SAFETY_METHOD } from '../lib/safetyScore.js';

const router = express.Router();

const EMPTY_SIGNALS = { reviews: 0, web: 0, restroom: 0, brand: 0, cei: 0 };
const EMPTY_STANCES = { friendly: 0, mixed: 0, unfriendly: 0, unclear: 0 };
const EMPTY_BANDS = { good: 0, mixed: 0, poor: 0 };
// Past this span the map asks the visitor to zoom in rather than send
// thousands of shapes at once.
const MAX_SPAN_DEG = 8;
const MAX_ZIPS = 2000;
const HIDDEN = { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 };

// Every route below needs Mongo. Fail with a clear message instead of hanging.
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable. Is mongod running?' });
  }
  next();
});

// A ZIP with no stored score comes back grey rather than missing.
const toFeature = (zcta, row) => ({
  type: 'Feature',
  geometry: zcta.geometry,
  properties: {
    zip: zcta.zip,
    bbox: [zcta.w, zcta.s, zcta.e, zcta.n],
    score: row?.score ?? null,
    band: row?.band ?? 'insufficient',
    scored: row?.scored ?? 0,
    scanned: row?.scanned ?? 0,
    corporateOnly: row?.corporateOnly ?? 0,
    // Merged so rows scored before a signal existed still carry every key.
    signals: { ...EMPTY_SIGNALS, ...(row?.signals ?? {}) },
    highest: row?.highest ?? [],
    lowest: row?.lowest ?? [],
    businesses: row?.businesses ?? [],
    reviews: row?.reviews ?? [],
    stances: { ...EMPTY_STANCES, ...(row?.stances ?? {}) },
    businessBands: { ...EMPTY_BANDS, ...(row?.businessBands ?? {}) },
  },
});

async function withScores(zctas) {
  const rows = await ZipScore.find({ zip: { $in: zctas.map((zcta) => zcta.zip) } }, HIDDEN).lean();
  const byZip = new Map(rows.map((row) => [row.zip, row]));
  return zctas.map((zcta) => toFeature(zcta, byZip.get(zcta.zip)));
}

async function describe() {
  const [latest, shapes] = await Promise.all([
    ZipScore.findOne({}, { computedAt: 1 }).sort({ computedAt: -1 }).lean(),
    Zcta.estimatedDocumentCount(),
  ]);
  return { scored: Boolean(latest), computedAt: latest?.computedAt ?? null, shapes, method: SAFETY_METHOD };
}

// "west,south,east,north" in degrees, or null when it is not a usable box.
function parseBbox(value) {
  const numbers = String(value).split(',').map(Number);
  if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))) return null;
  const [w, s, e, n] = numbers;
  return w < e && s < n ? { w, s, e, n } : null;
}

// GET /api/zipscores?bbox=west,south,east,north -> the ZIP areas in view with
// their Business Safety Scores. Without a bbox: every ZIP that has a score.
router.get('/', async (req, res) => {
  try {
    let zctas = [];
    let truncated = false;
    let tooWide = false;

    if (req.query.bbox != null) {
      const box = parseBbox(req.query.bbox);
      if (!box) return res.status(400).json({ error: 'bbox must be west,south,east,north' });

      if (box.e - box.w > MAX_SPAN_DEG || box.n - box.s > MAX_SPAN_DEG) {
        tooWide = true;
      } else {
        zctas = await Zcta.find(
          { w: { $lte: box.e }, e: { $gte: box.w }, s: { $lte: box.n }, n: { $gte: box.s } },
          { _id: 0 }
        )
          .limit(MAX_ZIPS + 1)
          .lean();
        truncated = zctas.length > MAX_ZIPS;
        zctas = zctas.slice(0, MAX_ZIPS);
      }
    } else {
      zctas = await Zcta.find({ zip: { $in: await ZipScore.distinct('zip') } }, { _id: 0 }).lean();
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      type: 'FeatureCollection',
      features: await withScores(zctas),
      meta: { ...(await describe()), truncated, tooWide, maxZips: MAX_ZIPS },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/zipscores/:zip -> one ZIP area, for search
router.get('/:zip', async (req, res) => {
  if (!/^\d{5}$/.test(req.params.zip)) {
    return res.status(400).json({ error: 'A ZIP code is five digits' });
  }

  try {
    const zcta = await Zcta.findOne({ zip: req.params.zip }, { _id: 0 }).lean();
    if (!zcta) return res.status(404).json({ error: `No ZIP code area for ${req.params.zip}` });

    const [feature] = await withScores([zcta]);
    res.json(feature);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
