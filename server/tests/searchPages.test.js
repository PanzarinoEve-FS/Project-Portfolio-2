import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

import osmRouter from '../routes/osm.js';
import restroomsRouter from '../routes/restrooms.js';
import surgeonsRouter from '../routes/surgeons.js';

// Overpass is throttled to one request every five seconds inside the route

const app = express();
app.use('/api/osm', osmRouter);
app.use('/api/restrooms', restroomsRouter);
app.use('/api/surgeons', surgeonsRouter);

const realFetch = globalThis.fetch;
afterAll(() => { globalThis.fetch = realFetch; });

const overpass = (elements) => {
  globalThis.fetch = jest.fn(async () => ({
    ok: true, status: 200, text: async () => JSON.stringify({ elements }),
  }));
};
const refuge = (rows, ok = true, status = 200) => {
  globalThis.fetch = jest.fn(async () => ({ ok, status, json: async () => rows }));
};

const ORLANDO = { lat: 28.55, lng: -81.33 };

describe('Search page - nearby places (/api/osm)', () => {
  test('lat and lng are required', async () => {
    const { body } = await request(app).get('/api/osm?categories=all').expect(400);
    expect(body.error).toMatch(/lat and lng are required/);
  });

  test('an unknown category is refused, and the error names the valid ones', async () => {
    const { body } = await request(app)
      .get(`/api/osm?lat=${ORLANDO.lat}&lng=${ORLANDO.lng}&categories=casinos`)
      .expect(400);
    expect(body.error).toMatch(/categories must include at least one of/);
    expect(body.error).toMatch(/nails/);
    expect(body.error).toMatch(/all/);
  });

  test('no category at all is refused rather than searching for everything', async () => {
    await request(app).get(`/api/osm?lat=${ORLANDO.lat}&lng=${ORLANDO.lng}`).expect(400);
  });

  test('a valid category alongside an invalid one still searches', async () => {
    // Reaches the network path; the response itself is asserted below.
    overpass([]);
    const { body } = await request(app)
      .get(`/api/osm?lat=${ORLANDO.lat}&lng=${ORLANDO.lng}&categories=nails,casinos&radius=3`)
      .expect(200);
    expect(body.results).toEqual([]);
  }, 20000);

  test('one Overpass answer: names, coordinates, categories, order and limit', async () => {
    overpass([
      // far away, so it must sort last
      { type: 'node', id: 1, lat: 28.70, lon: -81.33, tags: { name: 'Far Beauty Bar', shop: 'beauty' } },
      // nearest
      { type: 'node', id: 2, lat: 28.551, lon: -81.331, tags: { name: 'Close Nails', beauty: 'nails' } },
      // no name: Overpass returns many of these and they are not places a person can choose
      { type: 'node', id: 3, lat: 28.552, lon: -81.332, tags: { shop: 'beauty' } },
      // a way carries its point in `center` rather than lat/lon
      { type: 'way', id: 4, center: { lat: 28.56, lon: -81.34 }, tags: { name: 'Way Clinic', healthcare: 'clinic' } },
      // no coordinates anywhere: cannot be put on a map
      { type: 'node', id: 5, tags: { name: 'Nowhere Salon', shop: 'beauty' } },
      // falls through to amenity, then to 'place'
      { type: 'node', id: 6, lat: 28.57, lon: -81.35, tags: { name: 'Corner Doctors', amenity: 'doctors' } },
      { type: 'node', id: 7, lat: 28.58, lon: -81.36, tags: { name: 'Untagged Spot' } },
    ]);

    const { body } = await request(app)
      .get(`/api/osm?lat=${ORLANDO.lat}&lng=${ORLANDO.lng}&categories=all&radius=3`)
      .expect(200);

    const names = body.results.map((r) => r.name);
    expect(names).not.toContain('Nowhere Salon');
    expect(body.results.every((r) => r.name)).toBe(true);
    expect(names[0]).toBe('Close Nails');
    expect(names[names.length - 1]).toBe('Far Beauty Bar');

    const by = Object.fromEntries(body.results.map((r) => [r.name, r]));
    expect(by['Close Nails'].category).toBe('nails');
    expect(by['Way Clinic'].category).toBe('clinic');
    expect(by['Way Clinic'].lat).toBe(28.56);
    expect(by['Corner Doctors'].category).toBe('doctors');
    expect(by['Untagged Spot'].category).toBe('place');
    expect(by['Close Nails'].osmId).toBe('node-2');
    expect(by['Way Clinic'].osmId).toBe('way-4');
  }, 20000);

  test('the same search again is served from cache without asking Overpass', async () => {
    globalThis.fetch.mockClear();
    const { body } = await request(app)
      .get(`/api/osm?lat=${ORLANDO.lat}&lng=${ORLANDO.lng}&categories=all&radius=3`)
      .expect(200);
    expect(body.cached).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('a wide "all" search is capped and says so, so the page can tell the reader', async () => {
    overpass([]);
    const { body } = await request(app)
      .get(`/api/osm?lat=28.9&lng=-81.9&categories=all&radius=40`)
      .expect(200);
    expect(body.cappedAtKm).toBe(4);
    expect(body.askedKm).toBe(40);
  }, 20000);

  test('a named category is not capped at the "all" ceiling', async () => {
    const { body } = await request(app)
      .get(`/api/osm?lat=28.9&lng=-81.9&categories=nails&radius=40`)
      .expect(200);
    expect(body.cappedAtKm).toBeUndefined();
  }, 20000);
});

describe('Search page - documented restrooms (/api/restrooms)', () => {
  test('lat and lng are required', async () => {
    const { body } = await request(app).get('/api/restrooms').expect(400);
    expect(body.error).toMatch(/lat and lng are required/);
  });

  test('the upstream fields are renamed into the shape the page reads', async () => {
    refuge([{
      id: 77, name: 'Library', street: '101 Main St', city: 'Orlando', state: 'FL',
      latitude: 28.54, longitude: -81.38, unisex: true, accessible: true,
      changing_table: false, directions: 'Second floor', upvote: 9, downvote: 1,
    }]);
    const { body } = await request(app)
      .get(`/api/restrooms?lat=${ORLANDO.lat}&lng=${ORLANDO.lng}`)
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: '77', name: 'Library', address: '101 Main St, Orlando, FL',
      lat: 28.54, lng: -81.38, unisex: true, accessible: true,
      changingTable: false, upvotes: 9, downvotes: 1,
    });
  });

  test('a missing street or city does not leave stray commas in the address', async () => {
    refuge([{ id: 1, name: 'Park', city: 'Orlando', state: 'FL', latitude: 1, longitude: 2 }]);
    const { body } = await request(app).get('/api/restrooms?lat=1&lng=2').expect(200);
    expect(body[0].address).toBe('Orlando, FL');
  });

  test('the unisex and ada filters are passed upstream only when asked for', async () => {
    refuge([]);
    await request(app).get('/api/restrooms?lat=1&lng=2&unisex=true').expect(200);
    expect(String(globalThis.fetch.mock.calls[0][0])).toMatch(/unisex=true/);
    expect(String(globalThis.fetch.mock.calls[0][0])).not.toMatch(/ada=/);

    refuge([]);
    await request(app).get('/api/restrooms?lat=1&lng=2&unisex=false&ada=true').expect(200);
    const url = String(globalThis.fetch.mock.calls[0][0]);
    expect(url).toMatch(/ada=true/);
    expect(url).not.toMatch(/unisex=true/);
  });

  test('an upstream failure is reported rather than shown as no restrooms', async () => {
    refuge([], false, 503);
    const { body } = await request(app).get('/api/restrooms?lat=1&lng=2').expect(503);
    expect(body.error).toMatch(/Refuge Restrooms/);
  });
});

