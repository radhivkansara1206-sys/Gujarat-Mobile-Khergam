'use client';

import { useEffect } from 'react';

interface StockReportClientProps {
  categories: any[];
  totals: {
    totalItems: number;
    totalStock: number;
    totalValue: number;
  };
}

export default function StockReportClient({ categories, totals }: StockReportClientProps) {
  useEffect(() => {
    // Auto-trigger print dialog after rendering
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const now = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: "'Inter', sans-serif" }}>
      {/* Print button (hidden in print) */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🖨️ Print Report
        </button>

        <button
          onClick={() => window.history.back()}
          className="btn btn-secondary"
        >
          ← Back to Inventory
        </button>
      </div>

      <div id="report-content" style={{ background: 'white', padding: '0.5rem' }}>
        {/* Report Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '3px solid #ff6600', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
          Gujarat Mobile Khergam
        </h1>
        <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Inventory Stock Report</p>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Generated on: {now}</p>
      </div>

      {/* Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem',
        background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Total Items</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{totals.totalItems}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Total Stock</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{totals.totalStock} units</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Inventory Value</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>₹{totals.totalValue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Category-wise tables */}
      {categories.filter((cat: any) => cat.items && cat.items.length > 0).map((category: any) => (
        <div key={category.id} style={{ marginBottom: '2rem', pageBreakInside: 'avoid' }}>
          <h2 style={{
            fontSize: '1.1rem', fontWeight: 700, color: '#0f172a',
            borderBottom: `2px solid ${category.color}`, paddingBottom: '0.5rem', marginBottom: '0.75rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <span>{category.icon}</span> {category.name}
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>
              {category.items.length} items
            </span>
          </h2>

          {category.items.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>No items in this category</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Item Name</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Selling Price</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Stock</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item: any, idx: number) => {
                  const isLow = item.stock > 0 && item.stock <= item.lowStockThreshold;
                  const isOut = item.stock <= 0;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: '#0f172a' }}>{item.name}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#475569' }}>₹{item.sellingPrice.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#0f172a' }}>
                        {item.stock}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                        {isOut ? (
                          <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>Out of Stock</span>
                        ) : isLow ? (
                          <span style={{ background: '#fef3c7', color: '#d97706', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>Low Stock</span>
                        ) : (
                          <span style={{ background: '#d1fae5', color: '#059669', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>In Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {categories.filter((cat: any) => cat.items && cat.items.length > 0).length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', marginBottom: '2rem' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>No active stock items available to display.</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Add items with stock in the inventory dashboard first.</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
        <p style={{ margin: 0 }}>Gujarat Mobile Khergam — Stock Report</p>
        <p style={{ margin: '0.25rem 0 0 0' }}>Developer: Radhiv Kansara | 📞 6354184700</p>
      </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sidebar, .mobile-menu-btn, .sidebar-overlay { display: none !important; }
          .main-content { margin-left: 0 !important; padding: 0 !important; max-width: 100% !important; }
          .app-layout { display: block !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
