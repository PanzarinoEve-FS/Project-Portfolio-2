import express from 'express';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import CEI from '../models/CEI.js';

const router = express.Router();

// Scores live in MongoDB (`npm run seed:cei`). The JSON file it was seeded
// from stays as a fallback for when mongod is not running.
const dataPath = fileURLToPath(new URL('../data/cei.json', import.meta.url));
const seed = JSON.parse(readFileSync(dataPath, 'utf8'));

const live = () => mongoose.connection.readyState === 1;

// _-prefixed keys are maintainer notes, not client data.
const fromFile = (entry) =>
  Object.fromEntries(Object.entries(entry).filter(([k]) => !k.startsWith('_')));

const meta = {
  index: seed.index,
  publisher: seed.publisher,
  edition: seed.edition,
  checkedOn: seed.checkedOn,
  maxScore: seed.maxScore,
};

// GET /api/cei -> every company, matched against business names on the client
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');

  try {
    if (live()) {
      const entries = await CEI.find(
        {},
        // Maintainer notes and bookkeeping fields stay server-side.
        { _id: 0, __v: 0, anchorNote: 0, brandsNote: 0, createdAt: 0, updatedAt: 0 }
      )
        .sort({ company: 1 })
        .lean();

      if (entries.length) {
        return res.json({ ...meta, total: entries.length, entries, store: 'mongodb' });
      }
    }
  } catch (err) {
    console.error('CEI query failed, falling back to the seed file:', err.message);
  }

  res.json({
    ...meta,
    total: seed.entries.length,
    entries: seed.entries.map(fromFile),
    store: 'seed-file',
  });
});

export default router;
