import mongoose from 'mongoose';

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    return true;
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    console.error('Saved ratings will not work until Mongo is running.');
    return false;
  }
}
