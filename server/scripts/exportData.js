import 'dotenv/config';
import mongoose from 'mongoose';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Writes the collections this project computes itself back out to server/data
// so they can live in the repo and be restored with `npm run seed`. Everything
// else in server/data was hand-built or downloaded and is already committed.
//
// One collection is deliberately never exported: users, which holds password
// hashes and real email addresses.
const out = (name) => fileURLToPath(new URL(`../data/${name}`, import.meta.url));

const write = (name, entries, note) => {
  const body = { note, generatedAt: new Date().toISOString(), count: entries.length, entries };
  writeFileSync(out(name), `${JSON.stringify(body, null, 2)}\n`);
  const mb = (Buffer.byteLength(JSON.stringify(body)) / 1048576).toFixed(2);
  console.log(`${name.padEnd(24)} ${String(entries.length).padStart(6)} rows  ${mb} MB`);
};

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');
console.log(`connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

const db = mongoose.connection.db;
const plain = { projection: { _id: 0, __v: 0 } };

const zipscores = await db.collection('zipscores').find({}, plain).toArray();
write('zipscores.json', zipscores, 'Business Safety Scores from `npm run score:zips`.');

// Only the ZIPs that actually carry a score. The full Census set is 33,791
// shapes and about 97 MB, far too large to commit; the heatmap asks for exactly
// these, and `npm run seed:zctas` fetches the rest when they are wanted.
const scored = zipscores.map((row) => row.zip);
const zctas = await db.collection('zctas').find({ zip: { $in: scored } }, plain).toArray();
write('zctas-scored.json', zctas, 'Census ZCTA shapes for the scored ZIPs only.');

// The Overpass sweep is slow and rate-limited, so the cache travels with the
// repo: `npm run score:zips` can then be re-run without re-sweeping.
// Reviews read off Google Maps and classified by this project. The hand-written
// research reviews live in reviews.json and are not touched here.
const web = await db.collection('reviews').find({ origin: 'google' }, plain).toArray();
write('reviews-web.json', web, 'Google Maps reviews collected and classified by this project.');

// Community ratings left on directory entries. 
const surgeonReviews = await db.collection('surgeonreviews').find({}, plain).toArray();
write('reviews-surgeons.json', surgeonReviews, 'Community ratings of directory entries.');

const sweep = await db.collection('sweepbusinesses').find({}, plain).toArray();
write('sweepbusinesses.json', sweep, 'Cached Overpass business sweep used by `npm run score:zips`.');

await mongoose.disconnect();
