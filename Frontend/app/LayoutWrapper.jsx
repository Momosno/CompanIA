'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { getUsuarioActual } from './lib/api';

// El usuario solo cambia desde /usuarios, y al navegar este componente vuelve a leerlo
const sinSuscripcion = () => () => {};

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useSyncExternalStore(sinSuscripcion, getUsuarioActual, () => null);

  const isAuthPage = pathname.startsWith('/usuarios') || pathname.startsWith('/login');

  useEffect(() => {
    if (!getUsuarioActual() && !isAuthPage) router.replace('/usuarios');
  }, [pathname, isAuthPage, router]);

  if (isAuthPage) {
    return (
      <main className="notebook-page auth-layout">
        {children}
      </main>
    );
  }

  // Oculto hasta tener usuario, para no mostrar datos de ejemplo antes de redirigir
  return (
    <div className="layout-wrapper" style={{ visibility: usuario ? 'visible' : 'hidden' }}>
      <Sidebar usuario={usuario} />
      <main className={`content-area ${pathname === '/' ? 'home-content-area' : ''} ${pathname === '/mi-semana' ? 'week-content-area' : ''}`}>
        {children}
      </main>
    </div>
  );
}
