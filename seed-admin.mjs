/**
 * seed-admin.mjs
 * ─────────────────────────────────────────────────────────────
 * Run this ONCE from the terminal to create your admin account.
 *
 * Usage:
 *   node seed-admin.mjs
 *
 * Prerequisites:
 *   • MONGODB_URI must be set in .env.local
 *   • Run from the project root directory
 * ─────────────────────────────────────────────────────────────
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const require = createRequire(import.meta.url);

// ── Load .env.local manually ───────────────────────────────────
function loadEnv() {
  const envPath = new URL('.env.local', import.meta.url).pathname;
  if (!existsSync(envPath)) {
    console.error('❌  .env.local not found. Create it first.');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

// ── Prompt helper ──────────────────────────────────────────────
function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    if (hidden && process.stdout.isTTY) {
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      let input = '';
      process.stdin.on('data', (char) => {
        const c = char.toString();
        if (c === '\r' || c === '\n') {
          process.stdin.setRawMode(false);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          process.exit();
        } else if (c === '\u007f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI || MONGODB_URI.includes('xxxxx')) {
    console.error('\n❌  MONGODB_URI in .env.local is still the placeholder.');
    console.error('   Update it with your real MongoDB Atlas connection string first.\n');
    process.exit(1);
  }

  console.log('\n📦  Stocks Flow System — Admin Setup\n');
  console.log('─'.repeat(45));

  // Connect
  process.stdout.write('🔗  Connecting to MongoDB Atlas... ');
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log('✓ Connected\n');

  // Check if admin already exists
  const UserSchema = new mongoose.Schema({
    storeName: String, ownerName: String, phone: String, address: String,
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    defaultLowStockThreshold: { type: Number, default: 5 },
    setupComplete: { type: Boolean, default: false },
  }, { timestamps: true });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const existing = await User.findOne({});

  if (existing) {
    console.log(`⚠️   An admin account already exists for: ${existing.email}`);
    const overwrite = await prompt('   Overwrite it? (yes/no): ');
    if (overwrite.trim().toLowerCase() !== 'yes') {
      console.log('\n✅  No changes made. Exiting.\n');
      await mongoose.disconnect();
      process.exit(0);
    }
    await User.deleteMany({});
    console.log('   Existing account removed.\n');
  }

  // Collect details
  console.log('📝  Enter your admin account details:\n');
  const storeName = await prompt('   Store Name:   ');
  const ownerName = await prompt('   Your Name:    ');
  const email     = await prompt('   Email:        ');
  const password  = await prompt('   Password:     ', true);
  const confirm   = await prompt('   Confirm Pass: ', true);

  // Validate
  if (!storeName.trim() || !ownerName.trim() || !email.trim()) {
    console.error('\n❌  All fields are required.\n');
    await mongoose.disconnect();
    process.exit(1);
  }
  if (!email.includes('@')) {
    console.error('\n❌  Invalid email address.\n');
    await mongoose.disconnect();
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('\n❌  Password must be at least 6 characters.\n');
    await mongoose.disconnect();
    process.exit(1);
  }
  if (password !== confirm) {
    console.error('\n❌  Passwords do not match.\n');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Create admin
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    storeName: storeName.trim(),
    ownerName: ownerName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    setupComplete: false,
  });

  console.log('\n─'.repeat(45));
  console.log('✅  Admin account created successfully!\n');
  console.log(`   Store : ${storeName.trim()}`);
  console.log(`   Email : ${email.trim().toLowerCase()}`);
  console.log('\n🚀  Start the app:  npm run dev');
  console.log('   Then visit:     http://localhost:3000\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message, '\n');
  process.exit(1);
});
