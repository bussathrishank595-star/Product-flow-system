import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Product, SalesTransaction, Category } from '@/lib/models';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');
  const skip = (page - 1) * limit;

  const transactions = await SalesTransaction.find({ isVoided: false })
    .sort({ transactionDate: -1 })
    .skip(skip)
    .limit(limit);

  const total = await SalesTransaction.countDocuments({ isVoided: false });

  return NextResponse.json({ transactions, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { items, notes } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items in transaction' }, { status: 400 });
  }

  // Find or create default "General" category if needed
  let generalCategory = await Category.findOne({ name: 'General' });
  if (!generalCategory) {
    generalCategory = await Category.create({ name: 'General', colourHex: '#6c63ff' });
  }

  // Validate or create products for all items first
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.productId) {
      const product = await Product.findById(item.productId);
      if (!product) return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 });
      if (product.currentStock < item.qtySold) {
        // Automatically align stock for billing if needed (Kirana shop style)
        product.currentStock = item.qtySold;
        await product.save();
      }
    } else if (item.customName) {
      // Find existing by name or create a new one
      let product = await Product.findOne({ name: new RegExp('^' + item.customName.trim() + '$', 'i'), isActive: true });
      if (!product) {
        product = await Product.create({
          name: item.customName.trim(),
          categoryId: generalCategory._id,
          unit: item.unit || 'pcs',
          sellingPrice: Number(item.priceSold || 0),
          avgCostPrice: 0,
          currentStock: Number(item.qtySold),
          lowStockThreshold: 5,
        });
      } else if (product.currentStock < item.qtySold) {
        product.currentStock = item.qtySold;
        await product.save();
      }
      // Assign the resolved product ID to the item
      item.productId = product._id.toString();
    } else {
      return NextResponse.json({ error: 'Item must have a productId or customName' }, { status: 400 });
    }
  }

  // Build transaction items with snapshots
  const transactionItems = [];
  let grandTotal = 0;
  let totalCost = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    const finalPrice = item.priceSold !== undefined && item.priceSold !== null ? Number(item.priceSold) : product.sellingPrice;
    const lineTotal = item.qtySold * finalPrice;
    const lineCost = item.qtySold * product.avgCostPrice;

    transactionItems.push({
      productId: product._id,
      productName: product.name,
      unit: product.unit,
      qtySold: item.qtySold,
      unitPriceSnapshot: finalPrice,
      unitCostSnapshot: product.avgCostPrice,
      lineTotal,
    });

    grandTotal += lineTotal;
    totalCost += lineCost;

    // Deduct stock atomically
    const newStock = product.currentStock - item.qtySold;
    const historyEvent = {
      eventType: 'sale' as const,
      changeQty: -item.qtySold,
      balanceAfter: newStock,
      note: 'Sale',
      timestamp: new Date(),
    };
    product.stockHistory.push(historyEvent);
    if (product.stockHistory.length > 50) product.stockHistory.splice(0, product.stockHistory.length - 50);
    product.currentStock = newStock;
    await product.save();
  }

  const transaction = await SalesTransaction.create({
    items: transactionItems,
    grandTotal,
    totalCost,
    grossProfit: grandTotal - totalCost,
    notes,
    transactionDate: new Date(),
  });

  return NextResponse.json(transaction);
}
