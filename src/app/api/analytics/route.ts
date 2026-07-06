import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { SalesTransaction, Product } from '@/lib/models';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '7'; // days
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(range));

  const matchStage = { isVoided: false, transactionDate: { $gte: daysAgo } };

  // KPI totals
  const [kpi] = await SalesTransaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$grandTotal' },
        totalCost: { $sum: '$totalCost' },
        grossProfit: { $sum: '$grossProfit' },
        totalTransactions: { $sum: 1 },
        totalUnitsSold: { $sum: { $sum: '$items.qtySold' } },
      },
    },
  ]);

  // Daily revenue (last N days)
  const dailyRevenue = await SalesTransaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
        revenue: { $sum: '$grandTotal' },
        profit: { $sum: '$grossProfit' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Top 5 products
  const top5 = await SalesTransaction.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        totalQtySold: { $sum: '$items.qtySold' },
        totalRevenue: { $sum: '$items.lineTotal' },
        unit: { $first: '$items.unit' },
      },
    },
    { $sort: { totalQtySold: -1 } },
    { $limit: 5 },
  ]);

  // Bottom 5 products (slow movers — sold least)
  const bottom5 = await SalesTransaction.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        totalQtySold: { $sum: '$items.qtySold' },
        totalRevenue: { $sum: '$items.lineTotal' },
        unit: { $first: '$items.unit' },
      },
    },
    { $sort: { totalQtySold: 1 } },
    { $limit: 5 },
  ]);

  // Category breakdown
  const categoryBreakdown = await SalesTransaction.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$category._id',
        categoryName: { $first: '$category.name' },
        colourHex: { $first: '$category.colourHex' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  // Low stock count
  const lowStockCount = await Product.countDocuments({
    isActive: true,
    $expr: { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$lowStockThreshold'] }] },
  });
  const outOfStockCount = await Product.countDocuments({ isActive: true, currentStock: 0 });

  return NextResponse.json({
    kpi: kpi || { totalRevenue: 0, totalCost: 0, grossProfit: 0, totalTransactions: 0, totalUnitsSold: 0 },
    dailyRevenue,
    top5,
    bottom5,
    categoryBreakdown,
    alerts: { lowStock: lowStockCount, outOfStock: outOfStockCount },
    range: parseInt(range),
  });
}
