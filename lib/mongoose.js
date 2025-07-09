// lib/mongoose.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
console.log('MONGODB_URI:', MONGODB_URI); // Log the MongoDB URI for debugging


if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let isConnected = false; // Track the connection status

export const connectDB = async () => {
  if (isConnected) {
    // Already connected
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {});
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.log('MongoDB connection error:', error);
    throw error;
  }
};
