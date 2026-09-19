import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ZipScore from '../models/ZipScore.js';
import Zcta from '../models/Zcta.js';

// Restores the three collections the heatmap needs
const read = (name) => {
  const path = fileURLToPath(new URL(`../data/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8'));
};

const upsert = async (model, entries, key) =>
  model.bulkWrite(
    entries.map((entry) => ({
      updateOne: { filter: { [key]: entry[key] }, update: { $set: entry }, upsert: true },
    })),
    { ordered: false }
  );

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');
console.log(`connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

const shapes = read('zctas-scored.json');
const shapeResult = await upsert(Zcta, shapes.entries, 'zip');
console.log(
  `zip shapes      upserted ${shapeResult.upsertedCount}, updated ${shapeResult.modifiedCount} `
    + `-- collection holds ${await Zcta.estimatedDocumentCount()}`
);

const scores = read('zipscores.json');
const scoreResult = await upsert(ZipScore, scores.entries, 'zip');
console.log(
  `zip scores      upserted ${scoreResult.upsertedCount}, updated ${scoreResult.modifiedCount} `
    + `-- collection holds ${await ZipScore.countDocuments()}`
);


const sweep = read('sweepbusinesses.json');
const sweepCollection = mongoose.connection.db.collection('sweepbusinesses');
const sweepResult = await sweepCollection.bulkWrite(
  sweep.entries.map((entry) => ({
    updateOne: { filter: { osmId: entry.osmId }, update: { $set: entry }, upsert: true },
  })),
  { ordered: false }
);
console.log(
  `business sweep  upserted ${sweepResult.upsertedCount}, updated ${sweepResult.modifiedCount} `
    + `-- collection holds ${await sweepCollection.countDocuments()}`
);

const bands = await ZipScore.aggregate([{ $group: { _id: '$band', n: { $sum: 1 } } }]);
console.log(
  `bands: ${bands.map((b) => `${b._id} ${b.n}`).join(' · ')}`
);
console.log(`scores computed ${scores.generatedAt.slice(0, 10)}; exported from this project's own scoring run`);

await mongoose.disconnect();
