'use client';

import { useState } from 'react';
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
  const { showToast } = useToast();

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

      {/* Summary Cards */}
      <div className="stats-grid stats-grid-3">
        <div className="stat-card sales">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Replacements</span>
            <div className="stat-card-icon sales">🔄</div>
          </div>
          <div className="stat-card-value">{data.totalCount}</div>
        </div>
        <div className="stat-card value">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Units Replaced</span>
            <div className="stat-card-icon value">📦</div>
          </div>
          <div className="stat-card-value">{data.totalQuantity}</div>
        </div>
        <div className="stat-card stock">
          <div className="stat-card-header">
            <span className="stat-card-label">Categories Affected</span>
            <div className="stat-card-icon stock">📊</div>
          </div>
          <div className="stat-card-value">
            {new Set(data.replacements.map((r: any) => r.item?.category?.name)).size}
          </div>
        </div>
      </div>

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
                  <tr key={r.id}>
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
