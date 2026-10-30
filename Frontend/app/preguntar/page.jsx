'use client';

import { useEffect, useState } from 'react';
import MessageBubble from './MessageBubble';

export default function PreguntarPage() {
  const [materiasDisponibles, setMateriasDisponibles] = useState([
    'Análisis Matemático I',
    'Física I',
    'Introducción a la Programación',
  ]);
  const [materiaActiva, setMateriaActiva] = useState('Análisis Matemático I');
  const [preguntasRestantes, setPreguntasRestantes] = useState(22);
  const [inputPregunta, setInputPregunta] = useState('');

  // Sincronización automática con las materias reales del backend
  useEffect(() => {
    fetch('http://localhost:8000/usuarios/1/materias/')
      .then((r) => (r.ok ? r.json() : []))
      .then((materiasData) => {
        if (materiasData && materiasData.length > 0) {
          const nombres = materiasData.map((m) => m.nombre);
          setMateriasDisponibles(nombres);
          setMateriaActiva(nombres[0]);
        }
      })
      .catch((err) => {
        console.warn('Backend desconectado. Usando materias locales de prueba:', err);
      });
  }, []);

  // Conversaciones independientes por cada materia (SCRUM-29)
  const [conversaciones, setConversaciones] = useState({
    'Análisis Matemático I': [
      {
        id: 1,
        remitente: 'user',
        texto: '¿Cuál es la diferencia entre continuidad y derivabilidad?',
      },
      {
        id: 2,
        remitente: 'assistant',
        texto:
          'Una función es continua en un punto si el límite existe y coincide con el valor de la función. Es derivable si, además, existe el límite del cociente incremental. Toda función derivable es continua, pero no al revés: |x| es continua en 0 y no es derivable en ese punto.',
        fuentes: [
          { documento: 'Apunte de cátedra unidad 3.pdf', pagina: 41 },
          { documento: 'Apunte de cátedra unidad 3.pdf', pagina: 43 },
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
        texto:
          'Eso no aparece en tus apuntes de Análisis I, así que no te lo puedo confirmar. Consultalo con la cátedra, o subí el programa del parcial y te respondo desde ahí.',
        fuentes: [],
        sinFuente: true,
      },
    ],
    'Física I': [
      {
        id: 5,
        remitente: 'user',
        texto: '¿Qué diferencia hay entre velocidad media y velocidad instantánea?',
      },
      {
        id: 6,
        remitente: 'assistant',
        texto:
          'Ni idea, no conozco el tema',
        fuentes: [
          { documento: 'Guía Cinemática 2024.pdf', pagina: 4 },
        ],
        sinFuente: false,
      },
    ],
    'Introducción a la Programación': [],
  });

  const [sessionId, setSessionId] = useState('');

  // Recuperar historial de la sesión e inicializar ID en cliente (SCRUM-34)
  useEffect(() => {
    setSessionId(Date.now().toString());

    const historialGuardado = sessionStorage.getItem('compania_chat_sesion');
    if (historialGuardado) {
      try {
        setConversaciones(JSON.parse(historialGuardado));
      } catch (err) {
        console.warn('No se pudo restaurar el historial de sesión:', err);
      }
    }
  }, []);

  // Guardar en la sesión cada vez que se envía o limpia un mensaje (SCRUM-34)
  useEffect(() => {
    sessionStorage.setItem('compania_chat_sesion', JSON.stringify(conversaciones));
  }, [conversaciones]);

  // Mensajes de la materia seleccionada actualmente
  const mensajes = conversaciones[materiaActiva] || [];

  const limiteAlcanzado = preguntasRestantes <= 0;

  const handlePreguntar = (e) => {
    e.preventDefault();
    if (!inputPregunta.trim() || limiteAlcanzado) return;

    
    
    const mensajeUsuario = {
      id: Date.now(),
      remitente: 'user',
      texto: inputPregunta.trim(),
    };

    setConversaciones((prev) => ({
      ...prev,
      [materiaActiva]: [...(prev[materiaActiva] || []), mensajeUsuario],
    }));

    setInputPregunta('');
    setPreguntasRestantes((prev) => Math.max(0, prev - 1));
  };

  const handleNuevaConsulta = () => {
    if (mensajes.length > 0) {
      const confirmar = window.confirm(
        `¿Querés iniciar una nueva consulta en ${materiaActiva}? Se limpiará la conversación actual de esta materia.`
      );
      if (!confirmar) return;
    }

    setSessionId(Date.now().toString());
    setConversaciones((prev) => ({
      ...prev,
      [materiaActiva]: [],
    }));
  };

  return (
    <div className="ask-page">
      <div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          Preguntale a tus apuntes
        </h1>

        <div
          className="ask-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '12px',
          }}
        >
          <div
            className="ask-toolbar-controls"
            style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            <div
              className="ask-subject-control"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
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
                  outline: 'none',
                }}
              >
                {materiasDisponibles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <span style={{
              fontSize: '13px',
              fontWeight: limiteAlcanzado ? '700' : '400',
              color: limiteAlcanzado ? '#9B1C1C' : 'var(--text-secondary)',
              transition: 'color 0.2s ease',
            }}>
              {limiteAlcanzado ? 'Límite diario alcanzado (0 preguntas)' : `Te quedan ${preguntasRestantes} preguntas por hoy`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNuevaConsulta}
            title="Iniciar una nueva consulta"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EBE0D2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
          >
            <span style={{ fontSize: '15px', color: 'var(--accent-purple)' }}>+</span>
            Nueva consulta
          </button>
        </div>
      </div>

      <div className="ask-conversation" aria-live="polite">
        {mensajes.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px dashed var(--border-color)',
              borderRadius: '10px',
              padding: '32px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px',
            }}
          >
            Hacé una pregunta sobre tus apuntes de {materiaActiva}.
          </div>
        ) : (
          mensajes.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)', paddingTop: '16px', gap: '10px' }}>
        {limiteAlcanzado && (
          <div style={{
            backgroundColor: '#FDE8E8',
            border: '1px solid #F8B4B4',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#9B1C1C',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>Alcanzaste el límite de preguntas por hoy. El cupo se renueva a la medianoche.</span>
          </div>
        )}

        <form
          className="ask-composer"
          onSubmit={handlePreguntar}
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <input
            value={inputPregunta}
            onChange={(e) => setInputPregunta(e.target.value)}
            disabled={limiteAlcanzado}
            placeholder={limiteAlcanzado ? 'Alcanzaste el límite diario de preguntas...' : 'Preguntale a tus apuntes...'}
            style={{
              flex: 1,
              backgroundColor: limiteAlcanzado ? '#F5EFEB' : 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              outline: 'none',
              opacity: limiteAlcanzado ? 0.7 : 1,
              cursor: limiteAlcanzado ? 'not-allowed' : 'text',
            }}
          />
          <button
            type="submit"
            disabled={limiteAlcanzado}
            style={{
              backgroundColor: 'var(--accent-purple)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: '700',
              opacity: limiteAlcanzado ? 0.4 : 1,
              cursor: limiteAlcanzado ? 'not-allowed' : 'pointer',
            }}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
