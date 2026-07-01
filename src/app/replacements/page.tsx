import { getReplacements, getUnreadNotificationCount } from '@/app/actions/replacements';
import { getCategories } from '@/app/actions/categories';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReplacementsClient from './ReplacementsClient';

export default async function ReplacementsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [replacementsRes, categoriesRes, unreadCount] = await Promise.all([
    getReplacements(),
    getCategories(),
    session.role === 'admin' ? getUnreadNotificationCount() : Promise.resolve(0),
  ]);

  return (
    <ReplacementsClient
      initialData={replacementsRes.data || { replacements: [], totalCount: 0, totalQuantity: 0 }}
      categories={(categoriesRes.data || []).map((c: any) => ({ id: c.id, name: c.name }))}
      isAdmin={session.role === 'admin'}
      initialUnreadCount={unreadCount}
    />
  );
}
