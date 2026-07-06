'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

interface KPI { totalRevenue: number; grossProfit: number; totalUnitsSold: number; totalTransactions: number; }
interface DailyEntry { _id: string; revenue: number; profit: number; count: number; }
interface Product { _id: string; productName: string; totalQtySold: number; totalRevenue: number; unit: string; }
interface Category { _id: string; categoryName: string; revenue: number; colourHex: string; }

const RANGES = [
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState('7');
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [top5, setTop5] = useState<Product[]>([]);
  const [bottom5, setBottom5] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then(r => r.json())
      .then(data => {
        setKpi(data.kpi);
        setDaily(data.dailyRevenue || []);
        setTop5(data.top5 || []);
        setBottom5(data.bottom5 || []);
        setCategories(data.categoryBreakdown || []);
        setLoading(false);
      });
  }, [range]);

  const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const profitPct = kpi?.totalRevenue ? (((kpi.grossProfit || 0) / kpi.totalRevenue) * 100).toFixed(1) : '0.0';

  const chartData = daily.map(d => ({
    date: d._id.slice(5),
    revenue: Math.round(d.revenue),
    profit: Math.round(d.profit),
    count: d.count,
  }));

  const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#6c63ff', '#a855f7'];
  const PIE_COLORS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
    if (!active || !payload) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ marginBottom: 4, color: 'var(--text-muted)' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ fontWeight: 600 }}>
            {p.name === 'revenue' ? 'Revenue: ' : 'Profit: '}
            <span style={{ color: p.name === 'revenue' ? 'var(--accent)' : 'var(--green)' }}>
              ₹{p.value.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Sales insights and profit trends</p>
        </div>
        <div className="tabs">
          {RANGES.map(r => (
            <button key={r.value} className={`tab-btn ${range === r.value ? 'active' : ''}`}
              onClick={() => setRange(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div>
          <div className="kpi-grid">
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
          <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="card-title">💰 Total Revenue</div>
              <div className="card-value" style={{ color: 'var(--accent)' }}>{fmt(kpi?.totalRevenue || 0)}</div>
              <div className="card-sub">Last {range} days</div>
            </div>
            <div className="card">
              <div className="card-title">📈 Gross Profit</div>
              <div className="card-value" style={{ color: 'var(--green)' }}>{fmt(kpi?.grossProfit || 0)}</div>
              <div className="card-sub">{profitPct}% margin</div>
            </div>
            <div className="card">
              <div className="card-title">📦 Units Sold</div>
              <div className="card-value">{(kpi?.totalUnitsSold || 0).toLocaleString()}</div>
              <div className="card-sub">Total items moved</div>
            </div>
            <div className="card">
              <div className="card-title">🧾 Transactions</div>
              <div className="card-value">{(kpi?.totalTransactions || 0).toLocaleString()}</div>
              <div className="card-sub">Completed sales</div>
            </div>
          </div>

          {/* Revenue + Profit Chart */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-header">
              <div>
                <div className="section-title">📊 Daily Revenue & Profit</div>
                <div className="section-sub">Last {range} days performance</div>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="revenue" fill="#6c63ff" radius={[4,4,0,0]} opacity={0.85} />
                  <Bar dataKey="profit" name="profit" fill="#22c55e" radius={[4,4,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No sales data for this period. Start logging sales!</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, marginTop: 10, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#6c63ff' }} /> Revenue
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e' }} /> Profit
              </div>
            </div>
          </div>

          {/* Top 5 and Bottom 5 */}
          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Top 5 */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: 6 }}>🔥 Top 5 Fast-Moving</div>
              <div className="section-sub" style={{ marginBottom: 16 }}>Highest selling by quantity</div>
              {top5.length > 0 ? top5.map((p, i) => {
                const max = top5[0]?.totalQtySold || 1;
                return (
                  <div key={p._id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="rank-badge" style={{ background: `${rankColors[i]}22`, color: rankColors[i] }}>#{i+1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.productName}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.totalQtySold} {p.unit}</span>
                    </div>
                    <div className="stock-bar-bg">
                      <div className="stock-bar-fill" style={{ width: `${(p.totalQtySold / max) * 100}%`, background: rankColors[i] }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Revenue: ₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                );
              }) : <div className="empty-state" style={{ padding: 20 }}><p>No data yet</p></div>}
            </div>

            {/* Bottom 5 */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: 6 }}>🐌 Bottom 5 Slow-Moving</div>
              <div className="section-sub" style={{ marginBottom: 16 }}>Lowest selling — consider reducing stock</div>
              {bottom5.length > 0 ? bottom5.map((p, i) => (
                <div key={p._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8, marginBottom: 8,
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="rank-badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>#{i+1}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.productName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue</div>
                    </div>
                  </div>
                  <span className="badge badge-amber">{p.totalQtySold} {p.unit} sold</span>
                </div>
              )) : <div className="empty-state" style={{ padding: 20 }}><p>No data yet</p></div>}
            </div>
          </div>

          {/* Category Breakdown */}
          {categories.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 4 }}>🗂️ Revenue by Category</div>
              <div className="section-sub" style={{ marginBottom: 20 }}>Which categories drive the most sales</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
                <ResponsiveContainer width={240} height={200}>
                  <PieChart>
                    <Pie data={categories} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      dataKey="revenue" nameKey="categoryName" paddingAngle={3}>
                      {categories.map((cat, i) => (
                        <Cell key={cat._id} fill={cat.colourHex || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => ['₹' + Number(v).toLocaleString('en-IN'), 'Revenue']}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {categories.map((cat, i) => {
                    const totalRev = categories.reduce((s, c) => s + c.revenue, 0);
                    const pct = totalRev > 0 ? ((cat.revenue / totalRev) * 100).toFixed(1) : '0';
                    return (
                      <div key={cat._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: cat.colourHex || PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.categoryName || 'Unknown'}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>₹{cat.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
