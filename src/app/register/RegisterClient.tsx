'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { openRegister, closeRegister, addCashMovement, deleteCashMovement } from '@/app/actions/register';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function RegisterClient({ initialData, isAdmin }: { initialData: any, isAdmin: boolean }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<'ADDITION' | 'REMOVAL' | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<any>(null);

  // Open Register Form
  const prevClosing = data?.lastRegister?.closingBalance || 0;
  const [openingBalance, setOpeningBalance] = useState<number | string>(prevClosing);
  const [openDiscrepancyReason, setOpenDiscrepancyReason] = useState('');

  // Close Register Form
  const [actualClosingBalance, setActualClosingBalance] = useState<number | string>(data?.currentExpectedCash || 0);
  const [closeDiscrepancyReason, setCloseDiscrepancyReason] = useState('');

  // Custom Time Overrides
  const [openedAtOverride, setOpenedAtOverride] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [closedAtOverride, setClosedAtOverride] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Calculator State
  const [useCalculator, setUseCalculator] = useState(false);
  const [denominations, setDenominations] = useState({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0
  });

  const autoFillDenominations = (amount: number) => {
    let remaining = amount;
    const denoms = [500, 200, 100, 50, 20, 10];
    const newDenoms = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0 };
    
    for (const val of denoms) {
      const count = Math.floor(remaining / val);
      newDenoms[val as keyof typeof newDenoms] = count;
      remaining -= count * val;
    }
    newDenoms.coins = remaining;
    return newDenoms;
  };

  const handleOpenModalClick = () => {
    setDenominations(autoFillDenominations(prevClosing));
    setOpeningBalance(prevClosing);
    setShowOpenModal(true);
  };

  const handleCloseModalClick = () => {
    const expected = data?.currentExpectedCash || 0;
    setDenominations(autoFillDenominations(expected));
    setActualClosingBalance(expected);
    setShowCloseModal(true);
  };

  const calculateTotal = (denoms: typeof denominations) => {
    return (
      (denoms[500] * 500) +
      (denoms[200] * 200) +
      (denoms[100] * 100) +
      (denoms[50] * 50) +
      (denoms[20] * 20) +
      (denoms[10] * 10) +
      (denoms.coins || 0)
    );
  };

  const renderCalculator = (setBalance: (v: number) => void) => (
    <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Cash Denominations</h4>
        <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(calculateTotal(denominations))}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[500, 200, 100, 50, 20, 10].map(val => (
          <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '40px', fontSize: '0.9rem' }}>₹{val}</span>
            <span style={{ color: 'var(--text-muted)' }}>x</span>
            <input 
              type="number" 
              min="0" 
              className="form-input" 
              style={{ padding: '0.25rem 0.5rem', height: 'auto', minHeight: '32px' }} 
              value={denominations[val as keyof typeof denominations] || ''}
              onChange={e => {
                const newDenoms = { ...denominations, [val]: Number(e.target.value) };
                setDenominations(newDenoms);
                setBalance(calculateTotal(newDenoms));
              }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: 'span 2' }}>
          <span style={{ width: '40px', fontSize: '0.9rem' }}>Coins</span>
          <span style={{ color: 'var(--text-muted)' }}>=</span>
          <input 
            type="number" 
            min="0" 
            className="form-input" 
            placeholder="Total coin value in ₹"
            style={{ padding: '0.25rem 0.5rem', height: 'auto', minHeight: '32px' }} 
            value={denominations.coins || ''}
            onChange={e => {
              const newDenoms = { ...denominations, coins: Number(e.target.value) };
              setDenominations(newDenoms);
              setBalance(calculateTotal(newDenoms));
            }}
          />
        </div>
      </div>
    </div>
  );

  async function handleOpenRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const hasPastRegister = !!data?.lastRegister;
    const discrepancyAmount = hasPastRegister ? Number(openingBalance) - prevClosing : 0;
    
    if (hasPastRegister && discrepancyAmount !== 0 && !openDiscrepancyReason) {
      showToast('Reason required for opening balance discrepancy', 'error');
      setLoading(false);
      return;
    }

    const res = await openRegister({ 
      openingBalance: Number(openingBalance), 
      discrepancyAmount, 
      discrepancyReason: hasPastRegister ? openDiscrepancyReason : 'Initial System Setup',
      openingNotes: useCalculator ? JSON.stringify(denominations) : '',
      openedAt: openedAtOverride
    });
    if (res.success) {
      showToast('ROJMEL opened successfully!');
      router.refresh();
      window.location.reload(); // Refresh fully to get new server data
    } else {
      showToast(res.error, 'error');
    }
    setLoading(false);
  }

  async function handleCloseRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const discrepancyAmount = Number(actualClosingBalance) - (data.currentExpectedCash || 0);
    
    if (discrepancyAmount !== 0 && !closeDiscrepancyReason) {
      showToast('Reason required for closing balance discrepancy', 'error');
      setLoading(false);
      return;
    }

    const res = await closeRegister({ 
      actualClosingBalance: Number(actualClosingBalance), 
      expectedClosingBalance: data.currentExpectedCash, 
      discrepancyAmount, 
      discrepancyReason: closeDiscrepancyReason,
      closingNotes: useCalculator ? JSON.stringify(denominations) : '',
      closedAt: closedAtOverride
    });

    if (res.success) {
      showToast('ROJMEL closed for the day!');
      router.refresh();
      window.location.reload();
    } else {
      showToast(res.error, 'error');
    }
    setLoading(false);
  }

  async function handleCashMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const reason = formData.get('reason') as string;
    const notes = formData.get('notes') as string;

    const res = await addCashMovement({ type: showMovementModal!, amount, reason, notes });
    if (res.success) {
      showToast(`Cash ${showMovementModal === 'ADDITION' ? 'added' : 'removed'} successfully!`);
      setShowMovementModal(null);
      router.refresh();
      window.location.reload();
    } else {
      showToast(res.error, 'error');
    }
    setLoading(false);
  }

  async function handleDeleteMovement() {
    setLoading(true);
    const res = await deleteCashMovement(deletingMovement.id);
    if (res.success) {
      showToast('Cash movement deleted successfully');
      setDeletingMovement(null);
      router.refresh();
      window.location.reload();
    } else {
      showToast(res.error || 'Failed to delete movement', 'error');
    }
    setLoading(false);
  }

  if (!data?.isOpen) {
    // CLOSED STATE
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">ROJMEL is Closed</h1>
            <p className="page-subtitle">Open the drawer to start the day</p>
          </div>
          <Link href="/register/ledger" className="btn btn-secondary">View Ledger</Link>
        </div>

        <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '1rem' }}>Drawer is currently locked</h2>
          {data?.lastRegister ? (
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p><strong>Previous Closing Balance:</strong> {formatCurrency(data.lastRegister.closingBalance || 0)}</p>
              <p><strong>Closed By:</strong> {data.lastRegister.closedBy?.name}</p>
              <p><strong>Closed At:</strong> {formatDateTime(data.lastRegister.closedAt)}</p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>No previous ROJMEL records found. (First time setup)</p>
          )}
          <button className="btn btn-primary btn-lg" onClick={handleOpenModalClick} style={{ width: '100%' }}>
            Open Drawer
          </button>
        </div>

        <Modal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} title="Open Drawer">
          <form onSubmit={handleOpenRegister}>
            {!!data?.lastRegister && (
              <div className="form-group">
                <label className="form-label">Yesterday's Closing Balance</label>
                <div className="form-static-value">{formatCurrency(prevClosing)}</div>
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Opening Date & Time</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={openedAtOverride} 
                onChange={e => setOpenedAtOverride(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  {data?.lastRegister ? "Today's Opening Cash (₹) *" : "Initial Shop Setup: Current Cash (₹) *"}
                </label>
                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }}>
                  <input type="checkbox" checked={useCalculator} onChange={e => setUseCalculator(e.target.checked)} />
                  Use Calculator
                </label>
              </div>
              {useCalculator && renderCalculator(setOpeningBalance)}
              <input 
                type="number" 
                className="form-input" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))} 
                min="0" 
                required 
                readOnly={useCalculator}
                style={useCalculator ? { background: 'var(--bg-main)', cursor: 'not-allowed' } : {}}
              />
            </div>
            
            {!!data?.lastRegister && Number(openingBalance) !== prevClosing && (
              <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
                <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem' }}>
                  ⚠️ Discrepancy Detected: {formatCurrency(Number(openingBalance) - prevClosing)}
                </p>
                <div className="form-group">
                  <label className="form-label">Reason for Discrepancy *</label>
                  <select className="form-select" value={openDiscrepancyReason} onChange={e => setOpenDiscrepancyReason(e.target.value)} required>
                    <option value="">Select a reason...</option>
                    <option value="Owner Withdrawal">Owner Withdrawal</option>
                    <option value="Bank Deposit">Bank Deposit</option>
                    <option value="Missing Cash">Missing Cash / Unexplained</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Opening...' : 'Confirm & Open'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // OPEN STATE
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ROJMEL: OPEN</h1>
          <p className="page-subtitle">Opened by {data.register.openedBy.name} at {formatDateTime(data.register.openedAt)}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/register/ledger" className="btn btn-secondary">Ledger</Link>
          <button className="btn btn-danger" onClick={handleCloseModalClick}>Close Drawer</button>
        </div>
      </div>

      <div className="stats-grid stats-grid-4">
        <div className="stat-card">
          <div className="stat-card-label">Opening Balance</div>
          <div className="stat-card-value">
            {formatCurrency(data.register.openingBalance)}
            {data.register.openingNotes && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 'normal', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {Object.entries(JSON.parse(data.register.openingNotes)).filter(([_,v]) => Number(v) > 0).map(([k,v]) => (
                  <span key={k} style={{ background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    {k === 'coins' ? 'Coins' : `₹${k}`} x {v as any}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Cash Sales Today</div>
          <div className="stat-card-value text-success">+{formatCurrency(data.cashSales)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Cash Expenses</div>
          <div className="stat-card-value text-danger">-{formatCurrency(data.cashExpenses)}</div>
        </div>
        <div className="stat-card" style={{ border: '2px solid var(--primary)', background: 'var(--primary-light)' }}>
          <div className="stat-card-label" style={{ color: 'var(--primary)' }}>Expected Cash in Drawer</div>
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>{formatCurrency(data.currentExpectedCash)}</div>
        </div>
      </div>

      <div className="card mt-2">
        <div className="table-header">
          <h3 style={{ margin: 0 }}>Manual Cash Movements</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMovementModal('ADDITION')}>+ Add Cash</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMovementModal('REMOVAL')}>- Remove Cash</button>
          </div>
        </div>

        {data.register.movements.length === 0 ? (
          <p className="text-secondary" style={{ padding: '1rem 0' }}>No manual cash movements today.</p>
        ) : (
          <div className="table-responsive mt-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>By</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.register.movements.map((m: any) => (
                  <tr key={m.id}>
                    <td className="text-secondary">{new Date(m.createdAt).toLocaleTimeString()}</td>
                    <td>
                      <span className={`badge ${m.type === 'ADDITION' ? 'badge-success' : 'badge-danger'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td>{m.reason} <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{m.notes}</span></td>
                    <td className={`font-semibold ${m.type === 'ADDITION' ? 'text-success' : 'text-danger'}`}>
                      {m.type === 'ADDITION' ? '+' : '-'}{formatCurrency(m.amount)}
                    </td>
                    <td className="text-secondary">{m.user.name}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeletingMovement(m)} title="Delete Movement">
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

      {/* Cash Movement Modal */}
      <Modal isOpen={!!showMovementModal} onClose={() => setShowMovementModal(null)} title={showMovementModal === 'ADDITION' ? 'Add Cash to Drawer' : 'Remove Cash from Drawer'}>
        {showMovementModal && (
          <form onSubmit={handleCashMovement}>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input name="amount" type="number" className="form-input" min="1" required />
            </div>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <select name="reason" className="form-select" required>
                <option value="">Select reason...</option>
                {showMovementModal === 'ADDITION' ? (
                  <>
                    <option value="Change Float Added">Change Float Added</option>
                    <option value="Owner Deposit">Owner Deposit</option>
                    <option value="Other Addition">Other Addition</option>
                  </>
                ) : (
                  <>
                    <option value="Bank Deposit">Bank Deposit</option>
                    <option value="Owner Withdrawal">Owner Withdrawal</option>
                    <option value="Supplier Payment (Cash)">Supplier Payment (Cash)</option>
                    <option value="Other Removal">Other Removal</option>
                  </>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <input name="notes" className="form-input" placeholder="Additional details..." />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowMovementModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Close Register Modal */}
      <Modal isOpen={showCloseModal} onClose={() => setShowCloseModal(false)} title="Close Drawer">
        <form onSubmit={handleCloseRegister}>
          <div className="form-group">
            <label className="form-label">Closing Date & Time</label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={closedAtOverride} 
              onChange={e => setClosedAtOverride(e.target.value)} 
              required 
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Note: Changing this will recalculate Expected Cash accurately on the backend based on sales exactly up to this time.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Expected Cash in Drawer</label>
            <div className="form-static-value" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
              {formatCurrency(data.currentExpectedCash)}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              (Live calculation up to current time. Actual calculation will adjust to your custom time above).
            </p>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Actual Cash Counted (₹) *</label>
              <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }}>
                <input type="checkbox" checked={useCalculator} onChange={e => setUseCalculator(e.target.checked)} />
                Use Calculator
              </label>
            </div>
            {useCalculator && renderCalculator(setActualClosingBalance)}
            <input 
              type="number" 
              className="form-input" 
              value={actualClosingBalance} 
              onChange={e => setActualClosingBalance(e.target.value === '' ? '' : Number(e.target.value))} 
              min="0" 
              required 
              readOnly={useCalculator}
              style={useCalculator ? { background: 'var(--bg-main)', cursor: 'not-allowed' } : {}}
            />
          </div>

          {Number(actualClosingBalance) !== data.currentExpectedCash && (
            <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
              <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem' }}>
                ⚠️ Discrepancy Detected: {formatCurrency(Number(actualClosingBalance) - data.currentExpectedCash)}
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Discrepancy *</label>
                <select className="form-select" value={closeDiscrepancyReason} onChange={e => setCloseDiscrepancyReason(e.target.value)} required>
                  <option value="">Select a reason...</option>
                  <option value="Missing Cash">Missing Cash</option>
                  <option value="Over Count">Over Count</option>
                  <option value="Unrecorded Expense">Unrecorded Expense</option>
                  <option value="Unrecorded Sale">Unrecorded Sale</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Closing...' : 'Close ROJMEL'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Movement Modal */}
      <Modal isOpen={!!deletingMovement} onClose={() => setDeletingMovement(null)} title="Delete Cash Movement" size="sm">
        {deletingMovement && (
          <div>
            <p style={{ marginBottom: '1.5rem' }}>
              Are you sure you want to delete this {deletingMovement.type.toLowerCase()} of <strong>{formatCurrency(deletingMovement.amount)}</strong>? 
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingMovement(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteMovement} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Movement'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
