import mongoose from 'mongoose';

const ceiSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, unique: true, index: true, trim: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    year: { type: Number, required: true, index: true },

    verified: { type: Boolean, default: false },
    industry: String,

    brands: { type: [String], default: [] },

    anchoredBrands: { type: [String], default: [] },

    source: { type: String, required: true },

    anchorNote: String,
    brandsNote: String,
  },
  { timestamps: true }
);

export default mongoose.model('CEI', ceiSchema, 'cei');
