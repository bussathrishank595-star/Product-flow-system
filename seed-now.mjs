/**
 * Quick seed — creates the admin account with preset credentials.
 * Run once: node seed-now.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

import { readFileSync, existsSync } from 'fs';

// Load .env.local
const envPath = new URL('.env.local', import.meta.url).pathname;
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocks-flow-system';

const UserSchema = new mongoose.Schema({
  storeName: String, ownerName: String, phone: String, address: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  defaultLowStockThreshold: { type: Number, default: 5 },
  setupComplete: { type: Boolean, default: false },
}, { timestamps: true });

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  // Clear existing
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash('admin123', 12);
  await User.create({
    storeName: 'Meena General Store',
    ownerName: 'Meena Devi',
    email: 'admin@store.com',
    passwordHash,
    setupComplete: true,
  });

  console.log('✅ Admin seeded!');
  console.log('   Email   : admin@store.com');
  console.log('   Password: admin123');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
