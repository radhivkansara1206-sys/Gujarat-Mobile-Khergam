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
  registerStatus: any;
  userName: string;
  isAdmin: boolean;
}

export default function DashboardClient({
  stats,
  activities,
  categories,
  lowStockItems,
  registerStatus,
  userName,
  isAdmin,
}: DashboardClientProps) {
  const renderNotesSummary = (notesJson: string | null) => {
    if (!notesJson) return null;
    try {
      const denoms = JSON.parse(notesJson);
      const entries = Object.entries(denoms).filter(([_, val]) => Number(val) > 0);
      if (entries.length === 0) return <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>No notes recorded</span>;
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.25rem', justifyContent: 'flex-end' }}>
          {entries.map(([k, v]) => (
            <span key={k} style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-primary)' }}>
              {k === 'coins' ? 'Coins' : `₹${k}`} x {v as any}
            </span>
          ))}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingDate, setClosingDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [recipientPhone, setRecipientPhone] = useState('group');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();

  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const autoFillDenominations = (amount: number) => {
    let remaining = amount;
    const denoms = [500, 200, 100, 50, 20, 10];
    const newDenoms = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0 };
    
    for (const val of denoms) {
      const count = Math.floor(remaining / val);
      newDenoms[val as keyof typeof newDenoms] = count;
      remaining -= count * val;
    }
    newDenoms.coins = remaining;
    return newDenoms;
  };

  const getNotesForDisplay = () => {
    if (!summaryData) return null;
    if (summaryData.register?.status === 'CLOSED' && summaryData.register.closingNotes) {
      try {
        return JSON.parse(summaryData.register.closingNotes);
      } catch {}
    }
    const amount = summaryData.register?.status === 'CLOSED' 
      ? (summaryData.register.closingBalance || 0) 
      : (summaryData.expectedCash || 0);
    return autoFillDenominations(amount);
  };

  useEffect(() => {
    const dismissedUntil = localStorage.getItem('dashboardAlertDismissed');
    if (dismissedUntil && (Number(dismissedUntil) === -1 || Number(dismissedUntil) > Date.now())) {
      setIsAlertDismissed(true);
    }
  }, []);

  const handleDismissBanner = (e: React.MouseEvent, hours: number) => {
    e.stopPropagation();
    const expiry = hours === -1 ? -1 : Date.now() + hours * 3600 * 1000;
    localStorage.setItem('dashboardAlertDismissed', String(expiry));
    setIsAlertDismissed(true);
    window.dispatchEvent(new Event('alerts-dismissed'));
  };

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

    const [year, month, day] = closingDate.split('-').map(Number);
    const localDateObj = new Date(year, month - 1, day);
    const formattedDate = localDateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Auto-calculate denominations from an amount (greedy)
    const calcDenoms = (amount: number) => {
      let remaining = Math.round(amount);
      const result: Record<string, number> = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0 };
      for (const val of [500, 200, 100, 50, 20, 10]) {
        result[String(val)] = Math.floor(remaining / val);
        remaining -= result[String(val)] * val;
      }
      result.coins = remaining;
      return result;
    };

    let registerText = '';
    if (summaryData.register) {
      const reg = summaryData.register;
      const cashAmount = reg.status === 'CLOSED' ? (reg.closingBalance || 0) : reg.openingBalance;
      const notesJson = reg.status === 'CLOSED' ? reg.closingNotes : reg.openingNotes;
      
      registerText = `\n━━━━━━━━━━━━━━━━━━━━\n💵 *ROJMEL REGISTER DETAILS*\n` +
        `• Opening Cash: ${formatCurrency(reg.openingBalance)}\n`;
        
      if (reg.status === 'CLOSED') {
        registerText += `• Closing Cash: ${formatCurrency(reg.closingBalance || 0)}\n`;
      }
      
      let denoms: Record<string, number> | null = null;
      if (notesJson) {
        try { denoms = JSON.parse(notesJson); } catch {}
      }
      const hasData = denoms && Object.values(denoms).some(v => Number(v) > 0);
      if (!hasData && cashAmount > 0) {
        denoms = calcDenoms(cashAmount);
      }
      
      if (denoms && Object.values(denoms).some(v => Number(v) > 0)) {
        let totalAmount = 0;
        const parts = Object.entries(denoms)
          .filter(([_, val]) => Number(val) > 0)
          .map(([k, v]) => {
            const count = Number(v);
            if (k === 'coins') {
              totalAmount += count;
              return `Coins     = ₹${count.toLocaleString('en-IN')}`;
            } else {
              const val = Number(k);
              const lineTotal = val * count;
              totalAmount += lineTotal;
              return `₹${k.padEnd(3, ' ')} × ${String(count).padEnd(2, ' ')} = ₹${lineTotal.toLocaleString('en-IN')}`;
            }
          });
        
        registerText += `\n📋 *TODAY'S CASH DENOMINATIONS*\n` +
          `\`\`\`\n` +
          `${parts.join('\n')}\n` +
          `--------------\n` +
          `TOTAL = ₹${totalAmount.toLocaleString('en-IN')}\n` +
          `\`\`\`\n`;
      }
      
      if (reg.discrepancyAmount !== 0 && reg.status === 'CLOSED') {
        registerText += `\n⚠️ *Discrepancy:* ${formatCurrency(reg.discrepancyAmount)} (${reg.discrepancyReason || 'No reason'})\n`;
      }
    }

    let itemsSoldText = '';
    const nonGiftItems = summaryData.itemsSold?.filter((item: any) => item.paymentType !== 'gift') || [];
    const giftItems = summaryData.itemsSold?.filter((item: any) => item.paymentType === 'gift') || [];
    if (nonGiftItems.length > 0 || giftItems.length > 0) {
      const nonGiftLines = nonGiftItems.map((item: any) => `• ${item.name} × ${item.quantity} (${formatCurrency(item.amount)}) [${item.paymentType === 'cash' ? 'Cash' : 'Online'}]`);
      const giftLines = giftItems.map((item: any) => `• 🎁 ${item.name} × ${item.quantity} (Gift${item.amount > 0 ? ` • ${formatCurrency(item.amount)}` : ''})`);
      itemsSoldText = `\n📦 *ITEMS SOLD TODAY*\n` + [...nonGiftLines, ...giftLines].join('\n') + `\n`;
    } else {
      itemsSoldText = `\n📦 *ITEMS SOLD TODAY*\n• No items sold today.\n`;
    }

    let expensesText = '';
    if (summaryData.expenses && summaryData.expenses.length > 0) {
      expensesText = `\n💸 *EXPENSES TODAY*\n` +
        summaryData.expenses.map((e: any) => `• ${e.category}${e.description ? ` (${e.description})` : ''}: ${formatCurrency(e.amount)}`).join('\n') +
        `\n• *Total Expenses:* ${formatCurrency(summaryData.totalExpenses)} (${summaryData.expensesCount} records)\n`;
    } else {
      expensesText = `\n💸 *EXPENSES TODAY*\n• No expenses recorded today.\n`;
    }

    let giftsText = '';
    if (summaryData.gifts && summaryData.gifts.length > 0) {
      giftsText = `\n🎁 *GIFTS GIVEN TODAY*\n` +
        summaryData.gifts.map((g: any) => `• ${g.itemName} × ${g.quantity}${g.recipientName ? ` (To: ${g.recipientName})` : ''}${g.reason ? ` - ${g.reason}` : ''}`).join('\n') +
        `\n`;
    } else {
      giftsText = `\n🎁 *GIFTS GIVEN TODAY*\n• No gifts recorded today.\n`;
    }

    return `📱 *GUJARAT MOBILE KHERGAM*
📊 *Daily Business Summary*
📅 *Date:* ${formattedDate}

━━━━━━━━━━━━━━━━━━━━
💰 *SALES SUMMARY*
• Cash Sales: ${formatCurrency(summaryData.salesCash)}
• Online Sales: ${formatCurrency(summaryData.salesOnline)}
• *Total Sales:* ${formatCurrency(summaryData.salesTotal)} (${summaryData.salesCount} bills)
${itemsSoldText}${expensesText}${giftsText}${registerText}
🔄 *REPLACEMENTS*
• Replaced Stock: ${summaryData.totalReplacements} units

📈 *NET SUMMARY*
• Expected Cash: ${formatCurrency(summaryData.expectedCash)}
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

      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 4vw, 2rem)', borderRadius: '16px', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }}>
        <h2 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', fontWeight: 700, margin: 0, marginBottom: '0.25rem' }}>Welcome to Gujarat Mobile Accessories! 📱</h2>
        <p style={{ opacity: 0.9, margin: 0, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Your central hub for managing inventory, tracking sales, and growing your business.</p>
      </div>

      {/* Drawer Status Banner */}
      {!registerStatus?.isOpen ? (
        <div className="alert-banner-container" style={{ position: 'relative', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/register" className="alert-banner-link" style={{ textDecoration: 'none', width: '100%' }}>
            <div className="alert-banner" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
              <span style={{ flex: 1 }}><strong>Cash Drawer is Closed.</strong> You must open the ROJMEL before logging cash sales.</span>
              <button className="btn btn-danger btn-sm">Open Drawer</button>
            </div>
          </Link>
        </div>
      ) : (
        <div className="alert-banner-container" style={{ position: 'relative', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/register" className="alert-banner-link" style={{ textDecoration: 'none', width: '100%' }}>
            <div className="alert-banner" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem' }}>💵</span>
              <span style={{ flex: 1 }}><strong>Drawer Open:</strong> Expected Cash {formatCurrency(registerStatus.currentExpectedCash)}</span>
              <button className="btn btn-secondary btn-sm" style={{ background: 'white', color: '#065f46', border: '1px solid #6ee7b7' }}>View Details</button>
            </div>
          </Link>
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {!isAlertDismissed && lowStockItems.length > 0 && (
        <div className="alert-banner-container" style={{ position: 'relative', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/alerts" className="alert-banner-link" style={{ textDecoration: 'none', width: '100%' }}>
            <div className="alert-banner warning" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ flex: 1, minWidth: '200px' }}><strong>{lowStockItems.length} items</strong> need attention — stock is running low!</span>
            </div>
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end', marginTop: '-0.5rem', paddingRight: '0.5rem' }}>
            <button onClick={(e) => handleDismissBanner(e, 24)} className="btn btn-ghost btn-sm" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-dark)' }}>Remind Later</button>
            <button onClick={(e) => handleDismissBanner(e, -1)} className="btn btn-ghost btn-icon btn-sm" style={{ padding: '0.3rem', width: '36px', height: '36px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-dark)' }} title="Dismiss">✕</button>
          </div>
        </div>
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
              const lowStock = items.filter((i: any) => !i.isAlertDismissed && i.stock > 0 && i.stock <= i.lowStockThreshold).length;
              const outOfStock = items.filter((i: any) => !i.isAlertDismissed && i.stock <= 0).length;
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
                max={(() => {
                  const d = new Date();
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })()}
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
              {/* ROJMEL Summary */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#d97706', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>💵</span> ROJMEL Status
                </p>
                 {summaryData.register ? (
                  <div className="grid-2" style={{ gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                      <span style={{ fontWeight: 600, color: summaryData.register.status === 'OPEN' ? 'var(--success)' : 'var(--text-primary)' }}>{summaryData.register.status}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', borderTop: '1px solid rgba(245, 158, 11, 0.15)', paddingTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Opening Balance:</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(summaryData.register.openingBalance)}</span>
                      </div>
                      {summaryData.register.openingNotes && renderNotesSummary(summaryData.register.openingNotes)}
                    </div>
                    {summaryData.register.status === 'CLOSED' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', borderTop: '1px solid rgba(245, 158, 11, 0.15)', paddingTop: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Closing Balance:</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(summaryData.register.closingBalance || 0)}</span>
                        </div>
                        {summaryData.register.closingNotes && renderNotesSummary(summaryData.register.closingNotes)}
                      </div>
                    )}
                    {summaryData.register.status === 'CLOSED' && summaryData.register.discrepancyAmount !== 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gridColumn: 'span 2', borderTop: '1px solid rgba(245, 158, 11, 0.15)', paddingTop: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Discrepancy:</span>
                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatCurrency(summaryData.register.discrepancyAmount)} ({summaryData.register.discrepancyReason})</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>ROJMEL was not opened for this date.</p>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--success-light)', color: 'var(--success-dark)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>Expected Cash</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: 'clamp(1.15rem, 3vw, 1.35rem)', fontWeight: 800 }}>{formatCurrency(summaryData.expectedCash)}</p>
                </div>
                <div style={{ background: 'var(--info-light)', color: 'var(--info-dark)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>Expected Online</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: 'clamp(1.15rem, 3vw, 1.35rem)', fontWeight: 800 }}>{formatCurrency(summaryData.salesOnline)}</p>
                </div>
                <div style={{ background: 'var(--danger-light)', color: 'var(--danger-dark)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>Total Expenses</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: 'clamp(1.15rem, 3vw, 1.35rem)', fontWeight: 800 }}>{formatCurrency(summaryData.totalExpenses)}</p>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Net Revenue</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: 'clamp(1.15rem, 3vw, 1.35rem)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatCurrency(summaryData.salesTotal - summaryData.totalExpenses)}
                  </p>
                </div>
              </div>

              {/* Cash Denominations Breakdown */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#065f46', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>💵</span> {summaryData.register?.status === 'CLOSED' ? 'Actual Closed Cash Notes' : 'Expected Cash Notes (Calculated)'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(() => {
                    const notesObj = getNotesForDisplay();
                    if (!notesObj) return <span style={{ color: '#065f46', fontStyle: 'italic', fontSize: '0.8rem' }}>No cash data available</span>;
                    const entries = Object.entries(notesObj).filter(([_, val]) => Number(val) > 0);
                    if (entries.length === 0) return <span style={{ color: '#065f46', fontStyle: 'italic', fontSize: '0.8rem' }}>No cash in drawer</span>;
                    return entries.map(([k, v]) => (
                      <span key={k} style={{ background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid #6ee7b7', fontSize: '0.8rem', fontWeight: 600, color: '#065f46' }}>
                        {k === 'coins' ? 'Coins' : `₹${k}`} x {v as any}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {/* Items Sold Today List */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>📦</span> Items Sold Today
                </p>
                {summaryData.itemsSold && summaryData.itemsSold.length > 0 ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                    {summaryData.itemsSold.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', paddingRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{item.paymentType === 'gift' ? '🎁 ' : ''}{item.name} <span style={{ color: 'var(--text-muted)' }}>× {item.quantity}</span></span>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px',
                            background: item.paymentType === 'cash' ? 'var(--success-light)' : item.paymentType === 'gift' ? '#fdf2f8' : 'var(--info-light)',
                            color: item.paymentType === 'cash' ? 'var(--success-dark)' : item.paymentType === 'gift' ? '#9d174d' : 'var(--info-dark)',
                            fontWeight: 600
                          }}>
                            {item.paymentType === 'cash' ? 'Cash' : item.paymentType === 'gift' ? 'Gift' : 'Online'}
                          </span>
                        </span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {item.paymentType === 'gift' ? <span style={{ color: '#9d174d' }}>🎁 Free</span> : formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No items sold today.</p>
                )}
              </div>

              {/* Expenses Today List */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>💸</span> Expenses Today
                </p>
                {summaryData.expenses && summaryData.expenses.length > 0 ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                    {summaryData.expenses.map((exp: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#7f1d1d' }}>
                        <span style={{ fontWeight: 500, color: '#991b1b', paddingRight: '0.5rem' }}>
                          {exp.category} 
                          {exp.description && <span style={{ color: '#b91c1c', opacity: 0.8, fontSize: '0.75rem', marginLeft: '0.25rem', display: 'inline-block' }}>({exp.description})</span>}
                        </span>
                        <span style={{ whiteSpace: 'nowrap' }}>{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', opacity: 0.8, fontStyle: 'italic' }}>No expenses recorded today.</p>
                )}
              </div>

              {/* Gifts Today List */}
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fdf2f8', border: '1px solid #fce7f3', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#9d174d', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🎁</span> Gifts Given Today
                </p>
                {summaryData.gifts && summaryData.gifts.length > 0 ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                    {summaryData.gifts.map((gift: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#831843' }}>
                        <span style={{ fontWeight: 500, color: '#9d174d', paddingRight: '0.5rem' }}>
                          {gift.itemName} <span style={{ color: '#db2777' }}>× {gift.quantity}</span>
                          {gift.recipientName && <span style={{ color: '#be185d', fontSize: '0.75rem', marginLeft: '0.25rem', display: 'inline-block' }}>(To: {gift.recipientName})</span>}
                        </span>
                        {gift.reason && <span style={{ color: '#db2777', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'right', whiteSpace: 'nowrap' }}>{gift.reason}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#be185d', opacity: 0.8, fontStyle: 'italic' }}>No gifts recorded today.</p>
                )}
              </div>

              {/* Replacements Info */}
              {summaryData.totalReplacements > 0 && (
                <div style={{ padding: '0.75rem 1rem', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', fontSize: '0.85rem', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔄</span>
                  <span><strong>{summaryData.totalReplacements} units</strong> defective stock replaced today.</span>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
