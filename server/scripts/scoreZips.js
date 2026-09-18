import 'dotenv/config';
import mongoose from 'mongoose';

import ZipScore from '../models/ZipScore.js';
import { matchCEI } from '../lib/cei.js';
import { SAFETY_METHOD, bandFor, scoreBusiness, scoreZip } from '../lib/safetyScore.js';

// Scores the ZIPs around central Orlando from the businesses inside them and
// stores the result in the zipscores collection. ZIP shapes come from the
// zctas collection (`npm run seed:zctas`).
//
// The business sweep is one Overpass query a tile, so it is saved to
// sweepbusinesses and reused. Pass --refresh to sweep again.

// Tags for places a person visits as a customer. Sweeping every amenity would
// pull in schools, churches and parks, which nobody chooses the way they choose
// a shop, and would quietly change what a Business Safety Score is measuring.
const SHOP_FILTER = '["shop"]["name"]';
const AMENITY_FILTER =
  '["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|pharmacy|clinic|doctors|dentist|hospital|bank|fuel|cinema|theatre|nightclub|veterinary|marketplace|car_wash|car_rental|driving_school)$"]["name"]';
const LEISURE_FILTER = '["leisure"~"^(fitness_centre|sports_centre|bowling_alley|dance)$"]["name"]';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Overpass answers 429 when pushed harder than this. A skipped tile is not a
// small loss: it drops every business in that part of the map, which makes the
// ZIPs under it look emptier than they are.
const OVERPASS_GAP_MS = 5000;
const OVERPASS_TRIES = 4;
const OVERPASS_TIMEOUT_MS = 90000;
const TILE_CAP = 1000;
// The area the sweep covers. Every ZIP whose shape touches it is scored.
const REGION = { w: -81.95, s: 28.05, e: -80.85, n: 29.1 };
// A tile this size comes back from Overpass in a few seconds with a few hundred
// to a thousand named places. Larger tiles run into the cap below and sample
// only part of what is there.
const GRID = 8;
const NOMINATIM_GAP_MS = 1100;
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'LGBTQIA-Safety-App/1.0';
const REFRESH = process.argv.includes('--refresh');
// How close a swept business has to be to count as the place a review describes.
const REVIEW_MATCH_M = 100;
const STANCE_ORDER = { unfriendly: 0, mixed: 1, friendly: 2 };
// Review links kept per ZIP for the map; the stance counts cover the rest.
const MAX_REVIEW_REFS = 12;
// Enough bars to compare a place against its neighbours without a chart that
// scrolls forever.
const MAX_BUSINESS_BARS = 40;

