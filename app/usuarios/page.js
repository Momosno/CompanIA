'use client';

import Link from 'next/link';

export default function UsuariosPage() {
  const perfiles = [
    {
      id: 1,
      nombre: 'Jimmy',
      materias: 'Análisis Matemático I, Física I',
      inicial: 'J',
      color: 'var(--accent-purple)',
      bgInicial: '#DFD7FA',
      esUltimaVez: true, // Indicador de última sesión
    },
    {
      id: 2,
      nombre: 'Sofía',
      materias: 'Álgebra Lineal, Química General',
      inicial: 'S',
      color: '#0D7A5F',
      bgInicial: '#D0F2E7',
      esUltimaVez: false,
    },
    {
      id: 3,
      nombre: 'Martín',
      materias: 'Todavía no cargó materias', // Placeholder dinámico para backend
      inicial: 'M',
      color: '#B45309',
      bgInicial: '#FDE68A',
      esUltimaVez: false,
    },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '85vh',
      maxWidth: '1100px',
      margin: '0 auto',
      justifyContent: 'space-between'
    }}>
      
      {/* 1. Header con Nombre/Logo de CompañÍA */}
      <div>
        <span style={{ 
          fontSize: '22px', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          CompañIA
        </span>
      </div>

      {/* 2. Bloque Central: Título y Tarjetas de Usuarios */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '36px',
        margin: '40px 0'
      }}>
        
        {/* Título y Subtítulo según Wireframe */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
            ¿Quién estudia hoy?
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            Elegí tu usuario para seguir.
          </p>
        </div>

        {/* Fila de 4 tarjetas horizontales */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', 
          gap: '18px', 
          width: '100%'
        }}>
          
          {perfiles.map((p) => (
            <Link
              key={p.id}
              href="/"
              style={{
                textDecoration: 'none',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '12px',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              {/* Etiqueta "La última vez" para el usuario activo más reciente */}
              {p.esUltimaVez && (
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  backgroundColor: '#DFD7FA',
                  color: '#4334A6',
                  border: '1px solid #C5B8F0',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '3px 8px',
                  borderRadius: '999px',
                }}>
                  La última vez
                </span>
              )}

              {/* Avatar circular */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: p.bgInicial,
                color: p.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                border: `2px solid ${p.color}`,
                marginTop: p.esUltimaVez ? '18px' : '6px'
              }}>
                {p.inicial}
              </div>

              {/* Nombre de usuario */}
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {p.nombre}
                </h2>
                
                {/* Materias o estado pendiente */}
                <p style={{ 
                  fontSize: '12px', 
                  color: p.materias.includes('Todavía no') ? 'var(--text-secondary)' : 'var(--text-primary)',
                  fontStyle: p.materias.includes('Todavía no') ? 'italic' : 'normal',
                  lineHeight: '1.4'
                }}>
                  {p.materias}
                </p>
              </div>

              {/* Botón de ingreso */}
              <span style={{
                marginTop: 'auto',
                backgroundColor: '#EBE0D2',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                Entrar como {p.nombre}
              </span>
            </Link>
          ))}

          {/* 4ta Tarjeta: Crear un usuario nuevo */}
          <div style={{
            backgroundColor: 'transparent',
            border: '2px dashed var(--border-color)',
            borderRadius: '14px',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px',
            cursor: 'pointer'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#EBE0D2',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              +
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Crear un usuario nuevo
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Configurá tus materias y horarios
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Pie de página descriptivo según Wireframe */}
      <div style={{ textAlign: 'center', paddingBottom: '16px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          ¿No estás en esta lista? Creá tu usuario y empezá a cargar tus materias.
        </p>
      </div>

    </div>
  );
}