import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// One saved place. 
// The name and subtitle are copied in rather than looked up
// later: businesses come from OpenStreetMap
// OpenStreetMap is rate limited, so a favorites list that re-fetched every entry would be slow and could fail.
const favoriteSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['business', 'surgeon', 'center'], required: true },
    // osmId for a business, slug for a surgeon or center.
    refId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    subtitle: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be 30 characters or fewer'],
      match: [/^[A-Za-z0-9_-]+$/, 'Username can only use letters, numbers, _ and -'],
    },
    // Lets "Eve" and "eve" collide on signup while the display name keeps the
    // capitalisation the person actually typed.
    usernameLower: { type: String, required: true, unique: true, index: true },
    // Optional: First name last name
    firstName: { type: String, trim: true, maxlength: [60, 'First name is too long'], default: '' },
    lastName: { type: String, trim: true, maxlength: [60, 'Last name is too long'], default: '' },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'That does not look like an email address'],
    },
    // select: false keeps the hash out of every ordinary query
    passwordHash: { type: String, required: true, select: false },
    favorites: { type: [favoriteSchema], default: [] },
  },
  { timestamps: true }
);

userSchema.pre('validate', function (next) {
  if (this.username) this.usernameLower = this.username.toLowerCase();
  next();
});

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

// Nothing sensitive should ever reach the client, even by accident.
userSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.usernameLower;
    delete ret.__v;
    delete ret.id;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
