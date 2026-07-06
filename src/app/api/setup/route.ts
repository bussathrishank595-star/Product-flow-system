// /api/setup is intentionally disabled.
// Admin accounts are created via the seed script: node seed-admin.mjs
// This route is kept as a placeholder to avoid 404s from old references.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Use seed-admin.mjs to create the admin account.' }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: 'Account creation is not allowed via the API.' }, { status: 403 });
}
