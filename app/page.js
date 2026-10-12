'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  // 1. Contrato de datos (Estructura como las respuestas de FastAPI/Supabase)
  const [fechaHoy] = useState('Jueves 22 de octubre');
  const [horasEstudio] = useState('dos horas');

  const [alertaParcial] = useState({
    fechaBadge: 'Vie 23',
    materia: 'Análisis Matemático I',
    unidades: 'unidades 1 a 3',
    bloquesHechos: 5,
    bloquesTotales: 8,
    ejemploPregunta: '¿cuándo una función no es derivable?',
  });

  const [bloquesHoy, setBloquesHoy] = useState([
    {
      id: 1,
      hora: '18:00',
      tipo: 'estudio', // 'estudio' | 'pausa' | 'libre'
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

  const [materias] = useState([
    { id: 1, nombre: 'Análisis Matemático I', detalle: '4 unidades, 6 apuntes', tieneApuntes: true },
    { id: 2, nombre: 'Física I', detalle: '3 unidades, 3 apuntes', tieneApuntes: true },
    { id: 3, nombre: 'Introducción a la Programación', detalle: 'Todavia no cargaste apuntes', tieneApuntes: false },
  ]);

  // Manejador para marcar bloques (que revise el formato los del back)
  const toggleListo = (id) => {
    setBloquesHoy((prev) =>
      prev.map((b) => (b.id === id ? { ...b, completado: !b.completado } : b))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Encabezado */}
      <div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {fechaHoy}
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Esta noche te tocan {horasEstudio} de estudio.
        </h1>
      </div>

      {/* Tarjeta "Alerta de Parcial" */}
      <div style={{ 
        backgroundColor: 'var(--bg-card)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '12px', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px' 
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            backgroundColor: '#E6DCCC', 
            padding: '4px 8px', 
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: 'bold', 
            border: '1px solid #D4C6B3' 
          }}>
            {alertaParcial.fechaBadge}
          </div>
          <div>
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
      </div>

      {/* Cronograma de bloques de estudio (.map dinámico) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {bloquesHoy.map((bloque) => {
          // Bloques de descanso o tiempo libre
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

          // Bloques de estudio
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
                <button style={{ 
                  backgroundColor: '#EBE0D2', 
                  color: 'var(--text-secondary)', 
                  border: '1px solid #D4C6B3', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  fontSize: '12px',
                  cursor: 'pointer'
                }}>
                  Pasar a otro dia
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección "Tus materias" (.map dinámico con enlaces) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Tus materias</h2>
          <Link 
            href="/materias"
            style={{ 
              color: 'var(--accent-purple)', 
              fontSize: '13px', 
              fontWeight: 'bold', 
              textDecoration: 'none' 
            }}
          >
            Agregar materia
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {materias.map((m) => (
            <Link 
              key={m.id}
              href="/materias"
              style={{ 
                textDecoration: 'none',
                color: 'inherit',
                backgroundColor: 'var(--bg-card)', 
                border: m.tieneApuntes ? '1px solid var(--border-color)' : '1px dashed var(--border-color)', 
                borderRadius: '10px', 
                padding: '16px',
                display: 'block'
              }}
            >
              <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                {m.nombre}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {m.detalle}
              </p>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}