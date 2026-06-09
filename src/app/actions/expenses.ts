'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getLocalDayBounds } from '@/lib/utils';

export async function recordExpense(formData: FormData) {
  try {
    const session = await requireAuth();
    
    // Only admins should record expenses, or maybe staff too? Let's restrict to admin for now,
    // or maybe allow staff if they pay for tea? Let's restrict to admin to be safe.
    if (session.role !== 'admin') {
       return { success: false, error: 'Only admins can record expenses' };
    }

    const amount = parseFloat(formData.get('amount') as string);
    const category = formData.get('category') as string;
    const description = formData.get('description') as string || '';
    
    // Date override
    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST

    const dateStr = formData.get('date') as string;
    let createdAt = new Date();
    
    if (dateStr) {
      const bounds = getLocalDayBounds(dateStr, offsetMinutes);
      const register = await prisma.cashRegister.findFirst({
        where: { openedAt: { gte: bounds.start, lt: bounds.end } },
        orderBy: { openedAt: 'asc' }
      });
      if (register) {
        createdAt = new Date(register.openedAt.getTime() + 60000);
      } else {
        createdAt = new Date(bounds.start.getTime() + 12 * 3600000);
      }
    }
    
    // Automated validation logging
    console.log(`[Validation Log] Client date payload received (Expense): "${dateStr}"`);
    console.log(`[Validation Log] Storing in database as (UTC) (Expense): "${createdAt.toISOString()}"`);

    const getLocalDateStr = (date: Date, offset: number) => {
      const localTime = new Date(date.getTime() - offset * 60000);
      return `${localTime.getUTCFullYear()}-${String(localTime.getUTCMonth() + 1).padStart(2, '0')}-${String(localTime.getUTCDate()).padStart(2, '0')}`;
    };

    const expenseDateStr = getLocalDateStr(createdAt, offsetMinutes);
    const todayDateStr = getLocalDateStr(new Date(), offsetMinutes);
    const isPastDate = expenseDateStr !== todayDateStr;

    if (isNaN(amount) || amount <= 0) return { success: false, error: 'Valid amount is required' };
    if (!category) return { success: false, error: 'Category is required' };

    if (!isPastDate) {
      const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } });
      if (!openRegister) return { success: false, error: 'Cannot record expense for today: Drawer is closed. Please open the ROJMEL first.' };
    }

    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          amount,
          category,
          description,
          userId: session.id, // Note: session.id is used here
          createdAt,
        }
      });

      const targetRegister = await tx.cashRegister.findFirst({
        where: { status: 'CLOSED', closedAt: { gte: exp.createdAt } },
        orderBy: { closedAt: 'asc' }
      });

      if (targetRegister && targetRegister.closedAt) {
        const prevReg = await tx.cashRegister.findFirst({
          where: { status: 'CLOSED', closedAt: { lte: targetRegister.openedAt } },
          orderBy: { closedAt: 'desc' }
        });
        const startTime = prevReg?.closedAt || targetRegister.openedAt;

        const rSales = await tx.sale.aggregate({
          where: { paymentType: 'cash', createdAt: { gte: startTime, lte: targetRegister.closedAt } },
          _sum: { totalAmount: true }
        });
        const rExpenses = await tx.expense.aggregate({
          where: { createdAt: { gte: startTime, lte: targetRegister.closedAt } },
          _sum: { amount: true }
        });
        const moves = await tx.cashMovement.findMany({
          where: { registerId: targetRegister.id, createdAt: { lte: targetRegister.closedAt } }
        });
        
        const adds = moves.filter(m => m.type === 'ADDITION').reduce((a, b) => a + b.amount, 0);
        const rems = moves.filter(m => m.type === 'REMOVAL').reduce((a, b) => a + b.amount, 0);

        const expectedClosing = targetRegister.openingBalance + (rSales._sum.totalAmount || 0) + adds - (rExpenses._sum.amount || 0) - rems;
        const discrepancy = (targetRegister.closingBalance || 0) - expectedClosing;

        await tx.cashRegister.update({
          where: { id: targetRegister.id },
          data: { expectedClosingBalance: expectedClosing, discrepancyAmount: discrepancy }
        });
      }

      return exp;
    });

    revalidatePath('/', 'layout');
    return { success: true, data: expense };
  } catch (error: any) {
    console.error('Record expense error:', error);
    return { success: false, error: error.message || 'Failed to record expense' };
  }
}

export async function getExpenses(filters?: { startDate?: string; endDate?: string; category?: string }) {
  try {
    await requireAuth(); // Admin or staff can view? Admin only for expenses usually.
    const session = await getSession();
    if (session?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    let where: any = {};

    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        const bounds = getLocalDayBounds(filters.startDate, offsetMinutes);
        where.createdAt.gte = bounds.start;
      }
      if (filters.endDate) {
        const bounds = getLocalDayBounds(filters.endDate, offsetMinutes);
        where.createdAt.lte = bounds.end;
      }
    }

    if (filters?.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return { 
      success: true, 
      data: {
        expenses,
        totalAmount,
        count: expenses.length
      }
    };
  } catch (error: any) {
    console.error('Get expenses error:', error);
    return { success: false, error: 'Failed to fetch expenses' };
  }
}

export async function deleteExpense(id: string) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return { success: false, error: 'Unauthorized' };

    await prisma.expense.delete({
      where: { id }
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('Delete expense error:', error);
    return { success: false, error: 'Failed to delete expense' };
  }
}
