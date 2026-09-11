import express from 'express';
import mongoose from 'mongoose';
import Business from '../models/Business.js';

const router = express.Router();

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable. Is mongod running?' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const businesses = await Business.find().sort({ updatedAt: -1 });
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.post('/', async (req, res) => {
  const { osmId, name, address, category, lat, lng, phone, website } = req.body;

  if (!osmId || !name || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'osmId, name, lat and lng are required' });
  }

  try {
    const existing = await Business.findOne({ osmId });
    if (existing) return res.status(200).json(existing);

    const business = await Business.create({ osmId, name, address, category, lat, lng, phone, website });
    res.status(201).json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

export default router;
