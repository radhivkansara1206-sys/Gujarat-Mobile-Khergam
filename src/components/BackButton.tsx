'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  
  return (
    <button 
      onClick={() => router.back()} 
      className="btn btn-ghost btn-sm" 
      style={{ marginBottom: '1rem', paddingLeft: 0, color: 'var(--text-secondary)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Back
    </button>
  );
}
