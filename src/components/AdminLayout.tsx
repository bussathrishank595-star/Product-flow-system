'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/inventory', icon: '📦', label: 'Inventory' },
  { href: '/inventory/add-stock', icon: '➕', label: 'Add Stock' },
  { href: '/sales/log', icon: '🧾', label: 'Log Sale' },
  { href: '/sales/history', icon: '📋', label: 'Sales History' },
  { href: '/analytics', icon: '📈', label: 'Analytics' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout({ children, storeName }: { children: React.ReactNode; storeName?: string }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitles: Record<string, { title: string; sub: string }> = {
    '/dashboard': { title: 'Dashboard', sub: 'Overview of your store' },
    '/inventory': { title: 'Inventory', sub: 'Track stock levels' },
    '/inventory/add-stock': { title: 'Add Stock', sub: 'Log incoming goods' },
    '/sales/log': { title: 'Log a Sale', sub: 'Record a transaction' },
    '/sales/history': { title: 'Sales History', sub: 'All transactions' },
    '/analytics': { title: 'Analytics', sub: 'Insights & reports' },
    '/settings': { title: 'Settings', sub: 'Store configuration' },
  };

  const current = pageTitles[pathname] || { title: 'Stocks Flow', sub: '' };

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h1>📦 StocksFlow</h1>
          <p>{storeName || 'Admin Panel'}</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item btn-danger"
            style={{ width: '100%', color: 'var(--red)' }}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-primary)',
                cursor: 'pointer', padding: 4, display: 'none', fontSize: 20,
              }}
              className="mobile-menu-btn"
            >
              ☰
            </button>
            <div>
              <div className="topbar-title">{current.title}</div>
              {current.sub && <div className="topbar-sub">{current.sub}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="tag">Admin</span>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent-glow)',
              border: '1px solid rgba(108,99,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>👤</div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
