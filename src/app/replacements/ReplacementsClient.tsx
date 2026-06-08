'use client';

import { useState, useEffect } from 'react';
import { getReplacements, getAdminNotifications, markNotificationsRead, restoreReplacement, deleteReplacement } from '@/app/actions/replacements';
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
  initialUnreadCount: number;
}

export default function ReplacementsClient({ initialData, categories, isAdmin, initialUnreadCount }: ReplacementsClientProps) {
  const [data, setData] = useState(initialData);
  const [filterLoading, setFilterLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [dismissedStaffAlerts, setDismissedStaffAlerts] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored = localStorage.getItem('dismissedStaffAlerts');
    if (stored) {
      try {
        setDismissedStaffAlerts(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const handleDismissStaffAlert = (e: React.MouseEvent, id: string, hours: number) => {
    e.stopPropagation();
    const expiry = hours === -1 ? -1 : Date.now() + hours * 3600 * 1000;
    const newDismissed = { ...dismissedStaffAlerts, [id]: expiry };
    setDismissedStaffAlerts(newDismissed);
    localStorage.setItem('dismissedStaffAlerts', JSON.stringify(newDismissed));
  };

  const activeNotifications = notifications.filter((n: any) => {
    const expiry = dismissedStaffAlerts[n.id];
    if (expiry === -1) return false;
    if (expiry && expiry > Date.now()) return false;
    return true;
  });

  const activeUnreadCount = activeNotifications.filter((n: any) => !n.isRead).length;
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
      setUnreadCount(0); // Disappear once seen
      // Mark all as read
      await markNotificationsRead();
    }
  }

  async function handleRestore(id: string) {
    if (!confirm('Restore this item back to inventory stock?')) return;
    setActionLoading(id);
    const result = await restoreReplacement(id);
    if (result.success) {
      showToast('Item restored to stock successfully');
      handleFilter();
    } else {
      showToast(result.error || 'Failed to restore', 'error');
    }
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this replacement record? Stock will NOT be restored.')) return;
    setActionLoading(id);
    const result = await deleteReplacement(id);
    if (result.success) {
      showToast('Replacement record deleted');
      handleFilter();
    } else {
      showToast(result.error || 'Failed to delete', 'error');
    }
    setActionLoading(null);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleViewNotifications} style={{ position: 'relative' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Staff Alerts
              {activeUnreadCount > 0 && (
                <span className="notification-badge" style={{ position: 'absolute', top: '-8px', right: '-8px', animation: 'pulse 1.5s infinite', border: '2px solid white' }}>
                  {activeUnreadCount > 99 ? '99+' : activeUnreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Stock to Return to Dealer */}
      <div style={{ background: 'linear-gradient(135deg, #ff6600, #e05500)', borderRadius: '12px', padding: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '1.5rem', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', opacity: 0.9 }}>📦 Total Defective Stock to Return to Dealer</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', fontWeight: 800 }}>
              {data.replacements.filter((r: any) => !r.reason?.startsWith('RESTOCK:')).reduce((sum: number, r: any) => sum + r.quantity, 0)} units
            </p>
          </div>
          <div style={{ textAlign: 'right', alignSelf: 'flex-end' }}>
            <p style={{ margin: 0, fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', opacity: 0.9 }}>
              From {data.replacements.filter((r: any) => !r.reason?.startsWith('RESTOCK:')).length} defective replacements
            </p>
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
                  data.replacements
                    .filter((r: any) => !r.reason?.startsWith('RESTOCK:'))
                    .reduce((acc: any, r: any) => {
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
          <h2 className="section-title">All Replacements & Exchanges ({data.totalCount})</h2>
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
                  <th>Type</th>
                  <th>Reason/Note</th>
                  <th>Logged By</th>
                  {isAdmin && <th>Actions</th>}
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
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        background: r.reason?.startsWith('RESTOCK:') ? '#d1fae5' : '#fee2e2',
                        color: r.reason?.startsWith('RESTOCK:') ? '#059669' : '#dc2626'
                      }}>
                        {r.reason?.startsWith('RESTOCK:') ? 'Restocked' : 'Defective'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span>{r.reason?.replace('RESTOCK:', '').trim() || '—'}</span>
                        {r.originalPurchaseDate && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            📅 Bought: {new Date(r.originalPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{r.user?.name || 'Unknown'}</td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#d1fae5', color: '#059669', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => handleRestore(r.id)}
                            disabled={actionLoading === r.id}
                          >
                            {actionLoading === r.id ? '...' : '↩ Restore'}
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => handleDelete(r.id)}
                            disabled={actionLoading === r.id}
                          >
                            {actionLoading === r.id ? '...' : '🗑 Delete'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNotifications(false)}
        >
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', padding: 'clamp(1rem, 3vw, 1.5rem)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#fef3c7', color: '#f59e0b', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  🔔
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Staff Alerts</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeNotifications.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newDismissed = { ...dismissedStaffAlerts };
                      activeNotifications.forEach((n: any) => newDismissed[n.id] = -1);
                      setDismissedStaffAlerts(newDismissed);
                      localStorage.setItem('dismissedStaffAlerts', JSON.stringify(newDismissed));
                      markNotificationsRead();
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', color: '#64748b' }}
                  >
                    Dismiss All
                  </button>
                )}
                <button onClick={() => setShowNotifications(false)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}>×</button>
              </div>
            </div>
            {activeNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>✅</div>
                <p style={{ color: '#64748b', margin: 0, fontWeight: 500 }}>You're all caught up!</p>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>No new replacement alerts.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeNotifications.map((n: any) => (
                  <div key={n.id} style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: n.isRead ? '#f8fafc' : '#fff7ed',
                    border: `1px solid ${n.isRead ? '#e2e8f0' : '#fed7aa'}`,
                    transition: 'transform 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: '#334155', flex: 1 }}>
                        {!n.isRead && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginRight: '0.5rem', boxShadow: '0 0 0 4px #fee2e2' }}></span>}
                        {n.message}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button onClick={(e) => handleDismissStaffAlert(e, n.id, 24)} className="btn btn-ghost btn-sm" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#f1f5f9', color: '#64748b' }}>Remind Later</button>
                        <button onClick={(e) => handleDismissStaffAlert(e, n.id, -1)} className="btn btn-ghost btn-icon btn-sm" style={{ padding: '0.3rem', width: '36px', height: '36px', background: '#f1f5f9', color: '#64748b' }} title="Dismiss">✕</button>
                      </div>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
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
