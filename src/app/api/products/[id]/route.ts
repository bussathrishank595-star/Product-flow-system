import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Product } from '@/lib/models';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const product = await Product.findById(id).populate('categoryId', 'name colourHex');
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { name, categoryId, unit, sellingPrice, avgCostPrice, currentStock, lowStockThreshold } = body;

  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Update fields
  if (name !== undefined) product.name = name;
  if (categoryId !== undefined) {
    product.categoryId = typeof categoryId === 'object' && categoryId !== null && '_id' in categoryId
      ? categoryId._id
      : categoryId;
  }
  if (unit !== undefined) product.unit = unit;
  if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
  if (avgCostPrice !== undefined) product.avgCostPrice = Number(avgCostPrice);
  if (lowStockThreshold !== undefined) product.lowStockThreshold = Number(lowStockThreshold);

  // If currentStock is manually adjusted, track history event
  if (currentStock !== undefined && Number(currentStock) !== product.currentStock) {
    const oldStock = product.currentStock;
    const diff = Number(currentStock) - oldStock;
    product.currentStock = Number(currentStock);
    product.stockHistory.push({
      eventType: 'adjustment',
      changeQty: diff,
      balanceAfter: product.currentStock,
      note: 'Manual inventory adjustment',
      timestamp: new Date()
    });
    if (product.stockHistory.length > 50) product.stockHistory.splice(0, product.stockHistory.length - 50);
  }

  await product.save();
  await product.populate('categoryId', 'name colourHex');

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  await Product.findByIdAndUpdate(id, { isActive: false });
  return NextResponse.json({ success: true });
}