describe('Services page - service categories (/api/osm)', () => {
  // The page offers laser, threading, nails and massage. Electrolysis was
  // removed, and laser and threading both ride on shop=beauty.
  test('every category the page offers is one the API accepts', async () => {
    const { body } = await request(app).get('/api/osm?lat=28.4&lng=-81.4').expect(400);
    for (const id of ['beauty', 'nails', 'massage']) expect(body.error).toMatch(new RegExp(id));
  });

  test('a service search returns places nearest first', async () => {
    overpass([
      { type: 'node', id: 11, lat: 28.62, lon: -81.4, tags: { name: 'Distant Brows', shop: 'beauty' } },
      { type: 'node', id: 12, lat: 28.401, lon: -81.401, tags: { name: 'Nearby Brows', shop: 'beauty' } },
    ]);
    const { body } = await request(app)
      .get('/api/osm?lat=28.4&lng=-81.4&categories=beauty&radius=5')
      .expect(200);
    expect(body.results.map((r) => r.name)).toEqual(['Nearby Brows', 'Distant Brows']);
  }, 20000);

  test('electrolysis is not a category the API knows', async () => {
    const { body } = await request(app)
      .get('/api/osm?lat=28.4&lng=-81.4&categories=electrolysis')
      .expect(400);
    expect(body.error).not.toMatch(/electrolysis/);
  });
});

describe('Surgeon page - one entry (/api/surgeons/:slug)', () => {
  test('an unknown slug is a 404, not an empty profile', async () => {
    const { body } = await request(app).get('/api/surgeons/not-a-real-surgeon').expect(404);
    expect(body.error).toMatch(/Not listed/i);
  });

  test('a known entry comes back with the fields the profile page renders', async () => {
    const { body } = await request(app).get('/api/surgeons/william-kuzon').expect(200);
    expect(body.name).toBe('William Kuzon');
    expect(body.slug).toBe('william-kuzon');
    expect(Array.isArray(body.procedures)).toBe(true);
    expect(Array.isArray(body.colleagues)).toBe(true);
    expect(Array.isArray(body.alsoHere)).toBe(true);
    expect(body.source).toBeTruthy();
  });

  test('with no database there are no community reviews and no average to show', async () => {
    const { body } = await request(app).get('/api/surgeons/william-kuzon').expect(200);
    expect(body.reviews).toEqual([]);
    expect(body.average).toBeNull();
  });

  test('a center lists the surgeons recorded at it', async () => {
    const { body } = await request(app).get('/api/surgeons/crane-center-for-transgender-surgery').expect(200);
    expect(body.kind).not.toBe('surgeon');
    expect(body.colleagues.length).toBeGreaterThan(0);
    expect(body.colleagues.every((c) => c.slug)).toBe(true);
  });
});
