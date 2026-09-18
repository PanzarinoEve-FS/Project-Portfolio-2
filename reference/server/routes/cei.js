import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const router = express.Router();

// The dataset is small and changes about once a year, so it is read once at
// startup and served whole. The client matches business names against it
// locally, which avoids one request per business on a map full of results.
const dataPath = fileURLToPath(new URL('../data/cei.json', import.meta.url));
const cei = JSON.parse(readFileSync(dataPath, 'utf8'));

// GET /api/cei -> the whole Corporate Equality Index seed set
router.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({
    index: cei.index,
    publisher: cei.publisher,
    maxScore: cei.maxScore,
    entries: cei.entries.map(({ _brandsNote, ...entry }) => entry),
  });
});

export default router;
