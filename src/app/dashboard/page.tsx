'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface KPI {
  totalRevenue: number;
  grossProfit: number;
  totalUnitsSold: number;
  totalTransactions: number;
}

interface DailyEntry { _id: string; revenue: number; profit: number; }
interface TopProduct { _id: string; productName: string; totalQtySold: number; totalRevenue: number; unit: string; }
interface AlertProduct { _id: string; name: string; currentStock: number; unit: string; lowStockThreshold: number; }

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [top5, setTop5] = useState<TopProduct[]>([]);
  const [alerts, setAlerts] = useState<{ lowStock: number; outOfStock: number }>({ lowStock: 0, outOfStock: 0 });
  const [lowItems, setLowItems] = useState<AlertProduct[]>([]);
  const [outItems, setOutItems] = useState<AlertProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics?range=7').then(r => r.json()),
      fetch('/api/products?status=low').then(r => r.json()),
      fetch('/api/products?status=out').then(r => r.json()),
    ]).then(([ana, low, out]) => {
      setKpi(ana.kpi);
      setDaily(ana.dailyRevenue || []);
      setTop5(ana.top5 || []);
      setAlerts(ana.alerts || { lowStock: 0, outOfStock: 0 });
      setLowItems(low || []);
      setOutItems(out || []);
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const chartData = daily.map(d => ({
    date: d._id.slice(5), // MM-DD
    revenue: Math.round(d.revenue),
    profit: Math.round(d.profit),
  }));

  if (loading) {
    return (
      <AdminLayout>
        <div className="kpi-grid">
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: 100 }} />)}
        </div>
        <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Alert banners */}
      {alerts.outOfStock > 0 && (
        <div className="alert-banner alert-red">
          <span>❌</span>
          <span><strong>{alerts.outOfStock} product{alerts.outOfStock > 1 ? 's' : ''} out of stock</strong> — needs immediate restocking</span>
          <Link href="/inventory?status=out" className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}>View</Link>
        </div>
      )}
      {alerts.lowStock > 0 && (
        <div className="alert-banner alert-amber">
          <span>⚠️</span>
          <span><strong>{alerts.lowStock} product{alerts.lowStock > 1 ? 's' : ''} running low</strong> — consider restocking soon</span>
          <Link href="/inventory?status=low" className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}>View</Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title">Total Revenue</div>
            <div className="icon-circle" style={{ background: 'rgba(108,99,255,0.1)' }}>💰</div>
          </div>
          <div className="card-value" style={{ color: 'var(--accent)' }}>{fmt(kpi?.totalRevenue || 0)}</div>
          <div className="card-sub">Last 7 days</div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title">Gross Profit</div>
            <div className="icon-circle" style={{ background: 'var(--green-bg)' }}>📈</div>
          </div>
          <div className="card-value" style={{ color: 'var(--green)' }}>{fmt(kpi?.grossProfit || 0)}</div>
          <div className="card-sub">Est. profit (7 days)</div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title">Units Sold</div>
            <div className="icon-circle" style={{ background: 'var(--amber-bg)' }}>📦</div>
          </div>
          <div className="card-value">{(kpi?.totalUnitsSold || 0).toLocaleString()}</div>
          <div className="card-sub">Items moved (7 days)</div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title">Needs Reorder</div>
            <div className="icon-circle" style={{ background: 'var(--red-bg)' }}>⚠️</div>
          </div>
          <div className="card-value" style={{ color: alerts.outOfStock > 0 ? 'var(--red)' : alerts.lowStock > 0 ? 'var(--amber)' : 'var(--green)' }}>
            {alerts.outOfStock + alerts.lowStock}
          </div>
          <div className="card-sub">{alerts.outOfStock} out · {alerts.lowStock} low</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Revenue — Last 7 Days</div>
              <div className="section-sub">Daily sales performance</div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => ['₹' + Number(v).toLocaleString('en-IN'), 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? '#6c63ff' : 'rgba(108,99,255,0.4)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No sales data yet. Start by logging a sale!</p>
            </div>
          )}
        </div>

        {/* Top 5 */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">🔥 Top Selling Products</div>
              <div className="section-sub">Last 7 days by quantity</div>
            </div>
          </div>
          {top5.length > 0 ? (
            <div>
              {top5.map((p, i) => {
                const max = top5[0]?.totalQtySold || 1;
                const pct = (p.totalQtySold / max) * 100;
                const rankColors = ['#ffd700','#c0c0c0','#cd7f32','#6c63ff','#6c63ff'];
                return (
                  <div key={p._id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="rank-badge" style={{ background: `${rankColors[i]}22`, color: rankColors[i] }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.productName}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {p.totalQtySold} {p.unit}
                      </span>
                    </div>
                    <div className="stock-bar-bg">
                      <div className="stock-bar-fill" style={{ width: `${pct}%`, background: rankColors[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No sales logged yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Panel */}
      {(lowItems.length > 0 || outItems.length > 0) && (
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">⚠️ Needs Attention</div>
              <div className="section-sub">Items requiring restock</div>
            </div>
            <Link href="/inventory/add-stock" className="btn btn-primary btn-sm">+ Add Stock</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {outItems.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--red)', fontWeight: 700 }}>0 {p.unit}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.lowStockThreshold} {p.unit}</td>
                    <td><span className="badge badge-red">❌ Out of Stock</span></td>
                    <td>
                      <Link href="/inventory/add-stock" className="btn btn-sm btn-secondary">Restock</Link>
                    </td>
                  </tr>
                ))}
                {lowItems.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--amber)', fontWeight: 700 }}>{p.currentStock} {p.unit}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.lowStockThreshold} {p.unit}</td>
                    <td><span className="badge badge-amber">⚠️ Low Stock</span></td>
                    <td>
                      <Link href="/inventory/add-stock" className="btn btn-sm btn-secondary">Restock</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid-3" style={{ marginTop: 16 }}>
        <Link href="/inventory/add-stock" className="card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>➕</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Add Stock</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Log new goods received</div>
        </Link>
        <Link href="/sales/log" className="card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🧾</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Log a Sale</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Record a customer purchase</div>
        </Link>
        <Link href="/analytics" className="card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📈</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>View Analytics</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Insights & profit reports</div>
        </Link>
      </div>
    </AdminLayout>
  );
}
