import { getStockStatus, getStockStatusLabel } from '@/lib/utils';

interface StockBadgeProps {
  stock: number;
  threshold: number;
  isSimCategory?: boolean;
}

export default function StockBadge({ stock, threshold, isSimCategory }: StockBadgeProps) {
  const status = isSimCategory ? 'in-stock' : getStockStatus(stock, threshold);
  const label = isSimCategory ? 'In Stock' : getStockStatusLabel(stock, threshold);

  return (
    <span className={`stock-badge ${status}`}>
      {label} ({stock})
    </span>
  );
}
