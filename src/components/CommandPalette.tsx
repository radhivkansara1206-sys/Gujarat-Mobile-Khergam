'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const actions = [
    { name: 'Dashboard', path: '/' },
    { name: 'Point of Sale (New Sale)', path: '/sales' },
    { name: 'Inventory Management', path: '/inventory' },
    { name: 'ROJMEL (Cash Drawer)', path: '/register' },
    { name: 'Replacements', path: '/replacements' },
    { name: 'Expenses', path: '/expenses' },
  ];

  const filteredActions = actions.filter((action) =>
    action.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, alignItems: 'flex-start', paddingTop: '10vh' }} onClick={() => setIsOpen(false)}>
      <div 
        className="modal" 
        style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-card)', padding: '0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '1rem', color: 'var(--text-muted)' }}>🔍</span>
          <input
            type="text"
            autoFocus
            placeholder="Search commands or jump to page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '1.1rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
          />
          <kbd style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>ESC</kbd>
        </div>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '0.5rem 0' }}>
          {filteredActions.length === 0 ? (
            <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No commands found.</p>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  router.push(action.path);
                  setIsOpen(false);
                  setQuery('');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {action.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
