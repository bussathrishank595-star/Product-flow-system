import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Product, Category } from '@/lib/models';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { isActive: true };
  if (search) query.$text = { $search: search };
  if (category) query.categoryId = category;
  if (status === 'low') query.$expr = { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$lowStockThreshold'] }] };
  if (status === 'out') query.currentStock = 0;

  const products = await Product.find(query).populate('categoryId', 'name colourHex').sort({ name: 1 });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { name, categoryId, unit, sellingPrice, avgCostPrice, lowStockThreshold } = body;

  if (!name || !categoryId || !unit || sellingPrice === undefined) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
  }

  const cat = await Category.findById(categoryId);
  if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  const product = await Product.create({
    name: name.trim(),
    categoryId,
    unit,
    sellingPrice: Number(sellingPrice),
    avgCostPrice: Number(avgCostPrice || 0),
    lowStockThreshold: Number(lowStockThreshold || 5),
    currentStock: 0,
  });

  await product.populate('categoryId', 'name colourHex');
  return NextResponse.json(product);
}
