'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { recordSale, getSales, deleteSale, updateSalePaymentType, updateSaleTime, updateSaleAmount } from '@/app/actions/sales';
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
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [optimisticSales, setOptimisticSales] = useState(initialSales.sales);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // WhatsApp Receipt State
  const [receiptSale, setReceiptSale] = useState<any>(null);
  const [customerPhone, setCustomerPhone] = useState('');

  // Inline Edit Amount State
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<string>('');
  const [updatingAmountId, setUpdatingAmountId] = useState<string | null>(null);
  
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setOptimisticSales(salesData.sales);
  }, [salesData.sales]);

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
  const [isCustomItem, setIsCustomItem] = useState(false);
  
  // Exchange states
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeItemId, setExchangeItemId] = useState('');
  const [cashCollected, setCashCollected] = useState<number | ''>('');
  const [isDefective, setIsDefective] = useState(true);
  const [originalPurchaseDate, setOriginalPurchaseDate] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const getRoundedAmount = (amount: number) => amount;

  const selectedItemData = items.find(i => i.id === selectedItem);
  const exchangeItemData = items.find(i => i.id === exchangeItemId);
  const total = selectedItemData ? selectedItemData.sellingPrice * quantity : 0;
  const displayTotal = (typeof customPaidAmount === 'number' && !isNaN(customPaidAmount)) ? customPaidAmount : total;

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
      isDefective: isExchange ? isDefective : true,
      originalPurchaseDate: originalPurchaseDate || undefined,
    });
    if (result.success) {
      showToast('Replacement recorded successfully! Stock updated.');
      setShowReplacementModal(false);
      setSelectedItem(null);
      setQuantity(1);
      setIsExchange(false);
      setExchangeItemId('');
      setCashCollected('');
      setIsDefective(true);
      setOriginalPurchaseDate('');
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

  function handleSendReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptSale) return;
    
    let phone = customerPhone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    const dt = new Date(receiptSale.createdAt).toLocaleString('en-IN');
    const text = `*GUJARAT MOBILE KHERGAM*
--------------------------------
*Digital Receipt*
Date: ${dt}
Item: ${receiptSale.item?.name} ${receiptSale.item?.brand ? `(${receiptSale.item?.brand})` : ''}
Quantity: ${receiptSale.quantity}
Payment: ${receiptSale.paymentType.toUpperCase()}
*Total: ₹${receiptSale.totalAmount}*
--------------------------------
Thank you for shopping with us! 🙏`;

    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${phone}?text=${encodedText}`;
    
    window.open(url, '_blank');
    setReceiptSale(null);
    setCustomerPhone('');
  }

  async function handleSaveAmount(saleId: string, value: string) {
    const amt = parseFloat(value);
    if (isNaN(amt) || amt < 0) {
      showToast('Invalid amount', 'error');
      setEditingAmountId(null);
      return;
    }

    setUpdatingAmountId(saleId);
    const res = await updateSaleAmount(saleId, amt);
    setUpdatingAmountId(null);
    setEditingAmountId(null);

    if (res.success) {
      showToast('Sale amount updated successfully');
      router.refresh();
      // Refilter sales data
      const refreshed = await getSales({ startDate, endDate, paymentType: filterPayment, categoryId: filterCategory });
      if (refreshed.data) setSalesData(refreshed.data);
    } else {
      showToast(res.error || 'Failed to update amount', 'error');
    }
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {optimisticSales.map((sale: any, index: number) => (
                  <tr 
                    key={sale.id} 
                    id={`row-${sale.id}`} 
                    className={`${highlightedId === sale.id ? 'highlighted-row' : ''} ${draggedId === sale.id ? 'dragging-row' : ''}`}
                    draggable={isAdmin}
                    onDragStart={(e) => {
                      if (!isAdmin) return;
                      setDraggedId(sale.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (!isAdmin) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={async (e) => {
                      if (!isAdmin) return;
                      e.preventDefault();
                      if (!draggedId || draggedId === sale.id) {
                        setDraggedId(null);
                        return;
                      }

                      const draggedIdx = optimisticSales.findIndex((s: any) => s.id === draggedId);
                      const targetIdx = index;

                      if (draggedIdx === -1) return;

                      const newSales = [...optimisticSales];
                      const [moved] = newSales.splice(draggedIdx, 1);
                      newSales.splice(targetIdx, 0, moved);

                      let timeAbove = newSales[targetIdx - 1]?.createdAt;
                      let timeBelow = newSales[targetIdx + 1]?.createdAt;

                      const dAbove = timeAbove ? new Date(timeAbove).getTime() : Date.now();
                      const dBelow = timeBelow ? new Date(timeBelow).getTime() : dAbove - 3600000;

                      const newTimeMs = Math.floor((dAbove + dBelow) / 2);
                      const newTime = new Date(newTimeMs);

                      moved.createdAt = newTime.toISOString();
                      setOptimisticSales(newSales);
                      setDraggedId(null);
                      
                      const res = await updateSaleTime(moved.id, newTime.toISOString());
                      if (!res.success) {
                         showToast(res.error || 'Failed to reorder sale', 'error');
                         setOptimisticSales(salesData.sales);
                      } else {
                         router.refresh();
                      }
                    }}
                    onDragEnd={() => setDraggedId(null)}
                    style={{ cursor: isAdmin ? 'grab' : 'default', opacity: draggedId === sale.id ? 0.5 : 1 }}
                  >
                    <td className="text-secondary">
                      {isAdmin && (
                        <span style={{ marginRight: '8px', cursor: 'grab', color: 'var(--text-muted)' }}>⋮⋮</span>
                      )}
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="font-semibold">{sale.item?.name}</td>
                    <td className="text-secondary">{sale.item?.category?.name}</td>
                    <td>{sale.quantity}</td>
                    <td>{formatCurrency(sale.unitPrice)}</td>
                    <td className="font-semibold">
                      {isAdmin ? (
                        editingAmountId === sale.id ? (
                          <input
                            type="number"
                            value={tempAmount}
                            onChange={(e) => setTempAmount(e.target.value)}
                            onBlur={() => handleSaveAmount(sale.id, tempAmount)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveAmount(sale.id, tempAmount);
                              } else if (e.key === 'Escape') {
                                setEditingAmountId(null);
                              }
                            }}
                            autoFocus
                            style={{
                              width: '80px',
                              padding: '2px 6px',
                              fontSize: '0.9rem',
                              borderRadius: '4px',
                              border: '1px solid var(--primary)',
                              background: '#fff',
                              color: '#000'
                            }}
                            disabled={updatingAmountId === sale.id}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingAmountId(sale.id);
                              setTempAmount(String(sale.totalAmount));
                            }}
                            title="Click to edit amount"
                            style={{
                              cursor: 'pointer',
                              borderBottom: '1px dashed var(--text-secondary)',
                              paddingBottom: '2px'
                            }}
                          >
                            {formatCurrency(sale.totalAmount)}
                          </span>
                        )
                      ) : (
                        formatCurrency(sale.totalAmount)
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={sale.paymentType}
                          disabled={updatingPaymentId === sale.id}
                          onChange={async (e) => {
                            setUpdatingPaymentId(sale.id);
                            const res = await updateSalePaymentType(sale.id, e.target.value);
                            setUpdatingPaymentId(null);
                            if (res.success) {
                              showToast('Payment type updated');
                              router.refresh();
                            } else {
                              showToast(res.error || 'Failed to update', 'error');
                            }
                          }}
                          style={{
                            padding: '0.25rem 1.5rem 0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '999px',
                            border: '1px solid transparent',
                            background: sale.paymentType === 'cash' ? 'var(--success-light)' : sale.paymentType === 'online' ? 'var(--info-light)' : '#fdf2f8',
                            color: sale.paymentType === 'cash' ? 'var(--success-dark)' : sale.paymentType === 'online' ? 'var(--info-dark)' : '#9d174d',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="cash">₹ Cash</option>
                          <option value="online">📱 Online</option>
                          <option value="gift">🎁 Gift</option>
                        </select>
                      ) : (
                        <span className={`payment-badge ${sale.paymentType}`}>
                          {sale.paymentType === 'cash' ? '₹ Cash' : sale.paymentType === 'online' ? '📱 Online' : '🎁 Gift'}
                        </span>
                      )}
                    </td>
                    <td className="text-secondary">
                      {sale.referenceNumber && <div style={{ marginBottom: '2px' }}>{sale.referenceNumber}</div>}
                      {sale.notes && <div style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>{sale.notes}</div>}
                      {!sale.referenceNumber && !sale.notes && '—'}
                    </td>
                    <td className="text-secondary">{sale.user?.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm text-success" onClick={() => setReceiptSale(sale)} title="Send WhatsApp Receipt">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </button>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingSale(sale)} title="Delete Sale">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
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
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <input type="checkbox" id="customItemToggle" name="isCustomItem" value="true" checked={isCustomItem} onChange={e => setIsCustomItem(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
            <label htmlFor="customItemToggle" style={{ margin: 0, fontWeight: 600, color: 'var(--primary-hover)', cursor: 'pointer' }}>➕ Sell Custom / Unlisted Item</label>
          </div>

          {!isCustomItem ? (
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
                required={!isCustomItem}
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
          ) : (
            <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input name="customName" type="text" className="form-input" required={isCustomItem} placeholder="e.g. Type-C Cable" />
                </div>
                <div className="form-group">
                  <label className="form-label">Brand (Optional)</label>
                  <input name="customBrand" type="text" className="form-input" placeholder="e.g. Samsung" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select name="customCategoryId" className="form-select" required={isCustomItem}>
                    <option value="">Choose category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (₹) *</label>
                  <input name="customPrice" type="number" className="form-input" required={isCustomItem} min="0" onChange={e => {
                    if (quantity > 0) setCustomPaidAmount(Number(e.target.value) * quantity);
                  }} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                Note: This item will be automatically saved to your inventory after this sale.
              </p>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                name="quantity"
                type="number"
                className="form-input"
                min="1"
                max={!isCustomItem ? (selectedItemData?.stock || 999) : 999}
                value={quantity}
                onChange={e => {
                  const q = parseInt(e.target.value) || 1;
                  setQuantity(q);
                  if (selectedItemData) setCustomPaidAmount(getRoundedAmount(q * selectedItemData.sellingPrice));
                }}
                required
              />
              {!isCustomItem && selectedItemData && (
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
              {!isCustomItem && selectedItemData && customPaidAmount !== '' && quantity > 0 && (
                Number(customPaidAmount) / quantity !== selectedItemData.sellingPrice
              ) && (
                <div style={{ marginTop: '0.5rem', background: 'var(--warning-light)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, color: '#854d0e' }}>
                    <input type="checkbox" name="updateDefaultPrice" value="true" />
                    <strong>Update default inventory price to ₹{Number(customPaidAmount) / quantity}?</strong>
                  </label>
                </div>
              )}
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
            <button type="submit" className="btn btn-primary" disabled={loading || (!isCustomItem && !selectedItem)}>
              {loading ? <><span className="spinner"></span> Recording...</> : paymentType === 'gift' ? 'Record Gift' : `Record Sale • ${formatCurrency(displayTotal)}`}
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
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Is the returned item defective? *</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="radio" name="isDefective" checked={isDefective} onChange={() => setIsDefective(true)} />
                    Yes (Return to Dealer)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="radio" name="isDefective" checked={!isDefective} onChange={() => setIsDefective(false)} />
                    No (Add back to stock)
                  </label>
                </div>
              </div>

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

          <div className="form-group">
            <label className="form-label">Original Purchase Date (Optional)</label>
            <input
              type="date"
              className="form-input"
              value={originalPurchaseDate}
              onChange={(e) => setOriginalPurchaseDate(e.target.value)}
              max={(() => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              })()}
            />
            <span className="form-hint" style={{ display: 'block', marginTop: '0.25rem' }}>
              Select the date the customer originally bought this item (for reference).
            </span>
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

      {/* WhatsApp Receipt Modal */}
      <Modal isOpen={!!receiptSale} onClose={() => setReceiptSale(null)} title="Send Digital Receipt" size="sm">
        {receiptSale && (
          <form onSubmit={handleSendReceipt}>
            <div className="form-group">
              <label className="form-label">Customer WhatsApp Number *</label>
              <div style={{ display: 'flex' }}>
                <span style={{ padding: '0.75rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: '8px 0 0 8px', color: 'var(--text-secondary)' }}>+91</span>
                <input 
                  type="tel" 
                  className="form-input" 
                  style={{ borderRadius: '0 8px 8px 0' }}
                  placeholder="9876543210" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  pattern="[0-9]*"
                  minLength={10}
                  maxLength={10}
                  required 
                />
              </div>
              <p className="form-hint" style={{ marginTop: '0.5rem' }}>This will open WhatsApp in a new tab with a pre-filled professional receipt message.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setReceiptSale(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#25D366', borderColor: '#25D366', color: 'white' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                Open WhatsApp
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
