'use client';

import { useState } from 'react';
import BackButton from '@/components/BackButton';
import { formatCurrency } from '@/lib/utils';

interface AnalyticsClientProps {
  data: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    salesTrend: { date: string; sales: number; expenses: number }[];
    salesByCategory: { name: string; icon: string; color: string; value: number; count: number }[];
    paymentShare: { cash: number; online: number };
    expenseBreakdown: { category: string; amount: number }[];
    topSellingProducts: { name: string; quantity: number; revenue: number }[];
  };
}

export default function AnalyticsClient({ data }: AnalyticsClientProps) {
  const {
    totalRevenue,
    totalExpenses,
    netProfit,
    salesTrend,
    salesByCategory,
    paymentShare,
    expenseBreakdown,
    topSellingProducts,
  } = data;

  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');

  // --- SVG Chart Math ---
  const maxVal = Math.max(...salesTrend.map(d => Math.max(d.sales, d.expenses)), 1000) * 1.1; // Add 10% breathing room
  const width = 650;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => paddingLeft + (index / (salesTrend.length - 1)) * chartWidth;
  const getY = (val: number) => height - paddingBottom - (val / maxVal) * chartHeight;

  // Polyline coordinates
  const salesPoints = salesTrend.map((d, i) => `${getX(i).toFixed(1)},${getY(d.sales).toFixed(1)}`).join(' ');
  const salesAreaPoints = `${getX(0).toFixed(1)},${(height - paddingBottom).toFixed(1)} ${salesPoints} ${getX(salesTrend.length - 1).toFixed(1)},${(height - paddingBottom).toFixed(1)}`;

  const expPoints = salesTrend.map((d, i) => `${getX(i).toFixed(1)},${getY(d.expenses).toFixed(1)}`).join(' ');
  const expAreaPoints = `${getX(0).toFixed(1)},${(height - paddingBottom).toFixed(1)} ${expPoints} ${getX(salesTrend.length - 1).toFixed(1)},${(height - paddingBottom).toFixed(1)}`;

  // Payment percentages
  const totalPayment = paymentShare.cash + paymentShare.online;
  const cashPct = totalPayment > 0 ? (paymentShare.cash / totalPayment) * 100 : 0;
  const onlinePct = totalPayment > 0 ? (paymentShare.online / totalPayment) * 100 : 0;

  // Expense total helper
  const totalCatValue = salesByCategory.reduce((sum, c) => sum + c.value, 0);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <BackButton />
      
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Visual Analytics</h1>
          <p className="page-subtitle">Store intelligence, sales trends, payment modes, and expense diagnostics for the last 30 days.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {/* Total Revenue */}
        <div className="stat-card sales" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-card-label" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total Revenue</span>
            <div className="stat-card-icon" style={{ background: '#fef3c7', color: 'var(--primary)' }}>💰</div>
          </div>
          <h2 className="stat-card-value" style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800 }}>
            {formatCurrency(totalRevenue)}
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--success)' }}>
            🟢 Active sales ledger
          </p>
        </div>

        {/* Total Expenses */}
        <div className="stat-card alerts" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-card-label" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total Expenses</span>
            <div className="stat-card-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>💸</div>
          </div>
          <h2 className="stat-card-value" style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>
            {formatCurrency(totalExpenses)}
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#c2410c' }}>
            🔴 Outflowing operational costs
          </p>
        </div>

        {/* Net Revenue */}
        <div className="stat-card value" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-card-label" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Net Profit</span>
            <div className="stat-card-icon" style={{ background: '#d1fae5', color: '#10b981' }}>📈</div>
          </div>
          <h2 className="stat-card-value" style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(netProfit)}
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: netProfit >= 0 ? 'var(--success)' : 'var(--text-danger)' }}>
            {netProfit >= 0 ? '🟢 Net positive business yield' : '🔴 Net loss in this cycle'}
          </p>
        </div>
      </div>

      {/* Main Graph Card */}
      <div className="table-container" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              📈 Sales & Operations Trend (Last 30 Days)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Comparing incoming sales revenue with operational cash expenses.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--border-light)', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
              onClick={() => setActiveTab('sales')} 
              className={`btn btn-sm ${activeTab === 'sales' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', border: 'none' }}
            >
              Show Sales Trend
            </button>
            <button 
              onClick={() => setActiveTab('expenses')} 
              className={`btn btn-sm ${activeTab === 'expenses' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', border: 'none', background: activeTab === 'expenses' ? '#ef4444' : 'transparent', color: activeTab === 'expenses' ? 'white' : 'inherit' }}
            >
              Show Expense Trend
            </button>
          </div>
        </div>

        {/* Custom SVG Line Chart */}
        <div style={{ width: '100%', overflowX: 'auto', padding: '0.5rem 0' }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="sales-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="exp-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines and Y labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const val = maxVal * ratio;
              const y = getY(val);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fontWeight="500"
                    fill="var(--text-muted)"
                  >
                    ₹{val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* X axis line */}
            <line 
              x1={paddingLeft} 
              y1={height - paddingBottom} 
              x2={width - paddingRight} 
              y2={height - paddingBottom} 
              stroke="var(--text-muted)" 
              strokeWidth="1" 
            />

            {/* X Axis Labels */}
            {salesTrend.map((d, i) => {
              if (i % 5 !== 0 && i !== salesTrend.length - 1) return null;
              return (
                <g key={i}>
                  <line
                    x1={getX(i)}
                    y1={height - paddingBottom}
                    x2={getX(i)}
                    y2={height - paddingBottom + 4}
                    stroke="var(--text-muted)"
                    strokeWidth="1"
                  />
                  <text
                    x={getX(i)}
                    y={height - paddingBottom + 16}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="500"
                    fill="var(--text-muted)"
                  >
                    {d.date}
                  </text>
                </g>
              );
            })}

            {/* Render Areas */}
            {activeTab === 'sales' ? (
              <>
                <polygon points={salesAreaPoints} fill="url(#sales-gradient)" />
                <polyline points={salesPoints} fill="none" stroke="var(--primary)" strokeWidth="3" />
                {/* Dots on Sales points */}
                {salesTrend.map((d, i) => {
                  if (i % 2 !== 0 && i !== salesTrend.length - 1) return null;
                  return (
                    <circle
                      key={i}
                      cx={getX(i)}
                      cy={getY(d.sales)}
                      r="4"
                      fill="var(--primary)"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </>
            ) : (
              <>
                <polygon points={expAreaPoints} fill="url(#exp-gradient)" />
                <polyline points={expPoints} fill="none" stroke="#ef4444" strokeWidth="3" />
                {/* Dots on Expense points */}
                {salesTrend.map((d, i) => {
                  if (i % 2 !== 0 && i !== salesTrend.length - 1) return null;
                  return (
                    <circle
                      key={i}
                      cx={getX(i)}
                      cy={getY(d.expenses)}
                      r="4"
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="dashboard-grid">
        {/* Sales by Category Ledger */}
        <div className="table-container" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📦</span> Sales by Category Share
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {salesByCategory.length === 0 ? (
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No category sales recorded in the past 30 days.
              </p>
            ) : (
              salesByCategory.map((cat, idx) => {
                const pct = totalCatValue > 0 ? (cat.value / totalCatValue) * 100 : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ fontSize: '1.15rem' }}>{cat.icon}</span> {cat.name}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(cat.value)}{' '}
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                          ({pct.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    {/* Progress line */}
                    <div style={{ width: '100%', height: '7px', background: 'var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${pct}%`, 
                          height: '100%', 
                          background: cat.color || 'var(--primary)', 
                          borderRadius: '10px',
                          transition: 'width 0.8s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Split & Expenses Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Payment splits */}
          <div className="table-container" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
              💳 Payment Mode Share
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Online split */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: '#eff6ff', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                <div>
                  <span className="payment-badge online" style={{ marginBottom: '0.35rem' }}>📱 UPI / Online</span>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e40af' }}>{formatCurrency(paymentShare.online)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e40af' }}>{onlinePct.toFixed(0)}%</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#60a5fa' }}>Safe UPI clearance</p>
                </div>
              </div>

              {/* Cash split */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'var(--success-light)', borderRadius: '12px', border: '1px solid var(--success)' }}>
                <div>
                  <span className="payment-badge cash" style={{ marginBottom: '0.35rem' }}>💵 Cash In Hand</span>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--success-dark)' }}>{formatCurrency(paymentShare.cash)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--success-dark)' }}>{cashPct.toFixed(0)}%</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--success)' }}>Drawer vault cash</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses categories breakdown */}
          <div className="table-container" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
              💸 Expense Diagnostics
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {expenseBreakdown.length === 0 ? (
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No expense records logged in the past 30 days.
                </p>
              ) : (
                expenseBreakdown.map((exp, idx) => {
                  const pct = totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        • {exp.category}
                      </span>
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>
                        {formatCurrency(exp.amount)}{' '}
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                          ({pct.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Products Card */}
      <div className="table-container" style={{ marginTop: '2rem' }}>
        <div className="table-header">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            🏆 Top 5 Accessories by Sales Quantity
          </h2>
          <span style={{ fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary-hover)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
            Past 30 Days
          </span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                <th>Product Details</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Units Sold</th>
                <th style={{ textAlign: 'right', width: '160px' }}>Gross Revenue</th>
              </tr>
            </thead>
            <tbody>
            {topSellingProducts.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No item sales logged in this period.
                </td>
              </tr>
            ) : (
              topSellingProducts.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>
                    <span 
                      style={{ 
                        display: 'inline-flex', 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '12px', 
                        background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : 'var(--border-light)',
                        color: idx === 0 ? '#d97706' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : 'var(--text-secondary)',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.name}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.quantity} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>pcs</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(p.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
