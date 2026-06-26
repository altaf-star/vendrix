import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ handles these defaults internally
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Graceful shutdown on app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed via SIGINT');
      process.exit(0);
    });
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    if (!process.env.VERCEL) process.exit(1);
  }
};

export default connectDB;
