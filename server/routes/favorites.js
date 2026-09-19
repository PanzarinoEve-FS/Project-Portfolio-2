import express from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const live = () => mongoose.connection.readyState === 1;
const KINDS = new Set(['business', 'surgeon', 'center']);

router.use((req, res, next) =>
  live() ? next() : res.status(503).json({ error: 'Database unavailable. Is mongod running?' })
);
router.use(requireAuth);

// GET /api/favorites -> everything this user has saved, newest first
router.get('/', (req, res) => {
  const favorites = [...req.user.favorites].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ favorites, total: favorites.length });
});

// POST /api/favorites -> save one place
router.post('/', async (req, res) => {
  const { kind, refId, name, subtitle } = req.body ?? {};

  if (!KINDS.has(kind)) {
    return res.status(400).json({ error: 'kind must be business, surgeon or center' });
  }
  if (!refId || !name) {
    return res.status(400).json({ error: 'refId and name are required' });
  }

  // Saving the same place twice is a no-op rather than an error -- two quick
  // taps on a heart should not fail.
  const already = req.user.favorites.some((f) => f.kind === kind && f.refId === refId);
  if (!already) {
    req.user.favorites.push({ kind, refId, name, subtitle });
    await req.user.save();
  }

  res.status(already ? 200 : 201).json({ favorites: req.user.favorites });
});

// DELETE /api/favorites/:kind/:refId -> unsave one place
router.delete('/:kind/:refId', async (req, res) => {
  const { kind, refId } = req.params;
  const before = req.user.favorites.length;

  req.user.favorites = req.user.favorites.filter((f) => !(f.kind === kind && f.refId === refId));

  if (req.user.favorites.length !== before) await req.user.save();

  res.json({ favorites: req.user.favorites });
});

export default router;
