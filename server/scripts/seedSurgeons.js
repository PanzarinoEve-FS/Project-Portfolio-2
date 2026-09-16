import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Surgeon from '../models/Surgeon.js';

// Imports server/data/surgeons.json into MongoDB. Safe to re-run: every row is
// upserted on its slug, so re-seeding refreshes the data without duplicating.
const slugify = (name) =>
  name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

const dataPath = fileURLToPath(new URL('../data/surgeons.json', import.meta.url));
const { entries, source, checkedOn } = JSON.parse(readFileSync(dataPath, 'utf8'));

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');
console.log(`connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

// The slug comes from the file rather than being recomputed here. Two people
// share a name across regions, and deriving the slug from the name alone made
// the second upsert overwrite the first instead of adding it -- 816 rows in
// the file became 814 in the collection.
const ops = entries.map((e) => {
  const { _brandsNote, ...rest } = e;
  const slug = e.slug || slugify(e.name);
  return {
    updateOne: { filter: { slug }, update: { $set: { ...rest, slug } }, upsert: true },
  };
});

const result = await Surgeon.bulkWrite(ops, { ordered: false });
const total = await Surgeon.countDocuments();
const centres = await Surgeon.countDocuments({ kind: { $ne: 'surgeon' } });

console.log(`upserted ${result.upsertedCount}, updated ${result.modifiedCount}`);
console.log(`collection holds ${total} entries (${centres} centres)`);
console.log(`source: ${source} (checked ${checkedOn})`);

await mongoose.disconnect();
