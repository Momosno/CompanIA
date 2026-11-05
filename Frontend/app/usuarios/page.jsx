'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL, getUsuarioActual, setUsuarioActual } from '../lib/api';

export default function UsuariosPage() {
  const router = useRouter();
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [ultimoId, setUltimoId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/usuarios/`)
      .then((r) => {
        if (!r.ok) throw new Error('Error al listar usuarios');
        return r.json();
      })
      .then((lista) => {
        setUltimoId(getUsuarioActual()?.id ?? null);
        setPerfiles(lista);
      })
      .catch((err) => {
        console.warn('No se pudieron cargar los usuarios:', err);
        setError('No pudimos cargar los usuarios. Revisá que el backend esté corriendo.');
      })
      .finally(() => setCargando(false));
  }, []);

  const entrarComo = (perfil) => {
    setUsuarioActual(perfil);
    router.push('/');
  };

  const crearUsuario = (e) => {
    e.preventDefault();
    const nombre = nuevoNombre.trim();
    if (!nombre || creando) return;

    setCreando(true);
    setError(null);
    fetch(`${API_URL}/usuarios/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Error al crear el usuario');
        return r.json();
      })
      .then(entrarComo)
      .catch((err) => {
        console.warn('No se pudo crear el usuario:', err);
        setError('No pudimos crear el usuario. Probá de nuevo.');
        setCreando(false);
      });
  };

  return (
    <div className="users-page" style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '85vh',
      maxWidth: '1100px',
      margin: '0 auto',
      justifyContent: 'space-between'
    }}>
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

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '36px',
        margin: '40px 0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
            ¿Quién estudia hoy?
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            Elegí tu usuario para seguir.
          </p>
        </div>

        {cargando && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
        )}
        {error && (
          <p role="alert" style={{ fontSize: '14px', color: '#9B1C1C' }}>{error}</p>
        )}

        <div className="profile-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
          gap: '18px',
          width: '100%'
        }}>
          {perfiles.map((p) => {
            const esUltimaVez = p.id === ultimoId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => entrarComo(p)}
                style={{
                  font: 'inherit',
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
                {esUltimaVez && (
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

                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#DFD7FA',
                  color: '#4334A6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  border: '2px solid #4334A6',
                  marginTop: esUltimaVez ? '18px' : '6px'
                }}>
                  {p.nombre.charAt(0).toUpperCase()}
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {p.nombre}
                </h2>

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
              </button>
            );
          })}

          <form onSubmit={crearUsuario} style={{
            backgroundColor: 'transparent',
            border: '2px dashed var(--border-color)',
            borderRadius: '14px',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Crear un usuario nuevo
            </h3>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Tu nombre"
              aria-label="Nombre del usuario nuevo"
              required
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <button type="submit" disabled={creando} style={{
              backgroundColor: 'var(--accent-purple)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              opacity: creando ? 0.6 : 1,
              cursor: creando ? 'not-allowed' : 'pointer'
            }}>
              {creando ? 'Creando...' : 'Crear y entrar'}
            </button>
          </form>
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingBottom: '16px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          ¿Ya tenés una cuenta?{' '}
          <Link href="/login" style={{ color: 'var(--accent-purple)', fontWeight: '700' }}>
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
