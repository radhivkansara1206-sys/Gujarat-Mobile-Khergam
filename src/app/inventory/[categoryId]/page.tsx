import { getItems } from '@/app/actions/items';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import CategoryDetailClient from './CategoryDetailClient';

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) notFound();

  const result = await getItems(categoryId);
  const items = result.data || [];

  return (
    <CategoryDetailClient
      category={JSON.parse(JSON.stringify(category))}
      items={JSON.parse(JSON.stringify(items))}
      isAdmin={session.role === 'admin'}
    />
  );
}
