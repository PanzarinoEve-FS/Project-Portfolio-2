import express from 'express';

const router = express.Router();

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

export default router;
