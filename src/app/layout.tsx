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
              const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
              const offset = new Date().getTimezoneOffset();
              
              const getCookie = (name) => {
                const value = "; " + document.cookie;
                const parts = value.split("; " + name + "=");
                if (parts.length === 2) return parts.pop().split(";").shift();
              };
              
              if (getCookie('timezone') !== tz || getCookie('timezoneOffset') !== String(offset)) {
                document.cookie = 'timezone=' + encodeURIComponent(tz) + '; path=/; max-age=31536000; SameSite=Lax';
                document.cookie = 'timezoneOffset=' + offset + '; path=/; max-age=31536000; SameSite=Lax';
                window.location.reload();
              }

              window.deferredPrompt = null;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPrompt = e;
                window.dispatchEvent(new Event('pwa-prompt-ready'));
              });
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
