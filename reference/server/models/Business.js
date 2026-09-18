import mongoose from 'mongoose';

// One rating submitted by one user for one place.
const reviewSchema = new mongoose.Schema(
  {
    author: { type: String, default: 'Anonymous', trim: true },
    comment: { type: String, trim: true, maxlength: 1000 },
    bathroomAccess: { type: Number, min: 1, max: 5, required: true },
    acceptance: { type: Number, min: 1, max: 5, required: true },
    staffFriendliness: { type: Number, min: 1, max: 5, required: true },
    safety: { type: Number, min: 1, max: 5, required: true },
    overall: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true }
);

// A place people can rate. `osmId` ties it back to the Nominatim result
// so the same business is not stored twice.
const businessSchema = new mongoose.Schema(
  {
    osmId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    category: { type: String, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    reviews: [reviewSchema],
  },
  { timestamps: true }
);

// Average of every review, per stat. Feeds the Recharts radar chart.
businessSchema.virtual('averages').get(function () {
  const stats = ['bathroomAccess', 'acceptance', 'staffFriendliness', 'safety', 'overall'];
  const empty = Object.fromEntries(stats.map((s) => [s, 0]));

  if (this.reviews.length === 0) return empty;

  return Object.fromEntries(
    stats.map((stat) => {
      const total = this.reviews.reduce((sum, review) => sum + review[stat], 0);
      return [stat, Number((total / this.reviews.length).toFixed(1))];
    })
  );
});

businessSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Business', businessSchema);
