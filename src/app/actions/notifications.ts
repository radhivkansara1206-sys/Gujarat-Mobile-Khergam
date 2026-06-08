'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getActiveNotifications() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const notifications = await prisma.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: notifications };
  } catch (error: any) {
    console.error('Failed to get notifications:', error);
    return { success: false, error: error.message };
  }
}

export async function dismissNotification(id: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to dismiss notification:', error);
    return { success: false, error: error.message };
  }
}
