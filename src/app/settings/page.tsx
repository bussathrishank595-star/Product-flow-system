'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import toast from 'react-hot-toast';

interface Category { _id: string; name: string; colourHex: string; }
const COLORS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6'];

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState({ name: '', colourHex: COLORS[0] });
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
        else setCategories([]);
      })
      .catch(() => setCategories([]));
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setCategories(prev => [...prev, data]);
      setNewCat({ name: '', colourHex: COLORS[0] });
      toast.success('Category added!');
    } else toast.error(data.error || 'Failed');
  };

  const handleDeleteCat = async (id: string) => {
    const res = await fetch('/api/categories', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setCategories(prev => prev.filter(c => c._id !== id));
      toast.success('Category removed');
    } else toast.error('Failed to remove');
    setDeleteId(null);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your store configuration</p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Categories */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>🗂️ Product Categories</div>
          <div className="section-sub" style={{ marginBottom: 20 }}>
            Manage the categories used to group your products
          </div>

          {/* Existing categories */}
          {categories.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              {categories.map(cat => (
                <div key={cat._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 10,
                  border: '1px solid var(--border-light)', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: cat.colourHex, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(cat._id)}>🗑️ Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px 0', marginBottom: 16 }}>
              <p>No categories yet. Create one below.</p>
            </div>
          )}

          {/* Add new category */}
          <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 16, border: '1px solid var(--border-light)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>➕ Add New Category</div>
            <form onSubmit={handleAddCategory}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: 160 }}>
                  <label className="form-label">Category Name</label>
                  <input className="form-input" required placeholder="e.g. Dairy, Pulses, Snacks"
                    value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Colour</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button type="button" key={c}
                        style={{
                          width: 30, height: 30, borderRadius: 6, background: c, border: 'none', cursor: 'pointer',
                          outline: newCat.colourHex === c ? '3px solid white' : 'none',
                          transition: 'transform 0.1s',
                          transform: newCat.colourHex === c ? 'scale(1.15)' : 'scale(1)',
                        }}
                        onClick={() => setNewCat(p => ({ ...p, colourHex: c }))}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginBottom: 0 }}>
                  {loading ? '...' : '+ Add'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>⚡ Quick Links</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/inventory/new-product" className="btn btn-secondary">+ New Product</a>
            <a href="/inventory/add-stock" className="btn btn-secondary">📦 Add Stock</a>
            <a href="/sales/log" className="btn btn-secondary">🧾 Log Sale</a>
            <a href="/analytics" className="btn btn-secondary">📈 Analytics</a>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <div className="modal-title" style={{ textAlign: 'center' }}>Remove Category?</div>
            <div className="modal-sub" style={{ textAlign: 'center' }}>
              Products in this category will remain, but the category label will be unlinked.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger btn-full" onClick={() => handleDeleteCat(deleteId)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
