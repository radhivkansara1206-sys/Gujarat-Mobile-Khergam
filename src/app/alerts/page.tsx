import { getLowStockItems } from '@/app/actions/dashboard';
import { getActiveNotifications } from '@/app/actions/notifications';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AlertsClient from './AlertsClient';

export default async function AlertsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const result = await getLowStockItems();
  const items = result.data || [];

  const notifResult = await getActiveNotifications();
  const notifications = notifResult.data || [];

  return <AlertsClient items={JSON.parse(JSON.stringify(items))} notifications={JSON.parse(JSON.stringify(notifications))} isAdmin={session.role === 'admin'} />;
}
