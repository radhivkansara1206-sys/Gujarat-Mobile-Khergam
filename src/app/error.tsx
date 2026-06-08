'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="main-content flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--danger)' }}>🚨</div>
        <h2 className="empty-state-title" style={{ color: 'var(--danger)' }}>Something went wrong!</h2>
        <p className="empty-state-text" style={{ fontFamily: 'monospace', background: 'var(--border-light)', padding: '1rem', borderRadius: '8px', maxWidth: '600px', margin: '1rem auto' }}>
          {error.message || 'Unknown error'}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => reset()}
          style={{ marginTop: '1.5rem' }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
