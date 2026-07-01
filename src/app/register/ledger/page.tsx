import { requireAuth } from '@/lib/auth';
import { getRegisterHistory } from '@/app/actions/register';
import LedgerClient from './LedgerClient';

export default async function LedgerPage() {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    return <div>Access Denied. Admins only.</div>;
  }
  const result = await getRegisterHistory();

  return (
    <div className="layout">
      <LedgerClient history={result.data || []} />
    </div>
  );
}
