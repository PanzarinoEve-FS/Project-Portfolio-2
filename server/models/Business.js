import mongoose from 'mongoose';

// One rating submitted by one user for one place: five stars, plus two facts
// about the restroom that the person can vouch for from their own visit.
const reviewSchema = new mongoose.Schema(
  {
    author: { type: String, default: 'Anonymous', trim: true, maxlength: 80 },
    comment: { type: String, trim: true, maxlength: 2000 },
    rating: { type: Number, min: 1, max: 5, required: true },
    genderNeutralRestroom: { type: Boolean, default: false },
    wheelchairAccessible: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A place people can rate. `osmId` ties it back to the OpenStreetMap result
// so the same business is not stored twice.
const businessSchema = new mongoose.Schema(
  {
    osmId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    category: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    reviews: [reviewSchema],
  },
  { timestamps: true }
);

// Summary of every review. Feeds the star display and the bathroom badge.
businessSchema.virtual('averages').get(function () {
  const reviews = this.reviews || [];

  if (reviews.length === 0) {
    return { overall: 0, genderNeutral: 0, wheelchair: 0, count: 0 };
  }

  const total = reviews.reduce((sum, r) => sum + r.rating, 0);

  return {
    overall: Number((total / reviews.length).toFixed(1)),
    // How many reviewers reported each, so the badge can say "3 of 5".
    genderNeutral: reviews.filter((r) => r.genderNeutralRestroom).length,
    wheelchair: reviews.filter((r) => r.wheelchairAccessible).length,
    count: reviews.length,
  };
});

businessSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Business', businessSchema);
