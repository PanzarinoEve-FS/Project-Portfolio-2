import mongoose from 'mongoose';

// One 2020 Census ZIP Code Tabulation Area, loaded by `npm run seed:zctas` 
// from the Census Bureau's cartographic boundary file (public domain).
const zctaSchema = new mongoose.Schema(
  {
    zip: { type: String, required: true, unique: true },
    // Bounding box, so the map can ask for just the ZIPs in view.
    w: { type: Number, required: true },
    s: { type: Number, required: true },
    e: { type: Number, required: true },
    n: { type: Number, required: true },
    geometry: {
      type: { type: String, enum: ['Polygon', 'MultiPolygon'], required: true },
      coordinates: { type: Array, required: true },
    },
  },
  { versionKey: false }
);

zctaSchema.index({ s: 1, n: 1, w: 1, e: 1 });

export default mongoose.model('Zcta', zctaSchema, 'zctas');
