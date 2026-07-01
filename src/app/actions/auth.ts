'use server';

import { prisma } from '@/lib/prisma';
import { createSession, deleteSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'staff',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: `Error: ${error?.message || 'Unknown error'}` };
  }
}

export async function logoutAction() {
  await deleteSession();
  redirect('/login');
}
