'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Category { _id: string; name: string; colourHex: string; }
interface Product { _id: string; name: string; unit: string; sellingPrice: number; avgCostPrice: number; }

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'pack'];

export default function AddStockPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({
    quantityReceived: '',
    costPricePerUnit: '',
    sellingPricePerUnit: '',
    supplierName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    notes: '',
  });

  const [newProduct, setNewProduct] = useState({
    name: '', categoryId: '', unit: 'pcs', sellingPrice: '', avgCostPrice: '',
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProductObj = products.find(p => p._id === selectedProduct);

  const sellBelowCost =
    form.costPricePerUnit && form.sellingPricePerUnit &&
    Number(form.sellingPricePerUnit) < Number(form.costPricePerUnit);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    });
    const data = await res.json();
    if (res.ok) {
      setProducts(prev => [...prev, data]);
      setSelectedProduct(data._id);
      setProductSearch(data.name);
      setForm(f => ({ ...f, sellingPricePerUnit: String(data.sellingPrice || '') }));
      setShowNewProduct(false);
      toast.success(`"${data.name}" created!`);
    } else {
      toast.error(data.error || 'Failed to create product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { toast.error('Please select a product'); return; }
    setLoading(true);

    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: selectedProduct, ...form }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      toast.success(`✅ Stock added! ${selectedProductObj?.name} now has ${data.product.currentStock} ${data.product.unit}`);
      router.push('/inventory');
    } else {
      toast.error(data.error || 'Failed to add stock');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Stock</h1>
          <p className="page-subtitle">Log incoming goods from a supplier</p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* Product Selection */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📦 Product Details</div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Product Name *</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="Search existing product..."
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); setSelectedProduct(''); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  {showDropdown && productSearch && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                      maxHeight: 200, overflowY: 'auto', marginTop: 4,
                    }}>
                      {filteredProducts.length > 0 ? filteredProducts.map(p => (
                        <div key={p._id}
                          style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid var(--border-light)' }}
                          onMouseDown={() => {
                            setSelectedProduct(p._id);
                            setProductSearch(p.name);
                            setForm(f => ({ ...f, sellingPricePerUnit: String(p.sellingPrice) }));
                            setShowDropdown(false);
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>₹{p.sellingPrice} / {p.unit}</div>
                        </div>
                      )) : (
                        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                          No match — create a new product below
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewProduct(!showNewProduct)}>
                  + New
                </button>
              </div>
              {selectedProduct && (
                <div className="alert-banner alert-green" style={{ marginTop: 8, marginBottom: 0, padding: '8px 12px' }}>
                  ✅ Selected: <strong>{selectedProductObj?.name}</strong>
                </div>
              )}
            </div>

            {/* Inline new product form */}
            {showNewProduct && (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 16, border: '1px solid var(--border-light)', marginTop: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>✨ Create New Product</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input className="form-input" required placeholder="e.g. Toor Dal"
                      value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-input" required value={newProduct.categoryId}
                      onChange={e => setNewProduct(p => ({ ...p, categoryId: e.target.value }))}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <select className="form-input" value={newProduct.unit}
                      onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹)</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00"
                      value={newProduct.sellingPrice} onChange={e => setNewProduct(p => ({ ...p, sellingPrice: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost Price (₹)</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00"
                      value={newProduct.avgCostPrice} onChange={e => setNewProduct(p => ({ ...p, avgCostPrice: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNewProduct(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleCreateProduct}>Create Product</button>
                </div>
              </div>
            )}
          </div>

          {/* Stock Details */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📋 Stock Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Quantity Received *</label>
                <input className="form-input" type="number" step="0.001" required placeholder="e.g. 50"
                  value={form.quantityReceived} onChange={e => setForm(f => ({ ...f, quantityReceived: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price / Unit (₹) *</label>
                <input className="form-input" type="number" step="0.01" required placeholder="e.g. 108.00"
                  value={form.costPricePerUnit} onChange={e => setForm(f => ({ ...f, costPricePerUnit: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price / Unit (₹) *</label>
                <input className="form-input" type="number" step="0.01" required placeholder="e.g. 130.00"
                  value={form.sellingPricePerUnit} onChange={e => setForm(f => ({ ...f, sellingPricePerUnit: e.target.value }))} />
                {sellBelowCost && (
                  <div className="form-warn">⚠️ Selling price is below cost — you may be selling at a loss</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Supplier Name</label>
                <input className="form-input" placeholder="e.g. Ravi Traders (optional)"
                  value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date *</label>
                <input className="form-input" type="date" required
                  value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input className="form-input" type="date"
                  value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Remarks</label>
              <textarea className="form-input" rows={2} placeholder="Optional notes..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Total preview */}
            {form.quantityReceived && form.costPricePerUnit && (
              <div style={{
                background: 'var(--bg-primary)', borderRadius: 10, padding: '12px 16px',
                border: '1px solid var(--border-light)', display: 'flex', gap: 24, flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>TOTAL COST</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                    ₹{(Number(form.quantityReceived) * Number(form.costPricePerUnit)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                {form.sellingPricePerUnit && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>POTENTIAL REVENUE</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>
                      ₹{(Number(form.quantityReceived) * Number(form.sellingPricePerUnit)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !selectedProduct}>
              {loading ? '⏳ Saving...' : '✅ Confirm Stock Inward'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
