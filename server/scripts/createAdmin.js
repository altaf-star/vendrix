import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

import User from '../models/User.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: 'admin@vendrix.store' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@vendrix.store',
    password: 'Admin@12345',
    role: 'admin',
    isActive: true,
  });

  console.log('✓ Admin created:', admin.email);
  console.log('  Email:    admin@vendrix.store');
  console.log('  Password: Admin@12345');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
