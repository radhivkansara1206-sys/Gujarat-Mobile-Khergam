import { requireAuth } from '@/lib/auth';
import { getRegisterStatus, getRegisterHistory } from '@/app/actions/register';
import RegisterClient from './RegisterClient';

export default async function RegisterPage() {
  const session = await requireAuth();
  const result = await getRegisterStatus();
  const history = await getRegisterHistory();

  return (
    <div className="layout">
      <RegisterClient 
        initialData={result.data} 
        historyData={history.data || []} 
        isAdmin={session.role === 'admin'} 
      />
    </div>
  );
}
