'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Category { _id: string; name: string; colourHex: string; }
const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'pack'];
const COLORS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6'];

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', colourHex: COLORS[0] });

  const [form, setForm] = useState({
    name: '', categoryId: '', unit: 'pcs', sellingPrice: '', avgCostPrice: '', lowStockThreshold: '5',
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }, []);

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat),
    });
    const data = await res.json();
    if (res.ok) {
      setCategories(prev => [...prev, data]);
      setForm(f => ({ ...f, categoryId: data._id }));
      setShowNewCat(false);
      toast.success('Category created!');
    } else toast.error(data.error || 'Failed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      toast.success(`"${data.name}" added to inventory!`);
      router.push('/inventory');
    } else toast.error(data.error || 'Failed to create product');
  };

  const margin = form.sellingPrice && form.avgCostPrice
    ? (((Number(form.sellingPrice) - Number(form.avgCostPrice)) / Number(form.sellingPrice)) * 100).toFixed(1)
    : null;

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">New Product</h1>
          <p className="page-subtitle">Add a product to your inventory catalogue</p>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-input" required placeholder="e.g. Toor Dal (1 kg)"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <select className="form-input" required value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewCat(!showNewCat)}>
                  + New
                </button>
              </div>
              {showNewCat && (
                <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14, border: '1px solid var(--border-light)', marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Category Name</label>
                      <input className="form-input" required placeholder="e.g. Dairy"
                        value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Colour</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {COLORS.map(c => (
                          <button type="button" key={c}
                            style={{
                              width: 28, height: 28, borderRadius: 6, background: c, border: 'none', cursor: 'pointer',
                              outline: newCat.colourHex === c ? '3px solid white' : 'none',
                            }}
                            onClick={() => setNewCat(p => ({ ...p, colourHex: c }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewCat(false)}>Cancel</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateCat}>Create</button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Unit of Measure *</label>
              <select className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input className="form-input" type="number" step="0.01" required placeholder="0.00"
                  value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price (₹)</label>
                <input className="form-input" type="number" step="0.01" placeholder="0.00"
                  value={form.avgCostPrice} onChange={e => setForm(f => ({ ...f, avgCostPrice: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Alert (units)</label>
                <input className="form-input" type="number" value={form.lowStockThreshold}
                  onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
                <div className="form-hint">Alert when stock falls below this number</div>
              </div>
              {margin !== null && (
                <div className="form-group">
                  <label className="form-label">Profit Margin</label>
                  <div style={{
                    height: 44, display: 'flex', alignItems: 'center',
                    fontWeight: 800, fontSize: 20,
                    color: Number(margin) > 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {margin}%
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? '⏳ Creating...' : '✅ Add Product'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
