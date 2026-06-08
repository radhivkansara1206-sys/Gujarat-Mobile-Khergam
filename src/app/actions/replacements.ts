'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function recordReplacement(data: {
  itemId: string;
  quantity: number;
  reason?: string;
  exchangeItemId?: string;
  cashCollected?: number;
}) {
  try {
    const session = await requireAuth();

    if (data.quantity <= 0) {
      return { error: 'Quantity must be greater than 0' };
    }

    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
      include: { category: true },
    });

    if (!item) {
      return { error: 'Item not found' };
    }

    if (data.exchangeItemId) {
      const exchangeItem = await prisma.item.findUnique({ where: { id: data.exchangeItemId } });
      if (!exchangeItem) return { error: 'Exchange item not found' };
      if (exchangeItem.stock < data.quantity) {
        return { error: `Insufficient stock for exchange item. Only ${exchangeItem.stock} units available.` };
      }
    } else {
      if (item.stock < data.quantity) {
        return { error: `Insufficient stock. Only ${item.stock} units available.` };
      }
    }

    const replacement = await prisma.$transaction(async (tx) => {
      // Create replacement record
      let finalReason = data.reason || 'Defective item replaced';
      let exchangeItemName = '';
      if (data.exchangeItemId) {
        const exchangeItem = await tx.item.findUnique({ where: { id: data.exchangeItemId } });
        if (exchangeItem) {
          exchangeItemName = exchangeItem.name;
          finalReason = `Exchanged for ${exchangeItem.name}. ${data.reason || ''}`.trim();
        }
      }

      const newReplacement = await tx.replacement.create({
        data: {
          itemId: data.itemId,
          userId: session.id,
          quantity: data.quantity,
          reason: finalReason,
        },
      });

      // Update item stock
      const targetItemId = data.exchangeItemId || data.itemId;
      await tx.item.update({
        where: { id: targetItemId },
        data: {
          stock: {
            decrement: data.quantity,
          },
        },
      });

      // Handle Cash Difference if any
      if (data.cashCollected && data.cashCollected !== 0) {
        const activeRegister = await tx.cashRegister.findFirst({
          where: { status: 'OPEN' },
          orderBy: { openedAt: 'desc' }
        });
        if (activeRegister) {
          await tx.cashMovement.create({
            data: {
              registerId: activeRegister.id,
              userId: session.id,
              type: data.cashCollected > 0 ? 'ADDITION' : 'REMOVAL',
              amount: Math.abs(data.cashCollected),
              reason: 'Exchange Price Difference',
              notes: `Exchanged ${item.name} for ${exchangeItemName || 'another item'}`,
            }
          });
        }
      }

      // Create admin notification
      await tx.notification.create({
        data: {
          type: 'replacement',
          message: `${session.name} replaced ${data.quantity}x ${item.name} (${item.category.name}) — Reason: ${data.reason || 'Defective item'}`,
          userId: session.id,
        },
      });

      return newReplacement;
    });

    revalidatePath('/', 'layout');

    return { success: true, data: replacement };
  } catch (error: any) {
    console.error('Record replacement error:', error);
    return { error: error.message || 'Failed to record replacement' };
  }
}

export async function getReplacements(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}) {
  try {
    await requireAuth();

    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    if (filters?.categoryId) {
      where.item = { categoryId: filters.categoryId };
    }

    const replacements = await prisma.replacement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        user: {
          select: { name: true },
        },
      },
    });

    const totalQuantity = replacements.reduce((sum, r) => sum + r.quantity, 0);

    return {
      success: true,
      data: {
        replacements,
        totalCount: replacements.length,
        totalQuantity,
      },
    };
  } catch (error: any) {
    console.error('Fetch replacements error:', error);
    return { error: error.message || 'Failed to fetch replacements' };
  }
}

export async function getAdminNotifications() {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return { success: true, data: [] };

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { success: true, data: notifications };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch notifications' };
  }
}

export async function markNotificationsRead() {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return { error: 'Unauthorized' };

    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to mark notifications as read' };
  }
}

export async function getUnreadNotificationCount() {
  try {
    const count = await prisma.notification.count({
      where: { isRead: false },
    });
    return count;
  } catch {
    return 0;
  }
}

export async function restoreReplacement(replacementId: string) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return { error: 'Only admin can restore replacements' };

    const result = await prisma.$transaction(async (tx) => {
      const replacement = await tx.replacement.findUnique({
        where: { id: replacementId },
        include: { item: true },
      });

      if (!replacement) throw new Error('Replacement not found');

      // Restore stock back to inventory
      await tx.item.update({
        where: { id: replacement.itemId },
        data: { stock: { increment: replacement.quantity } },
      });

      // Delete the replacement record
      await tx.replacement.delete({ where: { id: replacementId } });

      return replacement;
    });

    revalidatePath('/', 'layout');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Restore replacement error:', error);
    return { error: error.message || 'Failed to restore replacement' };
  }
}

export async function deleteReplacement(replacementId: string) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return { error: 'Only admin can delete replacements' };

    await prisma.replacement.delete({ where: { id: replacementId } });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('Delete replacement error:', error);
    return { error: error.message || 'Failed to delete replacement' };
  }
}
