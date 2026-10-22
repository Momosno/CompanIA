'use client';

import { useState } from 'react';
import MessageBubble from './MessageBubble';

export default function PreguntarPage() {
  const materiasDisponibles = ['Análisis Matemático I', 'Física I'];
  const [materiaActiva, setMateriaActiva] = useState(materiasDisponibles[0]);
  const [preguntasRestantes, setPreguntasRestantes] = useState(22);
  const [inputPregunta, setInputPregunta] = useState('');

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

  const handlePreguntar = (e) => {
    e.preventDefault();
    if (!inputPregunta.trim()) return;

    const mensajeUsuario = {
      id: Date.now(),
      remitente: 'user',
      texto: inputPregunta.trim(),
    };

    setMensajes((prev) => [...prev, mensajeUsuario]);
    setInputPregunta('');
    setPreguntasRestantes((prev) => Math.max(0, prev - 1));
  };

  const handleEmpezarDeNuevo = () => {
    setMensajes([]);
  };

  return (
    <div className="ask-page">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Preguntale a tus apuntes
        </h1>

        <div className="ask-toolbar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px'
        }}>
          <div className="ask-toolbar-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="ask-subject-control" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      <div className="ask-conversation" aria-live="polite">
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
          mensajes.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <form className="ask-composer" onSubmit={handlePreguntar} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <input
          value={inputPregunta}
          onChange={(e) => setInputPregunta(e.target.value)}
          placeholder="Preguntale a tus apuntes..."
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '14px',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            backgroundColor: 'var(--accent-purple)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
