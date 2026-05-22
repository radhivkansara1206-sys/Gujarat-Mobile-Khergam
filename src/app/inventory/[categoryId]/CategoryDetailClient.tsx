'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import StockBadge from '@/components/StockBadge';
import { createItem, updateItem, deleteItem } from '@/app/actions/items';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface CategoryDetailClientProps {
  category: any;
  items: any[];
  isAdmin: boolean;
}

export default function CategoryDetailClient({ category, items, isAdmin }: CategoryDetailClientProps) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [updatingStockItem, setUpdatingStockItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.brand.toLowerCase().includes(search.toLowerCase()) ||
    item.model.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('categoryId', category.id);
    const result = await createItem(formData);
    if (result.success) {
      showToast('Item added successfully');
      setShowAddModal(false);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to add item', 'error');
    }
    setLoading(false);
  }

  async function handleEditItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateItem(editingItem.id, formData);
    if (result.success) {
      showToast('Item updated successfully');
      setEditingItem(null);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to update item', 'error');
    }
    setLoading(false);
  }

  async function handleUpdateStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('name', updatingStockItem.name); // keep name intact
    const result = await updateItem(updatingStockItem.id, formData);
    if (result.success) {
      showToast('Stock updated successfully!');
      setUpdatingStockItem(null);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to update stock', 'error');
    }
    setLoading(false);
  }

  async function handleDeleteItem() {
    setLoading(true);
    const result = await deleteItem(deletingItem.id);
    if (result.success) {
      showToast('Item deleted successfully');
      setDeletingItem(null);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete item', 'error');
    }
    setLoading(false);
  }

  return (
    <div>
      <BackButton />
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/inventory" className="breadcrumb-link">Inventory</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{category.icon} {category.name}</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{category.icon} {category.name}</h1>
          <p className="page-subtitle">{items.length} items in this category</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Item
          </button>
        )}
      </div>

      {/* Items Table */}
      <div className="table-container">
        <div className="table-header">
          <div className="table-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="search-icon">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="form-input"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="table-count">{filteredItems.length} items</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{category.icon}</div>
            <h3 className="empty-state-title">{search ? 'No items match your search' : 'No items yet'}</h3>
            <p className="empty-state-text">{search ? 'Try a different search term' : 'Add your first item to this category'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Brand / Model</th>
                  {isAdmin && <th>Purchase Price</th>}
                  <th>Selling Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.name}</td>
                    <td className="text-secondary">{[item.brand, item.model].filter(Boolean).join(' · ') || '—'}</td>
                    {isAdmin && <td>{formatCurrency(item.purchasePrice)}</td>}
                    <td className="font-semibold">{formatCurrency(item.sellingPrice)}</td>
                    <td>{item.stock}</td>
                    <td><StockBadge stock={item.stock} threshold={item.lowStockThreshold} /></td>
                    {isAdmin && (
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm text-primary" onClick={() => setUpdatingStockItem(item)} title="Update Stock">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingItem(item)} title="Edit Item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingItem(item)} title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Item">
        <form onSubmit={handleAddItem}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input name="name" className="form-input" placeholder="e.g. Boat Airdopes 141" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input name="brand" className="form-input" placeholder="e.g. Boat" />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input name="model" className="form-input" placeholder="e.g. Airdopes 141" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Purchase Price (₹)</label>
              <input name="purchasePrice" type="number" className="form-input" placeholder="0" min="0" step="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹) *</label>
              <input name="sellingPrice" type="number" className="form-input" placeholder="0" min="0" step="1" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Initial Stock *</label>
              <input name="stock" type="number" className="form-input" placeholder="0" min="0" required />
            </div>
            <div className="form-group">
              <label className="form-label">Low Stock Alert At</label>
              <input name="lowStockThreshold" type="number" className="form-input" placeholder="5" min="0" defaultValue="5" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span> Adding...</> : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item">
        {editingItem && (
          <form onSubmit={handleEditItem}>
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input name="name" className="form-input" defaultValue={editingItem.name} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input name="brand" className="form-input" defaultValue={editingItem.brand} />
              </div>
              <div className="form-group">
                <label className="form-label">Model</label>
                <input name="model" className="form-input" defaultValue={editingItem.model} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Purchase Price (₹)</label>
                <input name="purchasePrice" type="number" className="form-input" defaultValue={editingItem.purchasePrice} min="0" step="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (₹)</label>
                <input name="sellingPrice" type="number" className="form-input" defaultValue={editingItem.sellingPrice} min="0" step="1" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Current Stock</label>
                <input name="stock" type="number" className="form-input" defaultValue={editingItem.stock} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Alert At</label>
                <input name="lowStockThreshold" type="number" className="form-input" defaultValue={editingItem.lowStockThreshold} min="0" />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner"></span> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Quick Update Stock Modal */}
      <Modal isOpen={!!updatingStockItem} onClose={() => setUpdatingStockItem(null)} title="Update Stock" size="sm">
        {updatingStockItem && (
          <form onSubmit={handleUpdateStock}>
            <p style={{ marginBottom: '1rem' }}>
              <strong>{updatingStockItem.name}</strong>
              <br />
              <span className="text-secondary">Current stock: {updatingStockItem.stock} | Threshold: {updatingStockItem.lowStockThreshold}</span>
            </p>
            <div className="form-group">
              <label className="form-label">New Stock Quantity</label>
              <input name="stock" type="number" className="form-input" defaultValue={updatingStockItem.stock} min="0" required autoFocus />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setUpdatingStockItem(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner"></span> Updating...</> : 'Update Stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} title="Delete Item" size="sm">
        {deletingItem && (
          <div>
            <p>Are you sure you want to delete <strong>{deletingItem.name}</strong>?</p>
            <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              This action cannot be undone. Sales and gift history for this item will be preserved.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeletingItem(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteItem} disabled={loading}>
                {loading ? <><span className="spinner"></span> Deleting...</> : 'Delete Item'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
