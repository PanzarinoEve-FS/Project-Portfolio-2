import 'dotenv/config';
import mongoose from 'mongoose';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Review from '../models/Review.js';
import SurgeonReview from '../models/SurgeonReview.js';

// Imports server/data/reviews.json. 
const dataPath = fileURLToPath(new URL('../data/reviews.json', import.meta.url));
const doc = JSON.parse(readFileSync(dataPath, 'utf8'));

// The file marks maintainer notes with _; Mongo reserves that prefix.
const entries = doc.reviews.map((review) => ({
  checkedOn: doc.checkedOn,
  origin: 'research',
  ...Object.fromEntries(Object.entries(review).filter(([key]) => !key.startsWith('_'))),
}));

// Check every review before touching the collection, 
// so one bad entry cannot leave it half imported.
const problems = [];
for (const entry of entries) {
  try {
    await new Review(entry).validate();
  } catch (err) {
    problems.push(`${entry.key ?? '(no key)'}: ${err.message}`);
  }
}
const keys = entries.map((entry) => entry.key);
const duplicates = [...new Set(keys.filter((key, i) => keys.indexOf(key) !== i))];
if (duplicates.length) problems.push(`duplicate keys: ${duplicates.join(', ')}`);

if (problems.length) {
  console.error(`reviews.json has ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');
console.log(`connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

if (entries.length) {
  const result = await Review.bulkWrite(
    entries.map((entry) => ({
      replaceOne: { filter: { key: entry.key }, replacement: entry, upsert: true },
    })),
    { ordered: false }
  );
  console.log(`upserted ${result.upsertedCount}, updated ${result.modifiedCount}`);
}
const removed = await Review.deleteMany({ origin: { $ne: 'google' }, key: { $nin: keys } });
if (removed.deletedCount) console.log(`removed ${removed.deletedCount} no longer in the file`);

// Reviews collected from Google Maps, exported 
const webPath = fileURLToPath(new URL('../data/reviews-web.json', import.meta.url));
if (existsSync(webPath)) {
  const web = JSON.parse(readFileSync(webPath, 'utf8')).entries;
  if (web.length) {
    const webResult = await Review.bulkWrite(
      web.map((entry) => ({
        replaceOne: { filter: { key: entry.key }, replacement: entry, upsert: true },
      })),
      { ordered: false }
    );
    console.log(`web reviews: upserted ${webResult.upsertedCount}, updated ${webResult.modifiedCount}`);
  }
}

// Community ratings of surgeons and centers.

const surgeonPath = fileURLToPath(new URL('../data/reviews-surgeons.json', import.meta.url));
if (existsSync(surgeonPath)) {
  const rows = JSON.parse(readFileSync(surgeonPath, 'utf8')).entries;
  if (rows.length) {
    const result = await SurgeonReview.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { slug: row.slug, comment: row.comment },
          update: { $set: row },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    console.log(
      `surgeon ratings: upserted ${result.upsertedCount}, updated ${result.modifiedCount} `
        + `-- collection holds ${await SurgeonReview.countDocuments()}`
    );
  }
}

const tally = await Review.aggregate([
  { $group: { _id: { scope: '$scope', stance: '$stance' }, n: { $sum: 1 } } },
  { $sort: { '_id.scope': 1, '_id.stance': 1 } },
]);
console.log(`collection holds ${await Review.countDocuments()} reviews`);
for (const row of tally) console.log(`  ${row._id.scope} · ${row._id.stance}: ${row.n}`);
console.log(`researched ${doc.researched.length} businesses in ${doc.region} (checked ${doc.checkedOn})`);

await mongoose.disconnect();
