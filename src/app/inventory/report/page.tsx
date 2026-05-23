import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StockReportClient from './StockReportClient';

export default async function StockReportPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/inventory');

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Calculate totals
  let totalItems = 0;
  let totalStock = 0;
  let totalValue = 0;

  categories.forEach((cat) => {
    cat.items.forEach((item) => {
      totalItems++;
      totalStock += item.stock;
      totalValue += item.sellingPrice * item.stock;
    });
  });

  return (
    <StockReportClient
      categories={JSON.parse(JSON.stringify(categories))}
      totals={{ totalItems, totalStock, totalValue }}
    />
  );
}
