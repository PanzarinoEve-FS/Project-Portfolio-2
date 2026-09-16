import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import CEI from '../models/CEI.js';

// Imports server/data/cei.json. Safe to re-run: upserts on company name.
const dataPath = fileURLToPath(new URL('../data/cei.json', import.meta.url));
const doc = JSON.parse(readFileSync(dataPath, 'utf8'));

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');
console.log(`connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

// The file marks maintainer notes with _; Mongo reserves that prefix.
const ops = doc.entries.map(({ _anchorNote, _brandsNote, ...rest }) => ({
  updateOne: {
    filter: { company: rest.company },
    update: {
      $set: {
        ...rest,
        ...(_anchorNote ? { anchorNote: _anchorNote } : {}),
        ...(_brandsNote ? { brandsNote: _brandsNote } : {}),
      },
    },
    upsert: true,
  },
}));

const result = await CEI.bulkWrite(ops, { ordered: false });
const total = await CEI.countDocuments();
const verified = await CEI.countDocuments({ verified: true });
const names = await CEI.aggregate([
  { $project: { n: { $add: [{ $size: '$brands' }, { $size: '$anchoredBrands' }] } } },
  { $group: { _id: null, total: { $sum: '$n' } } },
]);

console.log(`upserted ${result.upsertedCount}, updated ${result.modifiedCount}`);
console.log(`collection holds ${total} companies (${verified} verified) `
  + `covering ${names[0]?.total ?? 0} storefront names`);
console.log(`${doc.index} ${doc.edition}, ${doc.publisher} (checked ${doc.checkedOn})`);

await mongoose.disconnect();
