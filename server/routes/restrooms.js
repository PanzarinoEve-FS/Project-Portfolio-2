import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  const { lat, lng, unisex, ada, per_page = 20 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  try {
    const url = new URL('https://www.refugerestrooms.org/api/v1/restrooms/by_location');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lng', lng);
    url.searchParams.set('per_page', per_page);
    if (unisex === 'true') url.searchParams.set('unisex', 'true');
    if (ada === 'true') url.searchParams.set('ada', 'true');

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Refuge Restrooms request failed' });
    }

    const data = await response.json();

    res.json(
      data.map((room) => ({
        id: String(room.id),
        name: room.name,
        address: [room.street, room.city, room.state].filter(Boolean).join(', '),
        lat: room.latitude,
        lng: room.longitude,
        unisex: room.unisex,
        accessible: room.accessible,
        changingTable: room.changing_table,
        directions: room.directions,
        upvotes: room.upvote,
        downvotes: room.downvote,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
