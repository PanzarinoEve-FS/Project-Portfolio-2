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

const ops = entries.map((e) => {
  const { _brandsNote, ...rest } = e;
  const slug = slugify(e.name);
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
