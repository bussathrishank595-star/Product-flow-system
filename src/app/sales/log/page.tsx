'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  unit: string;
  currentStock: number;
  sellingPrice: number;
  avgCostPrice: number;
  categoryId: { name: string; colourHex: string };
}

interface CartItem {
  product: Product;
  qtySold: number;
  priceSold: number;
}

interface BillItem {
  id: string;
  productId?: string;
  name: string;
  priceSold: string;
  qtySold: string;
  unit: string;
  avgCostPrice: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function LogSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([
    { id: '1', name: '', priceSold: '', qtySold: '1', unit: 'pcs', avgCostPrice: 0 }
  ]);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [showRowDropdown, setShowRowDropdown] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  
  // Quick Add Product state (unused now, but we keep the categories loading for custom dropdown options)
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductLoading, setNewProductLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    categoryId: '',
    unit: 'pcs',
    sellingPrice: '',
    avgCostPrice: '',
    initialStock: '10',
  });

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
        else setProducts([]);
      })
      .catch(() => setProducts([]));

    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const handleAddRow = () => {
    setBillItems(prev => [
      ...prev,
      { id: generateId(), name: '', priceSold: '', qtySold: '1', unit: 'pcs', avgCostPrice: 0 }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setBillItems(prev => {
      const filtered = prev.filter(row => row.id !== id);
      return filtered.length === 0 ? [{ id: generateId(), name: '', priceSold: '', qtySold: '1', unit: 'pcs', avgCostPrice: 0 }] : filtered;
    });
  };

  const handleUpdateRow = (id: string, field: keyof BillItem, value: any) => {
    setBillItems(prev => prev.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'name') {
          updated.productId = undefined; // clear catalog link if edited manually
        }
        return updated;
      }
      return row;
    }));
  };

  const handleSelectProduct = (rowId: string, p: Product) => {
    setBillItems(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          productId: p._id,
          name: p.name,
          priceSold: String(p.sellingPrice),
          unit: p.unit,
          avgCostPrice: p.avgCostPrice,
        };
      }
      return row;
    }));
    setShowRowDropdown(false);
    setFocusedRowId(null);
  };

  const grandTotal = billItems.reduce((sum, item) => sum + (Number(item.priceSold || 0) * Number(item.qtySold || 0)), 0);
  const totalProfit = billItems.reduce((sum, item) => sum + ((Number(item.priceSold || 0) - item.avgCostPrice) * Number(item.qtySold || 0)), 0);

  const handleSubmit = async () => {
    const validItems = billItems.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Add at least one product name');
      return;
    }
    
    // Check for negative prices or invalid quantities
    for (const item of validItems) {
      const q = Number(item.qtySold);
      const p = Number(item.priceSold);
      if (isNaN(q) || q <= 0) {
        toast.error(`Invalid quantity for "${item.name}"`);
        return;
      }
      if (isNaN(p) || p < 0) {
        toast.error(`Invalid price for "${item.name}"`);
        return;
      }
    }

    setLoading(true);

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: validItems.map(item => {
          if (item.productId) {
            return { productId: item.productId, qtySold: Number(item.qtySold), priceSold: Number(item.priceSold) };
          } else {
            return { customName: item.name, qtySold: Number(item.qtySold), priceSold: Number(item.priceSold), unit: item.unit };
          }
        }),
        notes,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setConfirmed(true);
    } else {
      toast.error(data.error || 'Sale failed');
    }
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.categoryId || !newProduct.sellingPrice) {
      toast.error('Name, Category and Selling Price are required');
      return;
    }
    setNewProductLoading(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          categoryId: newProduct.categoryId,
          unit: newProduct.unit,
          sellingPrice: newProduct.sellingPrice,
          avgCostPrice: newProduct.avgCostPrice || 0,
        })
      });
      const createdProd = await res.json();
      if (!res.ok) {
        toast.error(createdProd.error || 'Failed to create product');
        setNewProductLoading(false);
        return;
      }

      let finalProduct = createdProd;

      const initialStockQty = Number(newProduct.initialStock);
      if (initialStockQty > 0) {
        const stockRes = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: createdProd._id,
            quantityReceived: initialStockQty,
            costPricePerUnit: newProduct.avgCostPrice || 0,
            sellingPricePerUnit: newProduct.sellingPrice,
            purchaseDate: new Date().toISOString().split('T')[0],
            notes: 'Initial stock inward during billing'
          })
        });
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          if (stockData.product) {
            finalProduct = stockData.product;
          }
        }
      }

      const r = await fetch('/api/products');
      const latestProducts = await r.json();
      if (Array.isArray(latestProducts)) setProducts(latestProducts);

      // Append new product to billItems (replace focused empty row or add new)
      setBillItems(prev => {
        const targetRow = prev.find(row => row.id === focusedRowId || (!row.name && !row.priceSold));
        if (targetRow) {
          return prev.map(row => row.id === targetRow.id ? {
            ...row,
            productId: finalProduct._id,
            name: finalProduct.name,
            priceSold: String(finalProduct.sellingPrice),
            unit: finalProduct.unit,
            avgCostPrice: finalProduct.avgCostPrice,
          } : row);
        } else {
          return [...prev, {
            id: generateId(),
            productId: finalProduct._id,
            name: finalProduct.name,
            priceSold: String(finalProduct.sellingPrice),
            qtySold: '1',
            unit: finalProduct.unit,
            avgCostPrice: finalProduct.avgCostPrice,
          }];
        }
      });
      
      setShowNewProductModal(false);
      setNewProduct({
        name: '',
        categoryId: '',
        unit: 'pcs',
        sellingPrice: '',
        avgCostPrice: '',
        initialStock: '10',
      });
      toast.success(`"${finalProduct.name}" created and loaded to bill!`);
    } catch {
      toast.error('An error occurred while creating product');
    }
    setNewProductLoading(false);
  };

  if (confirmed) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Sale Recorded!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
            Total: <strong style={{ color: 'var(--text-primary)' }}>₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
          </p>
          <p style={{ color: 'var(--green)', fontSize: 13, marginBottom: 28 }}>
            Est. Profit: ₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => { setBillItems([{ id: '1', name: '', priceSold: '', qtySold: '1', unit: 'pcs', avgCostPrice: 0 }]); setNotes(''); setConfirmed(false); }}>
              🧾 Log Another Sale
            </button>
            <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
              📊 Dashboard
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Log a Sale</h1>
          <p className="page-subtitle">Build the bill and add products on the fly</p>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>🧾 Bill Items</div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setFocusedRowId(null);
                setShowNewProductModal(true);
              }}
            >
              ✨ Create Product Database Entry
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>PRODUCT NAME</th>
                  <th style={{ padding: '8px 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', width: 100 }}>PRICE (₹)</th>
                  <th style={{ padding: '8px 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', width: 80 }}>QTY</th>
                  <th style={{ padding: '8px 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', width: 90 }}>UNIT</th>
                  <th style={{ padding: '8px 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', width: 100, textAlign: 'right' }}>SUBTOTAL</th>
                  <th style={{ padding: '8px 4px', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {billItems.map((item, idx) => {
                  const subtotal = Number(item.priceSold || 0) * Number(item.qtySold || 0);
                  const filteredSuggestions = products.filter(p =>
                    p.name.toLowerCase().includes(item.name.toLowerCase())
                  );

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px 4px', position: 'relative' }}>
                        <input
                          className="form-input"
                          placeholder="Type product name..."
                          style={{ fontWeight: 500 }}
                          value={item.name}
                          onChange={e => {
                            handleUpdateRow(item.id, 'name', e.target.value);
                            setFocusedRowId(item.id);
                            setShowRowDropdown(true);
                          }}
                          onFocus={() => {
                            setFocusedRowId(item.id);
                            setShowRowDropdown(true);
                          }}
                          onBlur={() => setTimeout(() => {
                            setShowRowDropdown(false);
                          }, 250)}
                        />
                        {/* Auto-suggest dropdown inside the table cell */}
                        {focusedRowId === item.id && showRowDropdown && item.name && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 4, right: 4, zIndex: 100,
                            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                            maxHeight: 180, overflowY: 'auto', marginTop: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          }}>
                            {filteredSuggestions.length > 0 ? (
                              filteredSuggestions.map(p => (
                                <div
                                  key={p._id}
                                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
                                  onMouseDown={() => handleSelectProduct(item.id, p)}
                                >
                                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>₹{p.sellingPrice}</span>
                                </div>
                              ))
                            ) : (
                              <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                                Not in database (Will sell as custom item)
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 4px' }}>
                        <input
                          className="form-input"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          style={{ textAlign: 'center', fontWeight: 600 }}
                          value={item.priceSold}
                          onChange={e => handleUpdateRow(item.id, 'priceSold', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px 4px' }}>
                        <input
                          className="form-input"
                          type="number"
                          step="0.001"
                          min="0.001"
                          placeholder="1"
                          style={{ textAlign: 'center' }}
                          value={item.qtySold}
                          onChange={e => handleUpdateRow(item.id, 'qtySold', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px 4px' }}>
                        <select
                          className="form-input"
                          value={item.unit}
                          onChange={e => handleUpdateRow(item.id, 'unit', e.target.value)}
                        >
                          {['pcs', 'kg', 'g', 'litre', 'ml', 'pack'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                        ₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          style={{ padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}
                          onClick={() => handleRemoveRow(item.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={handleAddRow}>
              ➕ Add Row
            </button>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Total: <span style={{ color: 'var(--accent)' }}>₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 20, marginBottom: 0 }}>
            <label className="form-label">Notes (optional)</label>
            <input
              className="form-input"
              placeholder="Any remarks (e.g. customer name, payment mode)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Estimated Profit</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                ₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ padding: '0 32px' }}
              onClick={handleSubmit}
              disabled={loading || billItems.length === 0}
            >
              {loading ? '⏳ Saving...' : 'Confirm Checkout'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Product Modal */}
      {showNewProductModal && (
        <div className="modal-overlay" onClick={() => setShowNewProductModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-title">✨ Add Product During Billing</div>
            <div className="modal-sub">Create a product and instantly add it to the cart</div>
            
            <form onSubmit={handleQuickCreateProduct}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input 
                  className="form-input" 
                  required 
                  placeholder="e.g. Britannia Marie Gold (250g)"
                  value={newProduct.name} 
                  onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select 
                    className="form-input" 
                    required 
                    value={newProduct.categoryId}
                    onChange={e => setNewProduct(p => ({ ...p, categoryId: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit of Measure *</label>
                  <select 
                    className="form-input" 
                    required
                    value={newProduct.unit}
                    onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}
                  >
                    {['pcs', 'kg', 'g', 'litre', 'ml', 'pack'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Selling Price (₹) *</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="0.00"
                    value={newProduct.sellingPrice} 
                    onChange={e => setNewProduct(p => ({ ...p, sellingPrice: e.target.value }))} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cost Price (₹)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={newProduct.avgCostPrice} 
                    onChange={e => setNewProduct(p => ({ ...p, avgCostPrice: e.target.value }))} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stock</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="10"
                    value={newProduct.initialStock} 
                    onChange={e => setNewProduct(p => ({ ...p, initialStock: e.target.value }))} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowNewProductModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={newProductLoading}>
                  {newProductLoading ? '⏳ Creating...' : 'Create & Add to Cart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
