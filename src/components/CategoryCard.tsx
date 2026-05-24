'use client';

import { useRouter } from 'next/navigation';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  itemCount: number;
  lowStockCount: number;
  outOfStockCount: number;
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
  onDelete,
}: CategoryCardProps) {
  const router = useRouter();

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
              width: '28px',
              height: '28px',
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
              padding: 0,
            }}
            title="Delete Category"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    </div>
  );
}
