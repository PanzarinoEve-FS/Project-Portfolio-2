import mongoose from 'mongoose';

// One ZIP's Business Safety Score, written by `npm run score:zips`.
const contributorSchema = new mongoose.Schema(
  {
    name: String,
    score: Number,
    sources: [String],
    // Enough to open this place's own profile from a ZIP's list.
    osmId: String,
    lat: Number,
    lng: Number,
    // Has a bad review of the place itself.
    bad: Boolean,
  },
  { _id: false }
);

// A web review that shaped the score, kept so the map can link to its source.
const reviewRefSchema = new mongoose.Schema(
  {
    key: String,
    business: String,
    osmId: String,
    scope: String,
    stance: String,
    origin: String,
    title: String,
    publisher: String,
    url: String,
    // A short excerpt, kept so a reader can check the wording themselves.
    quote: String,
    // What the finding says, in this project's own words.
    summary: String,
    address: String,
    // Where the place is, so a review can be pinned on the map. A chain-wide
    // review describes no single address and carries none.
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const zipScoreSchema = new mongoose.Schema(
  {
    zip: { type: String, required: true, unique: true, index: true },
    // null when too few businesses were scored to stand behind a number.
    score: { type: Number, min: 0, max: 100, default: null },
    band: { type: String, enum: ['good', 'mixed', 'poor', 'insufficient'], required: true },
    scored: { type: Number, default: 0 },
    scanned: { type: Number, default: 0 },
    // Places known only by company-wide evidence (CEI or a chain review), left out of the ZIP.
    corporateOnly: { type: Number, default: 0 },
    signals: {
      reviews: { type: Number, default: 0 },
      web: { type: Number, default: 0 },
      restroom: { type: Number, default: 0 },
      brand: { type: Number, default: 0 },
      cei: { type: Number, default: 0 },
    },
    highest: { type: [contributorSchema], default: [] },
    lowest: { type: [contributorSchema], default: [] },
    // Every counted place here, for the chart on a business profile.
    businesses: { type: [contributorSchema], default: [] },
    reviews: { type: [reviewRefSchema], default: [] },
    // How many reviews of places here read friendly, mixed or unfriendly.
    stances: {
      friendly: { type: Number, default: 0 },
      mixed: { type: Number, default: 0 },
      unfriendly: { type: Number, default: 0 },
      unclear: { type: Number, default: 0 },
    },
    // How many counted places score High, Mixed or Low.
    businessBands: {
      good: { type: Number, default: 0 },
      mixed: { type: Number, default: 0 },
      poor: { type: Number, default: 0 },
    },
    computedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('ZipScore', zipScoreSchema, 'zipscores');
