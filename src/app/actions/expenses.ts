'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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
    const dateStr = formData.get('date') as string;
    let createdAt = new Date();
    if (dateStr) {
      // Create a Date object from the YYYY-MM-DD input, keeping the local time
      const [year, month, day] = dateStr.split('-').map(Number);
      createdAt = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone issues
    }

    if (isNaN(amount) || amount <= 0) return { success: false, error: 'Valid amount is required' };
    if (!category) return { success: false, error: 'Category is required' };

    const expense = await prisma.expense.create({
      data: {
        amount,
        category,
        description,
        userId: session.id,
        createdAt,
      }
    });

    revalidatePath('/expenses');
    revalidatePath('/');
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

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
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

    revalidatePath('/expenses');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Delete expense error:', error);
    return { success: false, error: 'Failed to delete expense' };
  }
}
