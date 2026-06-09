'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getLocalDayBounds } from '@/lib/utils';

export async function recordSale(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const itemId = formData.get('itemId') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const paidAmount = parseFloat(formData.get('paidAmount') as string);
    const paymentType = formData.get('paymentType') as string;
    const referenceNumber = (formData.get('referenceNumber') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    if (!itemId) return { success: false, error: 'Item is required' };
    if (!quantity || quantity <= 0) return { success: false, error: 'Quantity must be greater than 0' };
    if (!paymentType || !['cash', 'online', 'gift'].includes(paymentType)) {
      return { success: false, error: 'Payment type must be cash, online, or gift' };
    }

    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST

    const dateStr = formData.get('date') as string;
    let createdAt = new Date();
    
    if (dateStr) {
      const bounds = getLocalDayBounds(dateStr, offsetMinutes);
      // Attempt to find a register for this date to align the time perfectly
      const register = await prisma.cashRegister.findFirst({
        where: { openedAt: { gte: bounds.start, lt: bounds.end } },
        orderBy: { openedAt: 'asc' }
      });
      if (register) {
        // Fall exactly inside the register! (1 min after opening to be safe)
        createdAt = new Date(register.openedAt.getTime() + 60000);
      } else {
        // Just use midday local time
        createdAt = new Date(bounds.start.getTime() + 12 * 3600000);
      }
    }
    
    // Automated validation logging
    console.log(`[Validation Log] Client date payload received: "${dateStr}"`);
    console.log(`[Validation Log] Storing in database as (UTC): "${createdAt.toISOString()}"`);

    const getLocalDateStr = (date: Date, offset: number) => {
      const localTime = new Date(date.getTime() - offset * 60000);
      return `${localTime.getUTCFullYear()}-${String(localTime.getUTCMonth() + 1).padStart(2, '0')}-${String(localTime.getUTCDate()).padStart(2, '0')}`;
    };

    const saleDateStr = getLocalDateStr(createdAt, offsetMinutes);
    const todayDateStr = getLocalDateStr(new Date(), offsetMinutes);
    const isPastDate = saleDateStr !== todayDateStr;

    if (paymentType === 'cash' && !isPastDate) {
      const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } });
      if (!openRegister) return { success: false, error: 'Cannot process cash sale for today: Drawer is closed. Please open the ROJMEL first.' };
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
          totalAmount: !isNaN(paidAmount) ? paidAmount : item.sellingPrice * quantity,
          paymentType,
          referenceNumber,
          notes,
          createdAt,
        },
      });

      // Deduct stock
      await tx.item.update({
        where: { id: itemId },
        data: { stock: { decrement: quantity } },
      });

      return sale;
    });

    revalidatePath('/', 'layout');
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
    
    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST

    if (filters?.startDate) {
      const bounds = getLocalDayBounds(filters.startDate, offsetMinutes);
      where.createdAt = { ...where.createdAt, gte: bounds.start };
    }
    if (filters?.endDate) {
      const bounds = getLocalDayBounds(filters.endDate, offsetMinutes);
      where.createdAt = { ...where.createdAt, lte: bounds.end };
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

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('Delete sale error:', error);
    return { success: false, error: error.message || 'Failed to delete sale' };
  }
}

export async function updateSalePaymentType(id: string, paymentType: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can edit payment types' };
    }

    if (!['cash', 'online', 'gift'].includes(paymentType)) {
      return { success: false, error: 'Invalid payment type' };
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: { paymentType }
    });

    revalidatePath('/', 'layout');
    return { success: true, data: sale };
  } catch (error: any) {
    console.error('Update payment type error:', error);
    return { success: false, error: 'Failed to update payment type' };
  }
}
