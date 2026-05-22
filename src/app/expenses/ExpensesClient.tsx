'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { recordExpense, getExpenses, deleteExpense } from '@/app/actions/expenses';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface ExpensesClientProps {
  initialData: {
    expenses: any[];
    totalAmount: number;
    count: number;
  };
  defaultStartDate: string;
}

export default function ExpensesClient({ initialData, defaultStartDate }: ExpensesClientProps) {
  const [data, setData] = useState(initialData);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<any>(null);
  const { showToast } = useToast();
  const router = useRouter();

  // Filters
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const EXPENSE_CATEGORIES = [
    { id: 'rent', name: 'Rent', icon: '🏠' },
    { id: 'electricity', name: 'Electricity Bill', icon: '⚡' },
    { id: 'salary', name: 'Staff Salary', icon: '👥' },
    { id: 'tea', name: 'Tea & Snacks', icon: '☕' },
    { id: 'stock_transport', name: 'Transport / Shipping', icon: '🚚' },
    { id: 'other', name: 'Other Expenses', icon: '🧾' },
  ];

  async function handleRecordExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await recordExpense(formData);
    
    if (result.success) {
      showToast('Expense recorded successfully!');
      setShowModal(false);
      router.refresh();
      handleFilter(); // refresh data
    } else {
      showToast(result.error || 'Failed to record expense', 'error');
    }
    setLoading(false);
  }

  async function handleFilter() {
    setFilterLoading(true);
    const result = await getExpenses({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: filterCategory !== 'all' ? filterCategory : undefined,
    });
    if (result.data) setData(result.data);
    setFilterLoading(false);
  }

  async function handleDeleteExpense() {
    setLoading(true);
    const result = await deleteExpense(deletingExpense.id);
    if (result.success) {
      showToast('Expense deleted successfully');
      setDeletingExpense(null);
      handleFilter();
    } else {
      showToast(result.error || 'Failed to delete expense', 'error');
    }
    setLoading(false);
  }

  // Calculate stats by category for the current filtered view
  const categoryStats = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: data.expenses.filter((e: any) => e.category === cat.id).reduce((sum: number, e: any) => sum + e.amount, 0)
  })).sort((a, b) => b.total - a.total);

  return (
    <div>
      <BackButton />
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage daily shop expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card value" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-card-header">
            <span className="stat-card-label">Total Expenses</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>💸</div>
          </div>
          <div className="stat-card-value" style={{ color: '#ef4444' }}>{formatCurrency(data.totalAmount)}</div>
          <div className="stat-card-footer">{data.count} records in selected period</div>
        </div>
        {categoryStats.slice(0, 3).map(cat => (
          <div key={cat.id} className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">{cat.name}</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9' }}>{cat.icon}</div>
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(cat.total)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Expenses</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={handleFilter} disabled={filterLoading}>
          {filterLoading ? <span className="spinner"></span> : 'Apply'}
        </button>
      </div>

      {/* Expenses Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="section-title">Expense History</h2>
          <span className="table-count">{data.count} records</span>
        </div>
        {data.expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <h3 className="empty-state-title">No expenses recorded</h3>
            <p className="empty-state-text">Click "Record Expense" to track your spending</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Recorded By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense: any) => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.id === expense.category);
                  return (
                    <tr key={expense.id}>
                      <td className="text-secondary">{formatDateTime(expense.createdAt)}</td>
                      <td className="font-semibold">
                        {cat ? `${cat.icon} ${cat.name}` : expense.category}
                      </td>
                      <td className="text-secondary">{expense.description || '—'}</td>
                      <td className="font-semibold text-danger">{formatCurrency(expense.amount)}</td>
                      <td className="text-secondary">{expense.user?.name}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingExpense(expense)} title="Delete Expense">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Expense">
        <form onSubmit={handleRecordExpense}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select name="category" className="form-select" required defaultValue="">
                <option value="" disabled>Select category...</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input name="amount" type="number" step="0.01" min="0" className="form-input" required placeholder="0.00" />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Date (Optional)</label>
            <input name="date" type="date" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
            <p className="form-hint">Leave as today to record right now, or select a past date.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Notes</label>
            <input name="description" type="text" className="form-input" placeholder="E.g., Bill for March, Paid to Ramu, etc." />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span> Recording...</> : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingExpense} onClose={() => setDeletingExpense(null)} title="Delete Expense" size="sm">
        {deletingExpense && (
          <div>
            <p style={{ marginBottom: '1.5rem' }}>
              Are you sure you want to delete this expense of <strong>{formatCurrency(deletingExpense.amount)}</strong>? 
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingExpense(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteExpense} disabled={loading}>
                {loading ? <><span className="spinner"></span> Deleting...</> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
