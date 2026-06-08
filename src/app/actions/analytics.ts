'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getTodayBounds } from '@/lib/utils';

export async function getAnalyticsData() {
  try {
    await requireAuth();

    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST
    const timezone = cookieStore.get('timezone')?.value || 'Asia/Kolkata';

    // Get start of today in client's timezone, then subtract 30 days
    const todayBounds = getTodayBounds(offsetMinutes);
    const thirtyDaysAgo = new Date(todayBounds.start);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        item: {
          include: { category: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'asc' }
    });

    // 2. Sales Trend (Revenue & Expenses over last 30 days, grouped by date)
    const trendMap = new Map<string, { date: string; sales: number; expenses: number }>();
    
    // Initialize last 30 days with 0 values
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { timeZone: timezone, day: '2-digit', month: 'short' });
      trendMap.set(dateStr, { date: dateStr, sales: 0, expenses: 0 });
    }

    sales.forEach(sale => {
      const dateStr = new Date(sale.createdAt).toLocaleDateString('en-IN', { timeZone: timezone, day: '2-digit', month: 'short' });
      if (trendMap.has(dateStr)) {
        const cur = trendMap.get(dateStr)!;
        cur.sales += sale.totalAmount;
      }
    });

    expenses.forEach(exp => {
      const dateStr = new Date(exp.createdAt).toLocaleDateString('en-IN', { timeZone: timezone, day: '2-digit', month: 'short' });
      if (trendMap.has(dateStr)) {
        const cur = trendMap.get(dateStr)!;
        cur.expenses += exp.amount;
      }
    });

    const salesTrend = Array.from(trendMap.values());

    // 3. Sales by Category
    const categoryMap = new Map<string, { name: string; icon: string; color: string; value: number; count: number }>();
    
    sales.forEach(sale => {
      if (sale.paymentType === 'gift') return;
      const cat = sale.item.category;
      const cur = categoryMap.get(cat.id) || { name: cat.name, icon: cat.icon, color: cat.color, value: 0, count: 0 };
      cur.value += sale.totalAmount;
      cur.count += sale.quantity;
      categoryMap.set(cat.id, cur);
    });

    const salesByCategory = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value);

    // 4. Payment Type Share
    let cashSales = 0;
    let onlineSales = 0;
    sales.forEach(sale => {
      if (sale.paymentType === 'cash') cashSales += sale.totalAmount;
      if (sale.paymentType === 'online') onlineSales += sale.totalAmount;
    });

    // 5. Expense Breakdown
    const expenseMap = new Map<string, { category: string; amount: number }>();
    expenses.forEach(exp => {
      const cur = expenseMap.get(exp.category) || { category: exp.category, amount: 0 };
      cur.amount += exp.amount;
      expenseMap.set(exp.category, cur);
    });

    const expenseBreakdown = Array.from(expenseMap.values()).sort((a, b) => b.amount - a.amount);

    // 6. Top Selling Products (by quantity)
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales.forEach(sale => {
      if (sale.paymentType === 'gift') return;
      const cur = productMap.get(sale.item.id) || { name: sale.item.name, quantity: 0, revenue: 0 };
      cur.quantity += sale.quantity;
      cur.revenue += sale.totalAmount;
      productMap.set(sale.item.id, cur);
    });

    const topSellingProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 7. General Aggregated Totals
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        salesTrend,
        salesByCategory,
        paymentShare: { cash: cashSales, online: onlineSales },
        expenseBreakdown,
        topSellingProducts,
      }
    };
  } catch (error: any) {
    console.error('Analytics data error:', error);
    return { success: false, error: error.message || 'Failed to fetch analytics data' };
  }
}
