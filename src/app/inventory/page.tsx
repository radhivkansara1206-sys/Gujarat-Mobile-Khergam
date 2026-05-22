import { getCategories } from '@/app/actions/categories';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const result = await getCategories();
  const categories = result.data || [];

  return (
    <InventoryClient
      categories={categories}
      isAdmin={session.role === 'admin'}
    />
  );
}
