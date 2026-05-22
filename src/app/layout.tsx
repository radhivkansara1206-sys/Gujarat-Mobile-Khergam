import './globals.css';
import { getSession } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gujarat Mobile Khergam Accessories',
  description: 'Official stock management and accessory inventory system for Gujarat Mobile Khergam Accessories.',
  keywords: 'Gujarat Mobile Khergam Accessories, Gujarat Mobile, Khergam Mobile Shop, Accessories, Stock Management',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>
          {session ? (
            <div className="app-layout">
              <Sidebar user={{ name: session.name, role: session.role }} />
              <main className="main-content">{children}</main>
            </div>
          ) : (
            <>{children}</>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
