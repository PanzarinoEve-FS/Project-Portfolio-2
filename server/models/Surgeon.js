import mongoose from 'mongoose';

// The surgeon and surgery-center directory 
// from r/TransSurgeriesWiki 
// enriched from the CMS NPI Registry.
// server/data/surgeons.json is the seed source; 
// this collection is what the app actually queries.
const surgeonSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    // "surgeon" is a person; 
    // "surgery centerrs" are places surgeons work
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
    // true when the location is a real address 
    precise: { type: Boolean, default: false },

    clinic: { type: String, index: true },
    specialty: String,
    status: { type: String, enum: ['active', 'unclear', 'retired'], default: 'active' },

    // Provenance, so every row can say where it came from.
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
