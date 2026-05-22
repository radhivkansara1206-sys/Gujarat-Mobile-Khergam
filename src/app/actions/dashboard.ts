'use server';

import { prisma } from '@/lib/prisma';

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

    const activities = recentSales.map(s => ({
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
