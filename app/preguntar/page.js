'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PreguntarPage() {
  // 1. Estados de control y contexto
  const materiasDisponibles = ['Análisis Matemático I', 'Física I'];
  const [materiaActiva, setMateriaActiva] = useState(materiasDisponibles[0]);
  const [preguntasRestantes, setPreguntasRestantes] = useState(22);
  const [inputPregunta, setInputPregunta] = useState('');

  // 2. Contrato de datos (Estructura idéntica a lo que responderá el backend de RAG)
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      remitente: 'user',
      texto: '¿Cuál es la diferencia entre continuidad y derivabilidad?',
    },
    {
      id: 2,
      remitente: 'assistant',
      texto: 'Una función es continua en un punto si el límite existe y coincide con el valor de la función. Es derivable si, además, existe el límite del cociente incremental. Toda función derivable es continua, pero no al revés: |x| es continua en 0 y no es derivable en ese punto.',
      fuentes: [
        '1 Apunte de cátedra, unidad 3, página 41',
        '2 Apunte de cátedra, unidad 3, página 43',
      ],
      sinFuente: false,
    },
    {
      id: 3,
      remitente: 'user',
      texto: "¿Entra la regla de L'Hôpital en el parcial?",
    },
    {
      id: 4,
      remitente: 'assistant',
      texto: 'Eso no aparece en tus apuntes de Análisis I, así que no te lo puedo confirmar. Consultalo con la cátedra, o subí el programa del parcial y te respondo desde ahí.',
      fuentes: [],
      sinFuente: true,
    },
  ]);

  // Manejo de envío de preguntas
  const handlePreguntar = (e) => {
    e.preventDefault();
    if (!inputPregunta.trim()) return;

    const mensajeUsuario = {
      id: Date.now(),
      remitente: 'user',
      texto: inputPregunta.trim(),
    };

    // Agregar la pregunta al hilo
    setMensajes((prev) => [...prev, mensajeUsuario]);
    setInputPregunta('');
    setPreguntasRestantes((prev) => Math.max(0, prev - 1));

    // ACÁ EL BACKEND CONECTARÁ:
    // const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ pregunta, materia: materiaActiva }) })
  };

  // Reiniciar hilo de la conversación
  const handleEmpezarDeNuevo = () => {
    setMensajes([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Encabezado y barra de contexto */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Preguntale a tus apuntes
        </h1>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Materia</span>
              <select 
                value={materiaActiva}
                onChange={(e) => setMateriaActiva(e.target.value)}
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  padding: '4px 8px', 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              >
                {materiasDisponibles.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Te quedan {preguntasRestantes} preguntas por hoy
            </span>
          </div>

          <button 
            onClick={handleEmpezarDeNuevo}
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '6px 14px', 
              fontSize: '13px', 
              fontWeight: '500', 
              color: 'var(--text-primary)', 
              cursor: 'pointer' 
            }}
          >
            Empezar de nuevo
          </button>
        </div>
      </div>

      {/* 2. Hilo de conversación generado con .map */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {mensajes.length === 0 ? (
          <div style={{ 
            backgroundColor: 'var(--bg-card)', 
            border: '1px dashed var(--border-color)', 
            borderRadius: '10px', 
            padding: '32px', 
            textAlign: 'center', 
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            Hacé una pregunta sobre tus apuntes de {materiaActiva}.
          </div>
        ) : (
          mensajes.map((m) => {
            // Burbuja de usuario
            if (m.remitente === 'user') {
              return (
                <div key={m.id} style={{ alignSelf: 'flex-start' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                    Vos
                  </span>
                  <div style={{ 
                    backgroundColor: '#EBE0D2', 
                    padding: '10px 14px', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: 'var(--text-primary)',
                    maxWidth: '650px'
                  }}>
                    {m.texto}
                  </div>
                </div>
              );
            }

            // Burbuja de respuesta de la IA
            return (
              <div 
                key={m.id}
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxWidth: '750px'
                }}
              >
                <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                  {m.texto}
                </p>

                {/* Citas de los apuntes */}
                {m.fuentes?.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    {m.fuentes.map((fuente, idx) => (
                      <div 
                        key={idx}
                        style={{ 
                          backgroundColor: '#EFE9DD', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          padding: '4px 8px', 
                          fontSize: '11px', 
                          color: 'var(--text-secondary)' 
                        }}
                      >
                        {fuente}
                      </div>
                    ))}
                  </div>
                )}

                {/* Caso sin fuente en apuntes */}
                {m.sinFuente && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
                    <Link
                      href="/materias"
                      style={{ 
                        backgroundColor: '#EBE0D2', 
                        color: 'var(--text-primary)', 
                        border: '1px solid var(--border-color)', 
                        padding: '6px 12px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: '500',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                    >
                      Subir el programa del parcial
                    </Link>

                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Sin fuente en tus apuntes
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Área de entrada de nueva pregunta (Formulario funcional) */}
      <form 
        onSubmit={handlePreguntar}
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px',
          marginTop: '12px'
        }}
      >
        <div>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block' }}>
            Tu próxima pregunta
          </label>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Escribila como se la harías a un compañero
          </span>
        </div>

        <textarea 
          rows={3}
          value={inputPregunta}
          onChange={(e) => setInputPregunta(e.target.value)}
          placeholder="Escribí acá tu duda..."
          style={{ 
            width: '100%', 
            backgroundColor: 'var(--bg-page)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            padding: '10px', 
            fontSize: '14px', 
            color: 'var(--text-primary)',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Respondo solo con lo que está en los apuntes que subiste.
          </span>
          <button 
            type="submit"
            style={{ 
              backgroundColor: 'var(--accent-purple)', 
              color: '#FFFFFF', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '6px', 
              fontSize: '13px', 
              fontWeight: '600', 
              cursor: 'pointer' 
            }}
          >
            Preguntar
          </button>
        </div>
      </form>

    </div>
  );
}