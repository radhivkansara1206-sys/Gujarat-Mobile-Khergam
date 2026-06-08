'use server';

import { requireAuth } from '@/lib/auth';
import { optimizeAndReport } from '@/lib/optimizer';
import { revalidatePath } from 'next/cache';

export async function runManualOptimizationAction() {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only administrators can trigger system optimization.' };
    }

    console.log(`[Manual Action] Admin ${session.name} triggered manual database scan & optimization.`);
    const result = await optimizeAndReport('manual');
    
    // Revalidate dashboard and settings paths to show fresh numbers
    revalidatePath('/');
    revalidatePath('/settings');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('Manual system optimization error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during system optimization.'
    };
  }
}
