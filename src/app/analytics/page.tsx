import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAnalyticsData } from '@/app/actions/analytics';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/');

  const res = await getAnalyticsData();
  if (!res.success || !res.data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h2 style={{ color: 'var(--text-danger)' }}>Error Loading Analytics</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{res.error || 'Please try again later'}</p>
      </div>
    );
  }

  return (
    <AnalyticsClient data={res.data} />
  );
}
