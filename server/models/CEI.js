import mongoose from 'mongoose';

// HRC Corporate Equality Index, seeded from server/data/cei.json.
// Rates a company's own workplace policies, 
// not necessarily how a storefront treats customers 
// CEI (would be most useful for job searching, but is also a good indicator of how a business treats the public).
const ceiSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, unique: true, index: true, trim: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    year: { type: Number, required: true, index: true },
    // false = no survey submitted
    // so HRC scored it from public policy.
    verified: { type: Boolean, default: false },
    industry: String,

    // Storefront names this company trades under 
    // matched against OSM results.
    brands: { type: [String], default: [] },
    // Ordinary words: only count at the start, so "On Target Fitness" does not match "Target"
    anchoredBrands: { type: [String], default: [] },

    source: { type: String, required: true },

    anchorNote: String,
    brandsNote: String,
  },
  { timestamps: true }
);

export default mongoose.model('CEI', ceiSchema, 'cei');
