'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SalesItem {
  productName: string;
  unit: string;
  qtySold: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

interface Transaction {
  _id: string;
  transactionDate: string;
  items: SalesItem[];
  grandTotal: number;
  grossProfit: number;
  isVoided: boolean;
  voidReason?: string;
  notes?: string;
}

export default function SalesHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [voidModal, setVoidModal] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSales = async (p = 1) => {
    setLoading(true);
    const res = await fetch(`/api/sales?page=${p}&limit=20`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchSales(page); }, [page]);

  const handleVoid = async () => {
    if (!voidModal || !voidReason.trim()) { toast.error('Please provide a reason'); return; }
    const res = await fetch(`/api/sales/${voidModal}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voidReason }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Sale voided and stock restored');
      setVoidModal(null);
      setVoidReason('');
      fetchSales(page);
    } else toast.error(data.error || 'Failed to void');
  };

  const canVoid = (dateStr: string) => {
    const hours = (Date.now() - new Date(dateStr).getTime()) / 3600000;
    return hours <= 24;
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">{total} transactions recorded</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 8 }} />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>🧾</div>
            <h3>No sales yet</h3>
            <p>Log your first sale to see history here</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Profit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn._id} style={{ display: 'table-row-group' }}>
                    <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr style={{ opacity: txn.isVoided ? 0.5 : 1 }}>
                            <td style={{ width: '16.6%' }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {format(new Date(txn.transactionDate), 'dd MMM yyyy')}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {format(new Date(txn.transactionDate), 'hh:mm a')}
                              </div>
                            </td>
                            <td style={{ width: '16.6%' }}>
                              <div style={{ fontSize: 13 }}>{txn.items.length} item{txn.items.length > 1 ? 's' : ''}</div>
                              <button
                                style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                onClick={() => setExpandedId(expandedId === txn._id ? null : txn._id)}
                              >
                                {expandedId === txn._id ? '▲ Hide' : '▼ Details'}
                              </button>
                            </td>
                            <td style={{ width: '16.6%', fontWeight: 700 }}>₹{txn.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td style={{ width: '16.6%', color: 'var(--green)', fontWeight: 600 }}>
                              ₹{txn.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ width: '16.6%' }}>
                              {txn.isVoided
                                ? <span className="badge badge-red">❌ Voided</span>
                                : <span className="badge badge-green">✅ Completed</span>
                              }
                            </td>
                            <td style={{ width: '16.6%' }}>
                              {!txn.isVoided && canVoid(txn.transactionDate) && (
                                <button className="btn btn-sm btn-danger"
                                  onClick={() => { setVoidModal(txn._id); setVoidReason(''); }}>
                                  Void
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedId === txn._id && (
                            <tr>
                              <td colSpan={6} style={{ background: 'var(--bg-primary)', padding: '12px 20px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {txn.items.map((item, i) => (
                                    <div key={i} style={{
                                      background: 'var(--bg-card)', borderRadius: 8, padding: '8px 12px',
                                      border: '1px solid var(--border-light)', fontSize: 12,
                                    }}>
                                      <div style={{ fontWeight: 600 }}>{item.productName}</div>
                                      <div style={{ color: 'var(--text-muted)' }}>
                                        {item.qtySold} {item.unit} × ₹{item.unitPriceSnapshot} = <strong>₹{item.lineTotal}</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {txn.isVoided && txn.voidReason && (
                                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>
                                    Void reason: {txn.voidReason}
                                  </div>
                                )}
                                {txn.notes && (
                                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                    Notes: {txn.notes}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Void Modal */}
      {voidModal && (
        <div className="modal-overlay" onClick={() => setVoidModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>↩️</div>
            <div className="modal-title" style={{ textAlign: 'center' }}>Void This Sale?</div>
            <div className="modal-sub" style={{ textAlign: 'center' }}>
              Stock will be restored. This cannot be undone.
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Voiding *</label>
              <input className="form-input" required placeholder="e.g. Customer returned item, wrong entry..."
                value={voidReason} onChange={e => setVoidReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setVoidModal(null)}>Cancel</button>
              <button className="btn btn-danger btn-full" onClick={handleVoid} disabled={!voidReason.trim()}>
                Void & Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
