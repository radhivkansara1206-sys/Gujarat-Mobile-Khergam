import { getStockStatus, getStockStatusLabel } from '@/lib/utils';

interface StockBadgeProps {
  stock: number;
  threshold: number;
}

export default function StockBadge({ stock, threshold }: StockBadgeProps) {
  const status = getStockStatus(stock, threshold);
  const label = getStockStatusLabel(stock, threshold);

  return (
    <span className={`stock-badge ${status}`}>
      {label} ({stock})
    </span>
  );
}