// The scored ZIP shapes, filled from Mongo once connected.
let zctas = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function metres(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

const normalise = (value = '') =>
  ` ${value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;

// "Hamburger Mary's" and "Hamburger Mary's Orlando" are the same place.
function sameName(a, b) {
  const x = normalise(a);
  const y = normalise(b);
  return x.includes(y) || y.includes(x);
}

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Inside the outer ring and not inside any hole.
const inPolygon = (point, rings) =>
  inRing(point, rings[0]) && !rings.slice(1).some((hole) => inRing(point, hole));

const polygonsOf = (geometry) =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

const segmentsCross = (a, b, c, d) =>
  cross(a, b, c) > 0 !== cross(a, b, d) > 0 && cross(c, d, a) > 0 !== cross(c, d, b) > 0;

// True when a shape overlaps the box at all: a vertex inside it, a corner of
// the box inside the shape, or an edge crossing one of the box's sides.
function touchesBox(geometry, box) {
  const corners = [[box.w, box.s], [box.e, box.s], [box.e, box.n], [box.w, box.n]];
  const sides = corners.map((corner, i) => [corner, corners[(i + 1) % 4]]);

  return polygonsOf(geometry).some(
    (rings) =>
      rings.some((ring) => ring.some(([x, y]) => x >= box.w && x <= box.e && y >= box.s && y <= box.n)) ||
      corners.some((corner) => inPolygon(corner, rings)) ||
      rings.some((ring) =>
        ring.some((point, i) => i > 0 && sides.some(([a, b]) => segmentsCross(ring[i - 1], point, a, b)))
      )
  );
}

function zipAt(lng, lat) {
  for (const zcta of zctas) {
    if (lng < zcta.w || lng > zcta.e || lat < zcta.s || lat > zcta.n) continue;
    if (polygonsOf(zcta.geometry).some((rings) => inPolygon([lng, lat], rings))) return zcta.zip;
  }
  return null;
}

// The shape a point falls in, or its postcode when that is one of the scored ZIPs.
const placeZip = (business) =>
  zipAt(business.lng, business.lat) ??
  (zctas.some((zcta) => zcta.zip === business.postcode) ? business.postcode : null);

function tiles() {
  const box = zctas.reduce(
    (acc, zcta) => ({
      w: Math.min(acc.w, zcta.w),
      s: Math.min(acc.s, zcta.s),
      e: Math.max(acc.e, zcta.e),
      n: Math.max(acc.n, zcta.n),
    }),
    { w: Infinity, s: Infinity, e: -Infinity, n: -Infinity }
  );

  const out = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const w = box.w + ((box.e - box.w) * i) / GRID;
      const e = box.w + ((box.e - box.w) * (i + 1)) / GRID;
      const s = box.s + ((box.n - box.s) * j) / GRID;
      const n = box.s + ((box.n - box.s) * (j + 1)) / GRID;
      out.push({ w, e, s, n, lat: (s + n) / 2, lng: (w + e) / 2 });
    }
  }
  return out;
}

let lastNominatim = 0;

async function nominatim(params) {
  const wait = lastNominatim + NOMINATIM_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastNominatim = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  const query = { format: 'jsonv2', addressdetails: '1', bounded: '1', limit: '40', ...params };
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
  });
  if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
  return response.json();
}

let lastOverpass = 0;

// One query a tile, throttled, with a deadline so a stalled request cannot
// wedge the whole sweep. Overpass can answer 200 with an HTML error page or a
// remark instead of results, so both are treated as failures for this tile.
// Retries a tile that was refused or timed out, backing off each time, rather
// than dropping it. Only the last failure gives up.
async function overpass(tile) {
  let last;
  for (let attempt = 1; attempt <= OVERPASS_TRIES; attempt += 1) {
    try {
      return await askOverpass(tile);
    } catch (err) {
      last = err;
      if (attempt < OVERPASS_TRIES) await sleep(6000 * attempt);
    }
  }
  throw last;
}

async function askOverpass(tile) {
  const wait = lastOverpass + OVERPASS_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastOverpass = Date.now();

  const box = `(${tile.s},${tile.w},${tile.n},${tile.e})`;
  const body = `[out:json][timeout:60];(nwr${SHOP_FILTER}${box};nwr${AMENITY_FILTER}${box};nwr${LEISURE_FILTER}${box};);out tags center ${TILE_CAP};`;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body: new URLSearchParams({ data: body }),
    signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Overpass answered ${response.status}`);

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Overpass returned a page, not results');
  }
  if (json.remark) throw new Error(json.remark.slice(0, 70));
  return json.elements ?? [];
}

