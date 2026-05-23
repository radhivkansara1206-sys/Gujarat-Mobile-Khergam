'use client';

import { useState, useEffect } from 'react';
import { getReplacements, getAdminNotifications, markNotificationsRead } from '@/app/actions/replacements';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import BackButton from '@/components/BackButton';

interface ReplacementsClientProps {
  initialData: {
    replacements: any[];
    totalCount: number;
    totalQuantity: number;
  };
  categories: { id: string; name: string }[];
  isAdmin: boolean;
}

export default function ReplacementsClient({ initialData, categories, isAdmin }: ReplacementsClientProps) {
  const [data, setData] = useState(initialData);
  const [filterLoading, setFilterLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const highlight = params.get('highlight');
      if (highlight) {
        setHighlightedId(highlight);
        setTimeout(() => {
          const el = document.getElementById(`row-${highlight}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, []);

  async function handleFilter() {
    setFilterLoading(true);
    const result = await getReplacements({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      categoryId: filterCategory !== 'all' ? filterCategory : undefined,
    });
    if (result.data) setData(result.data);
    setFilterLoading(false);
  }

  async function handleViewNotifications() {
    const result = await getAdminNotifications();
    if (result.data) {
      setNotifications(result.data);
      setShowNotifications(true);
      // Mark all as read
      await markNotificationsRead();
    }
  }

  return (
    <div>
      <BackButton />
      <div className="page-header">
        <div>
          <h1 className="page-title">Replacement History</h1>
          <p className="page-subtitle">Track all defective item replacements</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleViewNotifications}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Staff Alerts
          </button>
        )}
      </div>

      {/* Stock to Return to Dealer */}
      <div style={{ background: 'linear-gradient(135deg, #ff6600, #e05500)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>📦 Total Defective Stock to Return to Dealer</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '2.25rem', fontWeight: 800 }}>{data.totalQuantity} units</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>From {data.totalCount} replacements</p>
          </div>
        </div>
      </div>

      {/* Item-wise breakdown */}
      {data.replacements.length > 0 && (
        <div className="table-container" style={{ marginBottom: '1.5rem' }}>
          <div className="table-header">
            <h2 className="section-title">🏭 Item-wise Return Summary</h2>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Units to Return</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(
                  data.replacements.reduce((acc: any, r: any) => {
                    const key = r.item?.id || r.itemId;
                    if (!acc[key]) {
                      acc[key] = {
                        name: r.item?.name || 'Unknown',
                        category: r.item?.category?.name || '',
                        icon: r.item?.category?.icon || '📦',
                        qty: 0,
                      };
                    }
                    acc[key].qty += r.quantity;
                    return acc;
                  }, {})
                )
                  .sort((a: any, b: any) => b.qty - a.qty)
                  .map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-semibold">{item.name}</td>
                      <td>{item.icon} {item.category}</td>
                      <td><strong style={{ color: '#c2410c' }}>{item.qty}</strong></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="form-label">From</label>
          <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="form-label">To</label>
          <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="form-label">Category</label>
          <select className="form-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleFilter} disabled={filterLoading}>
            {filterLoading ? 'Filtering...' : 'Apply Filter'}
          </button>
        </div>
      </div>

      {/* Replacements Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="section-title">All Replacements ({data.totalCount})</h2>
        </div>
        {data.replacements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔄</div>
            <p className="empty-state-title">No replacements found</p>
            <p className="empty-state-text">Defective item replacements will appear here</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Reason</th>
                  <th>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {data.replacements.map((r: any) => (
                  <tr key={r.id} id={`row-${r.id}`} className={highlightedId === r.id ? 'highlighted-row' : ''}>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td className="font-semibold">{r.item?.name || 'Unknown'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {r.item?.category?.icon} {r.item?.category?.name}
                      </span>
                    </td>
                    <td><strong>{r.quantity}</strong></td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason || '—'}</td>
                    <td>{r.user?.name || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}
          onClick={() => setShowNotifications(false)}
        >
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>🔔 Staff Replacement Alerts</h2>
              <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
            </div>
            {notifications.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No alerts yet. Alerts will appear here when staff logs a replacement.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((n: any) => (
                  <div key={n.id} style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: n.isRead ? 'var(--bg-color)' : '#fff7ed',
                    border: `1px solid ${n.isRead ? 'var(--border)' : '#fed7aa'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {!n.isRead && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginRight: '0.5rem' }}></span>}
                        {n.message}
                      </p>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
