import { getSales } from '@/app/actions/sales';
import { getCategories } from '@/app/actions/categories';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SalesClient from './SalesClient';

export default async function SalesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [salesRes, categoriesRes] = await Promise.all([
    getSales(),
    getCategories(),
  ]);

  // Get all items for the sale form
  const { getAllItemsForSelect } = await import('@/app/actions/items');
  const itemsRes = await getAllItemsForSelect();

  return (
    <SalesClient
      initialSales={salesRes.data || { sales: [], totalCash: 0, totalOnline: 0, totalAmount: 0, count: 0 }}
      categories={(categoriesRes.data || []).map((c: any) => ({ id: c.id, name: c.name }))}
      items={(itemsRes.data || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        sellingPrice: i.sellingPrice,
        stock: i.stock,
        categoryName: i.category?.name || '',
        categoryId: i.categoryId,
      }))}
    />
  );
}
