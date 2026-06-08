'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  itemCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  items?: any[];
  onDelete?: () => void;
}

export default function CategoryCard({
  id,
  name,
  icon,
  color,
  itemCount,
  lowStockCount,
  outOfStockCount,
  items,
  onDelete,
}: CategoryCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  return (
    <div
      className="category-card"
      onClick={() => router.push(`/inventory/${id}`)}
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className="category-card-header">
        <div className="category-card-icon" style={{ backgroundColor: `${color}15` }}>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        </div>
        {itemCount > 0 && (
          <span 
            className="category-card-badge"
            style={onDelete ? { right: '3.25rem' } : undefined}
          >
            {itemCount} items
          </span>
        )}
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            className="btn-icon"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.2s',
              padding: '4px',
            }}
            title="Delete Category"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        )}
      </div>
      <h3 className="category-card-name">{name}</h3>
      <div className="category-card-stats">
        {outOfStockCount > 0 && (
          <span className="stock-badge out-of-stock">
            {outOfStockCount} out of stock
          </span>
        )}
        {lowStockCount > 0 && (
          <span className="stock-badge low-stock">
            {lowStockCount} low stock
          </span>
        )}
        {outOfStockCount === 0 && lowStockCount === 0 && itemCount > 0 && (
          <span className="stock-badge in-stock">All stocked</span>
        )}
        {itemCount === 0 && (
          <span className="stock-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>No items yet</span>
        )}
      </div>

      {items && items.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
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
                    {item.brand && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.brand}</span>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: item.stock <= 0 ? 'var(--danger-light)' : item.stock <= item.lowStockThreshold ? 'var(--warning-light)' : 'var(--success-light)', color: item.stock <= 0 ? 'var(--danger)' : item.stock <= item.lowStockThreshold ? 'var(--warning-dark)' : 'var(--success-dark)' }}>
                      {item.stock} qty
                    </span>
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
