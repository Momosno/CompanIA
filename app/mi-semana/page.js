'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MiSemanaPage() {
  // 1. Contrato de datos de semana (Preparado para GET /api/calendario)
  const [rangoSemana, setRangoSemana] = useState('Del 19 al 25 de octubre');

  const [dias] = useState([
    { id: 0, nombre: 'Lun 19', hoy: false, parcial: false },
    { id: 1, nombre: 'Mar 20', hoy: false, parcial: false },
    { id: 2, nombre: 'Mié 21', hoy: false, parcial: false },
    { id: 3, nombre: 'Hoy, jue 22', hoy: true, parcial: false },
    { id: 4, nombre: 'Vie 23', hoy: false, parcial: true },
    { id: 5, nombre: 'Sáb 24', hoy: false, parcial: false },
    { id: 6, nombre: 'Dom 25', hoy: false, parcial: false },
  ]);

  // Escala horaria del calendario
  const horasGuia = [8, 10, 12, 14, 16, 18, 20];
  const HOUR_HEIGHT = 44; 
  const HORA_INICIO = 8;
  const HORA_FIN = 22;
  const ALTURA_TOTAL = (HORA_FIN - HORA_INICIO) * HOUR_HEIGHT;

  // Eventos organizados por día (0 = Lunes, 6 = Domingo) con start y end
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

  // 2. BLOQUE EN FOCO PARA HOY (Columna lateral derecha)
  const [bloqueActivo, setBloqueActivo] = useState({
    horarioTexto: 'Hoy, de 18 a 19',
    materia: 'Análisis Matemático I',
    detalle: 'Derivadas, unidad 3',
    temaChat: 'derivadas',
    completado: false,
  });

  // 3. EXÁMENES Y PROGRESO DE BLOQUES (Calcula porcentaje automáticamente)
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

  // Manejador para marcar el bloque en foco como listo
  const toggleBloqueActivo = () => {
    setBloqueActivo((prev) => ({
      ...prev,
      completado: !prev.completado,
    }));
  };

  const getBlockStyle = (type) => {
    switch (type) {
      case 'done':
        return {
          backgroundColor: '#E0ECD9',
          border: '1px solid #C4D8B8',
          color: '#275E10',
          fontWeight: 'bold',
        };
      case 'study':
        return {
          backgroundColor: '#DFD7FA',
          border: '1px solid #C5B8F0',
          color: '#4334A6',
          fontWeight: 'bold',
        };
      case 'work':
      default:
        return {
          backgroundColor: '#EAE2D5',
          border: '1px solid #DCD0C0',
          color: 'var(--text-secondary)',
          fontWeight: '500',
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Encabezado */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '16px' 
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Tu semana
        </h1>

        {/* Selector de semana */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            padding: '4px 10px', 
            fontSize: '13px', 
            fontWeight: 'bold',
            cursor: 'pointer' 
          }}>
            &lt;
          </button>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {rangoSemana}
          </span>
          <button style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            padding: '4px 10px', 
            fontSize: '13px', 
            fontWeight: 'bold',
            cursor: 'pointer' 
          }}>
            &gt;
          </button>
        </div>

        <button style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px', 
          padding: '6px 14px', 
          fontSize: '13px', 
          fontWeight: '500', 
          color: 'var(--text-primary)', 
          cursor: 'pointer' 
        }}>
          Cambiar mis horarios
        </button>
      </div>

      {/* 2. Cuerpo en dos columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
        
        {/* Columna izquierda: Calendario */}
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '16px',
        }}>
          {/* Cabecera de días */}
          <div style={{ display: 'grid', gridTemplateColumns: '45px repeat(7, 1fr)', gap: '6px', marginBottom: '12px', textAlign: 'center' }}>
            <div></div>
            {dias.map((dia) => (
              <div 
                key={dia.id} 
                style={{ 
                  backgroundColor: dia.hoy ? '#EBE0D2' : dia.parcial ? '#F5E6CC' : 'transparent', 
                  border: dia.hoy ? '1px solid #D4C6B3' : dia.parcial ? '1px solid #E5C992' : '1px solid transparent',
                  borderRadius: '6px', 
                  padding: '6px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {dia.parcial && (
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#9E6C00', textTransform: 'uppercase' }}>
                    Parcial
                  </span>
                )}
                <span style={{ fontSize: '12px', fontWeight: dia.hoy ? 'bold' : '600', color: 'var(--text-primary)' }}>
                  {dia.nombre}
                </span>
              </div>
            ))}
          </div>

          {/* Grilla horaria con líneas guía y bloques */}
          <div style={{ display: 'grid', gridTemplateColumns: '45px repeat(7, 1fr)', gap: '6px', position: 'relative', height: `${ALTURA_TOTAL}px` }}>
            
            {/* Eje de Horas */}
            <div style={{ position: 'relative', height: '100%' }}>
              {horasGuia.map((hora) => (
                <div 
                  key={hora} 
                  style={{ 
                    position: 'absolute', 
                    top: `${(hora - HORA_INICIO) * HOUR_HEIGHT - 8}px`, 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)', 
                    fontWeight: '500' 
                  }}
                >
                  {hora}:00
                </div>
              ))}
            </div>

            {/* 7 Columnas de días */}
            {dias.map((dia) => (
              <div 
                key={dia.id} 
                style={{ 
                  position: 'relative', 
                  height: '100%', 
                  backgroundColor: dia.hoy ? '#FAF4EC' : 'transparent',
                  borderRadius: '6px'
                }}
              >
                {/* Líneas divisorias horizontales */}
                {horasGuia.map((hora) => (
                  <div 
                    key={hora} 
                    style={{ 
                      position: 'absolute', 
                      top: `${(hora - HORA_INICIO) * HOUR_HEIGHT}px`, 
                      left: 0, 
                      right: 0, 
                      borderTop: '1px dashed var(--border-color)', 
                      pointerEvents: 'none' 
                    }} 
                  />
                ))}

                {/* Render de bloques con duración calculada automáticamente (end - start) */}
                {eventosPorDia[dia.id]?.map((evento) => {
                  const duracion = evento.end - evento.start;
                  const topPos = (evento.start - HORA_INICIO) * HOUR_HEIGHT;
                  const blockHeight = (duracion * HOUR_HEIGHT) - 4;

                  return (
                    <div
                      key={evento.id}
                      style={{
                        position: 'absolute',
                        top: `${topPos}px`,
                        height: `${blockHeight}px`,
                        left: '2px',
                        right: '2px',
                        borderRadius: '6px',
                        padding: '4px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        zIndex: 2,
                        ...getBlockStyle(evento.type),
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

        {/* Columna Derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tarjeta de bloque actual (conectada al estado bloqueActivo) */}
          <div style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px' 
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                {bloqueActivo.horarioTexto}
              </span>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>
                {bloqueActivo.materia}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {bloqueActivo.detalle}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button 
                onClick={toggleBloqueActivo}
                style={{ 
                  flex: 1,
                  backgroundColor: bloqueActivo.completado ? '#C5E2BA' : '#E0ECD9', 
                  color: '#275E10', 
                  border: '1px solid #C4D8B8', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {bloqueActivo.completado ? 'Completado ✓' : 'Listo'}
              </button>
              <button style={{ 
                flex: 1,
                backgroundColor: '#EBE0D2', 
                color: 'var(--text-secondary)', 
                border: '1px solid var(--border-color)', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'center'
              }}>
                Pasar a otro día
              </button>
            </div>

            <Link 
              href="/preguntar"
              style={{ 
                color: 'var(--accent-purple)', 
                fontSize: '12px', 
                fontWeight: '600', 
                textDecoration: 'underline',
                cursor: 'pointer' 
              }}
            >
              Preguntar sobre el tema {bloqueActivo.temaPregunta}
            </Link>
          </div>

          {/* Sección "Tus fechas de examen" con barras de progreso */}
          <div style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '14px' 
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Tus fechas de examen
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {examenes.map((ex, idx) => {
                const porcentaje = Math.round((ex.hechos / ex.total) * 100);

                return (
                  <div 
                    key={ex.id} 
                    style={{ 
                      borderBottom: idx !== examenes.length - 1 ? '1px solid var(--border-color)' : 'none', 
                      paddingBottom: idx !== examenes.length - 1 ? '12px' : '0' 
                    }}
                  >
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {ex.titulo}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {ex.hechos} de {ex.total} bloques hechos
                    </p>

                    {/* Barra de progreso */}
                    <div style={{ 
                      width: '100%', 
                      height: '6px', 
                      backgroundColor: '#EBE0D2', 
                      borderRadius: '999px', 
                      overflow: 'hidden' 
                    }}>
                      <div style={{ 
                        width: `${porcentaje}%`, 
                        height: '100%', 
                        backgroundColor: ex.color, 
                        borderRadius: '999px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <button style={{ 
              backgroundColor: '#EBE0D2', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '8px 12px', 
              fontSize: '12px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              cursor: 'pointer',
              marginTop: '4px',
              width: '100%'
            }}>
              Agregar fecha de examen
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}