'use client';

import { useState } from 'react';
import CategoryCard from '@/components/CategoryCard';
import Modal from '@/components/Modal';
import { createCategory } from '@/app/actions/categories';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface InventoryClientProps {
  categories: any[];
  isAdmin: boolean;
}

export default function InventoryClient({ categories, isAdmin }: InventoryClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleAddCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createCategory(formData);
    if (result.success) {
      showToast('Category created successfully');
      setShowAddModal(false);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to create category', 'error');
    }
    setLoading(false);
  }

  return (
    <div>
      <BackButton />
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage your stock by category</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a href="/inventory/report" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
              🖨️ Print Report
            </a>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Category
            </button>
          </div>
        )}
      </div>

      <div className="category-grid">
        {categories.map((cat: any) => {
          const items = cat.items || [];
          const lowStock = items.filter((i: any) => i.stock > 0 && i.stock <= i.lowStockThreshold).length;
          const outOfStock = items.filter((i: any) => i.stock <= 0).length;
          return (
            <CategoryCard
              key={cat.id}
              id={cat.id}
              name={cat.name}
              icon={cat.icon}
              color={cat.color}
              itemCount={cat._count?.items || 0}
              lowStockCount={lowStock}
              outOfStockCount={outOfStock}
            />
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3 className="empty-state-title">No categories yet</h3>
          <p className="empty-state-text">Create your first category to start managing inventory</p>
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Category">
        <form onSubmit={handleAddCategory}>
          <div className="form-group">
            <label className="form-label" htmlFor="cat-name">Category Name</label>
            <input id="cat-name" name="name" className="form-input" placeholder="e.g. Earphones & Headphones" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="cat-icon">Icon (Emoji)</label>
              <input id="cat-icon" name="icon" className="form-input" placeholder="🎧" defaultValue="📦" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cat-color">Color</label>
              <input id="cat-color" name="color" type="color" className="form-input" defaultValue="#f59e0b" style={{ height: '42px' }} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span> Creating...</> : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
