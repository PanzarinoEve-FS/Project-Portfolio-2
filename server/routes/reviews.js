import express from 'express';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Review from '../models/Review.js';

const router = express.Router();

// Reviews live in MongoDB (`npm run seed:reviews`). 
// The JSON file they are seeded from stands in when mongod is not running.
const dataPath = fileURLToPath(new URL('../data/reviews.json', import.meta.url));
const live = () => mongoose.connection.readyState === 1;
const SCOPES = ['brand', 'location'];

const fromFile = (entry) =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => !key.startsWith('_')));

// GET /api/reviews -> every web-researched review. ?scope=brand|location narrows it.
router.get('/', async (req, res) => {
  const scope = SCOPES.includes(req.query.scope) ? req.query.scope : null;
  res.set('Cache-Control', 'public, max-age=300');

  try {
    if (live()) {
      const reviews = await Review.find(scope ? { scope } : {}, { _id: 0, __v: 0 })
        .sort({ business: 1, key: 1 })
        .lean();
      if (reviews.length) return res.json({ total: reviews.length, reviews, store: 'mongodb' });
    }
  } catch (err) {
    console.error('review query failed, falling back to the seed file:', err.message);
  }

  try {
    const seed = JSON.parse(readFileSync(dataPath, 'utf8'));
    const reviews = seed.reviews
      .filter((review) => !scope || review.scope === scope)
      .map((review) => ({ checkedOn: seed.checkedOn, ...fromFile(review) }));
    res.json({ total: reviews.length, reviews, store: 'seed-file' });
  } catch (err) {
    console.error('review seed file unreadable:', err.message);
    res.status(500).json({ error: 'Reviews are unavailable' });
  }
});

export default router;
