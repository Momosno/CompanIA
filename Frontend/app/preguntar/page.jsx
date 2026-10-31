'use client';

import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import DialogoConfirmacion from '../DialogoConfirmacion';
import { API_URL, getUsuarioActual } from '../lib/api';

const CLAVE_HISTORIAL = 'compania_chat_por_materia';
const ERROR_CHAT = 'No pudimos responder tu pregunta. Probá de nuevo en unos minutos.';
const MAX_LINEAS = 7;
const ALTO_LINEA_PX = 20;
const RELLENO_VERTICAL_PX = 24;

export default function PreguntarPage() {
  const [usuario] = useState(getUsuarioActual);
  const [materiasDisponibles, setMateriasDisponibles] = useState([]);
  const [materiaId, setMateriaId] = useState(null);
  const [preguntasRestantes, setPreguntasRestantes] = useState(null);
  const [inputPregunta, setInputPregunta] = useState('');
  const [esperando, setEsperando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const preguntaEnCurso = useRef(false);
  const cuadroPregunta = useRef(null);

  // El cuadro crece con el texto hasta MAX_LINEAS; después scrollea adentro
  useEffect(() => {
    const cuadro = cuadroPregunta.current;
    if (!cuadro) return;

    const bordes = cuadro.offsetHeight - cuadro.clientHeight;
    const altoMaximo = MAX_LINEAS * ALTO_LINEA_PX + RELLENO_VERTICAL_PX + bordes;

    cuadro.style.height = 'auto';
    const altoNecesario = cuadro.scrollHeight + bordes;
    cuadro.style.height = `${Math.min(altoNecesario, altoMaximo)}px`;
    cuadro.style.overflowY = altoNecesario > altoMaximo ? 'auto' : 'hidden';
  }, [inputPregunta]);

  // Al enviar y al recibir la respuesta baja hasta el final; en el resto de los casos no mueve la lectura
  useEffect(() => {
    if (!preguntaEnCurso.current) return;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    if (!esperando) preguntaEnCurso.current = false;
  }, [esperando]);

  // Sincronización automática con las materias reales del backend
  useEffect(() => {
    if (!usuario) return;
    fetch(`${API_URL}/usuarios/${usuario.id}/materias/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((materiasData) => {
        if (materiasData && materiasData.length > 0) {
          setMateriasDisponibles(materiasData.map((m) => ({ id: m.id, nombre: m.nombre })));
          setMateriaId(materiasData[0].id);
        }
      })
      .catch((err) => {
        console.warn('No se pudieron cargar las materias:', err);
      });
  }, [usuario]);

  // Cupo de hoy: se relee al volver a la ventana porque puede cambiar por fuera
  // de esta pantalla (otra pestaña, la tabla o el cambio de día)
  useEffect(() => {
    if (!usuario) return;

    const consultarCupo = () => {
      fetch(`${API_URL}/usuarios/${usuario.id}/uso`)
        .then((r) => (r.ok ? r.json() : null))
        .then((uso) => {
          if (uso) setPreguntasRestantes(uso.restantes);
        })
        .catch((err) => {
          console.warn('No se pudo consultar el cupo diario:', err);
        });
    };

    consultarCupo();
    window.addEventListener('focus', consultarCupo);
    return () => window.removeEventListener('focus', consultarCupo);
  }, [usuario]);

  // Conversaciones independientes por cada materia, indexadas por materia_id (SCRUM-29)
  const [conversaciones, setConversaciones] = useState({});
  const [historialCargado, setHistorialCargado] = useState(false);

  const [sessionId, setSessionId] = useState('');

  // Recuperar historial de la sesión e inicializar ID en cliente (SCRUM-34)
  useEffect(() => {
    setSessionId(Date.now().toString());

    const historialGuardado = sessionStorage.getItem(CLAVE_HISTORIAL);
    if (historialGuardado) {
      try {
        setConversaciones(JSON.parse(historialGuardado));
      } catch (err) {
        console.warn('No se pudo restaurar el historial de sesión:', err);
      }
    }
    setHistorialCargado(true);
  }, []);

  // Guardar en la sesión cada vez que se envía o limpia un mensaje (SCRUM-34)
  useEffect(() => {
    if (!historialCargado) return;
    const sinPendientes = Object.fromEntries(
      Object.entries(conversaciones).map(([id, lista]) => [id, lista.filter((m) => !m.pensando)])
    );
    sessionStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(sinPendientes));
  }, [conversaciones, historialCargado]);

  // Mensajes de la materia seleccionada actualmente
  const mensajes = conversaciones[materiaId] || [];
  const nombreMateria = materiasDisponibles.find((m) => m.id === materiaId)?.nombre;

  const limiteAlcanzado = preguntasRestantes === 0;

  const handlePreguntar = async (e) => {
    e.preventDefault();
    const pregunta = inputPregunta.trim();
    if (!pregunta || limiteAlcanzado || esperando || !materiaId) return;

    // La materia puede cambiar mientras se espera la respuesta
    const idMateria = materiaId;
    const idPendiente = Date.now() + 1;

    const mensajeUsuario = {
      id: Date.now(),
      remitente: 'user',
      texto: pregunta,
    };
    const mensajePendiente = {
      id: idPendiente,
      remitente: 'assistant',
      texto: 'Pensando…',
      pensando: true,
    };

    setConversaciones((prev) => ({
      ...prev,
      [idMateria]: [...(prev[idMateria] || []), mensajeUsuario, mensajePendiente],
    }));
    setInputPregunta('');
    preguntaEnCurso.current = true;
    setEsperando(true);

    const reemplazarPendiente = (mensaje) => {
      setConversaciones((prev) => ({
        ...prev,
        [idMateria]: (prev[idMateria] || []).flatMap((m) => {
          if (m.id !== idPendiente) return [m];
          return mensaje ? [{ ...mensaje, id: idPendiente, remitente: 'assistant' }] : [];
        }),
      }));
    };

    try {
      const res = await fetch(`${API_URL}/usuarios/${usuario.id}/materias/${idMateria}/preguntas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta }),
      });
      const datos = await res.json().catch(() => ({}));

      if (typeof datos.restantes === 'number') setPreguntasRestantes(datos.restantes);

      if (res.status === 429) {
        setPreguntasRestantes(0);
        reemplazarPendiente(null);
      } else if (!res.ok) {
        reemplazarPendiente({
          texto: typeof datos.detail === 'string' ? datos.detail : ERROR_CHAT,
        });
      } else {
        reemplazarPendiente({
          texto: datos.respuesta,
          fuentes: datos.fuentes,
          sinFuente: datos.sin_fuente,
          complemento: datos.complemento,
        });
      }
    } catch (err) {
      console.warn('No se pudo enviar la pregunta:', err);
      reemplazarPendiente({ texto: ERROR_CHAT });
    } finally {
      setEsperando(false);
    }
  };

  const limpiarConsulta = () => {
    setSessionId(Date.now().toString());
    setConversaciones((prev) => ({
      ...prev,
      [materiaId]: [],
    }));
  };

  const handleNuevaConsulta = () => {
    if (mensajes.length === 0) {
      limpiarConsulta();
      return;
    }

    setConfirmacion({
      titulo: 'Nueva consulta',
      mensaje: `¿Querés iniciar una nueva consulta en ${nombreMateria}? Se limpiará la conversación actual de esta materia.`,
      textoConfirmar: 'Iniciar nueva consulta',
      accion: limpiarConsulta,
    });
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
                value={materiaId ?? ''}
                onChange={(e) => setMateriaId(Number(e.target.value))}
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
                  <option key={m.id} value={m.id}>
                    {m.nombre}
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
              {limiteAlcanzado && 'Límite diario alcanzado (0 preguntas)'}
              {preguntasRestantes > 0 && `Te quedan ${preguntasRestantes} preguntas por hoy`}
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
            {nombreMateria
              ? `Hacé una pregunta sobre tus apuntes de ${nombreMateria}.`
              : 'Todavía no tenés materias. Creá una para poder preguntar sobre tus apuntes.'}
          </div>
        ) : (
          mensajes.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <div style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px 0',
        backgroundColor: '#efe9df',
      }}>
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
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={cuadroPregunta}
            rows={1}
            value={inputPregunta}
            onChange={(e) => setInputPregunta(e.target.value)}
            onKeyDown={(e) => {
              // Enter envía y Shift+Enter agrega una línea
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) handlePreguntar(e);
            }}
            disabled={limiteAlcanzado || !materiaId}
            placeholder={limiteAlcanzado ? 'Alcanzaste el límite diario de preguntas...' : 'Preguntale a tus apuntes...'}
            style={{
              flex: 1,
              backgroundColor: limiteAlcanzado ? '#F5EFEB' : 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '14px',
              fontFamily: 'inherit',
              lineHeight: `${ALTO_LINEA_PX}px`,
              resize: 'none',
              color: 'var(--text-primary)',
              outline: 'none',
              opacity: limiteAlcanzado ? 0.7 : 1,
              cursor: limiteAlcanzado ? 'not-allowed' : 'text',
            }}
          />
          <button
            type="submit"
            disabled={limiteAlcanzado || esperando || !materiaId}
            style={{
              backgroundColor: 'var(--accent-purple)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: '700',
              opacity: limiteAlcanzado || esperando || !materiaId ? 0.4 : 1,
              cursor: limiteAlcanzado || esperando || !materiaId ? 'not-allowed' : 'pointer',
            }}
          >
            Enviar
          </button>
        </form>
      </div>

      <DialogoConfirmacion confirmacion={confirmacion} onCerrar={() => setConfirmacion(null)} />
    </div>
  );
}
