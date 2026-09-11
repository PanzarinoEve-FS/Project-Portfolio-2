import mongoose from 'mongoose';

const surgeonSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },

    kind: { type: String, enum: ['surgeon', 'institution', 'team'], default: 'surgeon', index: true },
    procedures: { type: [String], index: true },
    region: { type: String, index: true },

    state: String,
    city: String,
    country: String,
    address: String,
    phone: String,
    website: String,

    lat: Number,
    lng: Number,

    precise: { type: Boolean, default: false },

    clinic: { type: String, index: true },
    specialty: String,
    status: { type: String, enum: ['active', 'unclear', 'retired'], default: 'active' },

    npi: String,
    orgNpi: String,
    locationSource: String,
    phoneSource: String,
    note: String,
    wikiPage: String,
  },
  { timestamps: true }
);

surgeonSchema.index({ name: 'text', city: 'text', clinic: 'text' });

export default mongoose.model('Surgeon', surgeonSchema);
