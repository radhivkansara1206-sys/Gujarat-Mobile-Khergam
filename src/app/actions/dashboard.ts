'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function getDashboardStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total items and stock
    const itemStats = await prisma.item.aggregate({
      where: { isActive: true },
      _count: true,
      _sum: { stock: true },
    });

    // Calculate total inventory value
    const items = await prisma.item.findMany({
      where: { isActive: true },
      select: { sellingPrice: true, stock: true },
    });
    const totalValue = items.reduce((sum, item) => sum + item.sellingPrice * item.stock, 0);

    // Today's sales
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    });
    const todaySalesCash = todaySales
      .filter(s => s.paymentType === 'cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const todaySalesOnline = todaySales
      .filter(s => s.paymentType === 'online')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    // Low stock count
    // Manual filter for SQLite compatibility (no column comparison in where)
    const allActiveItems = await prisma.item.findMany({
      where: { isActive: true },
      select: { stock: true, lowStockThreshold: true },
    });
    const lowStockCount = allActiveItems.filter(i => i.stock > 0 && i.stock <= i.lowStockThreshold).length;
    const outOfStockCount = allActiveItems.filter(i => i.stock <= 0).length;

    return {
      success: true,
      data: {
        totalItems: itemStats._count || 0,
        totalStock: itemStats._sum?.stock || 0,
        totalValue,
        todaySalesCash,
        todaySalesOnline,
        todaySalesTotal: todaySalesCash + todaySalesOnline,
        lowStockCount,
        outOfStockCount,
      },
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}

export async function getRecentActivity() {
  try {
    const recentSales = await prisma.sale.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { name: true, category: { select: { name: true, icon: true } } } },
        user: { select: { name: true } },
      },
    });

    // We don't query the separate Gift table anymore, as gifts are now recorded as Sales with paymentType = 'gift'

    const recentReplacements = await prisma.replacement.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { name: true, category: { select: { name: true, icon: true } } } },
        user: { select: { name: true } },
      },
    });

    const salesMapped = recentSales.map(s => ({
      id: s.id,
      type: s.paymentType === 'gift' ? 'gift' as const : 'sale' as const,
      itemName: s.item.name,
      categoryName: s.item.category.name,
      categoryIcon: s.item.category.icon,
      quantity: s.quantity,
      amount: s.totalAmount,
      paymentType: s.paymentType === 'gift' ? null : s.paymentType,
      userName: s.user.name,
      recipientName: s.notes, // We use notes to store recipient name/reason for gifts
      createdAt: s.createdAt,
    }));

    const replacementsMapped = recentReplacements.map(r => ({
      id: r.id,
      type: 'replacement' as const,
      itemName: r.item.name,
      categoryName: r.item.category.name,
      categoryIcon: r.item.category.icon,
      quantity: r.quantity,
      amount: 0,
      paymentType: null,
      userName: r.user.name,
      recipientName: r.reason,
      createdAt: r.createdAt,
    }));

    const activities = [...salesMapped, ...replacementsMapped]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 15);

    return { success: true, data: activities };
  } catch (error) {
    console.error('Recent activity error:', error);
    return { success: false, error: 'Failed to fetch recent activity' };
  }
}

export async function getLowStockItems() {
  try {
    const items = await prisma.item.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    // Filter items where stock <= lowStockThreshold
    const lowStockItems = items.filter(i => i.stock <= i.lowStockThreshold);

    return { success: true, data: lowStockItems };
  } catch (error) {
    console.error('Low stock items error:', error);
    return { success: false, error: 'Failed to fetch low stock items' };
  }
}

export async function getDailySummaryAction(dateStr: string) {
  try {
    const session = await requireAuth();
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Sales for target date
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: targetDate, lt: nextDay },
      },
      include: { item: true },
    });

    const salesCash = sales
      .filter(s => s.paymentType === 'cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const salesOnline = sales
      .filter(s => s.paymentType === 'online')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const salesGift = sales
      .filter(s => s.paymentType === 'gift')
      .reduce((sum, s) => sum + s.quantity, 0);

    // Expenses for target date
    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: { gte: targetDate, lt: nextDay },
      },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Replacements for target date
    const replacements = await prisma.replacement.findMany({
      where: {
        createdAt: { gte: targetDate, lt: nextDay },
      },
    });
    const totalReplacements = replacements.reduce((sum, r) => sum + r.quantity, 0);

    // Group items sold
    const itemsSoldMap = new Map<string, { quantity: number; amount: number }>();
    sales.forEach((s) => {
      if (s.paymentType === 'gift') return;
      const current = itemsSoldMap.get(s.item.name) || { quantity: 0, amount: 0 };
      itemsSoldMap.set(s.item.name, {
        quantity: current.quantity + s.quantity,
        amount: current.amount + s.totalAmount,
      });
    });

    const itemsSold = Array.from(itemsSoldMap.entries()).map(([name, data]) => ({
      name,
      quantity: data.quantity,
      amount: data.amount,
    }));

    return {
      success: true,
      data: {
        salesCash,
        salesOnline,
        salesGift,
        salesTotal: salesCash + salesOnline,
        totalExpenses,
        totalReplacements,
        salesCount: sales.filter(s => s.paymentType !== 'gift').length,
        expensesCount: expenses.length,
        closedBy: session.name,
        itemsSold,
      },
    };
  } catch (error: any) {
    console.error('Get daily summary error:', error);
    return { success: false, error: error.message || 'Failed to fetch daily summary' };
  }
}
