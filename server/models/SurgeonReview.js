import mongoose from 'mongoose';

// Community ratings for a directory entry. Keyed by the entry's slug, since
// the wiki gives no identifier and these are not OpenStreetMap places.
const surgeonReviewSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, index: true },
    author: { type: String, default: 'Anonymous', trim: true, maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

export default mongoose.model('SurgeonReview', surgeonReviewSchema);
