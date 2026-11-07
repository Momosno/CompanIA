'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ usuario }) {
  const pathname = usePathname();

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
        <div className="sidebar-brand" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          <Link href="/" aria-label="CompañIA - Inicio">
            <Image src="/logo.png" alt="CompañIA" width={140} height={140} priority />
          </Link>
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
          {usuario?.nombre}
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
