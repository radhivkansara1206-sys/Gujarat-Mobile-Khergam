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
    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fff', color: '#000', minHeight: '100vh' }}>
      <h2 style={{ color: 'red' }}>Something went wrong!</h2>
      <p style={{ margin: '1rem 0', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px' }}>
        {error.message || 'Unknown error'}
      </p>
      <button
        onClick={() => reset()}
        style={{ padding: '0.5rem 1rem', background: '#ff6600', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  );
}
