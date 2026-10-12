'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PracticarPage() {
  // 1. CONTRATO DE DATOS DE LA EVALUACIÓN (Lo que devuelve el backend al corregir)
  const [testInfo] = useState({
    titulo: 'Test de práctica de Análisis Matemático I, unidades 1 a 3',
    mensajeAlerta: 'Tenés tres respuestas para revisar antes del viernes.',
    puntaje: '7/10',
  });

  const [temasRepaso] = useState([
    { id: 1, titulo: 'Continuidad y derivabilidad, unidad 3' },
    { id: 2, titulo: 'Regla de la cadena, unidad 3' },
    { id: 3, titulo: 'Límites laterales, unidad 2' },
  ]);

  // Lista unificada de preguntas generadas y corregidas por IA
  const [preguntas, setPreguntas] = useState([
    {
      numero: 3,
      enunciado: '¿Cuál es el dominio de f(x) = √(x - 2)?',
      esCorrecta: true,
      expandida: false,
    },
    {
      numero: 4,
      enunciado: 'Si f es continua en x=a, entonces f es derivable en x=a. ¿Verdadero o falso?',
      esCorrecta: false,
      expandida: true, // Viene abierta para mostrar el detalle del error
      mensajeError: 'Respondiste Verdadero. Es falso.',
      fuente: 'Lo explica el apunte de la unidad 3, página 41',
      explicacion: 'La continuidad hace falta para ser derivable, pero no alcanza. Por ejemplo, |x| es continua en 0 y no es derivable en ese punto.',
    },
    {
      numero: 5,
      enunciado: '¿Cuánto vale el límite de sen(x)/x cuando x tiende a 0?',
      esCorrecta: true,
      expandida: false,
    },
    {
      numero: 7,
      enunciado: '¿Cuál es la derivada de sen(x²)?',
      esCorrecta: false,
      expandida: false,
      mensajeError: 'Respondiste cos(x²). Faltó la regla de la cadena.',
      fuente: 'Lo explica el apunte de la unidad 3, página 48',
      explicacion: 'Debés multiplicar la derivada de la función externa por la derivada del argumento interno: cos(x²) · 2x.',
    },
  ]);

  // Permite abrir o cerrar la corrección de cualquier ejercicio
  const toggleExpandir = (numero) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.numero === numero ? { ...p, expandida: !p.expandida } : p
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Encabezado principal */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {testInfo.titulo}
        </h1>
      </div>

      {/* 2. Tarjeta resumen de diagnóstico y temas a repasar */}
      <div style={{ 
        backgroundColor: 'var(--bg-card)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '12px', 
        padding: '22px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '18px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {testInfo.mensajeAlerta}
            </h2>
          </div>
          <div style={{ 
            backgroundColor: '#EBE0D2', 
            border: '1px solid #D4C6B3', 
            borderRadius: '8px', 
            padding: '6px 14px', 
            textAlign: 'center' 
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Corrección</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {testInfo.puntaje}
            </span>
          </div>
        </div>

        {/* Sección Repasá esto */}
        <div style={{ 
          backgroundColor: 'var(--bg-page)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '10px', 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px' 
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.2px' }}>
            Repasá esto
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {temasRepaso.map((tema, idx) => (
              <div 
                key={tema.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderBottom: idx !== temasRepaso.length - 1 ? '1px solid var(--border-color)' : 'none',
                  paddingBottom: idx !== temasRepaso.length - 1 ? '8px' : '0' 
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {tema.titulo}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link 
                    href="/preguntar"
                    style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px', 
                      padding: '4px 10px', 
                      fontSize: '12px', 
                      color: 'var(--text-primary)', 
                      textDecoration: 'none',
                      cursor: 'pointer' 
                    }}
                  >
                    Preguntar
                  </Link>
                  <button style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    padding: '4px 10px', 
                    fontSize: '12px', 
                    color: 'var(--text-primary)', 
                    cursor: 'pointer' 
                  }}>
                    Agendar repaso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Desglose de preguntas (.map dinámico con acordeón de corrección) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {preguntas.map((p) => (
          <div 
            key={p.numero}
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '10px', 
              padding: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}
          >
            {/* Fila superior: Número, enunciado y badge o botón */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: p.expandida ? 'flex-start' : 'center' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', width: '20px', color: 'var(--text-secondary)' }}>
                  {p.numero}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: p.esCorrecta ? '500' : '700' }}>
                  {p.enunciado}
                </span>
              </div>

              {/* Indicador de estado */}
              {p.esCorrecta ? (
                <span style={{ 
                  backgroundColor: '#E0ECD9', 
                  color: '#275E10', 
                  border: '1px solid #C4D8B8', 
                  borderRadius: '6px', 
                  padding: '2px 8px', 
                  fontSize: '13px', 
                  fontWeight: 'bold' 
                }}>
                  ✓
                </span>
              ) : p.expandida ? (
                <button 
                  onClick={() => toggleExpandir(p.numero)}
                  style={{ 
                    backgroundColor: '#FDE8E8', 
                    color: '#9B1C1C', 
                    border: '1px solid #F8B4B4', 
                    borderRadius: '6px', 
                    padding: '2px 8px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                  title="Cerrar corrección"
                >
                  ✕
                </button>
              ) : (
                <button 
                  onClick={() => toggleExpandir(p.numero)}
                  style={{ 
                    backgroundColor: '#EBE0D2', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    padding: '4px 10px', 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)', 
                    cursor: 'pointer' 
                  }}
                >
                  Ver corrección
                </button>
              )}
            </div>

            {/* Caja explicativa del error (sólo si no es correcta y está expandida) */}
            {!p.esCorrecta && p.expandida && (
              <div style={{ 
                backgroundColor: 'var(--bg-page)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '14px', 
                marginLeft: '36px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px' 
              }}>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#9B1C1C' }}>
                  {p.mensajeError}
                </p>

                <div style={{ alignSelf: 'flex-start' }}>
                  <span style={{ 
                    backgroundColor: '#EFE9DD', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    padding: '3px 8px', 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)' 
                  }}>
                    {p.fuente}
                  </span>
                </div>

                <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                  {p.explicacion}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 4. Botones de acción inferiores */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '8px' }}>
        <button style={{ 
          backgroundColor: 'var(--accent-purple)', 
          color: '#FFFFFF', 
          border: 'none', 
          borderRadius: '8px', 
          padding: '10px 18px', 
          fontSize: '13px', 
          fontWeight: '600', 
          cursor: 'pointer' 
        }}>
          Hacer otro test
        </button>

        <Link 
          href="/" 
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            padding: '10px 18px', 
            fontSize: '13px', 
            fontWeight: '500', 
            color: 'var(--text-primary)', 
            textDecoration: 'none',
            display: 'inline-block' 
          }}
        >
          Volver a esta noche
        </Link>
      </div>

    </div>
  );
}