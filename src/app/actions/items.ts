'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getItems(categoryId?: string) {
  try {
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error('Get items error:', error);
    return { success: false, error: 'Failed to fetch items' };
  }
}

export async function getItem(id: string) {
  try {
    const item = await prisma.item.findUnique({
      where: { id },
      include: { category: true },
    });
    return { success: true, data: item };
  } catch (error) {
    console.error('Get item error:', error);
    return { success: false, error: 'Failed to fetch item' };
  }
}

export async function createItem(formData: FormData) {
  try {
    await requireAuth();
    const categoryId = formData.get('categoryId') as string;
    const name = formData.get('name') as string;
    const brand = (formData.get('brand') as string) || '';
    const model = (formData.get('model') as string) || '';
    const subCategory = (formData.get('subCategory') as string) || '';
    const purchasePrice = parseFloat(formData.get('purchasePrice') as string) || 0;
    const sellingPrice = parseFloat(formData.get('sellingPrice') as string) || 0;
    const stock = parseInt(formData.get('stock') as string) || 0;
    const lowStockThreshold = parseInt(formData.get('lowStockThreshold') as string) || 5;

    if (!categoryId) return { success: false, error: 'Category is required' };
    if (!name || name.trim().length === 0) return { success: false, error: 'Item name is required' };
    if (sellingPrice < 0) return { success: false, error: 'Selling price cannot be negative' };
    if (stock < 0) return { success: false, error: 'Stock cannot be negative' };

    const item = await prisma.item.create({
      data: {
        categoryId,
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        subCategory: subCategory.trim(),
        purchasePrice,
        sellingPrice,
        stock,
        lowStockThreshold,
      },
    });

    revalidatePath('/', 'layout');
    return { success: true, data: item };
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return { success: false, error: error.message };
    }
    console.error('Create item error:', error);
    return { success: false, error: 'Failed to create item' };
  }
}

export async function updateItem(id: string, formData: FormData) {
  try {
    await requireAuth();
    const name = formData.get('name') as string;
    const brand = formData.get('brand') as string;
    const model = formData.get('model') as string;
    const subCategory = formData.get('subCategory') as string;
    const purchasePrice = parseFloat(formData.get('purchasePrice') as string);
    const sellingPrice = parseFloat(formData.get('sellingPrice') as string);
    const stock = parseInt(formData.get('stock') as string);
    const lowStockThreshold = parseInt(formData.get('lowStockThreshold') as string);

    if (!name || name.trim().length === 0) return { success: false, error: 'Item name is required' };

    const item = await prisma.item.update({
      where: { id },
      data: {
        name: name.trim(),
        brand: brand?.trim() || '',
        model: model?.trim() || '',
        subCategory: subCategory?.trim() || '',
        ...(isNaN(purchasePrice) ? {} : { purchasePrice }),
        ...(isNaN(sellingPrice) ? {} : { sellingPrice }),
        ...(isNaN(stock) ? {} : { stock }),
        ...(isNaN(lowStockThreshold) ? {} : { lowStockThreshold }),
        isAlertDismissed: false, // Reset dismiss state on any update
      },
      include: { category: true },
    });

    revalidatePath('/', 'layout');
    return { success: true, data: item };
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return { success: false, error: error.message };
    }
    console.error('Update item error:', error);
    return { success: false, error: 'Failed to update item' };
  }
}

export async function deleteItem(id: string) {
  try {
    await requireAuth();
    
    const item = await prisma.item.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return { success: false, error: error.message };
    }
    console.error('Delete item error:', error);
    return { success: false, error: 'Failed to delete item' };
  }
}

export async function getAllItemsForSelect() {
  try {
    const items = await prisma.item.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
    return { success: true, data: items };
  } catch (error) {
    console.error('Get items for select error:', error);
    return { success: false, error: 'Failed to fetch items' };
  }
}

export async function dismissItemAlert(id: string) {
  try {
    await requireAuth();
    const item = await prisma.item.update({
      where: { id },
      data: { isAlertDismissed: true },
    });
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return { success: false, error: error.message };
    }
    console.error('Dismiss alert error:', error);
    return { success: false, error: 'Failed to dismiss alert' };
  }
}

export async function dismissAllItemAlerts() {
  try {
    await requireAuth();
    
    // Fetch all active items
    const items = await prisma.item.findMany({
      where: { isActive: true },
      select: { id: true, stock: true, lowStockThreshold: true }
    });
    
    // Filter items where stock <= lowStockThreshold
    const itemsToDismiss = items.filter(i => i.stock <= i.lowStockThreshold).map(i => i.id);
    
    if (itemsToDismiss.length > 0) {
      await prisma.item.updateMany({
        where: { id: { in: itemsToDismiss } },
        data: { isAlertDismissed: true },
      });
    }
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return { success: false, error: error.message };
    }
    console.error('Dismiss all alerts error:', error);
    return { success: false, error: 'Failed to dismiss all alerts' };
  }
}
