import StatsCard from '@/components/StatsCard';
import { formatCurrency } from '@/lib/utils';

interface DashboardStatsGridProps {
  stats: any;
  isAdmin: boolean;
}

export default function DashboardStatsGrid({ stats, isAdmin }: DashboardStatsGridProps) {
  return (
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
  );
}
