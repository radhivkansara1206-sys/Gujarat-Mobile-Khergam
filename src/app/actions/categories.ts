'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { items: { where: { isActive: true } } } },
        items: {
          where: { isActive: true },
          select: { stock: true, lowStockThreshold: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: categories };
  } catch (error) {
    console.error('Get categories error:', error);
    return { success: false, error: 'Failed to fetch categories' };
  }
}

export async function createCategory(formData: FormData) {
  try {
    await requireAdmin();
    const name = formData.get('name') as string;
    const icon = (formData.get('icon') as string) || '📦';
    const color = (formData.get('color') as string) || '#f59e0b';

    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Category name is required' };
    }

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return { success: false, error: 'Category already exists' };
    }

    const maxOrder = await prisma.category.findFirst({ orderBy: { sortOrder: 'desc' } });
    
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon,
        color,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    });

    revalidatePath('/inventory');
    revalidatePath('/');
    return { success: true, data: category };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
    console.error('Create category error:', error);
    return { success: false, error: 'Failed to create category' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    await requireAdmin();
    const name = formData.get('name') as string;
    const icon = formData.get('icon') as string;
    const color = formData.get('color') as string;

    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Category name is required' };
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(icon && { icon }),
        ...(color && { color }),
      },
    });

    revalidatePath('/inventory');
    revalidatePath('/');
    return { success: true, data: category };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
    console.error('Update category error:', error);
    return { success: false, error: 'Failed to update category' };
  }
}

export async function deleteCategory(id: string) {
  try {
    await requireAdmin();
    
    // Soft delete - mark as inactive
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    // Also deactivate all items in this category
    await prisma.item.updateMany({
      where: { categoryId: id },
      data: { isActive: false },
    });

    revalidatePath('/inventory');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
    console.error('Delete category error:', error);
    return { success: false, error: 'Failed to delete category' };
  }
}
