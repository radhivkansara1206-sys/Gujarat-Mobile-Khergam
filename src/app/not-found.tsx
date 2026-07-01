import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="main-content flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}>🔍</div>
        <h2 className="empty-state-title">Page Not Found</h2>
        <p className="empty-state-text">Could not find the requested resource or page.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
