'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function recordGift(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const itemId = formData.get('itemId') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const recipientName = (formData.get('recipientName') as string) || '';
    const reason = (formData.get('reason') as string) || '';

    if (!itemId) return { success: false, error: 'Item is required' };
    if (!quantity || quantity <= 0) return { success: false, error: 'Quantity must be greater than 0' };

    // Atomic transaction: create gift + deduct stock (NO payment entry)
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item) throw new Error('Item not found');
      if (!item.isActive) throw new Error('Item is no longer available');
      if (item.stock < quantity) throw new Error(`Insufficient stock. Available: ${item.stock}`);

      // Create gift record (NO payment/sale entry)
      const gift = await tx.gift.create({
        data: {
          itemId,
          userId: session.userId,
          quantity,
          recipientName,
          reason,
        },
      });

      // Deduct stock
      await tx.item.update({
        where: { id: itemId },
        data: { stock: { decrement: quantity } },
      });

      return gift;
    });

    revalidatePath('/gifts');
    revalidatePath('/inventory');
    revalidatePath('/');
    revalidatePath('/alerts');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Record gift error:', error);
    return { success: false, error: error.message || 'Failed to record gift' };
  }
}

export async function getGifts(filters?: {
  startDate?: string;
  endDate?: string;
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
    if (filters?.categoryId && filters.categoryId !== 'all') {
      where.item = { categoryId: filters.categoryId };
    }

    const gifts = await prisma.gift.findMany({
      where,
      include: {
        item: { include: { category: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return { success: true, data: gifts };
  } catch (error) {
    console.error('Get gifts error:', error);
    return { success: false, error: 'Failed to fetch gifts' };
  }
}

export async function deleteGift(giftId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can delete gifts' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the gift
      const gift = await tx.gift.findUnique({ where: { id: giftId } });
      if (!gift) throw new Error('Gift not found');

      // Revert stock (add the quantity back)
      await tx.item.update({
        where: { id: gift.itemId },
        data: { stock: { increment: gift.quantity } },
      });

      // Delete the gift record
      await tx.gift.delete({ where: { id: giftId } });

      return true;
    });

    revalidatePath('/gifts');
    revalidatePath('/inventory');
    revalidatePath('/');
    revalidatePath('/alerts');
    return { success: true };
  } catch (error: any) {
    console.error('Delete gift error:', error);
    return { success: false, error: error.message || 'Failed to delete gift' };
  }
}
