'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  
  // Oculta sidebar y márgenes en cualquier vista de selección o gestión de usuario
  const isAuthPage = pathname.startsWith('/usuarios');

  if (isAuthPage) {
    return (
      <main style={{ 
        minHeight: '100vh', 
        width: '100%', 
        backgroundColor: 'var(--bg-page)', 
        padding: '32px 40px',
        boxSizing: 'border-box'
      }}>
        {children}
      </main>
    );
  }

  // Estructura general para el resto de la aplicación
  return (
    <div className="layout-wrapper">
      <Sidebar />
      <main className="content-area">
        {children}
      </main>
    </div>
  );
}