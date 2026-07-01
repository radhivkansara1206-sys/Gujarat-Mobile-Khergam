'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { createUser, deleteUser, updateUser } from '@/app/actions/users';
import { logoutAction } from '@/app/actions/auth';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { runManualOptimizationAction } from '@/app/actions/optimize';

interface SettingsClientProps {
  users: any[];
  currentUserId: string;
}

export default function SettingsClient({ users, currentUserId }: SettingsClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const [showPasswordAdd, setShowPasswordAdd] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);

  // Optimization States
  const [optimizing, setOptimizing] = useState(false);
  const [optReport, setOptReport] = useState<string | null>(null);

  async function handleRunOptimization() {
    setOptimizing(true);
    setOptReport(null);
    try {
      const result = await runManualOptimizationAction();
      if (result.success && result.data) {
        showToast('System optimization completed successfully!');
        setOptReport(result.data.reportText || 'All systems optimized.');
        router.refresh();
      } else {
        showToast(result.error || 'Optimization failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Optimization failed', 'error');
    }
    setOptimizing(false);
  }

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);
    if (result.success) {
      showToast('User created successfully!');
      setShowAddModal(false);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to create user', 'error');
    }
    setLoading(false);
  }

  async function handleEditUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateUser(editingUser.id, formData);
    if (result.success) {
      showToast('User updated successfully!');
      setEditingUser(null);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to update user', 'error');
    }
    setLoading(false);
  }

  async function handleDeleteUser() {
    setLoading(true);
    const result = await deleteUser(deletingUser.id);
    if (result.success) {
      showToast('User deleted successfully');
      setDeletingUser(null);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete user', 'error');
    }
    setLoading(false);
  }

  return (
    <div>
      <BackButton />
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage users and app configuration</p>
        </div>
        <div className="flex-gap">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Add User
          </button>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </form>
        </div>
      </div>

      {/* Users Section */}
      <div className="table-container">
        <div className="table-header">
          <h2 className="section-title">User Management</h2>
          <span className="table-count">{users.length} users</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Sales</th>
                <th>Gifts</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id}>
                  <td className="font-semibold">
                    <div className="flex-center" style={{ gap: '0.5rem' }}>
                      <div className="sidebar-user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {user.name}
                      {user.id === currentUserId && <span className="badge">You</span>}
                    </div>
                  </td>
                  <td className="text-secondary">{user.email}</td>
                  <td>
                    <span className={`stock-badge ${user.role === 'admin' ? 'low-stock' : 'in-stock'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user._count?.sales || 0}</td>
                  <td>{user._count?.gifts || 0}</td>
                  <td className="text-secondary">{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="flex-gap">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingUser(user)}
                        title="Edit user"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      {user.id !== currentUserId && (
                        <button
                          className="btn btn-ghost btn-sm text-danger"
                          onClick={() => setDeletingUser(user)}
                          title="Delete user"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Optimization Section */}
      <div className="table-container" style={{ marginTop: '2rem', padding: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>⚡ System Optimization & Maintenance</h2>
        <p className="text-secondary" style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          Clean up weekly system junk, optimize database indices, clear expired cache, and ensure the application runs smoothly.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleRunOptimization} 
            disabled={optimizing}
            style={{ alignSelf: 'flex-start', background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }}
          >
            {optimizing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spinner"></span> Running System Optimization...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
                Optimize & Clean System Junk
              </span>
            )}
          </button>
          
          {optReport && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
              {optReport}
            </div>
          )}
        </div>
      </div>

      {/* App Info */}
      <div className="settings-info" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3>About</h3>
        <p>Gujarat Mobile Khergam — Stock Management System</p>
        <p className="text-secondary">Version 1.0.0</p>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New User">
        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input name="name" className="form-input" placeholder="Staff member name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input name="email" type="email" className="form-input" placeholder="user@gujaratmobile.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input 
                name="password" 
                type={showPasswordAdd ? 'text' : 'password'} 
                className="form-input" 
                placeholder="Minimum 6 characters" 
                minLength={6} 
                required 
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPasswordAdd(!showPasswordAdd)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                  color: '#64748b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {showPasswordAdd ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select name="role" className="form-select" defaultValue="staff">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <span className="form-hint">Staff can record sales and gifts. Admins can also manage users and categories.</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span> Creating...</> : 'Create User'}
            </button>
          </div>
        </form>
    </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        {editingUser && (
          <form onSubmit={handleEditUser}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input name="name" className="form-input" defaultValue={editingUser.name} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input name="email" type="email" className="form-input" defaultValue={editingUser.email} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  name="password" 
                  type={showPasswordEdit ? 'text' : 'password'} 
                  className="form-input" 
                  placeholder="Leave blank to keep current password" 
                  minLength={6} 
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordEdit(!showPasswordEdit)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                    color: '#64748b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {showPasswordEdit ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select name="role" className="form-select" defaultValue={editingUser.role}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner"></span> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete User Confirmation */}
      <Modal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} title="Delete User" size="sm">
        {deletingUser && (
          <div>
            <p>Are you sure you want to delete <strong>{deletingUser.name}</strong> ({deletingUser.email})?</p>
            <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              This user has recorded {deletingUser._count?.sales || 0} sales and {deletingUser._count?.gifts || 0} gifts.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingUser(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteUser} disabled={loading}>
                {loading ? <><span className="spinner"></span> Deleting...</> : 'Delete User'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
