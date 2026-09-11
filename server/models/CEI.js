import mongoose from 'mongoose';

// HRC Corporate Equality Index, seeded from server/data/cei.json.
// Rates a company's own workplace policies, not how a storefront treats
// customers -- hence `source` and `verified` on every row.
const ceiSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, unique: true, index: true, trim: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    year: { type: Number, required: true, index: true },
    // false = no survey submitted, so HRC scored it from public policy.
    verified: { type: Boolean, default: false },
    industry: String,

    // Storefront names this company trades under, matched against OSM results.
    brands: { type: [String], default: [] },
    // Ordinary words: only count at the start, so "On Target Fitness" does not.
    anchoredBrands: { type: [String], default: [] },

    source: { type: String, required: true },

    // Notes for whoever maintains the data. Never sent to the client.
    anchorNote: String,
    brandsNote: String,
  },
  { timestamps: true }
);

export default mongoose.model('CEI', ceiSchema, 'cei');
