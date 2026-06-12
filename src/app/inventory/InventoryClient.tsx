'use client';

import { useState } from 'react';
import CategoryCard from '@/components/CategoryCard';
import CompanyCard from '@/components/CompanyCard';
import Modal from '@/components/Modal';
import { createCategory, deleteCategory, getStockReportData } from '@/app/actions/categories';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface InventoryClientProps {
  categories: any[];
  isAdmin: boolean;
  companyStock?: { brand: string; stock: number }[];
}

export default function InventoryClient({ categories, isAdmin, companyStock }: InventoryClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const allItems = categories.flatMap((cat: any) => 
    (cat.items || []).map((i: any) => ({ ...i, category: { name: cat.name } }))
  );

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

  async function handleDeleteCategory() {
    if (!deletingCategory) return;
    setDeleteLoading(true);
    const result = await deleteCategory(deletingCategory.id);
    if (result.success) {
      showToast('Category deleted successfully');
      setDeletingCategory(null);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete category', 'error');
    }
    setDeleteLoading(false);
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

      // Use jsPDF directly — no html2canvas, no DOM screenshot, always works
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const nowStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      // ── Try to embed the logo from public folder ──────────────────────
      try {
        const logoResp = await fetch('/logo.png');
        const logoBlob = await logoResp.blob();
        const logoBase64: string = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        // Logo: left side, 20x20mm
        doc.addImage(logoBase64, 'PNG', margin, y, 20, 20);
      } catch (_) {
        // Logo optional — continue without it
      }

      // ── Header text: centered ──────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text('Gujarat Mobile Khergam', pageW / 2, y + 8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Inventory Stock Report', pageW / 2, y + 15, { align: 'center' });

      doc.setFontSize(8);
      doc.text(`Generated on: ${nowStr}`, pageW / 2, y + 20, { align: 'center' });

      y += 24;

      // Orange accent bar below header
      doc.setFillColor(255, 102, 0);
      doc.rect(margin, y, contentW, 1.2, 'F');
      y += 7;

      // ── Summary Box ──────────────────────────────────────────────────
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentW, 20, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentW, 20, 3, 3, 'S');

      const col = contentW / 3;
      const summaryItems = [
        { label: 'Total Items', value: String(totals.totalItems) },
        { label: 'Total Stock', value: `${totals.totalStock} units` },
        { label: 'Inventory Value', value: `Rs.${totals.totalValue.toLocaleString('en-IN')}` },
      ];
      summaryItems.forEach((s, i) => {
        const cx = margin + col * i + col / 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(s.label, cx, y + 7, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(i === 2 ? 16 : 15, i === 2 ? 185 : 23, i === 2 ? 129 : 42);
        doc.text(s.value, cx, y + 16, { align: 'center' });
      });
      y += 26;

      // ── Category Tables ── (skip empty categories) ──────────────────
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
      };

      for (const category of reportCategories) {
        const items: any[] = category.items || [];
        // Skip categories that have no items
        if (items.length === 0) continue;

        const rowH = 7;
        const tableH = 12 + items.length * rowH + 8;

        if (y + tableH > 278) {
          doc.addPage();
          y = margin;
        }

        // Category heading with colored underline
        const catColor = hexToRgb(category.color || '#ff6600');
        doc.setFillColor(catColor.r, catColor.g, catColor.b);
        doc.rect(margin, y + 6, contentW, 0.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(category.name, margin, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`${items.length} items`, margin + contentW, y + 5, { align: 'right' });
        y += 10;

        // Table header
        const cols = [
          { label: '#',            x: margin,           w: 8,  align: 'left' as const },
          { label: 'Item Name',    x: margin + 8,       w: 72, align: 'left' as const },
          { label: 'Price (Rs.)',  x: margin + 80,      w: 35, align: 'right' as const },
          { label: 'Stock',        x: margin + 115,     w: 25, align: 'right' as const },
          { label: 'Status',       x: margin + 140,     w: 35, align: 'center' as const },
        ];

        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        cols.forEach(col => {
          const tx = col.align === 'right'
            ? col.x + col.w
            : col.align === 'center'
              ? col.x + col.w / 2
              : col.x;
          doc.text(col.label, tx, y + 4.8, { align: col.align });
        });
        y += 7;

        // Table rows
        items.forEach((item: any, idx: number) => {
          if (y + rowH > 285) {
            doc.addPage();
            y = margin;
          }

          const isLow = item.stock > 0 && item.stock <= item.lowStockThreshold;
          const isOut = item.stock <= 0;

          // Alternating row bg
          if (idx % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, contentW, rowH, 'F');
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);

          // #
          doc.setTextColor(148, 163, 184);
          doc.text(String(idx + 1), cols[0].x, y + 4.8);

          // Name
          doc.setTextColor(15, 23, 42);
          const name = item.name.length > 38 ? item.name.slice(0, 36) + '…' : item.name;
          doc.text(name, cols[1].x, y + 4.8);

          // Price
          doc.setTextColor(71, 85, 105);
          doc.text(item.sellingPrice.toLocaleString('en-IN'), cols[2].x + cols[2].w, y + 4.8, { align: 'right' });

          // Stock
          if (isOut) doc.setTextColor(220, 38, 38);
          else if (isLow) doc.setTextColor(217, 119, 6);
          else doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.text(String(item.stock), cols[3].x + cols[3].w, y + 4.8, { align: 'right' });

          // Status badge
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          const badgeCx = cols[4].x + cols[4].w / 2;
          const badgeW = 18;
          const badgeH = 4;
          const badgeY = y + 1.5;
          if (isOut) {
            doc.setFillColor(254, 226, 226);
            doc.roundedRect(badgeCx - badgeW / 2, badgeY, badgeW, badgeH, 1, 1, 'F');
            doc.setTextColor(220, 38, 38);
            doc.text('Out of Stock', badgeCx, badgeY + 2.8, { align: 'center' });
          } else if (isLow) {
            doc.setFillColor(254, 243, 199);
            doc.roundedRect(badgeCx - badgeW / 2, badgeY, badgeW, badgeH, 1, 1, 'F');
            doc.setTextColor(217, 119, 6);
            doc.text('Low Stock', badgeCx, badgeY + 2.8, { align: 'center' });
          } else {
            doc.setFillColor(209, 250, 229);
            doc.roundedRect(badgeCx - badgeW / 2, badgeY, badgeW, badgeH, 1, 1, 'F');
            doc.setTextColor(5, 150, 105);
            doc.text('In Stock', badgeCx, badgeY + 2.8, { align: 'center' });
          }

          // Row separator
          doc.setDrawColor(241, 245, 249);
          doc.line(margin, y + rowH, margin + contentW, y + rowH);
          y += rowH;
        });

        y += 5;
      }

      // ── Footer ───────────────────────────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 287, margin + contentW, 287);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Gujarat Mobile Khergam — Stock Report', margin, 292);
        doc.text(`Page ${p} of ${totalPages}`, margin + contentW, 292, { align: 'right' });
      }

      doc.save(`Gujarat_Mobile_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Stock Report PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF', error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportToExcel = async () => {
    setExportingExcel(true);
    try {
      const result = await getStockReportData();
      if (!result.success || !result.data) {
        showToast(result.error || 'Failed to fetch report data', 'error');
        setExportingExcel(false);
        return;
      }

      const { categories: reportCategories } = result.data;

      // Prepare headers
      const headers = [
        'Category',
        'Item Name',
        'Brand',
        'Model',
        'Purchase Price (INR)',
        'Selling Price (INR)',
        'Stock',
        'Status',
        'Total Cost Value (INR)',
        'Total Retail Value (INR)',
        'Potential Profit (INR)'
      ];

      const rows: string[][] = [];

      reportCategories.forEach((cat: any) => {
        const items = cat.items || [];
        if (items.length === 0) return;
        items.forEach((item: any) => {
          const isLow = item.stock > 0 && item.stock <= item.lowStockThreshold;
          const isOut = item.stock <= 0;
          const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
          
          const costValue = item.purchasePrice * item.stock;
          const retailValue = item.sellingPrice * item.stock;
          const profit = retailValue - costValue;

          rows.push([
            cat.name,
            item.name,
            item.brand || '-',
            item.model || '-',
            item.purchasePrice.toString(),
            item.sellingPrice.toString(),
            item.stock.toString(),
            status,
            costValue.toString(),
            retailValue.toString(),
            profit.toString()
          ]);
        });
      });

      // Format CSV content with BOM to handle currency signs
      const csvContent = 
        '\uFEFF' + 
        [
          headers.join(','),
          ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `Gujarat_Mobile_Stock_Report_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Stock report successfully exported to Excel!');
    } catch (error) {
      console.error('Failed to export to Excel', error);
      showToast('Failed to export to Excel', 'error');
    } finally {
      setExportingExcel(false);
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
            <button
              onClick={handleExportToExcel}
              className="btn btn-secondary"
              disabled={exportingExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10B981', color: 'white', border: '1px solid #10B981' }}
            >
              {exportingExcel ? '⏳ Exporting...' : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export to Excel
                </>
              )}
            </button>
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
          const isSimCategory = cat.name.toLowerCase().includes('sim');
          const lowStock = isSimCategory ? 0 : items.filter((i: any) => !i.isAlertDismissed && i.stock > 0 && i.stock <= i.lowStockThreshold).length;
          const outOfStock = isSimCategory ? 0 : items.filter((i: any) => !i.isAlertDismissed && i.stock <= 0).length;
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
              items={items}
              onDelete={isAdmin ? () => setDeletingCategory(cat) : undefined}
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

      {companyStock && companyStock.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>🏢 Company-wise Stock</h2>
          <div className="stats-grid">
            {companyStock.map((company, idx) => {
              const brandName = company.brand || 'Unbranded';
              const companyItems = allItems.filter(i => (i.brand || 'Unbranded') === brandName);
              return (
                <CompanyCard 
                  key={idx} 
                  brand={brandName} 
                  stock={company.stock} 
                  items={companyItems} 
                />
              );
            })}
          </div>
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

      <Modal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)} title="Delete Category" size="sm">
        {deletingCategory && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Are you sure?</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                You are about to delete the category <strong>{deletingCategory.icon} {deletingCategory.name}</strong>.
              </p>
              <p style={{ fontSize: '0.825rem', color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 500 }}>
                This will also deactivate all items and stock within this category!
              </p>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingCategory(null)} disabled={deleteLoading}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteCategory} disabled={deleteLoading}>
                {deleteLoading ? <><span className="spinner"></span> Deleting...</> : 'Delete Category'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
