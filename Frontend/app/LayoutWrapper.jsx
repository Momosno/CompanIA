'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/usuarios') || pathname.startsWith('/login');

  if (isAuthPage) {
    return (
      <main className="notebook-page auth-layout">
        {children}
      </main>
    );
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <main className={`content-area ${pathname === '/' ? 'home-content-area' : ''} ${pathname === '/mi-semana' ? 'week-content-area' : ''}`}>
        {children}
      </main>
    </div>
  );
}
