'use client';

import { useState } from 'react';
import CategoryCard from '@/components/CategoryCard';
import Modal from '@/components/Modal';
import { createCategory, getStockReportData } from '@/app/actions/categories';
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
  const [downloading, setDownloading] = useState(false);
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

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const result = await getStockReportData();
      if (!result.success || !result.data) {
        showToast(result.error || 'Failed to fetch report data', 'error');
        setDownloading(false);
        return;
      }

      const { categories: reportCategories, totals } = result.data;

      const nowStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const htmlContent = `
        <div style="width: 850px; background: white; padding: 2rem; font-family: 'Inter', sans-serif; color: #0f172a; box-sizing: border-box;">
          <div style="text-align: center; margin-bottom: 2rem; border-bottom: 3px solid #ff6600; padding-bottom: 1.5rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0;">
              Gujarat Mobile Khergam
            </h1>
            <p style="margin: 0 0 0.5rem 0; color: #64748b; font-size: 0.9rem;">Inventory Stock Report</p>
            <p style="margin: 0; color: #94a3b8; font-size: 0.8rem;">Generated on: ${nowStr}</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; background: #f8fafc; border-radius: 12px; padding: 1.25rem; border: 1px solid #e2e8f0;">
            <div style="text-align: center;">
              <p style="margin: 0; font-size: 0.8rem; color: #64748b; font-weight: 500;">Total Items</p>
              <p style="margin: 0.25rem 0 0 0; font-size: 1.75rem; font-weight: 800; color: #0f172a;">${totals.totalItems}</p>
            </div>
            <div style="text-align: center;">
              <p style="margin: 0; font-size: 0.8rem; color: #64748b; font-weight: 500;">Total Stock</p>
              <p style="margin: 0.25rem 0 0 0; font-size: 1.75rem; font-weight: 800; color: #0f172a;">${totals.totalStock} units</p>
            </div>
            <div style="text-align: center;">
              <p style="margin: 0; font-size: 0.8rem; color: #64748b; font-weight: 500;">Inventory Value</p>
              <p style="margin: 0.25rem 0 0 0; font-size: 1.75rem; font-weight: 800; color: #10b981;">₹${totals.totalValue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          ${reportCategories.map((category: any) => `
            <div style="margin-bottom: 2rem; page-break-inside: avoid;">
              <h2 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; border-bottom: 2px solid ${category.color || '#ff6600'}; padding-bottom: 0.5rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                <span>${category.icon || '📦'} ${category.name}</span>
                <span style="font-size: 0.8rem; font-weight: 500; color: #64748b;">
                  ${(category.items || []).length} items
                </span>
              </h2>

              ${(category.items || []).length === 0 ? `
                <p style="color: #94a3b8; font-size: 0.85rem; font-style: italic; margin: 0.5rem 0;">No items in this category</p>
              ` : `
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                  <thead>
                    <tr style="background: #f1f5f9;">
                      <th style="text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">#</th>
                      <th style="text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Item Name</th>
                      <th style="text-align: right; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Selling Price</th>
                      <th style="text-align: right; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Stock</th>
                      <th style="text-align: center; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(category.items || []).map((item: any, idx: number) => {
                      const isLow = item.stock > 0 && item.stock <= item.lowStockThreshold;
                      const isOut = item.stock <= 0;
                      return `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 0.5rem 0.75rem; color: #94a3b8;">${idx + 1}</td>
                          <td style="padding: 0.5rem 0.75rem; font-weight: 500; color: #0f172a;">${item.name}</td>
                          <td style="padding: 0.5rem 0.75rem; text-align: right; color: #475569;">₹${item.sellingPrice.toLocaleString('en-IN')}</td>
                          <td style="padding: 0.5rem 0.75rem; text-align: right; font-weight: 700; color: ${isOut ? '#dc2626' : isLow ? '#d97706' : '#0f172a'};">${item.stock}</td>
                          <td style="padding: 0.5rem 0.75rem; text-align: center;">
                            ${isOut ? `
                              <span style="display: inline-block; background: #fee2e2; color: #dc2626; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600;">Out of Stock</span>
                            ` : isLow ? `
                              <span style="display: inline-block; background: #fef3c7; color: #d97706; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600;">Low Stock</span>
                            ` : `
                              <span style="display: inline-block; background: #d1fae5; color: #059669; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600;">In Stock</span>
                            `}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `}
            </div>
          `).join('')}

          <div style="text-align: center; padding-top: 1.5rem; border-top: 2px solid #e2e8f0; color: #94a3b8; font-size: 0.75rem; margin-top: 2rem;">
            <p style="margin: 0;">Gujarat Mobile Khergam — Stock Report</p>
            <p style="margin: 0.25rem 0 0 0;">Developer: Radhiv Kansara | 📞 6354184700</p>
          </div>
        </div>
      `;

      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin:       0.4,
        filename:     `Gujarat_Mobile_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(htmlContent).save();
      showToast('Stock Report PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF', error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

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
            <button
              onClick={handleDownloadPDF}
              className="btn btn-secondary"
              disabled={downloading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {downloading ? '⏳ Downloading...' : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PDF
                </>
              )}
            </button>
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
