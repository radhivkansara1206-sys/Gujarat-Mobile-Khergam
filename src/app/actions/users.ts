'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getUsers() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { sales: true, gifts: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: users };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
    console.error('Get users error:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

export async function createUser(formData: FormData) {
  try {
    await requireAdmin();
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;
    const role = (formData.get('role') as string) || 'staff';

    if (!email || !name || !password) {
      return { success: false, error: 'All fields are required' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: 'A user with this email already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        role,
      },
    });

    revalidatePath('/settings');
    return { success: true, data: { id: user.id, email: user.email, name: user.name, role: user.role } };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
    console.error('Create user error:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

export async function deleteUser(id: string) {
  try {
    await requireAdmin();
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { success: false, error: 'User not found' };
    if (user.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return { success: false, error: 'Cannot delete the last admin user' };
      }
    }

    await prisma.user.delete({ where: { id } });

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
    console.error('Delete user error:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

export async function updateUser(id: string, formData: FormData) {
  try {
    await requireAdmin();
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;
    const role = (formData.get('role') as string) || 'staff';

    if (!email || !name) {
      return { success: false, error: 'Email and name are required' };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return { success: false, error: 'A user with this email already exists' };
    }

    const data: any = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
    };

    if (password) {
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }
      data.password = await bcrypt.hash(password, 12);
    }

    // Protection against removing the last admin
    if (role !== 'admin') {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user?.role === 'admin') {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return { success: false, error: 'Cannot demote the last admin user' };
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    revalidatePath('/settings');
    return { success: true, data: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role } };
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return { success: false, error: error.message };
    }
    console.error('Update user error:', error);
    return { success: false, error: 'Failed to update user' };
  }
}
