import mongoose from 'mongoose';

// LGBTQIA+ friendliness reviews found through web research, seeded from
// server/data/reviews.json. One document per source, so every claim links back
// to where it was published. Community star ratings stay on each Business.
function isLocation() {
  return this.scope === 'location';
}

const reviewSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true },
    business: { type: String, required: true, trim: true },
    // brand: about a chain as a whole. location: about one place.
    scope: { type: String, enum: ['brand', 'location'], required: true },
    // research: checked by hand (server/data/reviews.json). google: read
    // automatically from Google Maps by `npm run scrape:google`.
    origin: { type: String, enum: ['research', 'google'], default: 'research', index: true },

    // Storefront names a brand review covers, matched the same way as CEI.
    brands: {
      type: [String],
      default: [],
      validate: {
        validator(brands) {
          return this.scope !== 'brand' || brands.length + (this.anchoredBrands?.length ?? 0) > 0;
        },
        message: 'A brand review needs at least one storefront name',
      },
    },
    anchoredBrands: { type: [String], default: [] },

    // Where a location review happened.
    address: { type: String, trim: true },
    lat: { type: Number, min: -90, max: 90, required: [isLocation, 'A location review needs coordinates'] },
    lng: { type: Number, min: -180, max: 180, required: [isLocation, 'A location review needs coordinates'] },
    osmId: { type: String, trim: true },
    placeKey: { type: String, trim: true, index: true },

    stance: { type: String, enum: ['friendly', 'mixed', 'unfriendly', 'unclear'], required: true },
    // In our own words.
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    // Word for word from the source.
    quote: { type: String, trim: true, maxlength: 500 },
    source: {
      title: { type: String, required: true, trim: true },
      publisher: { type: String, required: true, trim: true },
      url: { type: String, required: true, trim: true },
      published: Date,
    },
    checkedOn: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Review', reviewSchema, 'reviews');
