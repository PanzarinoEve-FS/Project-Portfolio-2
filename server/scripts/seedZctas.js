import 'dotenv/config';
import mongoose from 'mongoose';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Zcta from '../models/Zcta.js';

// Loads every US ZIP Code Tabulation Area into the zctas collection. Downloads
// the Census Bureau's 2020 cartographic boundary file (about 64 MB, public
// domain) and simplifies it with mapshaper. Both files are cached in
// server/data/cache, which git ignores, so a re-run skips straight to the import.

const SOURCE = 'https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_zcta520_500k.zip';
// Share of removable vertices kept. Borders between neighbours stay shared.
const KEEP = '50%';
const BATCH = 1000;

const cache = fileURLToPath(new URL('../data/cache/', import.meta.url));
const zipFile = `${cache}cb_2020_us_zcta520_500k.zip`;
const shapesFile = `${cache}zcta-us-${Number.parseInt(KEEP, 10)}.json`;

mkdirSync(cache, { recursive: true });

if (!existsSync(zipFile)) {
  console.log(`downloading ${SOURCE}`);
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`Census download failed with ${response.status}`);
  writeFileSync(zipFile, Buffer.from(await response.arrayBuffer()));
}

if (!existsSync(shapesFile)) {
  console.log(`simplifying to ${KEEP} of the detail with mapshaper, which takes a minute or two`);
  execFileSync(
    'npx',
    [
      '-y', '-p', 'mapshaper', 'mapshaper-xl', zipFile,
      '-rename-fields', 'ZCTA5=ZCTA5CE20',
      '-filter-fields', 'ZCTA5',
      '-simplify', KEEP, 'keep-shapes',
      '-o', 'format=geojson', 'precision=0.0001', shapesFile,
    ],
    { stdio: 'inherit' }
  );
}

const { features } = JSON.parse(readFileSync(shapesFile, 'utf8'));
const docs = [];
const erased = [];

for (const { properties, geometry } of features) {
  if (!geometry) {
    erased.push(properties.ZCTA5);
    continue;
  }

  const box = { w: Infinity, s: Infinity, e: -Infinity, n: -Infinity };
  const visit = (coords) => {
    if (typeof coords[0] === 'number') {
      box.w = Math.min(box.w, coords[0]);
      box.e = Math.max(box.e, coords[0]);
      box.s = Math.min(box.s, coords[1]);
      box.n = Math.max(box.n, coords[1]);
    } else {
      coords.forEach(visit);
    }
  };
  visit(geometry.coordinates);

  docs.push({ zip: properties.ZCTA5, ...box, geometry });
}

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');
console.log(`connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

// Replaced wholesale: the Census file is the source of truth.
await Zcta.collection.deleteMany({});
for (let i = 0; i < docs.length; i += BATCH) {
  await Zcta.collection.insertMany(docs.slice(i, i + BATCH), { ordered: false });
}
await Zcta.syncIndexes();

console.log(`loaded ${docs.length} ZIP code areas`);
if (erased.length) console.warn(`simplifying erased ${erased.length} shape(s): ${erased.join(', ')}`);

await mongoose.disconnect();
