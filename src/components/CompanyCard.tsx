'use client';

import { useState } from 'react';

interface CompanyCardProps {
  brand: string;
  stock: number;
  items?: any[];
}

export default function CompanyCard({ brand, stock, items }: CompanyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="stat-card" style={{ padding: '1.25rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div className="stat-card-header">
        <span className="stat-card-label" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{brand.toUpperCase()}</span>
        <div className="stat-card-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', width: '36px', height: '36px' }}>🏢</div>
      </div>
      <div className="stat-card-value" style={{ marginTop: '0.5rem' }}>{stock} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 400 }}>units</span></div>

      {items && items.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.4rem', color: 'var(--text-secondary)' }}
          >
            {isExpanded ? '⬆️ Hide Items' : '⬇️ Quick Peek'}
          </button>
          
          {isExpanded && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.5rem', background: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', paddingRight: '0.5rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                    {item.category?.name && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.category.name}</span>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {(() => {
                      const isSim = item.category?.name?.toLowerCase().includes('sim');
                      const isOut = !isSim && item.stock <= 0;
                      const isLow = !isSim && item.stock > 0 && item.stock <= item.lowStockThreshold;
                      return (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          background: isOut ? 'var(--danger-light)' : isLow ? 'var(--warning-light)' : 'var(--success-light)', 
                          color: isOut ? 'var(--danger)' : isLow ? 'var(--warning-dark)' : 'var(--success-dark)' 
                        }}>
                          {item.stock} qty
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
