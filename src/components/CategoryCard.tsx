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
}

export default function CategoryCard({
  id,
  name,
  icon,
  color,
  itemCount,
  lowStockCount,
  outOfStockCount,
}: CategoryCardProps) {
  const router = useRouter();

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
          <span className="category-card-badge">{itemCount} items</span>
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
