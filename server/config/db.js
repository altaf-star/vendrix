import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

// Cache connection across serverless function invocations
let cached = global._mongoConn;
if (!cached) cached = global._mongoConn = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((m) => m.connection);
  }

  try {
    cached.conn = await cached.promise;
    logger.info(`MongoDB connected: ${cached.conn.host}`);
  } catch (err) {
    cached.promise = null;
    logger.error(`MongoDB connection error: ${err.message}`);
    if (!process.env.VERCEL) process.exit(1);
  }

  return cached.conn;
};

export default connectDB;
