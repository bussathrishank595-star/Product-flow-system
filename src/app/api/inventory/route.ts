import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Product, InventoryBatch } from '@/lib/models';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId') || '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (productId) query.productId = productId;

  const batches = await InventoryBatch.find(query)
    .sort({ purchaseDate: -1 })
    .populate('productId', 'name unit');
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const {
    productId, quantityReceived, costPricePerUnit,
    sellingPricePerUnit, supplierName, purchaseDate, expiryDate, notes
  } = body;

  if (!productId || !quantityReceived || !costPricePerUnit || !sellingPricePerUnit) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
  }

  const product = await Product.findById(productId);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const qty = Number(quantityReceived);
  const cost = Number(costPricePerUnit);
  const sellPrice = Number(sellingPricePerUnit);
  const totalCost = qty * cost;

  // Weighted average cost price calculation
  const newAvgCost =
    product.currentStock > 0
      ? (product.currentStock * product.avgCostPrice + qty * cost) / (product.currentStock + qty)
      : cost;

  const newStock = product.currentStock + qty;

  // Update product
  product.currentStock = newStock;
  product.avgCostPrice = newAvgCost;
  product.sellingPrice = sellPrice;

  // Append to stock history (keep last 50)
  const historyEvent = {
    eventType: 'inward' as const,
    changeQty: qty,
    balanceAfter: newStock,
    note: supplierName ? `Inward from ${supplierName}` : 'Stock inward',
    timestamp: new Date(),
  };
  product.stockHistory.push(historyEvent);
  if (product.stockHistory.length > 50) product.stockHistory.splice(0, product.stockHistory.length - 50);

  await product.save();

  // Create batch record
  const batch = await InventoryBatch.create({
    productId,
    productName: product.name,
    quantityReceived: qty,
    unit: product.unit,
    costPricePerUnit: cost,
    sellingPricePerUnit: sellPrice,
    totalCost,
    supplierName,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    notes,
  });

  return NextResponse.json({ batch, product });
}
