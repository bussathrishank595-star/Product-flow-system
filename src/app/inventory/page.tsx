'use client';
import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  unit: string;
  currentStock: number;
  sellingPrice: number;
  avgCostPrice: number;
  lowStockThreshold: number;
  categoryId: { _id: string; name: string; colourHex: string };
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [quickSaleProduct, setQuickSaleProduct] = useState<Product | null>(null);
  const [saleQty, setSaleQty] = useState<string>('1');
  const [salePrice, setSalePrice] = useState<string>('0');
  const [saleLoading, setSaleLoading] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch('/api/products?' + params.toString());
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
      else setProducts([]);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (quickSaleProduct) {
      setSalePrice(String(quickSaleProduct.sellingPrice));
    }
  }, [quickSaleProduct]);

  const getStatus = (p: Product) => {
    if (p.currentStock === 0) return { label: 'Out of Stock', cls: 'badge-red', icon: '❌' };
    if (p.currentStock <= p.lowStockThreshold) return { label: 'Low Stock', cls: 'badge-amber', icon: '⚠️' };
    return { label: 'In Stock', cls: 'badge-green', icon: '✅' };
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Product removed');
      fetchProducts();
    } else toast.error('Failed to remove product');
    setDeleteId(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    const res = await fetch(`/api/products/${editProduct._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProduct),
    });
    if (res.ok) {
      toast.success('Product updated');
      fetchProducts();
      setEditProduct(null);
    } else toast.error('Update failed');
  };

  const handleQuickStockChange = async (product: Product, diff: number) => {
    const newStock = product.currentStock + diff;
    if (newStock < 0) return;
    
    // Call PUT endpoint with updated stock
    const res = await fetch(`/api/products/${product._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...product,
        currentStock: newStock
      }),
    });
    
    if (res.ok) {
      toast.success(`Stock adjusted to ${newStock} ${product.unit}`);
      fetchProducts();
    } else {
      toast.error('Failed to adjust stock');
    }
  };

  const profitMargin = (p: Product) => {
    if (!p.avgCostPrice) return null;
    return (((p.sellingPrice - p.avgCostPrice) / p.sellingPrice) * 100).toFixed(1);
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/inventory/add-stock" className="btn btn-primary">➕ Add Stock</Link>
          <Link href="/inventory/new-product" className="btn btn-secondary">+ New Product</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              className="form-input search-input"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs">
            {[
              { value: '', label: 'All' },
              { value: 'out', label: '❌ Out' },
              { value: 'low', label: '⚠️ Low' },
            ].map(f => (
              <button
                key={f.value}
                className={`tab-btn ${statusFilter === f.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <h3>No products found</h3>
            <p>Add your first product to start tracking inventory</p>
            <Link href="/inventory/new-product" className="btn btn-primary" style={{ marginTop: 16 }}>
              + Add First Product
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Selling Price</th>
                  <th>Cost Price</th>
                  <th>Margin</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const status = getStatus(p);
                  const margin = profitMargin(p);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 500,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.categoryId?.colourHex || '#666', flexShrink: 0 }} />
                          {p.categoryId?.name || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: p.currentStock === 0 ? 'var(--red)' : p.currentStock <= p.lowStockThreshold ? 'var(--amber)' : 'var(--text-primary)',
                        }}>
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td>₹{p.sellingPrice.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {p.avgCostPrice > 0 ? `₹${p.avgCostPrice.toFixed(2)}` : '—'}
                      </td>
                      <td>
                        {margin !== null ? (
                          <span style={{ color: Number(margin) > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                            {margin}%
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`badge ${status.cls}`}>{status.icon} {status.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => setQuickSaleProduct(p)}>🧾 Sell</button>
                          <button className="btn btn-sm btn-secondary" style={{ padding: '0 8px', minWidth: 28 }} onClick={() => handleQuickStockChange(p, 1)}>➕</button>
                          <button className="btn btn-sm btn-secondary" style={{ padding: '0 8px', minWidth: 28 }} onClick={() => handleQuickStockChange(p, -1)} disabled={p.currentStock <= 0}>➖</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditProduct(p)}>✏️ Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(p._id)}>🗑️ Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editProduct && (
        <div className="modal-overlay" onClick={() => setEditProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">✏️ Edit Product</div>
            <div className="modal-sub">Update product details</div>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input className="form-input" required value={editProduct.name}
                  onChange={e => setEditProduct(p => p ? { ...p, name: e.target.value } : null)} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-input" 
                  required 
                  value={typeof editProduct.categoryId === 'object' && editProduct.categoryId !== null ? editProduct.categoryId._id : String(editProduct.categoryId || '')}
                  onChange={e => setEditProduct(p => p ? { ...p, categoryId: { ...p.categoryId, _id: e.target.value } } : null)}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input className="form-input" type="number" step="0.001" required value={editProduct.currentStock}
                    onChange={e => setEditProduct(p => p ? { ...p, currentStock: Number(e.target.value) } : null)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Selling Price (₹)</label>
                  <input className="form-input" type="number" step="0.01" required value={editProduct.sellingPrice}
                    onChange={e => setEditProduct(p => p ? { ...p, sellingPrice: Number(e.target.value) } : null)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Price (₹)</label>
                  <input className="form-input" type="number" step="0.01" required value={editProduct.avgCostPrice}
                    onChange={e => setEditProduct(p => p ? { ...p, avgCostPrice: Number(e.target.value) } : null)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Low Stock Alert</label>
                  <input className="form-input" type="number" value={editProduct.lowStockThreshold}
                    onChange={e => setEditProduct(p => p ? { ...p, lowStockThreshold: Number(e.target.value) } : null)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Profit Margin</label>
                  <div style={{
                    height: 44, display: 'flex', alignItems: 'center',
                    fontWeight: 800, fontSize: 18,
                    color: (editProduct.sellingPrice - editProduct.avgCostPrice) > 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {editProduct.sellingPrice > 0 
                      ? (((editProduct.sellingPrice - editProduct.avgCostPrice) / editProduct.sellingPrice) * 100).toFixed(1) + '%' 
                      : '0%'
                    }
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setEditProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <div className="modal-title" style={{ textAlign: 'center' }}>Remove Product?</div>
            <div className="modal-sub" style={{ textAlign: 'center' }}>
              This product will be removed from your inventory. Sales history will be preserved.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger btn-full" onClick={() => handleDelete(deleteId)}>Remove</button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Sale Modal */}
      {quickSaleProduct && (
        <div className="modal-overlay" onClick={() => { setQuickSaleProduct(null); setSaleQty('1'); setSalePrice('0'); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🧾</div>
            <div className="modal-title" style={{ textAlign: 'center' }}>Log Sale: {quickSaleProduct.name}</div>
            <div className="modal-sub" style={{ textAlign: 'center' }}>
              Available Stock: {quickSaleProduct.currentStock} {quickSaleProduct.unit}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Qty ({quickSaleProduct.unit}) *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '0 10px', height: 44, minHeight: 44, border: 'none', borderRadius: 0 }}
                    onClick={() => setSaleQty(q => String(Math.max(0.001, Number(q) - 1)))}
                    disabled={Number(saleQty) <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={quickSaleProduct.currentStock}
                    className="form-input"
                    style={{ width: '100%', textAlign: 'center', padding: '0 8px', height: 44, minHeight: 44, border: 'none', borderRadius: 0, background: 'none' }}
                    value={saleQty}
                    onChange={e => setSaleQty(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '0 10px', height: 44, minHeight: 44, border: 'none', borderRadius: 0 }}
                    onClick={() => setSaleQty(q => String(Math.min(quickSaleProduct.currentStock, Number(q) + 1)))}
                    disabled={Number(saleQty) >= quickSaleProduct.currentStock}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ height: 44, minHeight: 44, fontWeight: 600 }}
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                />
              </div>
            </div>

            {Number(saleQty) > quickSaleProduct.currentStock && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: -12, marginBottom: 12 }}>
                ❌ Exceeds available stock
              </div>
            )}

            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: '12px', border: '1px solid var(--border-light)', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span>Total Bill:</span>
                <strong style={{ color: 'var(--accent)' }}>₹{(Number(saleQty) * Number(salePrice) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Est. Profit:</span>
                <strong style={{ color: 'var(--green)' }}>₹{(Number(saleQty) * (Number(salePrice) - quickSaleProduct.avgCostPrice) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={() => { setQuickSaleProduct(null); setSaleQty('1'); setSalePrice('0'); }}>Cancel</button>
              <button 
                className="btn btn-primary btn-full" 
                onClick={async () => {
                  const qty = Number(saleQty);
                  const price = Number(salePrice);
                  if (isNaN(qty) || qty <= 0 || qty > quickSaleProduct.currentStock) {
                    toast.error('Invalid quantity');
                    return;
                  }
                  if (isNaN(price) || price < 0) {
                    toast.error('Invalid price');
                    return;
                  }
                  setSaleLoading(true);
                  const res = await fetch('/api/sales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      items: [{ productId: quickSaleProduct._id, qtySold: qty, priceSold: price }]
                    })
                  });
                  setSaleLoading(false);
                  if (res.ok) {
                    toast.success('Sale logged successfully!');
                    setQuickSaleProduct(null);
                    setSaleQty('1');
                    setSalePrice('0');
                    fetchProducts();
                  } else {
                    const err = await res.json();
                    toast.error(err.error || 'Sale failed');
                  }
                }}
                disabled={saleLoading || Number(saleQty) > quickSaleProduct.currentStock || Number(saleQty) <= 0 || Number(salePrice) < 0}
              >
                {saleLoading ? '⏳ Saving...' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
