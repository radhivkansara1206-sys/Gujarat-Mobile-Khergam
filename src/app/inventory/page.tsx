import { getCategories } from '@/app/actions/categories';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const result = await getCategories();
  const categories = result.data || [];

  // Sort categories: put empty ones at the bottom, while keeping sortOrder asc within each group
  const sortedCategories = [...categories].sort((a: any, b: any) => {
    const aCount = a._count?.items || 0;
    const bCount = b._count?.items || 0;
    if (aCount > 0 && bCount === 0) return -1;
    if (aCount === 0 && bCount > 0) return 1;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  // Fetch company-wise total stock
  const companyStockRaw = await prisma.item.groupBy({
    by: ['brand'],
    _sum: { stock: true },
    where: {
      isActive: true,
      brand: { not: '' }
    },
    orderBy: {
      _sum: { stock: 'desc' }
    }
  });

  const companyStock = companyStockRaw.map(c => ({
    brand: c.brand,
    stock: c._sum.stock || 0
  }));

  return (
    <InventoryClient
      categories={sortedCategories}
      isAdmin={session.role === 'admin'}
      companyStock={companyStock}
    />
  );
}
