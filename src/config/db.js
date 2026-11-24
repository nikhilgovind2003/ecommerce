// Connects to MongoDB. The app stops if the connection string is missing or wrong.
import mongoose from 'mongoose';

export default async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Add your MongoDB URL to the .env file.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};
