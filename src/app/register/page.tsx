import { requireAuth } from '@/lib/auth';
import { getRegisterStatus } from '@/app/actions/register';
import RegisterClient from './RegisterClient';

export default async function RegisterPage() {
  const session = await requireAuth();
  const result = await getRegisterStatus();

  return (
    <div className="layout">
      <RegisterClient initialData={result.data} isAdmin={session.role === 'admin'} />
    </div>
  );
}
