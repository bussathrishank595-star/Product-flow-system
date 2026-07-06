import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { SalesTransaction, Product } from '@/lib/models';

// PATCH /api/sales/[id] — void a sale
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { id } = await params;
  const { voidReason } = await req.json();

  if (!voidReason) return NextResponse.json({ error: 'Void reason required' }, { status: 400 });

  const txn = await SalesTransaction.findById(id);
  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  if (txn.isVoided) return NextResponse.json({ error: 'Already voided' }, { status: 409 });

  // Check within 24 hours
  const hoursDiff = (Date.now() - txn.transactionDate.getTime()) / 3600000;
  if (hoursDiff > 24) return NextResponse.json({ error: 'Can only void sales within 24 hours' }, { status: 400 });

  // Restore stock
  for (const item of txn.items) {
    const product = await Product.findById(item.productId);
    if (product) {
      const newStock = product.currentStock + item.qtySold;
      product.stockHistory.push({
        eventType: 'adjustment',
        changeQty: item.qtySold,
        balanceAfter: newStock,
        note: `Void sale: ${voidReason}`,
        timestamp: new Date(),
      });
      if (product.stockHistory.length > 50) product.stockHistory.splice(0, product.stockHistory.length - 50);
      product.currentStock = newStock;
      await product.save();
    }
  }

  txn.isVoided = true;
  txn.voidedAt = new Date();
  txn.voidReason = voidReason;
  await txn.save();

  return NextResponse.json({ success: true });
}
