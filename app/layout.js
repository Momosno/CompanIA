import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CompañÍA - Asistente de Estudio',
  description: 'Plataforma de planificación de estudio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="layout-wrapper">
          {/* BARRA LATERAL FIJA A LA IZQUIERDA */}
          <aside className="sidebar">
            <div>
              {/* Marca */}
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  CompañIA
                </h1>
              </div>

              {/* Menú */}
              <nav>
                <Link href="/" className="nav-link active">
                  Esta noche
                </Link>
                <Link href="/preguntar" className="nav-link">
                  Preguntar
                </Link>
                <Link href="/mi-semana" className="nav-link">
                  Mi semana
                </Link>
                <Link href="/practicar" className="nav-link">
                  Practicar
                </Link>
                <Link href="/materias" className="nav-link">
                  Materias y apuntes
                </Link>
              </nav>
            </div>

            {/* Usuario al pie */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
                Jimmy
              </p>
              <Link href="/usuarios" style={{ fontSize: '12px', color: 'var(--accent-purple)', textDecoration: 'underline' }}>
                Cambiar de usuario
              </Link>
            </div>
          </aside>

          {/* CONTENIDO PRINCIPAL A LA DERECHA */}
          <main className="content-area">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}