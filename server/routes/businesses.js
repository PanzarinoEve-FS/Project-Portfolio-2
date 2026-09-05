import express from 'express';
import mongoose from 'mongoose';
import Business from '../models/Business.js';

const router = express.Router();

// Every route below needs Mongo. Fail with a clear message instead of hanging.
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable. Is mongod running?' });
  }
  next();
});

// GET /api/businesses -> every rated place
router.get('/', async (req, res) => {
  try {
    const businesses = await Business.find().sort({ updatedAt: -1 });
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/businesses/:osmId -> one profile
router.get('/:osmId', async (req, res) => {
  try {
    const business = await Business.findOne({ osmId: req.params.osmId });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/businesses -> create a place, or return the existing one
router.post('/', async (req, res) => {
  const { osmId, name, address, category, lat, lng } = req.body;

  if (!osmId || !name || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'osmId, name, lat and lng are required' });
  }

  try {
    const existing = await Business.findOne({ osmId });
    if (existing) return res.status(200).json(existing);

    const business = await Business.create({ osmId, name, address, category, lat, lng });
    res.status(201).json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/businesses/:osmId/reviews -> add a community rating
router.post('/:osmId/reviews', async (req, res) => {
  try {
    const business = await Business.findOne({ osmId: req.params.osmId });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    business.reviews.push(req.body);
    await business.save();

    res.status(201).json(business);
  } catch (err) {
    // Mongoose validation errors are the user's fault, not the server's.
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

export default router;
