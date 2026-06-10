import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface SummaryReceiptProps {
  summaryData: any;
  closingDate: string;
  notes: string;
  denoms: Record<string, number> | null;
}

export default function SummaryReceipt({ summaryData, closingDate, notes, denoms }: SummaryReceiptProps) {
  if (!summaryData) return null;

  const renderDenoms = () => {
    if (!denoms) return <span style={{ color: '#065f46', fontStyle: 'italic', fontSize: '0.8rem' }}>No cash data</span>;
    const entries = Object.entries(denoms).filter(([_, val]) => Number(val) > 0);
    if (entries.length === 0) return <span style={{ color: '#065f46', fontStyle: 'italic', fontSize: '0.8rem' }}>No cash in drawer</span>;
    
    let total = 0;
    const rows = entries.map(([k, v]) => {
      const count = Number(v);
      if (k === 'coins') {
        total += count;
        return (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem', color: '#064e3b' }}>
            <span>Coins</span>
            <span style={{ fontWeight: 600 }}>₹{count.toLocaleString('en-IN')}</span>
          </div>
        );
      } else {
        const val = Number(k);
        const lineTotal = val * count;
        total += lineTotal;
        return (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem', color: '#064e3b' }}>
            <span>₹{k} × {count}</span>
            <span style={{ fontWeight: 600 }}>₹{lineTotal.toLocaleString('en-IN')}</span>
          </div>
        );
      }
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0 0', marginTop: '4px', borderTop: '1px dashed #6ee7b7', fontSize: '1rem', color: '#064e3b', fontWeight: 800 }}>
          <span>Total Cash</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="receipt-export-node" 
      style={{ 
        width: '600px', // Fixed width for consistent image aspect ratio
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '2rem 1.5rem', color: 'white', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>GUJARAT MOBILE KHERGAM</h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>Daily Business Summary</p>
        <div style={{ marginTop: '1.5rem', display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 600 }}>
          📅 {closingDate}
        </div>
      </div>

      {/* Content Body */}
      <div style={{ padding: '2rem' }}>
        
        {/* Core Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Sales</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(summaryData.salesTotal)}</p>
          </div>
          <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', border: '1px solid #d1fae5', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#059669', textTransform: 'uppercase', fontWeight: 700 }}>Cash</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>{formatCurrency(summaryData.expectedCash)}</p>
          </div>
          <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #dbeafe', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#2563eb', textTransform: 'uppercase', fontWeight: 700 }}>Online</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>{formatCurrency(summaryData.salesOnline)}</p>
          </div>
          <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fee2e2', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Expenses</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#991b1b' }}>{formatCurrency(summaryData.totalExpenses)}</p>
          </div>
        </div>

        {/* Highlighted Net Revenue */}
        <div style={{ background: '#0f172a', color: 'white', padding: '1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Net Revenue</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>(Total Sales - Expenses)</p>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
            {formatCurrency(summaryData.salesTotal - summaryData.totalExpenses)}
          </div>
        </div>

        {/* Two-column layout for details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Left Column */}
          <div>
            {/* Items Sold */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Items Sold</h3>
              {summaryData.itemsSold && summaryData.itemsSold.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {summaryData.itemsSold.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {item.paymentType === 'gift' && '🎁 '}
                        <span>{item.name}</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          color: item.paymentType === 'cash' ? '#059669' : item.paymentType === 'online' ? '#2563eb' : '#db2777', 
                          marginLeft: '4px',
                          marginRight: '4px'
                        }}>
                          [{item.paymentType === 'cash' ? 'Cash' : item.paymentType === 'online' ? 'Online' : 'Gift'}]
                        </span>
                        <span style={{ color: '#94a3b8' }}>× {item.quantity}</span>
                      </span>
                      <span style={{ fontWeight: 600, color: item.paymentType === 'gift' ? '#db2777' : '#0f172a' }}>
                        {item.paymentType === 'gift' ? 'Free' : formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No items sold.</p>
              )}
            </div>

            {/* Expenses */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#dc2626', borderBottom: '2px solid #fee2e2', paddingBottom: '0.5rem' }}>Expenses</h3>
              {summaryData.expenses && summaryData.expenses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {summaryData.expenses.map((exp: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#7f1d1d' }}>
                        {exp.category} {exp.description && <span style={{ opacity: 0.7 }}>({exp.description})</span>}
                      </span>
                      <span style={{ fontWeight: 600, color: '#991b1b' }}>{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#fca5a5', fontStyle: 'italic', fontSize: '0.9rem' }}>No expenses.</p>
              )}
            </div>

            {/* Gifts */}
            {summaryData.gifts && summaryData.gifts.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#db2777', borderBottom: '2px solid #fce7f3', paddingBottom: '0.5rem' }}>Gifts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {summaryData.gifts.map((gift: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#9d174d' }}>{gift.itemName} <span style={{ opacity: 0.7 }}>× {gift.quantity}</span></span>
                      {gift.recipientName && <span style={{ color: '#be185d', fontSize: '0.85rem' }}>To: {gift.recipientName}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div>
            {/* Cash Denominations (Receipt Style Box) */}
            <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '1.5rem', border: '1px dashed #34d399', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#065f46', textAlign: 'center' }}>
                {summaryData.register?.status === 'CLOSED' ? 'Actual Cash Drawer' : 'Expected Cash Drawer'}
              </h3>
              {renderDenoms()}
            </div>

            {/* ROJMEL Status */}
            {summaryData.register && (
              <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1.5rem', border: '1px solid #fde68a', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#b45309' }}>ROJMEL Register</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#92400e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Opening Cash:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(summaryData.register.openingBalance)}</span>
                  </div>
                  {summaryData.register.status === 'CLOSED' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Closing Cash:</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(summaryData.register.closingBalance || 0)}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Expected Closing Cash:</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(summaryData.expectedCash || 0)}</span>
                    </div>
                  )}
                  {summaryData.register.discrepancyAmount !== 0 && summaryData.register.status === 'CLOSED' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #fcd34d' }}>
                      <span>Discrepancy:</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(summaryData.register.discrepancyAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Replacements */}
            {summaryData.totalReplacements > 0 && (
              <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '1rem', border: '1px solid #ffedd5', color: '#c2410c', fontSize: '0.9rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🔄</span>
                <span><strong>{summaryData.totalReplacements} units</strong> defective stock replaced.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{ background: '#f8fafc', padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: '2rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Closing Notes</p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>
            {notes.trim() || 'All systems clear. Counter closed.'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Generated By</p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
            {summaryData.closedBy}
          </p>
        </div>
      </div>
    </div>
  );
}
