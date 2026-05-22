'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { updateItem } from '@/app/actions/items';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface AlertsClientProps {
  items: any[];
  isAdmin: boolean;
}

export default function AlertsClient({ items, isAdmin }: AlertsClientProps) {
  const [updatingItem, setUpdatingItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const outOfStock = items.filter((i: any) => i.stock <= 0);
  const lowStock = items.filter((i: any) => i.stock > 0 && i.stock <= i.lowStockThreshold);

  async function handleUpdateStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('name', updatingItem.name);
    const result = await updateItem(updatingItem.id, formData);
    if (result.success) {
      showToast('Stock updated successfully!');
      setUpdatingItem(null);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to update stock', 'error');
    }
    setLoading(false);
  }

  return (
    <div>
      <BackButton />
      <div className="page-header">
        <div>
          <h1 className="page-title">Low Stock Alerts</h1>
          <p className="page-subtitle">{items.length} items need attention</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3 className="empty-state-title">All stocked up!</h3>
          <p className="empty-state-text">No items are below their stock threshold. Great job!</p>
        </div>
      ) : (
        <>
          {/* Out of Stock Section */}
          {outOfStock.length > 0 && (
            <div className="alert-section">
              <h2 className="alert-section-title danger">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Out of Stock ({outOfStock.length})
              </h2>
              <div className="alert-items-grid">
                {outOfStock.map((item: any) => (
                  <div key={item.id} className="alert-item-card danger">
                    <div className="alert-item-header">
                      <div>
                        <h3 className="alert-item-name">{item.name}</h3>
                        <p className="alert-item-category">{item.category?.icon} {item.category?.name}</p>
                      </div>
                      <span className="stock-badge out-of-stock">0 units</span>
                    </div>
                    <div className="alert-item-footer">
                      <span className="text-secondary">Threshold: {item.lowStockThreshold} units</span>
                      {isAdmin && (
                        <button className="btn btn-primary btn-sm" onClick={() => setUpdatingItem(item)}>
                          Restock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Section */}
          {lowStock.length > 0 && (
            <div className="alert-section">
              <h2 className="alert-section-title warning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Low Stock ({lowStock.length})
              </h2>
              <div className="alert-items-grid">
                {lowStock.map((item: any) => (
                  <div key={item.id} className="alert-item-card warning">
                    <div className="alert-item-header">
                      <div>
                        <h3 className="alert-item-name">{item.name}</h3>
                        <p className="alert-item-category">{item.category?.icon} {item.category?.name}</p>
                      </div>
                      <span className="stock-badge low-stock">{item.stock} units</span>
                    </div>
                    <div className="alert-item-footer">
                      <span className="text-secondary">Threshold: {item.lowStockThreshold} units</span>
                      {isAdmin && (
                        <button className="btn btn-primary btn-sm" onClick={() => setUpdatingItem(item)}>
                          Update Stock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Update Stock Modal */}
      <Modal isOpen={!!updatingItem} onClose={() => setUpdatingItem(null)} title="Update Stock" size="sm">
        {updatingItem && (
          <form onSubmit={handleUpdateStock}>
            <p style={{ marginBottom: '1rem' }}>
              <strong>{updatingItem.name}</strong>
              <br />
              <span className="text-secondary">Current stock: {updatingItem.stock} | Threshold: {updatingItem.lowStockThreshold}</span>
            </p>
            <div className="form-group">
              <label className="form-label">New Stock Quantity</label>
              <input name="stock" type="number" className="form-input" defaultValue={updatingItem.stock} min="0" required autoFocus />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setUpdatingItem(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner"></span> Updating...</> : 'Update Stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
