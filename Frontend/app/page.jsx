'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { getUsuarioActual } from './lib/api';
import {
  fechaISO, fechaLocal, formatearDiaHumano, horaDecimal, listarEventos, listarMetas, marcarCompletado,
} from './lib/agenda';

const formatearFecha = (fecha, opciones) =>
  new Intl.DateTimeFormat('es-ES', opciones).format(fecha);

const mayuscula = (texto) => texto.replace(/^(.)/, (letra) => letra.toUpperCase());

// 90 -> "1 h 30 min", 60 -> "una hora", 30 -> "30 min"
const formatearDuracion = (minutos) => {
  if (minutos === 60) return 'una hora';
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  if (!horas) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas === 1 ? 'una hora' : `${horas} horas`}`;
};

// la fecha y la hora solo existen en el navegador (en el servidor son null)
const sinSuscripcion = () => () => {};
const hoyEnNavegador = () => fechaISO(new Date());
const momentoEnNavegador = () => {
  const hora = new Date().getHours();
  return hora >= 5 && hora < 12 ? 'mañana' : hora >= 12 && hora < 20 ? 'tarde' : 'noche';
};

// bloques de estudio de hoy + las pausas y ratos libres entre ellos
const armarAgendaDeHoy = (eventos) => {
  const estudio = eventos
    .filter((e) => e.tipo === 'estudio')
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const items = [];
  estudio.forEach((e, i) => {
    const minutos = (horaDecimal(e.fin) - horaDecimal(e.inicio)) * 60;
    items.push({ id: e.id, hora: e.inicio.slice(11, 16), tipo: 'estudio', evento: e, minutos });
    const siguiente = estudio[i + 1];
    if (siguiente) {
      const hueco = (horaDecimal(siguiente.inicio) - horaDecimal(e.fin)) * 60;
      if (hueco > 0) {
        items.push({
          id: `hueco-${e.id}`,
          hora: e.fin.slice(11, 16),
          tipo: 'pausa',
          texto: hueco <= 60 ? `Pausa de ${formatearDuracion(hueco)}.` : `Libre hasta las ${siguiente.inicio.slice(11, 16)}.`,
        });
      }
    }
  });
  const ultimo = estudio[estudio.length - 1];
  if (ultimo) {
    items.push({ id: 'libre', hora: ultimo.fin.slice(11, 16), tipo: 'libre', texto: 'Libre. Terminaste lo de hoy.' });
  }
  return items;
};

const tituloDelParcial = (meta, hoyISO) => {
  const dias = Math.round((fechaLocal(meta.fecha) - fechaLocal(hoyISO)) / 86400000);
  const cuando = dias === 0 ? 'Hoy es' : dias === 1 ? 'Mañana es' : `El ${formatearDiaHumano(meta.fecha)} es`;
  const unidades = meta.unidades.map((u) => `U${u.numero_unidad}`).join(', ');
  return `${cuando} el parcial de ${meta.materia}${unidades ? `, ${unidades}` : ''}.`;
};

export default function Home() {
  const [usuario] = useState(getUsuarioActual);
  const hoyISO = useSyncExternalStore(sinSuscripcion, hoyEnNavegador, () => null);
  const momentoDia = useSyncExternalStore(sinSuscripcion, momentoEnNavegador, () => null);

  // misma idea que en Mi semana: cada carga tiene su clave y se recarga subiendo la versión
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [marcando, setMarcando] = useState(null);
  const clave = hoyISO ? `${hoyISO}#${version}` : null;

  useEffect(() => {
    if (!usuario || !clave) return;
    let vigente = true;
    Promise.all([listarEventos(hoyISO, hoyISO), listarMetas()])
      .then(([eventos, metas]) => {
        if (vigente) setDatos({ clave, eventos, metas });
      })
      .catch((err) => {
        if (vigente) setErrorCarga({ clave, mensaje: err.message });
      });
    return () => {
      vigente = false;
    };
  }, [usuario, clave, hoyISO]);

  const error = errorCarga?.clave === clave ? errorCarga.mensaje : null;
  const cargando = !datos && !error;

  const fechaHoy = hoyISO
    ? mayuscula(formatearFecha(fechaLocal(hoyISO), { weekday: 'long', day: 'numeric', month: 'long' }))
    : '';

  const bloquesHoy = armarAgendaDeHoy(datos?.eventos || []);
  const bloquesEstudio = bloquesHoy.filter((b) => b.tipo === 'estudio');
  const bloquesCompletados = bloquesEstudio.filter((b) => b.evento.completado).length;
  const progresoHoy = bloquesEstudio.length
    ? Math.round((bloquesCompletados / bloquesEstudio.length) * 100)
    : 0;
  const minutosHoy = bloquesEstudio.reduce((total, b) => total + b.minutos, 0);

  const metaPorId = new Map((datos?.metas || []).map((m) => [m.id, m]));
  const proximaMeta = (datos?.metas || []).find((m) => hoyISO && m.fecha >= hoyISO) || null;

  const toggleListo = async (evento) => {
    setMarcando(evento.id);
    setErrorAccion(null);
    try {
      await marcarCompletado(evento.id, !evento.completado);
      setVersion((v) => v + 1);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setMarcando(null);
    }
  };

  const titulo = !momentoDia || cargando || error
    ? 'Tu plan de estudio'
    : minutosHoy
      ? `Esta ${momentoDia} te ${minutosHoy === 60 ? 'toca' : 'tocan'} ${formatearDuracion(minutosHoy)} de estudio.`
      : 'Hoy no tenés bloques de estudio.';

  return (
    <div className="home-dashboard">
      <header className="home-heading">
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {fechaHoy || 'Cargando fecha...'}
          </p>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{titulo}</h1>
        </div>
      </header>

      <section className="home-schedule" aria-label="Agenda de hoy" aria-busy={cargando}>
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

        {(error || errorAccion) && (
          <div role="alert" style={{
            backgroundColor: '#FDE8E8', border: '1px solid #F8B4B4', borderRadius: '8px', padding: '10px 12px',
            fontSize: '13px', color: '#9B1C1C', fontWeight: '600', marginBottom: '10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          }}>
            <span>{error ? `No se pudo cargar tu agenda: ${error}` : errorAccion}</span>
            {error && (
              <button
                type="button"
                onClick={() => setVersion((v) => v + 1)}
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #F8B4B4', borderRadius: '6px', padding: '4px 10px', color: '#9B1C1C', fontWeight: 600, cursor: 'pointer' }}
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        <div className="home-block-list">
          {cargando && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cargando tu agenda…</p>}

          {datos && bloquesHoy.length === 0 && (
            <div style={{
              border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '16px',
              fontSize: '13px', color: 'var(--text-secondary)',
            }}>
              No hay nada agendado para hoy. Podés armar un plan desde{' '}
              <Link href="/mi-semana" style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Mi semana</Link>.
            </div>
          )}

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
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span style={{ fontWeight: 'bold', width: '48px', color: 'var(--text-primary)' }}>{bloque.hora}</span>
                  <span>{bloque.texto}</span>
                </div>
              );
            }

            const { evento } = bloque;
            const meta = metaPorId.get(evento.meta_id);
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
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', width: '48px' }}>{bloque.hora}</span>
                  <div>
                    <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{evento.titulo}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {mayuscula(formatearDuracion(bloque.minutos))}.
                      {meta ? ` Para el parcial del ${formatearDiaHumano(meta.fecha)}.` : ''}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => toggleListo(evento)}
                    disabled={marcando === evento.id}
                    style={{
                      backgroundColor: evento.completado ? '#C5E2BA' : '#E0ECD9',
                      color: '#275E10',
                      border: '1px solid #C4D8B8',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: marcando === evento.id ? 'wait' : 'pointer',
                      opacity: marcando === evento.id ? 0.6 : 1,
                    }}
                  >
                    {evento.completado ? 'Completado ✓' : 'Listo'}
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
        gap: '16px',
      }}>
        {!proximaMeta ? (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {cargando ? 'Buscando tu próximo parcial…' : 'No tenés parciales cargados.'}
            </h2>
            {!cargando && (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Cargá la fecha de tu próximo examen en{' '}
                <Link href="/mi-semana" style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Mi semana</Link>{' '}
                y te armamos un plan de estudio.
              </p>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <p className="home-exam-date">
                  {mayuscula(formatearFecha(fechaLocal(proximaMeta.fecha), { weekday: 'short', day: 'numeric' }))}
                  {proximaMeta.hora ? ` · ${proximaMeta.hora.slice(0, 5)}` : ''}
                </p>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {tituloDelParcial(proximaMeta, hoyISO)}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {proximaMeta.bloques_total
                    ? `Hiciste ${proximaMeta.bloques_completados} de los ${proximaMeta.bloques_total} bloques que te armamos.`
                    : <>Todavía no armaste un plan para este parcial. <Link href="/mi-semana" style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Armalo en Mi semana</Link>.</>}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Link
                href={`/practicar?materia=${proximaMeta.materia_id}`}
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
                  display: 'inline-block',
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
                    display: 'inline-block',
                  }}
                >
                  Preguntale a tus apuntes de {proximaMeta.materia}
                </Link>
                {proximaMeta.unidades[0] && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '2px' }}>
                    Por ejemplo: pedile un resumen de «{proximaMeta.unidades[0].nombre_tema}».
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
