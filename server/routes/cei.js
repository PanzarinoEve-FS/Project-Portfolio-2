import express from 'express';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import CEI from '../models/CEI.js';

const router = express.Router();

const dataPath = fileURLToPath(new URL('../data/cei.json', import.meta.url));
const seed = JSON.parse(readFileSync(dataPath, 'utf8'));

const live = () => mongoose.connection.readyState === 1;

const fromFile = (entry) =>
  Object.fromEntries(Object.entries(entry).filter(([k]) => !k.startsWith('_')));

const meta = {
  index: seed.index,
  publisher: seed.publisher,
  edition: seed.edition,
  checkedOn: seed.checkedOn,
  maxScore: seed.maxScore,
};

router.get('/', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');

  try {
    if (live()) {
      const entries = await CEI.find(
        {},

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