async function sweepBusinesses(db, grid) {
  const found = new Map();
  let queries = 0;

  for (const tile of grid) {
    try {
      for (const element of await overpass(tile)) {
        const tags = element.tags ?? {};
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;
        if (!tags.name || lat == null || lng == null) continue;

        const osmId = `${element.type}-${element.id}`;
        if (found.has(osmId)) continue;

        const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
        found.set(osmId, {
          osmId,
          name: tags.name,
          category: tags.shop ?? tags.amenity ?? tags.leisure ?? 'business',
          address: [street, tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', ') || tags.name,
          lat,
          lng,
          postcode: tags['addr:postcode'] ?? null,
        });
      }
    } catch (err) {
      console.warn(`  skipped one tile: ${err.message}`);
    }

    queries += 1;
    if (queries % 8 === 0 || queries === grid.length) {
      console.log(`  businesses: ${queries}/${grid.length} tiles, ${found.size} found`);
    }
  }

  const sweptAt = new Date();
  const docs = [...found.values()].map((business) => ({ ...business, zip: placeZip(business), sweptAt }));

  const collection = db.collection('sweepbusinesses');
  await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  await collection.createIndex({ osmId: 1 }, { unique: true });
  await collection.createIndex({ zip: 1 });

  return docs;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');
  const db = mongoose.connection.db;

  const candidates = await db
    .collection('zctas')
    .find({ w: { $lte: REGION.e }, e: { $gte: REGION.w }, s: { $lte: REGION.n }, n: { $gte: REGION.s } })
    .toArray();
  zctas = candidates.filter((zcta) => touchesBox(zcta.geometry, REGION));
  if (zctas.length === 0) {
    throw new Error('The zctas collection has no ZIP shapes here. Run `npm run seed:zctas` first.');
  }
  console.log(`Scoring ${zctas.length} ZIPs across Central Florida`);

  const grid = tiles();

  let swept = await db.collection('sweepbusinesses').find({}).toArray();
  if (REFRESH || swept.length === 0) {
    console.log(REFRESH ? 'Refreshing the business sweep' : 'No saved sweep yet, sweeping businesses');
    swept = await sweepBusinesses(db, grid);
  } else {
    console.log(`Reusing the saved sweep of ${swept.length} businesses (pass --refresh to sweep again)`);
  }

  const businesses = new Map(swept.map((business) => [business.osmId, business]));

  // Community star ratings. A reviewed business counts even when the sweep
  // did not happen to find it.
  const ratings = new Map();
  for (const doc of await db.collection('businesses').find({}).toArray()) {
    const list = doc.reviews ?? [];
    if (list.length === 0) continue;

    ratings.set(doc.osmId, {
      overall: list.reduce((sum, review) => sum + review.rating, 0) / list.length,
      genderNeutral: list.filter((review) => review.genderNeutralRestroom).length,
    });

    if (!businesses.has(doc.osmId) && doc.lat != null && doc.lng != null) {
      businesses.set(doc.osmId, { osmId: doc.osmId, name: doc.name, lat: doc.lat, lng: doc.lng, postcode: null });
    }
  }
  console.log(`  community ratings: ${ratings.size} rated business(es)`);

  // Web-researched reviews from the reviews collection (`npm run seed:reviews`).
  const researched = await db.collection('reviews').find({}).toArray();

  // A chain review applies to every storefront trading under its names.
  const chains = new Map();
  for (const review of researched.filter((item) => item.scope === 'brand')) {
    const chain = chains.get(review.business) ?? { brands: [], anchoredBrands: [], reviews: [] };
    chain.brands.push(...(review.brands ?? []));
    chain.anchoredBrands.push(...(review.anchoredBrands ?? []));
    chain.reviews.push(review);
    chains.set(review.business, chain);
  }
  const chainEntries = [...chains.values()];

  // Reviews of one place attach to the swept business they describe, or stand
  // in as that business when the sweep missed it. Grouped by place first, so a
  // place with many Google reviews is matched once.
  const groups = new Map();
  for (const review of researched.filter((item) => item.scope === 'location')) {
    const id = review.osmId ?? (review.placeKey ? `google:${review.placeKey}` : `review:${review.key}`);
    groups.set(id, [...(groups.get(id) ?? []), review]);
  }

  const placeReviews = new Map();
  for (const [id, group] of groups) {
    const [first] = group;
    let target = first.osmId ? businesses.get(first.osmId) : null;
    if (!target) {
      target = [...businesses.values()]
        .filter((business) => sameName(business.name, first.business) && metres(business, first) <= REVIEW_MATCH_M)
        .sort((a, b) => metres(a, first) - metres(b, first))[0];
    }
    if (!target) {
      target = { osmId: id, name: first.business, lat: first.lat, lng: first.lng, postcode: null };
      businesses.set(id, target);
    }
    placeReviews.set(target.osmId, [...(placeReviews.get(target.osmId) ?? []), ...group]);
  }
  const fromGoogle = researched.filter((item) => item.origin === 'google').length;
  console.log(
    `  web reviews: ${researched.length} (${fromGoogle} from Google Maps; ${chainEntries.length} chains, ${placeReviews.size} single places)`
  );

  // A restroom voted down more than up is treated as disputed and left out.
  const restrooms = new Map();
  for (const tile of grid) {
    try {
      const url = new URL('https://www.refugerestrooms.org/api/v1/restrooms/by_location');
      url.searchParams.set('lat', tile.lat);
      url.searchParams.set('lng', tile.lng);
      url.searchParams.set('per_page', '100');
      url.searchParams.set('unisex', 'true');

      const response = await fetch(url);
      if (response.ok) {
        for (const room of await response.json()) {
          if (room.unisex && (room.downvote ?? 0) <= (room.upvote ?? 0)) {
            restrooms.set(room.id, { lat: room.latitude, lng: room.longitude });
          }
        }
      }
    } catch (err) {
      console.warn(`  skipped restrooms in one tile: ${err.message}`);
    }
    await sleep(300);
  }
  const restroomList = [...restrooms.values()];
  console.log(`  restrooms: ${restroomList.length} documented gender-neutral`);

  const ceiEntries = await db.collection('cei').find({}).toArray();

  const zips = new Map(
    zctas.map((zcta) => [
      zcta.zip,
      {
        scanned: 0,
        scored: [],
        corporateOnly: 0,
        signals: { reviews: 0, web: 0, restroom: 0, brand: 0, cei: 0 },
        stances: { friendly: 0, mixed: 0, unfriendly: 0, unclear: 0 },
        reviews: new Map(),
      },
    ])
  );

  let unplaced = 0;
  for (const business of businesses.values()) {
    // Placed against the current shapes every run, not the ones saved with the sweep.
    const zip = placeZip(business);
    if (!zip || !zips.has(zip)) {
      unplaced += 1;
      continue;
    }

    const entry = zips.get(zip);
    entry.scanned += 1;

    const rating = ratings.get(business.osmId) ?? null;
    const webReviews = placeReviews.get(business.osmId) ?? [];
    // Chain reviews match storefront names the same way CEI does.
    const brandReviews = matchCEI(business.name, chainEntries)?.reviews ?? [];
    const nearRestroom =
      (rating?.genderNeutral ?? 0) > 0 ||
      restroomList.some((room) => metres(business, room) <= SAFETY_METHOD.restroomRadiusM);
    const cei = matchCEI(business.name, ceiEntries);

    const result = scoreBusiness({
      review: rating,
      webReviews,
      brandReviews,
      nearRestroom,
      cei,
      name: business.name,
    });
    if (!result) continue;

    // Known only through company-wide evidence (a CEI score or a chain review):
    // says nothing about how this location treats people, so it never counts
    // toward the ZIP.
    if (!result.local) {
      entry.corporateOnly += 1;
      continue;
    }

    entry.scored.push({
      name: business.name,
      score: result.score,
      zipScore: result.zipScore,
      sources: result.sources,
      bad: result.bad,
      osmId: business.osmId,
      lat: business.lat,
      lng: business.lng,
    });
    for (const source of result.sources) entry.signals[source] += 1;
    for (const review of webReviews) entry.stances[review.stance] += 1;
    for (const review of [...webReviews, ...brandReviews]) {
      entry.reviews.set(review.key, {
        key: review.key,
        business: review.business,
        osmId: business.osmId,
        scope: review.scope,
        stance: review.stance,
        origin: review.origin ?? 'research',
        title: review.source?.title,
        publisher: review.source?.publisher,
        url: review.source?.url,
        quote: review.quote,
        summary: review.summary,
        address: review.address,
        lat: review.lat,
        lng: review.lng,
      });
    }
  }

  const computedAt = new Date();
  const tally = { good: 0, mixed: 0, poor: 0, insufficient: 0 };

  const ops = [...zips.entries()].map(([zip, entry]) => {
    const count = entry.scored.length;
    // Businesses with a bad review count several times over.
    const average = scoreZip(entry.scored);
    const band = bandFor(average, count);
    tally[band] += 1;

    const ranked = [...entry.scored].sort((a, b) => b.score - a.score);

    return {
      updateOne: {
        filter: { zip },
        update: {
          $set: {
            zip,
            // A two-business average is not a number worth publishing.
            score: band === 'insufficient' ? null : average,
            band,
            scored: count,
            scanned: entry.scanned,
            corporateOnly: entry.corporateOnly,
            signals: entry.signals,
            highest: ranked.slice(0, 3),
            // Never repeat a business already listed among the highest.
            lowest: ranked.slice(Math.max(3, count - 3)).reverse(),
            // Both ends, not just the top. A ZIP is red because of its worst
            // places, and taking the highest scorers alone hid the very
            // business that turned it red from its own chart.
            businesses:
              ranked.length <= MAX_BUSINESS_BARS
                ? ranked
                : [...ranked.slice(0, MAX_BUSINESS_BARS - 10), ...ranked.slice(-10)],
            // The most serious first, and only a handful, to keep the map light.
            reviews: [...entry.reviews.values()]
              .sort(
                (a, b) =>
                  STANCE_ORDER[a.stance] - STANCE_ORDER[b.stance] ||
                  (a.origin === 'research' ? 0 : 1) - (b.origin === 'research' ? 0 : 1)
              )
              .slice(0, MAX_REVIEW_REFS),
            stances: entry.stances,
            businessBands: {
              good: entry.scored.filter((item) => item.score >= SAFETY_METHOD.bands.good).length,
              mixed: entry.scored.filter(
                (item) => item.score >= SAFETY_METHOD.bands.mixed && item.score < SAFETY_METHOD.bands.good
              ).length,
              poor: entry.scored.filter((item) => item.score < SAFETY_METHOD.bands.mixed).length,
            },
            computedAt,
          },
        },
        upsert: true,
      },
    };
  });

  await ZipScore.bulkWrite(ops, { ordered: false });
  // A ZIP that is no longer in the region keeps no stale score.
  const stale = await ZipScore.deleteMany({ zip: { $nin: [...zips.keys()] } });

  const localScored = [...zips.values()].reduce((sum, entry) => sum + entry.scored.length, 0);
  const corporateOnly = [...zips.values()].reduce((sum, entry) => sum + entry.corporateOnly, 0);

  console.log(
    `\n${businesses.size - unplaced} businesses placed in ${zips.size} ZIPs (${unplaced} fell outside the map)`
  );
  const withBad = [...zips.values()].reduce((sum, entry) => sum + entry.scored.filter((item) => item.bad).length, 0);
  console.log(`  ${localScored} with local evidence counted (${withBad} with a bad review), ${corporateOnly} known only company-wide left out`);
  if (stale.deletedCount) console.log(`  removed ${stale.deletedCount} score(s) for ZIPs outside the region`);
  console.log(
    `  green ${tally.good} · orange ${tally.mixed} · red ${tally.poor} · grey ${tally.insufficient}`
  );
}

main()
  .catch((err) => {
    console.error('scoring failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
