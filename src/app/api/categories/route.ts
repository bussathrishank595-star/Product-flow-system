import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Category } from '@/lib/models';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const categories = await Category.find({}).sort({ name: 1 });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { name, colourHex } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  try {
    const cat = await Category.create({ name: name.trim(), colourHex: colourHex || '#6366f1' });
    return NextResponse.json(cat);
  } catch {
    return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await req.json();
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
