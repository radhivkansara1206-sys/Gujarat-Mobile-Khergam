import './globals.css';
import { getSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import QuickStartGuide from '@/components/QuickStartGuide';
import AutoLogout from '@/components/AutoLogout';
import type { Metadata } from 'next';

import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Gujarat Mobile Khergam',
  description: 'Official stock management and inventory system for Gujarat Mobile Khergam.',
  keywords: 'Gujarat Mobile Khergam, Gujarat Mobile, Khergam Mobile Shop, Stock Management',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  let alertsCount = 0;
  if (session) {
    try {
      const items = await prisma.item.findMany({
        where: { isActive: true },
        select: { stock: true, lowStockThreshold: true }
      });
      const lowStockCount = items.filter(item => item.stock <= item.lowStockThreshold).length;

      const unreadNotifications = await prisma.notification.count({
        where: { isRead: false }
      });

      alertsCount = lowStockCount + unreadNotifications;
    } catch (e) {
      console.error('Failed to fetch alerts count for sidebar', e);
    }
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Capture client timezone and offset in cookies for Server Components / Actions
              (function() {
                var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                var offset = new Date().getTimezoneOffset();
                
                var getCookie = function(name) {
                  var value = "; " + document.cookie;
                  var parts = value.split("; " + name + "=");
                  if (parts.length === 2) return parts.pop().split(";").shift();
                  return null;
                };
                
                // Only set cookies and reload if they don't exist yet (first visit)
                // Avoids infinite reload loops on timezone mismatch
                var hasTz = getCookie('timezone');
                var hasOffset = getCookie('timezoneOffset');
                if (!hasTz || !hasOffset) {
                  document.cookie = 'timezone=' + encodeURIComponent(tz) + '; path=/; max-age=31536000; SameSite=Lax';
                  document.cookie = 'timezoneOffset=' + offset + '; path=/; max-age=31536000; SameSite=Lax';
                  window.location.reload();
                } else if (hasTz !== tz) {
                  // Timezone changed (e.g. user travelled) - update silently without reload
                  document.cookie = 'timezone=' + encodeURIComponent(tz) + '; path=/; max-age=31536000; SameSite=Lax';
                  document.cookie = 'timezoneOffset=' + offset + '; path=/; max-age=31536000; SameSite=Lax';
                }

                // PWA install prompt
                window.deferredPrompt = null;
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.deferredPrompt = e;
                  window.dispatchEvent(new Event('pwa-prompt-ready'));
                });

                // Auto-refresh page when a new service worker is installed
                // This ensures users always get the latest deployment
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    window.location.reload();
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ToastProvider>
          {session ? (
            <div className="app-wrapper">
              <div className="app-layout">
                <Sidebar user={{ name: session.name, role: session.role }} alertsCount={alertsCount} />
                <main className="main-content">
                  <div style={{ width: '100%', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <img src="/banner.jpg" alt="Gujarat Mobile Banner" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    <div style={{ padding: '0.5rem 1rem', background: '#ff6600', color: 'white', fontWeight: 'bold', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '1.1rem' }}>
                      Khergam
                    </div>
                  </div>
                  {children}
                </main>
                <QuickStartGuide />
                <AutoLogout />
              </div>
            </div>
          ) : (
            <>{children}</>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
