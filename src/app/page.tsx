import { getDashboardStats, getRecentActivity, getLowStockItems } from '@/app/actions/dashboard';
import { getCategories } from '@/app/actions/categories';
import { getRegisterStatus } from '@/app/actions/register';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [statsRes, activityRes, categoriesRes, lowStockRes, registerRes] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
    getCategories(),
    getLowStockItems(),
    getRegisterStatus(),
  ]);

  const stats = statsRes.data;
  const activities = activityRes.data || [];
  const categories = categoriesRes.data || [];
  const lowStockItems = lowStockRes.data || [];
  const register = registerRes.data;

  return (
    <DashboardClient
      stats={stats}
      activities={activities}
      categories={categories}
      lowStockItems={lowStockItems}
      registerStatus={register}
      userName={session.name}
      isAdmin={session.role === 'admin'}
    />
  );
}
