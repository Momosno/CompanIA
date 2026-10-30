'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const [usuarioActivo] = useState({
    nombre: 'Jimmy',
  });

  const navItems = [
    { name: 'Hoy', href: '/' },
    { name: 'Preguntar', href: '/preguntar' },
    { name: 'Mi semana', href: '/mi-semana' },
    { name: 'Practicar', href: '/practicar' },
    { name: 'Materias y apuntes', href: '/materias' },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand" style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            CompañIA
          </h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-user" style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
        <p style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
          {usuarioActivo.nombre}
        </p>
        <Link
          href="/usuarios"
          style={{ fontSize: '12px', color: 'var(--accent-purple)', textDecoration: 'underline' }}
        >
          Cambiar de usuario
        </Link>
      </div>
    </aside>
  );
}
