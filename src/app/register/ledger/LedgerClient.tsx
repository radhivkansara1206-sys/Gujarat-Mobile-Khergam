'use client';

import { useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { formatCurrency, formatDateTime } from '@/lib/utils';

// Format JSON notes (denominations) into a readable string
const formatDenomsText = (notesJson: string | null) => {
  if (!notesJson) return '';
  try {
    const denoms = JSON.parse(notesJson);
    const parts = Object.entries(denoms)
      .filter(([_, v]) => Number(v) > 0)
      .map(([k, v]) => `${k === 'coins' ? 'Coins' : '₹' + k} x ${v}`);
    return parts.join(', ');
  } catch {
    return '';
  }
};
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { deleteCashRegister } from '@/app/actions/register';
import { useRouter } from 'next/navigation';

export default function LedgerClient({ history }: { history: any[] }) {
  const [search, setSearch] = useState('');
  const [deletingLedger, setDeletingLedger] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const filteredHistory = history.filter(h => {
    const searchLower = search.toLowerCase();
    const dateStr = new Date(h.openedAt).toLocaleDateString().toLowerCase();
    const openedBy = h.openedBy?.name?.toLowerCase() || '';
    const closedBy = h.closedBy?.name?.toLowerCase() || '';
    return dateStr.includes(searchLower) || openedBy.includes(searchLower) || closedBy.includes(searchLower);
  });

  async function handleDeleteLedger() {
    setLoading(true);
    const res = await deleteCashRegister(deletingLedger.id);
    if (res.success) {
      showToast('Ledger deleted successfully');
      setDeletingLedger(null);
      router.refresh();
      window.location.reload();
    } else {
      showToast(res.error || 'Failed to delete ledger', 'error');
    }
    setLoading(false);
  }

  return (
    <div>
      <BackButton />
      <div className="page-header">
        <div>
          <h1 className="page-title">Historical Cash Ledger</h1>
          <p className="page-subtitle">Track the day-to-day chain of cash ROJMEL operations</p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div className="table-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="search-icon">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              className="form-input" 
              placeholder="Search by date or name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="table-count">{filteredHistory.length} records</span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <h3 className="empty-state-title">No history found</h3>
            <p className="empty-state-text">Your closed ROJMEL history will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Opening Bal</th>
                  <th>Expected Close</th>
                  <th>Actual Close</th>
                  <th>Discrepancy</th>
                  <th>Notes / Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h: any, i: number) => {
                  const isLinked = i < filteredHistory.length - 1 && h.openingBalance === filteredHistory[i+1].closingBalance;
                  
                  return (
                    <tr key={h.id}>
                      <td>
                        <div className="font-semibold">{formatDateTime(h.openedAt)}</div>
                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>By: {h.openedBy.name}</div>
                      </td>
                      <td>
                        <div className="font-semibold">{h.closedAt ? formatDateTime(h.closedAt) : '—'}</div>
                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>By: {h.closedBy?.name || '—'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {formatCurrency(h.openingBalance)}
                          {!isLinked && i < filteredHistory.length - 1 && h.discrepancyAmount !== 0 && (
                            <span title="Broken Chain: Opening balance differs from previous close" style={{ color: '#ef4444', cursor: 'help' }}>⚠️</span>
                          )}
                        </div>
                        {h.openingNotes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {formatDenomsText(h.openingNotes)}
                          </div>
                        )}
                      </td>
                      <td className="text-secondary">{formatCurrency(h.expectedClosingBalance || 0)}</td>
                      <td className="font-semibold">
                        <div>{formatCurrency(h.closingBalance || 0)}</div>
                        {h.closingNotes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 'normal' }}>
                            {formatDenomsText(h.closingNotes)}
                          </div>
                        )}
                      </td>
                      <td>
                        {h.closingBalance !== h.expectedClosingBalance ? (
                          <span className="text-danger font-semibold">
                            {formatCurrency((h.closingBalance || 0) - (h.expectedClosingBalance || 0))}
                          </span>
                        ) : (
                          <span className="text-success">Match</span>
                        )}
                      </td>
                      <td className="text-secondary">
                        {h.discrepancyReason || '—'}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingLedger(h)} title="Delete Ledger">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Ledger Modal */}
      <Modal isOpen={!!deletingLedger} onClose={() => setDeletingLedger(null)} title="Delete Ledger" size="sm">
        {deletingLedger && (
          <div>
            <p style={{ marginBottom: '1.5rem' }}>
              Are you sure you want to delete this closed ROJMEL from <strong>{new Date(deletingLedger.openedAt).toLocaleDateString()}</strong>? 
              This will also delete any manual cash movements associated with it. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingLedger(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteLedger} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Ledger'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
