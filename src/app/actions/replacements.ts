'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function recordReplacement(data: {
  itemId: string;
  quantity: number;
  reason?: string;
}) {
  try {
    const session = await requireAuth();

    if (data.quantity <= 0) {
      return { error: 'Quantity must be greater than 0' };
    }

    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      return { error: 'Item not found' };
    }

    if (item.stock < data.quantity) {
      return { error: `Insufficient stock. Only ${item.stock} units available.` };
    }

    const replacement = await prisma.$transaction(async (tx) => {
      // Create replacement record
      const newReplacement = await tx.replacement.create({
        data: {
          itemId: data.itemId,
          userId: session.id,
          quantity: data.quantity,
          reason: data.reason || 'Defective item replaced',
        },
      });

      // Update item stock
      await tx.item.update({
        where: { id: data.itemId },
        data: {
          stock: {
            decrement: data.quantity,
          },
        },
      });

      return newReplacement;
    });

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath(`/inventory/${item.categoryId}`);

    return { success: true, data: replacement };
  } catch (error: any) {
    console.error('Record replacement error:', error);
    return { error: error.message || 'Failed to record replacement' };
  }
}

export async function getRecentReplacements(limit = 10) {
  try {
    await requireAuth();

    const replacements = await prisma.replacement.findMany({
      take: limit,
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

    return { success: true, data: replacements };
  } catch (error: any) {
    console.error('Fetch replacements error:', error);
    return { error: error.message || 'Failed to fetch replacements' };
  }
}
