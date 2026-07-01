import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getExpenses } from '@/app/actions/expenses';
import ExpensesClient from './ExpensesClient';

export const metadata = {
  title: 'Expenses | Gujarat Mobile Khergam',
};

export default async function ExpensesPage() {
  const session = await getSession();
  
  // Expenses is an admin-only feature to protect financial privacy
  if (!session || session.role !== 'admin') {
    redirect('/login');
  }

  // Fetch initial data for this month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const startStr = firstDay.toISOString().split('T')[0];
  
  const result = await getExpenses({ startDate: startStr });
  const initialData = result.data || { expenses: [], totalAmount: 0, count: 0 };

  return <ExpensesClient initialData={initialData} defaultStartDate={startStr} />;
}
