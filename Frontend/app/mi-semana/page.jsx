'use client';

import { useEffect, useState } from 'react';
import SugerenciasEstudio from '../grupos/SugerenciasEstudio';
import { estudiantesDemo } from '../grupos/estudiantes';
import { API_URL, getUsuarioActual } from '../lib/api';

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

const formatearHora = (horaDecimal) => {
  const horas = Math.floor(horaDecimal);
  const minutos = Math.round((horaDecimal - horas) * 60);
  return `${horas}:${minutos === 0 ? '00' : minutos < 10 ? '0' + minutos : minutos}`;
};

export default function MiSemanaPage() {
  const [inicioSemana, setInicioSemana] = useState(null);
  const [hoy, setHoy] = useState(null);
  const [alturaHora, setAlturaHora] = useState(48);
  const [modoVista, setModoVista] = useState('calendario'); // 'calendario' | 'lista'

  const [examenes, setExamenes] = useState([
    {
      id: 1,
      titulo: 'Parcial de Análisis I, viernes 23',
      materia: 'Análisis Matemático I',
      fecha: '2026-10-23',
      unidades: [1, 2, 3],
      hechos: 5,
      total: 8,
      color: '#5A4BD1',
    },
    {
      id: 2,
      titulo: 'Parcial de Física I, viernes 30',
      materia: 'Física I',
      fecha: '2026-10-30',
      unidades: [1, 2],
      hechos: 1,
      total: 7,
      color: '#3B82F6',
    },
  ]);

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

        const fechaISO = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        const hayParcial = examenes.some((ex) => ex.fecha === fechaISO);

        return {
          id,
          fechaISO,
          nombre: `${nombreDia} ${fecha.getDate()}`,
          hoy: hoy?.getTime() === fecha.getTime(),
          parcial: hayParcial,
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
    id: 10,
    horarioTexto: 'Hoy, de 18 a 19',
    materia: 'Análisis Matemático I',
    detalle: 'Derivadas, unidad 3',
    temaChat: 'derivadas',
    completado: false,
  });

  const [reprogramando, setReprogramando] = useState(false);
  const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);
  const [tipoCompromiso, setTipoCompromiso] = useState('Trabajo');
  const [diaCompromiso, setDiaCompromiso] = useState('habiles');
  const [inicioCompromiso, setInicioCompromiso] = useState(9);
  const [finCompromiso, setFinCompromiso] = useState(18);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState(null);
  const [nuevoDia, setNuevoDia] = useState(3);
  const [nuevaHora, setNuevaHora] = useState(18);
  const [errorReprogramar, setErrorReprogramar] = useState(null);

  

  // SCRUM-38: Catálogo de materias y unidades oficiales (gemini)
  // SCRUM-38: Catálogo de materias dinámico vinculado al backend y a /materias
  const [usuario] = useState(getUsuarioActual);
  const [materiasMeta, setMateriasMeta] = useState([
    { id: 1, nombre: 'Análisis Matemático I', color: '#5A4BD1', unidades: [1, 2, 3] },
    { id: 2, nombre: 'Física I', color: '#3B82F6', unidades: [1, 2, 3] },
  ]);
  const MATERIAS_METAS = materiasMeta;

  useEffect(() => {
    if (!usuario?.id) return;
    fetch(`${API_URL}/usuarios/${usuario.id}/materias/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((materiasData) => {
        if (materiasData && materiasData.length > 0) {
          const adaptadas = materiasData.map((m) => ({
            id: m.id,
            nombre: m.nombre,
            color: m.nombre.includes('Física') ? '#3B82F6' : '#5A4BD1',
            unidades: (m.unidades && m.unidades.length > 0)
              ? m.unidades.map((u) => u.numero_unidad || u.numero).sort((a, b) => a - b)
              : [1, 2, 3],
          }));
          setMateriasMeta(adaptadas);
        }
      })
      .catch((err) => console.warn('Backend offline o sin materias, usando locales:', err));
  }, [usuario]);

  const [modalExamenAbierto, setModalExamenAbierto] = useState(false);
  const [examenEnEdicion, setExamenEnEdicion] = useState(null);
  const [materiaMeta, setMateriaMeta] = useState(MATERIAS_METAS[0].nombre);
  const [fechaMeta, setFechaMeta] = useState('');
  const [unidadesMeta, setUnidadesMeta] = useState([1, 2]);
  const [errorMeta, setErrorMeta] = useState(null);
  const [horaMeta, setHoraMeta] = useState(14);

  const formatearFechaHumana = (fechaStr) => {
    if (!fechaStr) return '';
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);
    const diaNombre = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(fechaObj);
    return `${diaNombre} ${dia}`;
  };

  const abreviarMateria = (nombre) => {
    if (nombre.includes('Análisis')) return 'Análisis I';
    if (nombre.includes('Física')) return 'Física I';
    return nombre;
  };

  const toggleBloqueActivo = () => {
    const nuevoEstado = !bloqueActivo.completado;
    setBloqueActivo((prev) => ({ ...prev, completado: nuevoEstado }));

    // Actualiza la grilla semanal para pasar a verde (#E0ECD9) con tilde ✓
    setEventosPorDia((prev) => {
      const copia = { ...prev };
      for (const diaKey in copia) {
        copia[diaKey] = copia[diaKey].map((ev) => {
          if (ev.id === bloqueActivo.id) {
            return {
              ...ev,
              type: nuevoEstado ? 'done' : 'study',
              title: nuevoEstado
                ? (ev.title.includes('✓') ? ev.title : `${ev.title} ✓`)
                : ev.title.replace(' ✓', ''),
            };
          }
          return ev;
        });
      }
      return copia;
    });

    // Contrato con FastAPI: PATCH /api/bloques/{id}
    fetch(`http://localhost:8000/api/bloques/${bloqueActivo.id || 10}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completado: nuevoEstado }),
    }).catch((err) => console.warn('Backend offline. Guardado local:', err));
  };

  const handleReprogramar = (e) => {
    e.preventDefault();
    if (!bloqueActivo) return;

    // 1. Averiguar la duración del bloque actual
    let duracion = 1;
    for (const diaKey in eventosPorDia) {
      const match = eventosPorDia[diaKey].find((ev) => ev.id === bloqueActivo.id);
      if (match) {
        duracion = match.end - match.start;
        break;
      }
    }

    const horaInicio = Number(nuevaHora);
    const horaFin = horaInicio + duracion;

    // 2. Validar que no se solape con otro evento en el nuevo día
    const eventoSolapado = (eventosPorDia[nuevoDia] || []).find(
      (ev) => ev.id !== bloqueActivo.id && horaInicio < ev.end && horaFin > ev.start
    );

    if (eventoSolapado) {
      setErrorReprogramar(`Ese horario ya está ocupado por "${eventoSolapado.title}".`);
      return;
    }

    // 3. Si el horario está libre, mover el bloque
    setErrorReprogramar(null);

    setEventosPorDia((prev) => {
      const copia = { ...prev };
      let eventoAMover = null;

      for (const diaKey in copia) {
        const encontrado = copia[diaKey].find((ev) => ev.id === bloqueActivo.id);
        if (encontrado) {
          eventoAMover = {
            ...encontrado,
            start: horaInicio,
            end: horaFin,
          };
          copia[diaKey] = copia[diaKey].filter((ev) => ev.id !== bloqueActivo.id);
          break;
        }
      }

      if (eventoAMover) {
        copia[nuevoDia] = [...(copia[nuevoDia] || []), eventoAMover];
      }
      return copia;
    });

    // 4. Actualizar textos laterales
    const diaElegido = dias.find((d) => d.id === nuevoDia)?.nombre || 'Nuevo día';
    setBloqueActivo((prev) => ({
      ...prev,
      diaId: nuevoDia,
      horarioTexto: `${diaElegido}, de ${formatearHora(horaInicio)} a ${formatearHora(horaFin)} hs`,
    }));

    setReprogramando(false);

    // Contrato con FastAPI: PATCH /api/bloques/{id}
    fetch(`http://localhost:8000/api/bloques/${bloqueActivo.id || 10}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diaId: nuevoDia,
        start: horaInicio,
        end: horaFin,
      }),
    }).catch((err) => console.warn('Backend offline. Guardado local:', err));
  };

  const handleGuardarDisponibilidad = (e) => {
    e.preventDefault();
    const start = Number(inicioCompromiso);
    const end = Number(finCompromiso);

    if (end <= start) {
      setErrorDisponibilidad('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    setErrorDisponibilidad(null);

    // Si elige "Lunes a Viernes" se aplica a los días 0 a 4; si no, al día seleccionado
    const diasDestino = diaCompromiso === 'habiles' ? [0, 1, 2, 3, 4] : [Number(diaCompromiso)];

    setEventosPorDia((prev) => {
      const copia = { ...prev };
      diasDestino.forEach((diaId) => {
        copia[diaId] = [
          ...(copia[diaId] || []),
          {
            id: Date.now() + Math.random(),
            start,
            end,
            title: tipoCompromiso.trim() || 'Actividad fija',
            type: 'work',
          },
        ];
      });
      return copia;
    });

    setModalHorariosAbierto(false);

    // Contrato con FastAPI: POST /api/disponibilidad (SCRUM-87)
    fetch('http://localhost:8000/api/disponibilidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: tipoCompromiso,
        dias: diasDestino,
        start,
        end,
      }),
    }).catch((err) => console.warn('Backend offline. Disponibilidad guardada localmente:', err));
  };

  // SCRUM-38: Controladores para crear, editar y eliminar metas de examen
  const abrirCrearExamen = () => {
    setExamenEnEdicion(null);
    setMateriaMeta(MATERIAS_METAS[0].nombre);
    setFechaMeta('');
    setHoraMeta(14);
    setUnidadesMeta([1, 2]);
    setErrorMeta(null);
    setModalExamenAbierto(true);
  };

  const abrirEditarExamen = (examen) => {
    setExamenEnEdicion(examen);
    setMateriaMeta(examen.materia || MATERIAS_METAS[0].nombre);
    setFechaMeta(examen.fecha || '');
    setHoraMeta(examen.hora || 14);
    setUnidadesMeta(examen.unidades || [1, 2]);
    setErrorMeta(null);
    setModalExamenAbierto(true);
  };

  const handleEliminarExamen = (id) => {
    // 1. Quitar el examen de la tarjeta lateral
    setExamenes((prev) => prev.filter((e) => e.id !== id));

    // 2. Borrar también el bloque del calendario si existía
    setEventosPorDia((prev) => {
      const copia = { ...prev };
      for (const diaKey in copia) {
        copia[diaKey] = copia[diaKey].filter((ev) => ev.examenId !== id);
      }
      return copia;
    });

    setModalExamenAbierto(false);
    setExamenEnEdicion(null);

    // Contrato con FastAPI: DELETE /api/metas-examen/{id}
    fetch(`http://localhost:8000/api/metas-examen/${id}`, { method: 'DELETE' })
      .catch((err) => console.warn('Backend offline. Eliminado local:', err));
  };

  const handleGuardarExamen = (e) => {
    e.preventDefault();
    if (!fechaMeta) {
      setErrorMeta('Por favor seleccioná la fecha del examen.');
      return;
    }
    if (unidadesMeta.length === 0) {
      setErrorMeta('Debés seleccionar al menos una unidad temática.');
      return;
    }
    setErrorMeta(null);

    const materiaObj = MATERIAS_METAS.find((m) => m.nombre === materiaMeta);
    const materiaCorta = abreviarMateria(materiaMeta);
    const tituloFormateado = `Parcial de ${materiaCorta}, ${formatearFechaHumana(fechaMeta)}`;
    const bloquesTotales = unidadesMeta.length * 2;
    const horaInicio = Number(horaMeta);
    const duracionExamen = 2;

    if (examenEnEdicion) {
      // Modo edición
      setExamenes((prev) =>
        prev.map((ex) =>
          ex.id === examenEnEdicion.id
            ? {
                ...ex,
                titulo: tituloFormateado,
                materia: materiaMeta,
                fecha: fechaMeta,
                hora: horaInicio,
                unidades: unidadesMeta,
                total: bloquesTotales,
                color: materiaObj ? materiaObj.color : ex.color,
              }
            : ex
        )
      );

      // Mover o actualizar el bloque en el calendario
      setEventosPorDia((prev) => {
        const copia = { ...prev };
        let bloquePrevio = null;

        for (const diaKey in copia) {
          const encontrado = copia[diaKey].find((ev) => ev.examenId === examenEnEdicion.id);
          if (encontrado) {
            bloquePrevio = encontrado;
            copia[diaKey] = copia[diaKey].filter((ev) => ev.examenId !== examenEnEdicion.id);
            break;
          }
        }

        const diaEnSemana = dias.find((d) => d.fechaISO === fechaMeta);
        if (diaEnSemana) {
          const bloqueActualizado = {
            ...(bloquePrevio || { id: Date.now() + 1, examenId: examenEnEdicion.id, type: 'study' }),
            start: horaInicio,
            end: horaInicio + duracionExamen,
            title: `Parcial ${materiaCorta}`,
          };
          copia[diaEnSemana.id] = [...(copia[diaEnSemana.id] || []), bloqueActualizado];
        }
        return copia;
      });
    } else {
      // Modo creación
      const nuevoExamenId = Date.now();
      const nuevoExamen = {
        id: nuevoExamenId,
        titulo: tituloFormateado,
        materia: materiaMeta,
        fecha: fechaMeta,
        hora: horaInicio,
        unidades: unidadesMeta,
        hechos: 0,
        total: bloquesTotales,
        color: materiaObj ? materiaObj.color : '#5A4BD1',
      };
      setExamenes((prev) => [...prev, nuevoExamen]);

      // Inserta el bloque en el calendario con la etiqueta "Parcial [Materia]" y su hora elegida
      const diaEnSemana = dias.find((d) => d.fechaISO === fechaMeta);
      if (diaEnSemana) {
        setEventosPorDia((prev) => ({
          ...prev,
          [diaEnSemana.id]: [
            ...(prev[diaEnSemana.id] || []),
            {
              id: Date.now() + 1,
              examenId: nuevoExamenId,
              start: horaInicio,
              end: horaInicio + duracionExamen,
              title: `Parcial ${materiaCorta}`,
              type: 'study',
            },
          ],
        }));
      }

      // Contrato con FastAPI: POST /api/metas-examen (SCRUM-88)
      fetch('http://localhost:8000/api/metas-examen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materia: materiaMeta,
          fecha: fechaMeta,
          hora: horaInicio,
          unidades: unidadesMeta,
          bloquesEstimados: bloquesTotales,
        }),
      }).catch((err) => console.warn('Backend offline. Guardado local:', err));
    }

    setModalExamenAbierto(false);
  };

  const alternarUnidadMeta = (numUnidad) => {
    setUnidadesMeta((prev) =>
      prev.includes(numUnidad) ? prev.filter((u) => u !== numUnidad) : [...prev, numUnidad].sort()
    );
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Tu semana
          </h1>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '3px',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => setModoVista('calendario')}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: modoVista === 'calendario' ? '600' : '500',
                backgroundColor: modoVista === 'calendario' ? 'var(--accent-purple)' : 'transparent',
                color: modoVista === 'calendario' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setModoVista('lista')}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: modoVista === 'lista' ? '600' : '500',
                backgroundColor: modoVista === 'lista' ? 'var(--accent-purple)' : 'transparent',
                color: modoVista === 'lista' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Lista
            </button>
          </div>
        </div>

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

        <button 
          className="week-hours-button"
          onClick={() => setModalHorariosAbierto(true)}
          style={{ cursor: 'pointer' }}
        >
          Cambiar mis horarios
        </button>
      </header>

      <div className="week-layout">
        <section className="week-calendar-card" aria-label="Calendario semanal">
          {inicioSemana ? (
            modoVista === 'calendario' ? (
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
                        const esEstudio = evento.type !== 'work';

                        return (
                          <div
                            key={evento.id}
                            onClick={() => {
                              if (esEstudio) {
                                setBloqueActivo({
                                  id: evento.id,
                                  diaId: dia.id,
                                  horarioTexto: `${dia.nombre}, de ${formatearHora(evento.start)} a ${formatearHora(evento.end)} hs`,
                                  materia: evento.title.replace(' ✓', ''),
                                  detalle: evento.title.includes('Análisis') ? 'Derivadas, unidad 3' : 'Repaso general',
                                  temaChat: evento.title.toLowerCase(),
                                  completado: evento.type === 'done',
                                });
                              }
                            }}
                            title={esEstudio ? 'Clic para enfocar bloque' : ''}
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
                              cursor: esEstudio ? 'pointer' : 'default',
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
            /* Vista Lista Cronológica (SCRUM-41) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: `${alturaTotal}px`, overflowY: 'auto', padding: '12px' }}>
              {dias.map((dia) => {
                const eventos = (eventosPorDia[dia.id] || []).slice().sort((a, b) => a.start - b.start);
                return (
                  <div key={dia.id} style={{ backgroundColor: dia.hoy ? '#FAF4EC' : 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{dia.nombre}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{eventos.length} actividades</span>
                    </div>
                    {eventos.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin actividades</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {eventos.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => ev.type !== 'work' && setBloqueActivo({
                              id: ev.id,
                              diaId: dia.id,
                              horarioTexto: `${dia.nombre}, de ${formatearHora(ev.start)} a ${formatearHora(ev.end)} hs`,
                              materia: ev.title.replace(' ✓', ''),
                              detalle: ev.title.includes('Análisis') ? 'Derivadas, unidad 3' : 'Repaso general',
                              temaChat: ev.title.toLowerCase(),
                              completado: ev.type === 'done',
                            })}
                            style={{
                              ...getBlockStyle(ev.type),
                              padding: '6px 10px',
                              borderRadius: '6px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: ev.type !== 'work' ? 'pointer' : 'default',
                            }}
                          >
                            <div>
                              <span style={{ fontSize: '11px', display: 'block', opacity: 0.85 }}>{formatearHora(ev.start)} - {formatearHora(ev.end)} hs</span>
                              <span style={{ fontSize: '13px' }}>{ev.title}</span>
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{ev.type === 'done' ? '✓ Listo' : ev.type === 'study' ? 'Estudio' : 'Fijo'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
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
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={toggleBloqueActivo}
                  style={{
                    flex: 1,
                    backgroundColor: bloqueActivo.completado ? '#C5E2BA' : '#E0ECD9',
                    border: '1px solid #C4D8B8',
                    color: '#275E10',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {bloqueActivo.completado ? 'Completado ✓' : 'Marcar listo'}
                </button>

                <button
                  onClick={() => setReprogramando(!reprogramando)}
                  style={{
                    flex: 1,
                    backgroundColor: '#EBE0D2',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {reprogramando ? 'Cancelar' : 'Reprogramar'}
                </button>
              </div>

              {reprogramando && (
                <form onSubmit={handleReprogramar} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* Selector de Día */}
                    <select
                      value={nuevoDia}
                      onChange={(e) => setNuevoDia(Number(e.target.value))}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    >
                      {dias.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>

                    {/* Selector de Horario */}
                    <select
                      value={nuevaHora}
                      onChange={(e) => setNuevaHora(Number(e.target.value))}
                      style={{
                        width: '95px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    >
                      {HORAS_GUIA.map((h) => (
                        <option key={h} value={h}>
                          {formatearHora(h)} hs
                        </option>
                      ))}
                    </select>
                  </div>

                  {errorReprogramar && (
                    <div style={{
                      backgroundColor: '#FDE8E8',
                      border: '1px solid #F8B4B4',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      fontSize: '11px',
                      color: '#9B1C1C',
                      fontWeight: '600',
                      lineHeight: '1.3'
                    }}>
                      {errorReprogramar}
                    </div>
                  )}
                      
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--accent-purple)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Confirmar cambio
                  </button>
                </form>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Parciales</h3>
              <button
                type="button"
                onClick={abrirCrearExamen}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--accent-purple)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                + Agregar examen
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {examenes.map((examen) => (
                <div key={examen.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      onClick={() => abrirEditarExamen(examen)}
                      style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                      title="Clic para editar examen"
                    >
                      {examen.titulo}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEliminarExamen(examen.id)}
                      style={{ background: 'none', border: 'none', color: '#9B1C1C', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
                      title="Eliminar examen"
                    >
                      ✕
                    </button>
                  </div>
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
      
      {/* SCRUM-37: Modal de Disponibilidad Semanal Fija */}
      {modalHorariosAbierto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '380px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                Disponibilidad semanal fija
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                Cargá actividades recurrentes (trabajo, cursada fija o compromisos semanales).
              </p>
            </div>

            <form onSubmit={handleGuardarDisponibilidad} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre del compromiso
                </label>
                <input
                  type="text"
                  value={tipoCompromiso}
                  onChange={(e) => setTipoCompromiso(e.target.value)}
                  placeholder="Ej: Trabajo, Cursada, Gimnasio..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Días aplicados
                </label>
                <select
                  value={diaCompromiso}
                  onChange={(e) => setDiaCompromiso(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="habiles">Lunes a Viernes (días hábiles)</option>
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados', 'Domingos'].map((dia, idx) => (
                    <option key={idx} value={idx}>
                      Todos los {dia}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Desde
                  </label>
                  <select
                    value={inicioCompromiso}
                    onChange={(e) => setInicioCompromiso(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 hs
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Hasta
                  </label>
                  <select
                    value={finCompromiso}
                    onChange={(e) => setFinCompromiso(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  >
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 hs
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {errorDisponibilidad && (
                <div style={{
                  backgroundColor: '#FDE8E8',
                  border: '1px solid #F8B4B4',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '11px',
                  color: '#9B1C1C',
                  fontWeight: '600',
                }}>
                  {errorDisponibilidad}
                </div>
              )}

              {/* Botones de acción inferior */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setErrorDisponibilidad(null);
                    setModalHorariosAbierto(false);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#FDE8E8',
                    border: '1px solid #F8B4B4',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#9B1C1C',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--accent-purple)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  Guardar horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SCRUM-38: Modal de Meta de Examen (hecho por geminiano. ni idea, mucho texto)*/}
      {modalExamenAbierto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '380px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                {examenEnEdicion ? 'Editar meta de examen' : 'Nueva meta de examen'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                {examenEnEdicion 
                  ? 'Modificá la fecha o las unidades a evaluar.' 
                  : 'El planificador distribuirá los bloques de estudio necesarios hasta la fecha.'}
              </p>
            </div>

            <form onSubmit={handleGuardarExamen} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Materia
                </label>
                <select
                  value={materiaMeta}
                  onChange={(e) => {
                    setMateriaMeta(e.target.value);
                    const mat = MATERIAS_METAS.find((m) => m.nombre === e.target.value);
                    setUnidadesMeta(mat ? [mat.unidades[0]] : [1]);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  {MATERIAS_METAS.map((m) => (
                    <option key={m.id} value={m.nombre}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
    
                {/* Selector de fecha con días dinámicos según el mes */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Fecha del examen
                  </label>
                  {(() => {
                    const mesSeleccionado = fechaMeta ? fechaMeta.split('-')[1] : '11';
                    const diaSeleccionado = fechaMeta ? fechaMeta.split('-')[2] : '';
                    // Obtiene la cantidad exacta de días del mes (Noviembre: 30, Octubre: 31, etc.)
                    const diasEnMes = new Date(2026, Number(mesSeleccionado), 0).getDate();

                    return (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                          value={diaSeleccionado && Number(diaSeleccionado) <= diasEnMes ? diaSeleccionado : ''}
                          onChange={(e) => setFechaMeta(`2026-${mesSeleccionado}-${e.target.value}`)}
                          style={{
                            flex: '1',
                            padding: '8px 6px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                          }}
                        >
                          <option value="" disabled>Día</option>
                          {Array.from({ length: diasEnMes }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>

                        <select
                          value={mesSeleccionado}
                          onChange={(e) => {
                            const nuevoMes = e.target.value;
                            const maxDiasNuevoMes = new Date(2026, Number(nuevoMes), 0).getDate();
                            // Si el día actual excede el tope del nuevo mes (ej. 31 en noviembre), lo ajusta al máximo permitido
                            const diaAjustado = diaSeleccionado 
                              ? String(Math.min(Number(diaSeleccionado), maxDiasNuevoMes)).padStart(2, '0')
                              : '01';
                            setFechaMeta(`2026-${nuevoMes}-${diaAjustado}`);
                          }}
                          style={{
                            flex: '1.4',
                            padding: '8px 6px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                          }}
                        >
                          <option value="10">Octubre</option>
                          <option value="11">Noviembre</option>
                          <option value="12">Diciembre</option>
                        </select>
                      </div>
                    );
                  })()}
                </div>

                {/* Selector de Horario exacto del parcial */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Horario de inicio
                  </label>
                  <select
                    value={horaMeta}
                    onChange={(e) => setHoraMeta(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 6px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 hs
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Unidades a evaluar
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(MATERIAS_METAS.find((m) => m.nombre === materiaMeta)?.unidades || [1, 2, 3]).map((u) => {
                    const seleccionada = unidadesMeta.includes(u);
                    return (
                      <button
                        type="button"
                        key={u}
                        onClick={() => alternarUnidadMeta(u)}
                        style={{
                          border: `1px solid ${seleccionada ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                          backgroundColor: seleccionada ? 'var(--accent-purple)' : 'var(--bg-page)',
                          color: seleccionada ? '#FFFFFF' : 'var(--text-primary)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: seleccionada ? 'bold' : 'normal',
                          cursor: 'pointer',
                        }}
                      >
                        Unidad {u}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMeta && (
                <div style={{
                  backgroundColor: '#FDE8E8',
                  border: '1px solid #F8B4B4',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '11px',
                  color: '#9B1C1C',
                  fontWeight: '600',
                }}>
                  {errorMeta}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {examenEnEdicion && (
                  <button
                    type="button"
                    onClick={() => handleEliminarExamen(examenEnEdicion.id)}
                    style={{
                      backgroundColor: '#FDE8E8',
                      border: '1px solid #F8B4B4',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9B1C1C',
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMeta(null);
                    setExamenEnEdicion(null);
                    setModalExamenAbierto(false);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-page)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--accent-purple)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {examenEnEdicion ? 'Guardar cambios' : 'Guardar meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
