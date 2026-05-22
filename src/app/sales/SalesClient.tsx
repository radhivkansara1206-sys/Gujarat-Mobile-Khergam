'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { recordSale, getSales, deleteSale } from '@/app/actions/sales';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface SalesClientProps {
  initialSales: {
    sales: any[];
    totalCash: number;
    totalOnline: number;
    totalAmount: number;
    count: number;
  };
  categories: { id: string; name: string }[];
  items: {
    id: string;
    name: string;
    brand: string;
    sellingPrice: number;
    stock: number;
    categoryName: string;
    categoryId: string;
  }[];
  isAdmin?: boolean;
}

export default function SalesClient({ initialSales, categories, items, isAdmin }: SalesClientProps) {
  const [salesData, setSalesData] = useState(initialSales);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deletingSale, setDeletingSale] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentType, setPaymentType] = useState<'cash' | 'online' | 'gift'>('cash');
  const { showToast } = useToast();
  const router = useRouter();

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const selectedItemData = items.find(i => i.id === selectedItem);
  const total = selectedItemData ? selectedItemData.sellingPrice * quantity : 0;

  async function handleRecordSale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await recordSale(formData);
    if (result.success) {
      showToast('Sale recorded successfully! Stock updated.');
      setShowModal(false);
      setSelectedItem(null);
      setQuantity(1);
      setPaymentType('cash');
      router.refresh();
      // Refresh sales data
      const refreshed = await getSales({ startDate, endDate, paymentType: filterPayment, categoryId: filterCategory });
      if (refreshed.data) setSalesData(refreshed.data);
    } else {
      showToast(result.error || 'Failed to record sale', 'error');
    }
    setLoading(false);
  }

  async function handleFilter() {
    setFilterLoading(true);
    const result = await getSales({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      paymentType: filterPayment !== 'all' ? filterPayment : undefined,
      categoryId: filterCategory !== 'all' ? filterCategory : undefined,
    });
    if (result.data) setSalesData(result.data);
    setFilterLoading(false);
  }

  // Group items by category for the select
  const groupedItems = categories.map(cat => ({
    category: cat.name,
    items: items.filter(i => i.categoryId === cat.id),
  })).filter(g => g.items.length > 0);

  async function handleDeleteSale() {
    setLoading(true);
    const result = await deleteSale(deletingSale.id);
    if (result.success) {
      showToast('Sale deleted and stock reverted');
      setDeletingSale(null);
      handleFilter(); // refresh
    } else {
      showToast(result.error || 'Failed to delete sale', 'error');
    }
    setLoading(false);
  }

  return (
    <div>
      <BackButton />
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">Record and track all sales transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Record Sale
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid stats-grid-3">
        <div className="stat-card sales">
          <div className="stat-card-header">
            <span className="stat-card-label">Cash Sales</span>
            <div className="stat-card-icon sales">₹</div>
          </div>
          <div className="stat-card-value">{formatCurrency(salesData.totalCash)}</div>
        </div>
        <div className="stat-card value">
          <div className="stat-card-header">
            <span className="stat-card-label">Online Sales</span>
            <div className="stat-card-icon value">📱</div>
          </div>
          <div className="stat-card-value">{formatCurrency(salesData.totalOnline)}</div>
        </div>
        <div className="stat-card stock">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Sales</span>
            <div className="stat-card-icon stock">💰</div>
          </div>
          <div className="stat-card-value">{formatCurrency(salesData.totalAmount)}</div>
          <div className="stat-card-footer">{salesData.count} transactions</div>
        </div>
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
          <label className="filter-label">Payment</label>
          <select className="form-select" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
            <option value="all">All</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="gift">Gift</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={handleFilter} disabled={filterLoading}>
          {filterLoading ? <span className="spinner"></span> : 'Apply'}
        </button>
      </div>

      {/* Sales Table */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="section-title">Sales History</h2>
          <span className="table-count">{salesData.count} records</span>
        </div>
        {salesData.sales.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <h3 className="empty-state-title">No sales recorded yet</h3>
            <p className="empty-state-text">Click "Record Sale" to add your first transaction</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Ref #</th>
                  <th>By</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {salesData.sales.map((sale: any) => (
                  <tr key={sale.id}>
                    <td className="text-secondary">{formatDateTime(sale.createdAt)}</td>
                    <td className="font-semibold">{sale.item?.name}</td>
                    <td className="text-secondary">{sale.item?.category?.name}</td>
                    <td>{sale.quantity}</td>
                    <td>{formatCurrency(sale.unitPrice)}</td>
                    <td className="font-semibold">{formatCurrency(sale.totalAmount)}</td>
                    <td>
                      <span className={`payment-badge ${sale.paymentType}`}>
                        {sale.paymentType === 'cash' ? '₹ Cash' : sale.paymentType === 'online' ? '📱 Online' : '🎁 Gift'}
                      </span>
                    </td>
                    <td className="text-secondary">{sale.referenceNumber || '—'}</td>
                    <td className="text-secondary">{sale.user?.name}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingSale(sale)} title="Delete Sale">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Sale" size="lg">
        <form onSubmit={handleRecordSale}>
          <div className="form-group">
            <label className="form-label">Select Item *</label>
            <select
              name="itemId"
              className="form-select"
              value={selectedItem || ''}
              onChange={e => { setSelectedItem(e.target.value); setQuantity(1); }}
              required
            >
              <option value="">Choose an item...</option>
              {groupedItems.map(group => (
                <optgroup key={group.category} label={group.category}>
                  {group.items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.brand ? ` (${item.brand})` : ''} — {formatCurrency(item.sellingPrice)} — Stock: {item.stock}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                name="quantity"
                type="number"
                className="form-input"
                min="1"
                max={selectedItemData?.stock || 999}
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
              {selectedItemData && (
                <span className="form-hint">Available: {selectedItemData.stock}</span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount</label>
              <div className="form-static-value">{formatCurrency(total)}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Type *</label>
            <div className="payment-type-selector">
              <label className={`payment-option ${paymentType === 'cash' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="cash"
                  checked={paymentType === 'cash'}
                  onChange={() => setPaymentType('cash')}
                />
                <span className="payment-option-icon">₹</span>
                <span>Cash</span>
              </label>
              <label className={`payment-option ${paymentType === 'online' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="online"
                  checked={paymentType === 'online'}
                  onChange={() => setPaymentType('online')}
                />
                <span className="payment-option-icon">📱</span>
                <span>Online</span>
              </label>
              <label className={`payment-option ${paymentType === 'gift' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="gift"
                  checked={paymentType === 'gift'}
                  onChange={() => setPaymentType('gift')}
                />
                <span className="payment-option-icon">🎁</span>
                <span>Gift</span>
              </label>
            </div>
          </div>

          {paymentType === 'online' && (
            <div className="form-group">
              <label className="form-label">Reference Number (Optional)</label>
              <input name="referenceNumber" className="form-input" placeholder="UPI/Transaction ID" />
            </div>
          )}

          {paymentType === 'gift' && (
            <div className="form-group">
              <label className="form-label">Recipient Name / Reason (Optional)</label>
              <input name="notes" className="form-input" placeholder="Who is receiving the gift?" />
            </div>
          )}

          {paymentType !== 'gift' && (
            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <textarea name="notes" className="form-textarea" placeholder="Any additional notes..." rows={2}></textarea>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !selectedItem}>
              {loading ? <><span className="spinner"></span> Recording...</> : paymentType === 'gift' ? 'Record Gift' : `Record Sale • ${formatCurrency(total)}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingSale} onClose={() => setDeletingSale(null)} title="Delete Sale" size="sm">
        {deletingSale && (
          <div>
            <p>Are you sure you want to delete this sale?</p>
            <p style={{ marginTop: '0.5rem' }}><strong>{deletingSale.quantity}x {deletingSale.item?.name}</strong></p>
            <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              This will restore {deletingSale.quantity} units back to the stock inventory. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeletingSale(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteSale} disabled={loading}>
                {loading ? <><span className="spinner"></span> Deleting...</> : 'Delete & Restore Stock'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
