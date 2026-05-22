'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function recordSale(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const itemId = formData.get('itemId') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const paymentType = formData.get('paymentType') as string;
    const referenceNumber = (formData.get('referenceNumber') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    if (!itemId) return { success: false, error: 'Item is required' };
    if (!quantity || quantity <= 0) return { success: false, error: 'Quantity must be greater than 0' };
    if (!paymentType || !['cash', 'online', 'gift'].includes(paymentType)) {
      return { success: false, error: 'Payment type must be cash, online, or gift' };
    }

    // Atomic transaction: create sale + deduct stock
    const result = await prisma.$transaction(async (tx) => {
      // Check current stock
      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item) throw new Error('Item not found');
      if (!item.isActive) throw new Error('Item is no longer available');
      if (item.stock < quantity) throw new Error(`Insufficient stock. Available: ${item.stock}`);

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          itemId,
          userId: session.userId,
          quantity,
          unitPrice: item.sellingPrice,
          totalAmount: item.sellingPrice * quantity,
          paymentType,
          referenceNumber,
          notes,
        },
      });

      // Deduct stock
      await tx.item.update({
        where: { id: itemId },
        data: { stock: { decrement: quantity } },
      });

      return sale;
    });

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/');
    revalidatePath('/alerts');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Record sale error:', error);
    return { success: false, error: error.message || 'Failed to record sale' };
  }
}

export async function getSales(filters?: {
  startDate?: string;
  endDate?: string;
  paymentType?: string;
  categoryId?: string;
}) {
  try {
    const where: any = {};
    
    if (filters?.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
    }
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: endDate };
    }
    if (filters?.paymentType && filters.paymentType !== 'all') {
      where.paymentType = filters.paymentType;
    }
    if (filters?.categoryId && filters.categoryId !== 'all') {
      where.item = { categoryId: filters.categoryId };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        item: { include: { category: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Calculate totals
    const totalCash = sales
      .filter(s => s.paymentType === 'cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const totalOnline = sales
      .filter(s => s.paymentType === 'online')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    return {
      success: true,
      data: {
        sales,
        totalCash,
        totalOnline,
        totalAmount: totalCash + totalOnline,
        count: sales.length,
      },
    };
  } catch (error) {
    console.error('Get sales error:', error);
    return { success: false, error: 'Failed to fetch sales' };
  }
}

export async function deleteSale(saleId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can delete sales' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the sale
      const sale = await tx.sale.findUnique({ where: { id: saleId } });
      if (!sale) throw new Error('Sale not found');

      // Revert stock (add the quantity back)
      await tx.item.update({
        where: { id: sale.itemId },
        data: { stock: { increment: sale.quantity } },
      });

      // Delete the sale record
      await tx.sale.delete({ where: { id: saleId } });

      return true;
    });

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/');
    revalidatePath('/alerts');
    return { success: true };
  } catch (error: any) {
    console.error('Delete sale error:', error);
    return { success: false, error: error.message || 'Failed to delete sale' };
  }
}
