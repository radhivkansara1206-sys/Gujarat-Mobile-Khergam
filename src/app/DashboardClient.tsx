'use client';

import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import StatsCard from '@/components/StatsCard';
import CategoryCard from '@/components/CategoryCard';
import Link from 'next/link';

interface DashboardClientProps {
  stats: any;
  activities: any[];
  categories: any[];
  lowStockItems: any[];
  userName: string;
  isAdmin: boolean;
}

export default function DashboardClient({
  stats,
  activities,
  categories,
  lowStockItems,
  userName,
  isAdmin,
}: DashboardClientProps) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {userName}! Here is your store overview.</p>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', padding: '1.5rem 2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: '0.25rem' }}>Welcome to Gujarat Mobile Accessories! 📱</h2>
        <p style={{ opacity: 0.9, margin: 0 }}>Your central hub for managing inventory, tracking sales, and growing your business.</p>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <Link href="/alerts" className="alert-banner-link">
          <div className="alert-banner warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span><strong>{lowStockItems.length} items</strong> need attention — stock is running low!</span>
          </div>
        </Link>
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
              activities.map((activity: any) => (
                <div key={activity.id} className="activity-item">
                  <div className={`activity-icon ${activity.type === 'sale' ? activity.paymentType : 'gift'}`}>
                    {activity.type === 'sale' ? (
                      activity.paymentType === 'cash' ? '₹' : '📱'
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
                        : `Gift${activity.recipientName ? ` to ${activity.recipientName}` : ''}`
                      }
                      {' · '}{activity.userName}
                    </span>
                  </div>
                  <span className="activity-time">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
              ))
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
              const lowStock = items.filter((i: any) => i.stock > 0 && i.stock <= i.lowStockThreshold).length;
              const outOfStock = items.filter((i: any) => i.stock <= 0).length;
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
    </div>
  );
}
