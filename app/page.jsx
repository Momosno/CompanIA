'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const formatearFecha = (fecha, opciones) =>
  new Intl.DateTimeFormat('es-ES', opciones).format(fecha);

export default function Home() {
  const [fechaHoy, setFechaHoy] = useState('');
  const [fechaMañana, setFechaMañana] = useState('');
  const [momentoDia, setMomentoDia] = useState('');

  useEffect(() => {
    const hoy = new Date();
    const horaActual = hoy.getHours();

    setMomentoDia(
      horaActual >= 5 && horaActual < 12
        ? 'mañana'
        : horaActual >= 12 && horaActual < 20
          ? 'tarde'
          : 'noche'
    );

    setFechaHoy(
      formatearFecha(hoy, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).replace(/^(.)/, (match) => match.toUpperCase())
    );

    setFechaMañana(
      formatearFecha(new Date(hoy.getTime() + 24 * 60 * 60 * 1000), {
        weekday: 'short',
        day: 'numeric',
      }).replace(/^(.)/, (match) => match.toUpperCase())
    );
  }, []);

  const [horasEstudio] = useState('dos horas');

  const alertaParcial = {
    fechaBadge: fechaMañana || 'Mañana',
    materia: 'Análisis Matemático I',
    unidades: 'unidades 1 a 3',
    bloquesHechos: 5,
    bloquesTotales: 8,
    ejemploPregunta: '¿cuándo una función no es derivable?',
  };

  const [bloquesHoy, setBloquesHoy] = useState([
    {
      id: 1,
      hora: '18:00',
      tipo: 'estudio',
      materia: 'Análisis Matemático I',
      detalle: 'Derivadas, unidad 3. Una hora.',
      completado: false,
    },
    {
      id: 2,
      hora: '19:00',
      tipo: 'pausa',
      texto: 'Pausa de media hora.',
    },
    {
      id: 3,
      hora: '19:30',
      tipo: 'estudio',
      materia: 'Física I',
      detalle: 'Cinemática, unidad 2. Una hora.',
      completado: false,
    },
    {
      id: 4,
      hora: '20:30',
      tipo: 'libre',
      texto: 'Libre. Mañana arrancás a las 9 en el trabajo.',
    },
  ]);

  const toggleListo = (id) => {
    setBloquesHoy((prev) =>
      prev.map((b) => (b.id === id ? { ...b, completado: !b.completado } : b))
    );
  };

  const bloquesEstudio = bloquesHoy.filter((bloque) => bloque.tipo === 'estudio');
  const bloquesCompletados = bloquesEstudio.filter((bloque) => bloque.completado).length;
  const progresoHoy = bloquesEstudio.length
    ? Math.round((bloquesCompletados / bloquesEstudio.length) * 100)
    : 0;

  return (
    <div className="home-dashboard">
      <header className="home-heading">
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {fechaHoy || 'Cargando fecha...'}
          </p>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {momentoDia
              ? `Esta ${momentoDia} te tocan ${horasEstudio} de estudio.`
              : 'Tu plan de estudio'}
          </h1>
        </div>
      </header>

      <section className="home-schedule" aria-label="Agenda de hoy">
        <div className="home-schedule-heading">
          <h2 className="home-section-title">Agenda de hoy</h2>
          <div className="home-progress">
            <span className="home-progress-count">
              {bloquesCompletados} de {bloquesEstudio.length} completos
            </span>
            <div
              className="home-progress-track"
              role="progressbar"
              aria-label="Progreso de los bloques de estudio de hoy"
              aria-valuemin={0}
              aria-valuemax={bloquesEstudio.length}
              aria-valuenow={bloquesCompletados}
            >
              <span style={{ width: `${progresoHoy}%` }} />
            </div>
          </div>
        </div>
        <div className="home-block-list">
        {bloquesHoy.map((bloque) => {
          if (bloque.tipo === 'pausa' || bloque.tipo === 'libre') {
            return (
              <div
                key={bloque.id}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  gap: '20px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                <span style={{ fontWeight: 'bold', width: '48px', color: 'var(--text-primary)' }}>
                  {bloque.hora}
                </span>
                <span>{bloque.texto}</span>
              </div>
            );
          }

          return (
            <div
              key={bloque.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', width: '48px' }}>
                  {bloque.hora}
                </span>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{bloque.materia}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{bloque.detalle}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleListo(bloque.id)}
                  style={{
                    backgroundColor: bloque.completado ? '#C5E2BA' : '#E0ECD9',
                    color: '#275E10',
                    border: '1px solid #C4D8B8',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {bloque.completado ? 'Completado ✓' : 'Listo'}
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </section>

      <aside className="home-exam-card" style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div>
            <p className="home-exam-date">{alertaParcial.fechaBadge}</p>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mañana es el parcial de {alertaParcial.materia}, {alertaParcial.unidades}.
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Hiciste {alertaParcial.bloquesHechos} de los {alertaParcial.bloquesTotales} bloques que te armamos.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Link
            href="/practicar"
            style={{
              backgroundColor: 'var(--accent-purple)',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Hacer un test de práctica
          </Link>

          <div>
            <Link
              href="/preguntar"
              style={{
                backgroundColor: '#EBE0D2',
                color: 'var(--text-primary)',
                border: '1px solid #D4C6B3',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Preguntale a tus apuntes de {alertaParcial.materia.split(' ')[0]} I
            </Link>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '2px' }}>
              Por ejemplo: {alertaParcial.ejemploPregunta}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
