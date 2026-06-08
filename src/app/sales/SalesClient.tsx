'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { recordSale, getSales, deleteSale } from '@/app/actions/sales';
import { recordReplacement } from '@/app/actions/replacements';
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
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deletingSale, setDeletingSale] = useState<any>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const highlight = params.get('highlight');
      if (highlight) {
        setHighlightedId(highlight);
        setTimeout(() => {
          const el = document.getElementById(`row-${highlight}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, []);
  const [quantity, setQuantity] = useState(1);
  const [customPaidAmount, setCustomPaidAmount] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState<'cash' | 'online' | 'gift'>('cash');
  
  // Exchange states
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeItemId, setExchangeItemId] = useState('');
  const [cashCollected, setCashCollected] = useState<number | ''>('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const getRoundedAmount = (amount: number) => Math.round(amount / 10) * 10;

  const selectedItemData = items.find(i => i.id === selectedItem);
  const exchangeItemData = items.find(i => i.id === exchangeItemId);
  const total = selectedItemData ? selectedItemData.sellingPrice * quantity : 0;

  useEffect(() => {
    if (isExchange && selectedItemData && exchangeItemData) {
      const diff = (exchangeItemData.sellingPrice * quantity) - (selectedItemData.sellingPrice * quantity);
      setCashCollected(diff);
    }
  }, [isExchange, selectedItem, exchangeItemId, quantity]);

  async function handleRecordSale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    // Timezone-aware date resolution
    const dateInput = formData.get('date') as string;
    let finalDate = new Date();
    if (dateInput) {
      const [year, month, day] = dateInput.split('-').map(Number);
      const now = new Date();
      if (year === now.getFullYear() && month - 1 === now.getMonth() && day === now.getDate()) {
        finalDate = now;
      } else {
        // Construct the backdated sale at local Noon (12:00:00)
        finalDate = new Date(year, month - 1, day, 12, 0, 0);
      }
    }
    formData.set('date', finalDate.toISOString());

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

  async function handleRecordReplacement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await recordReplacement({
      itemId: formData.get('itemId') as string,
      quantity: Number(formData.get('quantity')),
      reason: formData.get('reason') as string,
      exchangeItemId: isExchange ? exchangeItemId : undefined,
      cashCollected: isExchange && cashCollected !== '' ? Number(cashCollected) : undefined,
    });
    if (result.success) {
      showToast('Replacement recorded successfully! Stock updated.');
      setShowReplacementModal(false);
      setSelectedItem(null);
      setQuantity(1);
      setIsExchange(false);
      setExchangeItemId('');
      setCashCollected('');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to record replacement', 'error');
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowReplacementModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Log Replacement
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Record Sale
          </button>
        </div>
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
                  <th>Details</th>
                  <th>By</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {salesData.sales.map((sale: any) => (
                  <tr key={sale.id} id={`row-${sale.id}`} className={highlightedId === sale.id ? 'highlighted-row' : ''}>
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
                    <td className="text-secondary">
                      {sale.referenceNumber && <div style={{ marginBottom: '2px' }}>{sale.referenceNumber}</div>}
                      {sale.notes && <div style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>{sale.notes}</div>}
                      {!sale.referenceNumber && !sale.notes && '—'}
                    </td>
                    <td className="text-secondary">{sale.user?.name}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingSale(sale)} title="Delete Sale">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              onChange={e => { 
                setSelectedItem(e.target.value); 
                setQuantity(1); 
                const itm = items.find(i => i.id === e.target.value);
                setCustomPaidAmount(itm ? getRoundedAmount(itm.sellingPrice) : '');
              }}
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
                onChange={e => {
                  const q = parseInt(e.target.value) || 1;
                  setQuantity(q);
                  if (selectedItemData) setCustomPaidAmount(getRoundedAmount(q * selectedItemData.sellingPrice));
                }}
                required
              />
              {selectedItemData && (
                <span className="form-hint">Available: {selectedItemData.stock}</span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Paid Amount (₹)</label>
              <input
                name="paidAmount"
                type="number"
                className="form-input"
                min="0"
                value={customPaidAmount}
                onChange={e => setCustomPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date of Sale *</label>
            <input 
              name="date" 
              type="date" 
              className="form-input" 
              defaultValue={(() => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              })()} 
              max={(() => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              })()} 
              required
            />
            <span className="form-hint">Leave as today unless backdating a missed sale.</span>
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
              <label className="form-label">Bill Number *</label>
              <input name="notes" className="form-input" placeholder="Enter bill number" required />
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

      {/* Replacement Modal */}
      <Modal isOpen={showReplacementModal} onClose={() => setShowReplacementModal(false)} title="Log Defective Replacement">
        <form onSubmit={handleRecordReplacement}>
          <div className="form-group">
            <label className="form-label">Select Item *</label>
            <select
              name="itemId"
              className="form-input"
              value={selectedItem || ''}
              onChange={(e) => setSelectedItem(e.target.value)}
              required
            >
              <option value="">-- Choose Item --</option>
              {groupedItems.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.stock <= 0}>
                      {item.name} ({item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedItemData && (
            <div style={{ padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '6px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span className="text-secondary">Current Stock:</span>
                <strong>{selectedItemData.stock} units</strong>
              </div>
            </div>
          )}

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <input 
              type="checkbox" 
              id="isExchange" 
              checked={isExchange} 
              onChange={e => setIsExchange(e.target.checked)} 
              style={{ width: '1.25rem', height: '1.25rem' }} 
            />
            <label htmlFor="isExchange" style={{ margin: 0, fontWeight: 600 }}>Replace with a different item (Exchange/Upgrade)</label>
          </div>

          {isExchange && (
            <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Item Given to Customer *</label>
                <select
                  className="form-input"
                  value={exchangeItemId}
                  onChange={(e) => setExchangeItemId(e.target.value)}
                  required={isExchange}
                >
                  <option value="">-- Choose Exchange Item --</option>
                  {groupedItems.map((group) => (
                    <optgroup key={`exch-${group.category}`} label={group.category}>
                      {group.items.map((item) => (
                        <option key={`exch-${item.id}`} value={item.id} disabled={item.stock <= 0}>
                          {item.name} ({item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cash Collected for Difference (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={cashCollected}
                  onChange={(e) => setCashCollected(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                />
                <span className="form-hint" style={{ color: '#1e40af', display: 'block', marginTop: '0.25rem' }}>
                  {typeof cashCollected === 'number' && cashCollected < 0 
                    ? `Negative means you owe the customer ₹${Math.abs(cashCollected)}`
                    : 'This amount will be directly added to your Cash Drawer.'}
                </span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Quantity to Replace *</label>
            <input
              name="quantity"
              type="number"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              max={isExchange ? (exchangeItemData?.stock || 999) : (selectedItemData?.stock || 1)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Notes</label>
            <input
              name="reason"
              className="form-input"
              placeholder="e.g. Broken display, returned to manufacturer"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowReplacementModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !selectedItem}>
              {loading ? <><span className="spinner"></span> Saving...</> : 'Log Replacement'}
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
