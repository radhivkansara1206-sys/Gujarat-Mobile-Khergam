import { getUsers } from '@/app/actions/users';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role !== 'admin') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
        </div>
        <div className="alert-banner warning">
          <span>Only administrators can access settings.</span>
        </div>
      </div>
    );
  }

  const result = await getUsers();
  const users = result.data || [];

  return <SettingsClient users={JSON.parse(JSON.stringify(users))} currentUserId={session.userId} />;
}
