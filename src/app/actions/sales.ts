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

    const isCustomItem = formData.get('isCustomItem') === 'true';
    const updateDefaultPrice = formData.get('updateDefaultPrice') === 'true';
    const itemId = formData.get('itemId') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const paidAmount = parseFloat(formData.get('paidAmount') as string);
    const paymentType = formData.get('paymentType') as string;
    const referenceNumber = (formData.get('referenceNumber') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    if (!isCustomItem && !itemId) return { success: false, error: 'Item is required' };
    if (!quantity || quantity <= 0) return { success: false, error: 'Quantity must be greater than 0' };
    if (!paymentType || !['cash', 'online', 'gift'].includes(paymentType)) {
      return { success: false, error: 'Payment type must be cash, online, or gift' };
    }

    const dateStr = formData.get('date') as string;
    let createdAt = dateStr ? new Date(dateStr) : new Date();
    
    const cookieStore = cookies();
    const offsetStr = cookieStore.get('timezoneOffset')?.value;
    const offsetMinutes = offsetStr ? parseInt(offsetStr) : -330; // default to IST

    const getLocalDate = (d: Date) => new Date(d.getTime() - offsetMinutes * 60000);
    const localCreatedAt = getLocalDate(createdAt);
    const localNow = getLocalDate(new Date());

    const isPastDate = 
      localCreatedAt.getUTCFullYear() !== localNow.getUTCFullYear() ||
      localCreatedAt.getUTCMonth() !== localNow.getUTCMonth() ||
      localCreatedAt.getUTCDate() !== localNow.getUTCDate();

    if (isPastDate) {
      const bounds = getLocalDayBounds(
        `${localCreatedAt.getUTCFullYear()}-${String(localCreatedAt.getUTCMonth() + 1).padStart(2, '0')}-${String(localCreatedAt.getUTCDate()).padStart(2, '0')}`, 
        offsetMinutes
      );
      
      const register = await prisma.cashRegister.findFirst({
        where: { openedAt: { gte: bounds.start, lt: bounds.end } },
        orderBy: { openedAt: 'asc' }
      });
      if (register) {
        createdAt = new Date(register.openedAt.getTime() + 60000);
      }
    }

    if (paymentType === 'cash' && !isPastDate) {
      const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } });
      if (!openRegister) return { success: false, error: 'Cannot process cash sale for today: Drawer is closed. Please open the ROJMEL first.' };
    }

    // Atomic transaction: create sale + deduct stock
    const result = await prisma.$transaction(async (tx) => {
      let finalItemId = itemId;
      let unitPrice = 0;

      if (isCustomItem) {
        const customName = formData.get('customName') as string;
        const customBrand = (formData.get('customBrand') as string) || '';
        const customCategoryId = formData.get('customCategoryId') as string;
        const customPrice = parseFloat(formData.get('customPrice') as string) || 0;

        if (!customName || !customCategoryId) throw new Error('Custom item name and category are required');

        // Create the item with stock = quantity, so after sale it becomes 0
        const newItem = await tx.item.create({
          data: {
            name: customName.trim() + ' (Custom/Unlisted)',
            brand: customBrand.trim(),
            categoryId: customCategoryId,
            sellingPrice: customPrice,
            purchasePrice: 0,
            stock: quantity,
            lowStockThreshold: 0,
          }
        });
        finalItemId = newItem.id;
        unitPrice = customPrice;
      } else {
        const item = await tx.item.findUnique({ where: { id: finalItemId } });
        if (!item) throw new Error('Item not found');
        if (!item.isActive) throw new Error('Item is no longer available');
        if (item.stock < quantity) throw new Error(`Insufficient stock. Available: ${item.stock}`);
        unitPrice = item.sellingPrice;
        
        // Update default price if requested
        if (updateDefaultPrice && !isNaN(paidAmount) && quantity > 0) {
          const newUnitPrice = paidAmount / quantity;
          await tx.item.update({
            where: { id: finalItemId },
            data: { sellingPrice: newUnitPrice },
          });
          unitPrice = newUnitPrice;
        }
      }

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          itemId: finalItemId,
          userId: session.userId,
          quantity,
          unitPrice: unitPrice,
          totalAmount: !isNaN(paidAmount) ? paidAmount : unitPrice * quantity,
          paymentType,
          referenceNumber,
          notes,
          createdAt,
        },
      });

      // Deduct stock
      await tx.item.update({
        where: { id: finalItemId },
        data: { stock: { decrement: quantity } },
      });

      // Recalculate frozen closed register if backdated sale fell into it
      if (paymentType === 'cash') {
        const targetRegister = await tx.cashRegister.findFirst({
          where: { status: 'CLOSED', closedAt: { gte: sale.createdAt } },
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
      }

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
    await requireAuth();
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
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
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

export async function updateSaleTime(saleId: string, newTimeStr: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can reorder sales' };
    }

    const newTime = new Date(newTimeStr);

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId } });
      if (!sale) throw new Error('Sale not found');

      // Update the time
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: { createdAt: newTime }
      });

      // Recalculate closed register if this sale's new or old time affects a CLOSED register
      if (sale.paymentType === 'cash') {
        const registersToUpdate = new Set<string>();

        // Find the register it WAS in
        const oldRegister = await tx.cashRegister.findFirst({
          where: { status: 'CLOSED', closedAt: { gte: sale.createdAt } },
          orderBy: { closedAt: 'asc' }
        });
        if (oldRegister) registersToUpdate.add(oldRegister.id);

        // Find the register it IS in now
        const newRegister = await tx.cashRegister.findFirst({
          where: { status: 'CLOSED', closedAt: { gte: newTime } },
          orderBy: { closedAt: 'asc' }
        });
        if (newRegister) registersToUpdate.add(newRegister.id);

        for (const regId of Array.from(registersToUpdate)) {
          const targetRegister = await tx.cashRegister.findUnique({ where: { id: regId } });
          if (!targetRegister || !targetRegister.closedAt) continue;

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
      }

      return updatedSale;
    });

    revalidatePath('/', 'layout');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Update sale time error:', error);
    return { success: false, error: error.message || 'Failed to update sale time' };
  }
}

export async function updateSaleAmount(id: string, newAmount: number) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can edit sale amounts' };
    }

    if (isNaN(newAmount) || newAmount < 0) {
      return { success: false, error: 'Invalid amount' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id } });
      if (!sale) throw new Error('Sale not found');

      // Update the totalAmount
      const updatedSale = await tx.sale.update({
        where: { id },
        data: { totalAmount: newAmount }
      });

      // Recalculate closed register if this sale is cash and its time falls into a CLOSED register
      if (sale.paymentType === 'cash') {
        const targetRegister = await tx.cashRegister.findFirst({
          where: { status: 'CLOSED', closedAt: { gte: sale.createdAt } },
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
      }

      return updatedSale;
    });

    revalidatePath('/', 'layout');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Update sale amount error:', error);
    return { success: false, error: error.message || 'Failed to update sale amount' };
  }
}

