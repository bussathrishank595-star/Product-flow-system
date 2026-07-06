import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── User ────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  storeName: string;
  ownerName: string;
  phone?: string;
  address?: string;
  email: string;
  passwordHash: string;
  defaultLowStockThreshold: number;
  setupComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    storeName: { type: String, required: true, default: '' },
    ownerName: { type: String, required: true, default: '' },
    phone: { type: String },
    address: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    defaultLowStockThreshold: { type: Number, default: 5 },
    setupComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Category ────────────────────────────────────────────────────────────────
export interface ICategory extends Document {
  name: string;
  colourHex: string;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    colourHex: { type: String, default: '#6366f1' },
  },
  { timestamps: true }
);

// ─── Product ─────────────────────────────────────────────────────────────────
export interface IStockEvent {
  eventType: 'inward' | 'sale' | 'adjustment';
  changeQty: number;
  balanceAfter: number;
  note?: string;
  timestamp: Date;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  categoryId: mongoose.Types.ObjectId;
  unit: 'kg' | 'g' | 'litre' | 'ml' | 'pcs' | 'pack';
  currentStock: number;
  avgCostPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  isActive: boolean;
  stockHistory: IStockEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const StockEventSchema = new Schema<IStockEvent>(
  {
    eventType: { type: String, enum: ['inward', 'sale', 'adjustment'], required: true },
    changeQty: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    unit: { type: String, enum: ['kg', 'g', 'litre', 'ml', 'pcs', 'pack'], required: true },
    currentStock: { type: Number, required: true, default: 0, min: 0 },
    avgCostPrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true },
    lowStockThreshold: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
    stockHistory: { type: [StockEventSchema], default: [] },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text' });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ currentStock: 1 });
ProductSchema.index({ isActive: 1 });

// ─── InventoryBatch ──────────────────────────────────────────────────────────
export interface IInventoryBatch extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantityReceived: number;
  unit: string;
  costPricePerUnit: number;
  sellingPricePerUnit: number;
  totalCost: number;
  supplierName?: string;
  purchaseDate: Date;
  expiryDate?: Date;
  notes?: string;
  createdAt: Date;
}

const InventoryBatchSchema = new Schema<IInventoryBatch>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantityReceived: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true },
    costPricePerUnit: { type: Number, required: true },
    sellingPricePerUnit: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    supplierName: { type: String },
    purchaseDate: { type: Date, required: true },
    expiryDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

InventoryBatchSchema.index({ productId: 1 });
InventoryBatchSchema.index({ purchaseDate: -1 });

// ─── SalesTransaction ────────────────────────────────────────────────────────
export interface ISalesItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  unit: string;
  qtySold: number;
  unitPriceSnapshot: number;
  unitCostSnapshot: number;
  lineTotal: number;
}

export interface ISalesTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  transactionDate: Date;
  items: ISalesItem[];
  grandTotal: number;
  totalCost: number;
  grossProfit: number;
  notes?: string;
  isVoided: boolean;
  voidedAt?: Date;
  voidReason?: string;
  createdAt: Date;
}

const SalesItemSchema = new Schema<ISalesItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    unit: { type: String, required: true },
    qtySold: { type: Number, required: true, min: 0.001 },
    unitPriceSnapshot: { type: Number, required: true },
    unitCostSnapshot: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const SalesTransactionSchema = new Schema<ISalesTransaction>(
  {
    transactionDate: { type: Date, default: Date.now },
    items: { type: [SalesItemSchema], required: true },
    grandTotal: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    grossProfit: { type: Number, required: true },
    notes: { type: String },
    isVoided: { type: Boolean, default: false },
    voidedAt: { type: Date },
    voidReason: { type: String },
  },
  { timestamps: true }
);

SalesTransactionSchema.index({ transactionDate: -1 });
SalesTransactionSchema.index({ 'items.productId': 1 });
SalesTransactionSchema.index({ isVoided: 1 });

// ─── Model Exports ────────────────────────────────────────────────────────────
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export const InventoryBatch: Model<IInventoryBatch> =
  mongoose.models.InventoryBatch ||
  mongoose.model<IInventoryBatch>('InventoryBatch', InventoryBatchSchema);

export const SalesTransaction: Model<ISalesTransaction> =
  mongoose.models.SalesTransaction ||
  mongoose.model<ISalesTransaction>('SalesTransaction', SalesTransactionSchema);
