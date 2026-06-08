'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getLocalDayBounds, getTodayBounds } from '@/lib/utils';

export async function getDashboardStats() {
  try {
    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST

    const bounds = getTodayBounds(offsetMinutes);
    const today = bounds.start;
    const tomorrow = bounds.end;

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
      select: { stock: true, lowStockThreshold: true, isAlertDismissed: true },
    });
    const lowStockCount = allActiveItems.filter(i => !i.isAlertDismissed && i.stock > 0 && i.stock <= i.lowStockThreshold).length;
    const outOfStockCount = allActiveItems.filter(i => !i.isAlertDismissed && i.stock <= 0).length;

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

    // Filter items where stock <= lowStockThreshold and not dismissed
    const lowStockItems = items.filter(i => !i.isAlertDismissed && i.stock <= i.lowStockThreshold);

    return { success: true, data: lowStockItems };
  } catch (error) {
    console.error('Low stock items error:', error);
    return { success: false, error: 'Failed to fetch low stock items' };
  }
}

export async function getDailySummaryAction(dateStr: string) {
  try {
    const session = await requireAuth();
    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST

    const bounds = getLocalDayBounds(dateStr, offsetMinutes);
    const targetDate = bounds.start;
    const nextDay = bounds.end;

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

    // Gifts for target date - gifts are recorded as Sales with paymentType='gift'
    // The separate Gift table is legacy; all new gifts go through the Sale table
    const giftSales = sales.filter(s => s.paymentType === 'gift');
    const giftsFromSales = giftSales.map(s => ({
      id: s.id,
      itemName: s.item.name,
      quantity: s.quantity,
      recipientName: '',
      reason: s.notes || '',
    }));

    // Also check the legacy Gift table for older records
    const legacyGifts = await prisma.gift.findMany({
      where: {
        createdAt: { gte: targetDate, lt: nextDay },
      },
      include: {
        item: { select: { name: true } }
      }
    });
    const legacyGiftsMapped = legacyGifts.map(g => ({
      id: g.id,
      itemName: g.item.name,
      quantity: g.quantity,
      recipientName: g.recipientName || '',
      reason: g.reason || '',
    }));

    // Merge both sources
    const allGifts = [...giftsFromSales, ...legacyGiftsMapped];

    // Replacements for target date
    const replacements = await prisma.replacement.findMany({
      where: {
        createdAt: { gte: targetDate, lt: nextDay },
      },
    });
    const totalReplacements = replacements.reduce((sum, r) => sum + r.quantity, 0);

    // Fetch ROJMEL for the day
    let register = await prisma.cashRegister.findFirst({
      where: {
        openedAt: { gte: targetDate, lt: nextDay }
      },
      include: {
        movements: true
      }
    });

    // Fallback: If querying today's date and no register is found within boundaries, check for a currently active OPEN register
    if (!register) {
      const getLocalDateStr = (date: Date, offset: number) => {
        const localTime = new Date(date.getTime() - offset * 60000);
        return `${localTime.getUTCFullYear()}-${String(localTime.getUTCMonth() + 1).padStart(2, '0')}-${String(localTime.getUTCDate()).padStart(2, '0')}`;
      };
      const todayStr = getLocalDateStr(new Date(), offsetMinutes);
      if (todayStr === dateStr) {
        register = await prisma.cashRegister.findFirst({
          where: { status: 'OPEN' },
          include: {
            movements: true
          }
        });
      }
    }

    let expectedCash = 0;
    if (register) {
      const registerSales = await prisma.sale.aggregate({
        where: {
          paymentType: 'cash',
          createdAt: { gte: register.openedAt }
        },
        _sum: { totalAmount: true }
      });
      
      const registerExpenses = await prisma.expense.aggregate({
        where: {
          createdAt: { gte: register.openedAt }
        },
        _sum: { amount: true }
      });

      const cashSales = registerSales._sum.totalAmount || 0;
      const cashExpenses = registerExpenses._sum.amount || 0;
      
      const additions = register.movements.filter(m => m.type === 'ADDITION').reduce((acc, m) => acc + m.amount, 0);
      const removals = register.movements.filter(m => m.type === 'REMOVAL').reduce((acc, m) => acc + m.amount, 0);

      expectedCash = register.openingBalance + cashSales + additions - cashExpenses - removals;
    }

    // Group items sold by item and payment type (include gifts)
    const itemsSoldMap = new Map<string, { name: string; paymentType: string; quantity: number; amount: number }>();
    sales.forEach((s) => {
      const key = `${s.item.name}-${s.paymentType}`;
      const current = itemsSoldMap.get(key) || { name: s.item.name, paymentType: s.paymentType, quantity: 0, amount: 0 };
      itemsSoldMap.set(key, {
        name: s.item.name,
        paymentType: s.paymentType,
        quantity: current.quantity + s.quantity,
        amount: current.amount + s.totalAmount,
      });
    });

    const itemsSold = Array.from(itemsSoldMap.values());

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
        register,
        expectedCash,
        itemsSold,
        expenses: expenses.map(e => ({
          id: e.id,
          category: e.category,
          description: e.description || '',
          amount: e.amount
        })),
        gifts: allGifts,
      },
    };
  } catch (error: any) {
    console.error('Get daily summary error:', error);
    return { success: false, error: error.message || 'Failed to fetch daily summary' };
  }
}
