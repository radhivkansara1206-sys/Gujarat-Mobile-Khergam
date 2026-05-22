'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.success) {
      router.push('/');
      router.refresh();
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ marginBottom: '1rem' }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <h1>Gujarat Mobile</h1>
          <span className="login-logo-accent">Khergam Accessories</span>
        </div>
        <p className="login-subtitle">Stock Management System</p>

        {error && (
          <div className="alert-banner danger">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="admin@gujaratmobile.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner"></span> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="login-footer">
          © 2024 Gujarat Mobile Khergam Accessories
        </p>
      </div>
    </div>
  );
}
