'use client';

import { useEffect, useState } from 'react';
import SugerenciasEstudio from '../grupos/SugerenciasEstudio';
import { estudiantesDemo } from '../grupos/estudiantes';

const obtenerLunes = (fecha) => {
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return lunes;
};

const sumarDias = (fecha, cantidad) => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + cantidad);
  return resultado;
};

const formatearRangoSemana = (inicio) => {
  const fin = sumarDias(inicio, 6);
  const nombreMesInicio = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(inicio);
  const nombreMesFin = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(fin);

  if (inicio.getMonth() === fin.getMonth()) {
    return `Del ${inicio.getDate()} al ${fin.getDate()} de ${nombreMesFin}`;
  }

  return `Del ${inicio.getDate()} de ${nombreMesInicio} al ${fin.getDate()} de ${nombreMesFin}`;
};

const HORA_INICIO = 8;
const HORA_FIN = 22;
const HORAS_GUIA = [8, 10, 12, 14, 16, 18, 20];

export default function MiSemanaPage() {
  const [inicioSemana, setInicioSemana] = useState(null);
  const [hoy, setHoy] = useState(null);
  const [alturaHora, setAlturaHora] = useState(48);

  useEffect(() => {
    const fechaActual = new Date();
    setHoy(new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate()));
    setInicioSemana(obtenerLunes(fechaActual));
  }, []);

  useEffect(() => {
    const ajustarAltura = () => {
      setAlturaHora(Math.max(40, Math.min(64, Math.round((window.innerHeight - 208) / (HORA_FIN - HORA_INICIO)))));
    };

    ajustarAltura();
    window.addEventListener('resize', ajustarAltura);
    return () => window.removeEventListener('resize', ajustarAltura);
  }, []);

  const alturaTotal = (HORA_FIN - HORA_INICIO) * alturaHora;

  const dias = inicioSemana
    ? Array.from({ length: 7 }, (_, id) => {
        const fecha = sumarDias(inicioSemana, id);
        const nombreDia = new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
          .format(fecha)
          .replace(/\.$/, '')
          .replace(/^(.)/, (match) => match.toUpperCase());

        return {
          id,
          nombre: `${nombreDia} ${fecha.getDate()}`,
          hoy: hoy?.getTime() === fecha.getTime(),
          parcial: fecha.getDate() === 23 && fecha.getMonth() === 9,
        };
      })
    : [];

  const rangoSemana = inicioSemana ? formatearRangoSemana(inicioSemana) : 'Cargando semana...';

  const cambiarSemana = (cantidad) => {
    setInicioSemana((actual) => (actual ? sumarDias(actual, cantidad * 7) : actual));
  };

  const [eventosPorDia, setEventosPorDia] = useState({
    0: [
      { id: 1, start: 9, end: 18, title: 'Trabajo', type: 'work' },
      { id: 2, start: 18, end: 20, title: 'Cursada', type: 'work' },
      { id: 3, start: 20, end: 21, title: 'Física, hecho ✓', type: 'done' },
    ],
    1: [
      { id: 4, start: 9, end: 18, title: 'Trabajo', type: 'work' },
      { id: 5, start: 18, end: 20, title: 'Análisis hecho ✓', type: 'done' },
    ],
    2: [
      { id: 6, start: 9, end: 18, title: 'Trabajo', type: 'work' },
      { id: 7, start: 18, end: 20, title: 'Cursada', type: 'work' },
      { id: 8, start: 20, end: 21, title: 'Análisis, hecho ✓', type: 'done' },
    ],
    3: [
      { id: 9, start: 9, end: 18, title: 'Trabajo', type: 'work' },
      { id: 10, start: 18, end: 19, title: 'Análisis U3', type: 'study' },
      { id: 11, start: 19.5, end: 20.5, title: 'Física U2', type: 'study' },
    ],
    4: [
      { id: 12, start: 9, end: 18, title: 'Trabajo', type: 'work' },
      { id: 13, start: 18, end: 19, title: 'Física U3', type: 'study' },
      { id: 14, start: 19.5, end: 21, title: 'Física repaso', type: 'study' },
    ],
    5: [
      { id: 15, start: 10, end: 12, title: 'Física, test', type: 'study' },
    ],
    6: [
      { id: 16, start: 14, end: 15, title: 'Física U3', type: 'study' },
    ],
  });

  const [bloqueActivo, setBloqueActivo] = useState({
    horarioTexto: 'Hoy, de 18 a 19',
    materia: 'Análisis Matemático I',
    detalle: 'Derivadas, unidad 3',
    temaChat: 'derivadas',
    completado: false,
  });

  const [examenes, setExamenes] = useState([
    {
      id: 1,
      titulo: 'Parcial de Análisis I, viernes 23',
      hechos: 5,
      total: 8,
      color: '#5A4BD1',
    },
    {
      id: 2,
      titulo: 'Parcial de Física I, viernes 30',
      hechos: 1,
      total: 7,
      color: '#3B82F6',
    },
  ]);

  const toggleBloqueActivo = () => {
    setBloqueActivo((prev) => ({ ...prev, completado: !prev.completado }));
  };

  const getBlockStyle = (type) => {
    switch (type) {
      case 'done':
        return { backgroundColor: '#E0ECD9', border: '1px solid #C4D8B8', color: '#275E10', fontWeight: 'bold' };
      case 'study':
        return { backgroundColor: '#DFD7FA', border: '1px solid #C5B8F0', color: '#4334A6', fontWeight: 'bold' };
      case 'work':
      default:
        return { backgroundColor: '#EAE2D5', border: '1px solid #DCD0C0', color: 'var(--text-secondary)', fontWeight: '500' };
    }
  };

  const usuarioActual = {
    ...estudiantesDemo[0],
    agenda: Object.entries(eventosPorDia).flatMap(([dia, eventos]) => (
      eventos.map((evento) => ({ dia: Number(dia), inicio: evento.start, fin: evento.end }))
    )),
  };

  return (
    <div className="week-page">
      <header className="week-toolbar">
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Tu semana
        </h1>

        <div className="week-navigation">
          <button aria-label="Semana anterior" onClick={() => cambiarSemana(-1)}>
            &lt;
          </button>
          <span>
            {rangoSemana}
          </span>
          <button aria-label="Semana siguiente" onClick={() => cambiarSemana(1)}>
            &gt;
          </button>
        </div>

        <button className="week-hours-button">
          Cambiar mis horarios
        </button>
      </header>

      <div className="week-layout">
        <section className="week-calendar-card" aria-label="Calendario semanal">
          {inicioSemana ? (
            <div className="week-calendar-scroll">
              <div className="week-calendar">
                <div className="week-days-header">
                  <div aria-hidden="true"></div>
                  {dias.map((dia) => (
                    <div
                      key={dia.id}
                      className={`week-day-header ${dia.hoy ? 'is-today' : ''} ${dia.parcial ? 'has-exam' : ''}`}
                    >
                      <span>{dia.hoy ? 'Hoy' : '\u00a0'}</span>
                      <strong>{dia.nombre}</strong>
                    </div>
                  ))}
                </div>

                <div className="week-time-grid" style={{ height: `${alturaTotal}px` }}>
                  <div className="week-time-labels">
                    {HORAS_GUIA.map((hora) => (
                      <span
                        key={hora}
                        style={{ top: `${Math.max(4, (hora - HORA_INICIO) * alturaHora - 7)}px` }}
                      >
                        {hora}:00
                      </span>
                    ))}
                    <span className="week-end-time">{HORA_FIN}:00</span>
                  </div>

                  {dias.map((dia) => (
                    <div
                      key={dia.id}
                      className={`week-day-column ${dia.hoy ? 'is-today' : ''}`}
                      style={{
                        backgroundImage: `repeating-linear-gradient(to bottom, rgba(92, 80, 74, 0.1) 0, rgba(92, 80, 74, 0.1) 1px, transparent 1px, transparent ${alturaHora * 2}px)`,
                      }}
                    >
                      {eventosPorDia[dia.id]?.map((evento) => {
                        const top = ((evento.start - HORA_INICIO) * alturaHora) + 2;
                        const height = ((evento.end - evento.start) * alturaHora) - 4;
                        return (
                          <div
                            key={evento.id}
                            style={{
                              ...getBlockStyle(evento.type),
                              position: 'absolute',
                              left: '4px',
                              right: '4px',
                              top: `${top}px`,
                              height: `${height}px`,
                              borderRadius: '6px',
                              padding: '6px',
                              fontSize: '12px',
                              lineHeight: 1.25,
                              overflow: 'hidden',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {evento.title}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="week-loading">Cargando calendario...</p>
          )}
        </section>

        <aside className="week-side-panels">
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Bloque en foco</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{bloqueActivo.horarioTexto}</span>
              <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{bloqueActivo.materia}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{bloqueActivo.detalle}</p>
              <button onClick={toggleBloqueActivo} style={{ backgroundColor: bloqueActivo.completado ? '#C5E2BA' : '#E0ECD9', border: '1px solid #C4D8B8', color: '#275E10', borderRadius: '8px', padding: '8px 10px', fontWeight: '700', cursor: 'pointer' }}>
                {bloqueActivo.completado ? 'Completado ✓' : 'Marcar como listo'}
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Parciales</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {examenes.map((examen) => (
                <div key={examen.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{examen.titulo}</span>
                  <div style={{ height: '8px', borderRadius: '999px', backgroundColor: '#EAE2D5', overflow: 'hidden' }}>
                    <div style={{ width: `${(examen.hechos / examen.total) * 100}%`, height: '100%', backgroundColor: examen.color, borderRadius: '999px' }}></div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{examen.hechos}/{examen.total} bloques</span>
                </div>
              ))}
            </div>
          </div>

          <SugerenciasEstudio usuarioActual={usuarioActual} estudiantes={estudiantesDemo} />
        </aside>
      </div>
    </div>
  );
}
