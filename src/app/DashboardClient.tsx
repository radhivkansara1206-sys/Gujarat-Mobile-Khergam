'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import StatsCard from '@/components/StatsCard';
import CategoryCard from '@/components/CategoryCard';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { getDailySummaryAction } from '@/app/actions/dashboard';

interface DashboardClientProps {
  stats: any;
  activities: any[];
  categories: any[];
  lowStockItems: any[];
  userName: string;
  isAdmin: boolean;
}

export default function DashboardClient({
  stats,
  activities,
  categories,
  lowStockItems,
  userName,
  isAdmin,
}: DashboardClientProps) {
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
  const [recipientPhone, setRecipientPhone] = useState('group');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    if (!showClosingModal) return;
    
    async function loadSummary() {
      setLoadingSummary(true);
      const res = await getDailySummaryAction(closingDate);
      if (res.success) {
        setSummaryData(res.data);
      } else {
        showToast(res.error || 'Failed to load summary', 'error');
      }
      setLoadingSummary(false);
    }
    
    loadSummary();
  }, [closingDate, showClosingModal, showToast]);

  const handleBuildMessage = () => {
    if (!summaryData) return '';

    const formattedDate = new Date(closingDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    let itemsSoldText = '';
    if (summaryData.itemsSold && summaryData.itemsSold.length > 0) {
      itemsSoldText = `\n📦 *ITEMS SOLD TODAY*\n` + 
        summaryData.itemsSold.map((item: any) => `• ${item.name} × ${item.quantity} (${formatCurrency(item.amount)})`).join('\n') + 
        `\n`;
    } else {
      itemsSoldText = `\n📦 *ITEMS SOLD TODAY*\n• No items sold today.\n`;
    }

    return `📱 *GUJARAT MOBILE KHERGAM*
📊 *Daily Business Summary*
📅 *Date:* ${formattedDate}

━━━━━━━━━━━━━━━━━━━━
💰 *SALES SUMMARY*
• Cash Sales: ${formatCurrency(summaryData.salesCash)}
• Online Sales: ${formatCurrency(summaryData.salesOnline)}
• *Total Sales:* ${formatCurrency(summaryData.salesTotal)} (${summaryData.salesCount} bills)
${itemsSoldText}
💸 *EXPENSES*
• Total Expenses: ${formatCurrency(summaryData.totalExpenses)} (${summaryData.expensesCount} records)

🔄 *REPLACEMENTS*
• Replaced Stock: ${summaryData.totalReplacements} units

📈 *NET SUMMARY*
• Expected Cash: ${formatCurrency(summaryData.salesCash)}
• *Net Revenue:* ${formatCurrency(summaryData.salesTotal - summaryData.totalExpenses)}
━━━━━━━━━━━━━━━━━━━━
📝 *Notes:*
${notes.trim() || 'All systems clear. Counter closed.'}

👤 *Closed By:* ${summaryData.closedBy}`;
  };

  const handleWhatsAppShare = () => {
    if (!summaryData) return;
    const message = handleBuildMessage();

    if (recipientPhone === 'group') {
      // Open without phone parameter to launch Contact/Group Selector screen in WhatsApp
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      showToast('Daily Summary report generated! Select your WhatsApp Group / Contact next.');
    } else if (recipientPhone === 'all') {
      const numbers = ['919427487277', '919925300367', '919727353200'];
      numbers.forEach((num, idx) => {
        const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(message)}`;
        setTimeout(() => {
          window.open(url, '_blank');
        }, idx * 400);
      });
      showToast('Daily Summary reports generated for all owners!');
    } else {
      const url = `https://api.whatsapp.com/send?phone=${recipientPhone}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      showToast('Daily Summary report generated and opening in WhatsApp!');
    }
    
    setShowClosingModal(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {userName}! Here is your store overview.</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowClosingModal(true)} 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            📊 Daily Summary
          </button>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', padding: '1.5rem 2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: '0.25rem' }}>Welcome to Gujarat Mobile Accessories! 📱</h2>
        <p style={{ opacity: 0.9, margin: 0 }}>Your central hub for managing inventory, tracking sales, and growing your business.</p>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <Link href="/alerts" className="alert-banner-link">
          <div className="alert-banner warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span><strong>{lowStockItems.length} items</strong> need attention — stock is running low!</span>
          </div>
        </Link>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatsCard
          label="Total Items"
          value={stats?.totalItems || 0}
          variant="stock"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          }
          footer={`${stats?.totalStock || 0} total units in stock`}
        />
        <StatsCard
          label="Today's Sales"
          value={formatCurrency(stats?.todaySalesTotal || 0)}
          variant="sales"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          }
          footer={`Cash: ${formatCurrency(stats?.todaySalesCash || 0)} | Online: ${formatCurrency(stats?.todaySalesOnline || 0)}`}
        />
        <StatsCard
          label="Low Stock Alerts"
          value={(stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0)}
          variant="alerts"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          }
          footer={`${stats?.outOfStockCount || 0} out of stock`}
        />
        {isAdmin && (
          <StatsCard
            label="Inventory Value"
            value={formatCurrency(stats?.totalValue || 0)}
            variant="value"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            }
            footer="Based on selling prices"
          />
        )}
      </div>

      {/* Two column layout: Recent Activity + Categories */}
      <div className="dashboard-grid">
        {/* Recent Activity */}
        <div className="table-container">
          <div className="table-header">
            <h2 className="section-title">Recent Activity</h2>
            <Link href="/sales" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="activity-list">
            {activities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-title">No activity yet</p>
                <p className="empty-state-text">Sales and gifts will appear here</p>
              </div>
            ) : (
              activities.map((activity: any) => {
                const targetUrl = activity.type === 'replacement' ? `/replacements?highlight=${activity.id}` : `/sales?highlight=${activity.id}`;
                return (
                <Link key={activity.id} href={targetUrl} className={`activity-item ${activity.type === 'replacement' ? 'highlight-replacement' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className={`activity-icon ${activity.type === 'sale' ? activity.paymentType : (activity.type === 'replacement' ? 'replacement' : 'gift')}`}>
                    {activity.type === 'sale' ? (
                      activity.paymentType === 'cash' ? '₹' : '📱'
                    ) : activity.type === 'replacement' ? (
                      '🔄'
                    ) : (
                      '🎁'
                    )}
                  </div>
                  <div className="activity-details">
                    <span className="activity-name">
                      {activity.itemName}
                      <span className="activity-qty"> × {activity.quantity}</span>
                    </span>
                    <span className="activity-meta">
                      {activity.type === 'sale'
                        ? `${formatCurrency(activity.amount)} · ${activity.paymentType}`
                        : activity.type === 'replacement'
                        ? `Replacement${activity.recipientName ? ` - ${activity.recipientName}` : ''}`
                        : `Gift${activity.recipientName ? ` to ${activity.recipientName}` : ''}`
                      }
                      {' · '}{activity.userName}
                    </span>
                  </div>
                  <span className="activity-time">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Category Overview */}
        <div>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 className="section-title">Categories</h2>
            <Link href="/inventory" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="category-grid-compact">
            {categories.map((cat: any) => {
              const items = cat.items || [];
              const lowStock = items.filter((i: any) => i.stock > 0 && i.stock <= i.lowStockThreshold).length;
              const outOfStock = items.filter((i: any) => i.stock <= 0).length;
              return (
                <CategoryCard
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  icon={cat.icon}
                  color={cat.color}
                  itemCount={cat._count?.items || 0}
                  lowStockCount={lowStock}
                  outOfStockCount={outOfStock}
                />
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={showClosingModal} onClose={() => setShowClosingModal(false)} title="📊 Daily Business Summary" size="md">
        <div style={{ padding: '0.25rem' }}>
          <div className="form-row" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="closing-date">Select Summary Date</label>
              <input 
                id="closing-date"
                type="date" 
                className="form-input" 
                value={closingDate} 
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setClosingDate(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="recipient-phone">Send WhatsApp Report To</label>
              <select 
                id="recipient-phone"
                className="form-select"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              >
                <option value="group">👥 Share to Group / Contact Selector</option>
                <option value="all">👥 Send to All Owners (one-by-one)</option>
                <option value="919427487277">📞 9427487277 (Owner 1)</option>
                <option value="919925300367">📞 9925300367 (Owner 2)</option>
                <option value="919727353200">📞 97273 53200 (Owner 3)</option>
              </select>
            </div>
          </div>

          {loadingSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
              <span className="spinner spinner-lg"></span>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading summary metrics...</p>
            </div>
          ) : summaryData ? (
            <div>
              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--success-light)', color: 'var(--success-dark)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>Expected Cash</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 800 }}>{formatCurrency(summaryData.salesCash)}</p>
                </div>
                <div style={{ background: 'var(--info-light)', color: 'var(--info-dark)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>Expected Online</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 800 }}>{formatCurrency(summaryData.salesOnline)}</p>
                </div>
                <div style={{ background: 'var(--danger-light)', color: 'var(--danger-dark)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>Total Expenses</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 800 }}>{formatCurrency(summaryData.totalExpenses)}</p>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Net Revenue</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatCurrency(summaryData.salesTotal - summaryData.totalExpenses)}
                  </p>
                </div>
              </div>

              {/* Items Sold Today List */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>📦</span> Items Sold Today
                </p>
                {summaryData.itemsSold && summaryData.itemsSold.length > 0 ? (
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {summaryData.itemsSold.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.name} <span style={{ color: 'var(--text-muted)' }}>× {item.quantity}</span></span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No items sold today.</p>
                )}
              </div>

              {/* Replacements Info */}
              {summaryData.totalReplacements > 0 && (
                <div style={{ padding: '0.75rem 1rem', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', fontSize: '0.85rem', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔄</span>
                  <span><strong>{summaryData.totalReplacements} units</strong> defective stock replaced today.</span>
                </div>
              )}

              {/* Pop-up blocker helper for Send to All */}
              {recipientPhone === 'all' && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--info-light)', border: '1px solid var(--info)', borderRadius: '12px', fontSize: '0.825rem', color: 'var(--info-dark)', marginBottom: '1.25rem' }}>
                  <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.35rem' }}>📣 Pop-up Blocker Note</p>
                  <p style={{ margin: 0, opacity: 0.9, lineHeight: '1.4', marginBottom: '0.5rem' }}>
                    If your browser blocks the tabs, click <strong>"Always allow pop-ups"</strong> in the browser bar, or use the links below to send manually:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button type="button" onClick={() => window.open(`https://api.whatsapp.com/send?phone=919427487277&text=${encodeURIComponent(handleBuildMessage())}`, '_blank')} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      👤 Send to 9427487277
                    </button>
                    <button type="button" onClick={() => window.open(`https://api.whatsapp.com/send?phone=919925300367&text=${encodeURIComponent(handleBuildMessage())}`, '_blank')} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      👤 Send to 9925300367
                    </button>
                    <button type="button" onClick={() => window.open(`https://api.whatsapp.com/send?phone=919727353200&text=${encodeURIComponent(handleBuildMessage())}`, '_blank')} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      👤 Send to 97273 53200
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="closing-notes">Closing Notes / Notes to Owner</label>
                <textarea 
                  id="closing-notes"
                  className="form-input" 
                  style={{ minHeight: '80px' }}
                  placeholder="e.g. Counter closed successfully, matched drawer balance." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Footer */}
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowClosingModal(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleWhatsAppShare}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.832 0c3.15.001 6.11 1.229 8.337 3.458 2.226 2.227 3.453 5.187 3.451 8.338-.004 6.508-5.33 11.832-11.835 11.832-2.004-.001-3.972-.51-5.753-1.485L0 24zm6.59-4.846c1.78.966 3.55 1.488 5.233 1.489 5.331 0 9.68-4.321 9.683-9.626.002-2.57-1.002-4.99-2.825-6.812C16.914 2.38 14.49 1.376 11.92 1.376 6.59 1.376 2.24 5.698 2.237 11.004c-.001 1.905.503 3.755 1.472 5.434l-.973 3.553 3.911-.943z"/>
                  </svg>
                  Share on WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
              Failed to load closing analytics.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
