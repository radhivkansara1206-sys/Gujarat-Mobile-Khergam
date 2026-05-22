import { getDashboardStats, getRecentActivity, getLowStockItems } from '@/app/actions/dashboard';
import { getCategories } from '@/app/actions/categories';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import StatsCard from '@/components/StatsCard';
import CategoryCard from '@/components/CategoryCard';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [statsRes, activityRes, categoriesRes, lowStockRes] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
    getCategories(),
    getLowStockItems(),
  ]);

  const stats = statsRes.data;
  const activities = activityRes.data || [];
  const categories = categoriesRes.data || [];
  const lowStockItems = lowStockRes.data || [];

  return (
    <DashboardClient
      stats={stats}
      activities={activities}
      categories={categories}
      lowStockItems={lowStockItems}
      userName={session.name}
    />
  );
}
