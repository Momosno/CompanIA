'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import DialogoConfirmacion from '../DialogoConfirmacion';
import SugerenciasEstudio from '../grupos/SugerenciasEstudio';
import { estudiantesDemo } from '../grupos/estudiantes';
import { getUsuarioActual } from '../lib/api';
import {
  aBloque, borrarDisponibilidad, borrarMeta, confirmarPlan, crearDisponibilidad, crearMeta,
  editarMeta, fechaDe, fechaISO, fechaLocal, formatearDiaHumano, formatearHora, guardarPreferencias,
  horaDeTexto, listarDisponibilidad, listarEventos, listarMaterias, listarMetas, marcarCompletado,
  obtenerPreferencias, pedirPlanes, reprogramar,
} from '../lib/agenda';

// ---------- fechas y horas ----------

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

const nombreCortoDia = (fecha) => new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
  .format(fecha)
  .replace(/\.$/, '')
  .replace(/^(.)/, (letra) => letra.toUpperCase());

// 9 -> "09:00", 18.5 -> "18:30"; 24 se guarda como "23:59" (el tipo time de la base no admite 24:00)
const aTextoHora = (hora) => {
  if (hora >= 24) return '23:59';
  const h = Math.floor(hora);
  return `${String(h).padStart(2, '0')}:${String(Math.round((hora - h) * 60)).padStart(2, '0')}`;
};

const MEDIAS_HORAS = Array.from({ length: 49 }, (_, i) => i / 2); // 0, 0.5, ... 24
const NOMBRES_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados', 'Domingos'];
const DIAS_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const COLORES_MATERIA = ['#5A4BD1', '#3B82F6', '#0F766E', '#B45309', '#BE185D', '#4D7C0F'];
const colorDeMateria = (materiaId) => COLORES_MATERIA[(materiaId ?? 0) % COLORES_MATERIA.length];
const DURACION_EXAMEN = 2; // horas que se pintan para el examen en la grilla

// la fecha de hoy solo existe en el navegador (en el servidor es null, así no hay diferencias al hidratar)
const sinSuscripcion = () => () => {};
const hoyEnNavegador = () => fechaISO(new Date());

// ---------- estilos compartidos ----------

const estiloLabel = { display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' };
const estiloInput = {
  width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box',
};
const estiloError = {
  backgroundColor: '#FDE8E8', border: '1px solid #F8B4B4', borderRadius: '6px', padding: '6px 8px',
  fontSize: '11px', color: '#9B1C1C', fontWeight: '600', lineHeight: '1.3',
};
const estiloOk = { ...estiloError, backgroundColor: '#E0ECD9', border: '1px solid #C4D8B8', color: '#275E10' };
const estiloBotonPrimario = {
  flex: 1, backgroundColor: 'var(--accent-purple)', color: '#FFFFFF', border: 'none', borderRadius: '6px',
  padding: '8px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center',
};
const estiloBotonSecundario = {
  flex: 1, backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '6px',
  padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'center',
};
const estiloBotonPeligro = {
  backgroundColor: '#FDE8E8', border: '1px solid #F8B4B4', borderRadius: '6px', padding: '8px 10px',
  fontSize: '12px', fontWeight: '600', color: '#9B1C1C', cursor: 'pointer',
};
const estiloLink = {
  backgroundColor: 'transparent', border: 'none', color: 'var(--accent-purple)', fontSize: '12px',
  fontWeight: '700', cursor: 'pointer', padding: 0,
};
const estiloTarjeta = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' };
const deshabilitado = (estilo, ocupado) => (ocupado ? { ...estilo, opacity: 0.6, cursor: 'wait' } : estilo);

const getBlockStyle = (type) => {
  switch (type) {
    case 'done':
      return { backgroundColor: '#E0ECD9', border: '1px solid #C4D8B8', color: '#275E10', fontWeight: 'bold' };
    case 'study':
      return { backgroundColor: '#DFD7FA', border: '1px solid #C5B8F0', color: '#4334A6', fontWeight: 'bold' };
    case 'exam':
      return { backgroundColor: '#FDE8E8', border: '1px solid #F8B4B4', color: '#9B1C1C', fontWeight: 'bold' };
    case 'work':
    default:
      return { backgroundColor: '#EAE2D5', border: '1px solid #DCD0C0', color: 'var(--text-secondary)', fontWeight: '500' };
  }
};

function Modal({ titulo, subtitulo, children, ancho = '380px' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} style={{
        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
        padding: '24px', width: '90%', maxWidth: ancho, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{titulo}</h3>
          {subtitulo && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>{subtitulo}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

// agrupa las filas de disponibilidad (una por día) en compromisos: "Trabajo lun–vie 9 a 18"
const agruparCompromisos = (filas) => {
  const grupos = new Map();
  for (const f of filas) {
    const clave = `${f.titulo}|${f.hora_inicio}|${f.hora_fin}`;
    if (!grupos.has(clave)) grupos.set(clave, { clave, titulo: f.titulo, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin, dias: [], ids: [] });
    grupos.get(clave).dias.push(f.dia_semana);
    grupos.get(clave).ids.push(f.id);
  }
  return [...grupos.values()];
};

// "lun 9: 18:00–19:30, 20:00–21:00"
const resumirBloques = (bloques) => {
  const porDia = new Map();
  for (const b of bloques) {
    const dia = fechaDe(b.inicio);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(`${b.inicio.slice(11, 16)}–${b.fin.slice(11, 16)}`);
  }
  return [...porDia.entries()].map(([dia, horas]) => {
    const fecha = fechaLocal(dia);
    return `${DIAS_CORTOS[(fecha.getDay() + 6) % 7]} ${fecha.getDate()}: ${horas.join(', ')}`;
  });
};

export default function MiSemanaPage() {
  const [usuario] = useState(getUsuarioActual);
  const hoyISO = useSyncExternalStore(sinSuscripcion, hoyEnNavegador, () => null);
  const [semanasCorridas, setSemanasCorridas] = useState(0);
  const [alturaHora, setAlturaHora] = useState(48);
  const [modoVista, setModoVista] = useState('calendario'); // 'calendario' | 'lista'

  // ---------- datos de la semana ----------
  // Cada carga se identifica con `clave` (semana + versión): así se sabe si lo que hay en pantalla
  // corresponde a lo pedido sin tener que poner "cargando" a mano dentro del efecto.
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [confirmacion, setConfirmacion] = useState(null);

  const inicioSemana = hoyISO ? sumarDias(obtenerLunes(fechaLocal(hoyISO)), semanasCorridas * 7) : null;
  const lunesISO = inicioSemana ? fechaISO(inicioSemana) : null;
  const domingoISO = inicioSemana ? fechaISO(sumarDias(inicioSemana, 6)) : null;
  const clave = lunesISO ? `${lunesISO}#${version}` : null;
  const recargar = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!usuario || !clave) return;
    let vigente = true;
    Promise.all([listarEventos(lunesISO, domingoISO), listarDisponibilidad(), listarMetas(), obtenerPreferencias()])
      .then(([eventos, disponibilidad, metas, preferencias]) => {
        if (vigente) setDatos({ clave, eventos, disponibilidad, metas, preferencias });
      })
      .catch((err) => {
        if (vigente) setErrorCarga({ clave, mensaje: err.message });
      });
    return () => {
      vigente = false;
    };
  }, [usuario, clave, lunesISO, domingoISO]);

  useEffect(() => {
    if (!usuario) return;
    listarMaterias()
      .then(setMaterias)
      .catch(() => setMaterias([]));
  }, [usuario]);

  const error = errorCarga?.clave === clave ? errorCarga.mensaje : null;
  const actualizando = Boolean(clave) && datos?.clave !== clave && !error;

  const eventos = (datos?.eventos || []).map(aBloque);
  const disponibilidad = datos?.disponibilidad || [];
  const preferencias = datos?.preferencias || { hora_inicio: 8, hora_fin: 22 };
  const metas = (datos?.metas || []).filter((m) => !hoyISO || m.fecha >= hoyISO);
  const metaPorId = new Map((datos?.metas || []).map((m) => [m.id, m]));

  // ---------- grilla ----------
  const examenesDelDia = (fecha) => metas
    .filter((m) => m.fecha === fecha && m.hora)
    .map((m) => {
      const inicio = horaDeTexto(m.hora);
      return { id: `meta-${m.id}`, start: inicio, end: Math.min(24, inicio + DURACION_EXAMEN), title: `Parcial ${m.materia}`, type: 'exam' };
    });

  const dias = inicioSemana
    ? Array.from({ length: 7 }, (_, id) => {
        const fecha = sumarDias(inicioSemana, id);
        const iso = fechaISO(fecha);
        return {
          id,
          fechaISO: iso,
          nombre: `${nombreCortoDia(fecha)} ${fecha.getDate()}`,
          hoy: iso === hoyISO,
          parcial: metas.some((m) => m.fecha === iso),
          propios: [...eventos.filter((e) => e.fecha === iso), ...examenesDelDia(iso)],
          fijos: disponibilidad
            .filter((d) => d.dia_semana === id)
            .map((d) => ({
              id: `disp-${d.id}`, start: horaDeTexto(d.hora_inicio), end: horaDeTexto(d.hora_fin), title: d.titulo, type: 'work',
            })),
        };
      })
    : [];

  // la grilla muestra al menos de 8 a 22, y se estira si la franja o algún evento queda afuera
  const propios = dias.flatMap((d) => d.propios);
  const HORA_INICIO = Math.floor(Math.min(8, preferencias.hora_inicio, ...propios.map((e) => e.start)));
  const HORA_FIN = Math.ceil(Math.max(22, preferencias.hora_fin, ...propios.map((e) => e.end)));
  const HORAS_GUIA = [];
  for (let h = Math.ceil(HORA_INICIO / 2) * 2; h < HORA_FIN; h += 2) HORAS_GUIA.push(h);
  const alturaTotal = (HORA_FIN - HORA_INICIO) * alturaHora;

  // los compromisos fijos se recortan a lo que muestra la grilla (ej. "Dormir de 0 a 8")
  const itemsDelDia = (dia) => [
    ...dia.fijos
      .map((f) => ({ ...f, start: Math.max(f.start, HORA_INICIO), end: Math.min(f.end, HORA_FIN) }))
      .filter((f) => f.end > f.start),
    ...dia.propios,
  ].sort((a, b) => a.start - b.start);

  useEffect(() => {
    const ajustarAltura = () => {
      setAlturaHora(Math.max(40, Math.min(64, Math.round((window.innerHeight - 208) / (HORA_FIN - HORA_INICIO)))));
    };
    ajustarAltura();
    window.addEventListener('resize', ajustarAltura);
    return () => window.removeEventListener('resize', ajustarAltura);
  }, [HORA_INICIO, HORA_FIN]);

  const rangoSemana = inicioSemana ? formatearRangoSemana(inicioSemana) : 'Cargando semana...';

  // ---------- bloque en foco: completar y reprogramar ----------
  const [bloqueFocoId, setBloqueFocoId] = useState(null);
  const [ocupadoFoco, setOcupadoFoco] = useState(false);
  const [mensajeFoco, setMensajeFoco] = useState(null); // { tipo, texto }
  const bloqueFoco = eventos.find((e) => e.id === bloqueFocoId && e.type !== 'work') || null;

  const enfocar = (evento) => {
    if (evento.type !== 'study' && evento.type !== 'done') return;
    setBloqueFocoId(evento.id);
    setMensajeFoco(null);
  };

  const describirHorario = (bloque) => {
    const dia = formatearDiaHumano(bloque.fecha);
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, de ${formatearHora(bloque.start)} a ${formatearHora(bloque.end)} hs`;
  };

  const alternarCompletado = async () => {
    if (!bloqueFoco || ocupadoFoco) return;
    setOcupadoFoco(true);
    setMensajeFoco(null);
    try {
      await marcarCompletado(bloqueFoco.id, !bloqueFoco.completado);
      recargar();
    } catch (err) {
      setMensajeFoco({ tipo: 'error', texto: err.message });
    } finally {
      setOcupadoFoco(false);
    }
  };

  const pasarAOtroDia = async () => {
    if (!bloqueFoco || ocupadoFoco) return;
    setOcupadoFoco(true);
    setMensajeFoco(null);
    try {
      const movido = aBloque(await reprogramar(bloqueFoco.id));
      setMensajeFoco({ tipo: 'ok', texto: `Listo: lo pasamos al ${describirHorario(movido).replace(/^./, (l) => l.toLowerCase())}.` });
      recargar();
    } catch (err) {
      setMensajeFoco({ tipo: 'error', texto: err.message });
    } finally {
      setOcupadoFoco(false);
    }
  };

  // ---------- modal de horarios: franja + compromisos fijos ----------
  const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);
  const [franja, setFranja] = useState({ hora_inicio: 8, hora_fin: 22 });
  const [tipoCompromiso, setTipoCompromiso] = useState('Trabajo');
  const [diaCompromiso, setDiaCompromiso] = useState('habiles');
  const [inicioCompromiso, setInicioCompromiso] = useState(9);
  const [finCompromiso, setFinCompromiso] = useState(18);
  const [mensajeHorarios, setMensajeHorarios] = useState(null);
  const [ocupadoHorarios, setOcupadoHorarios] = useState(false);

  const abrirHorarios = () => {
    setFranja({ hora_inicio: preferencias.hora_inicio, hora_fin: preferencias.hora_fin });
    setMensajeHorarios(null);
    setModalHorariosAbierto(true);
  };

  const ejecutarEnHorarios = async (accion, textoOk) => {
    setOcupadoHorarios(true);
    setMensajeHorarios(null);
    try {
      await accion();
      setMensajeHorarios({ tipo: 'ok', texto: textoOk });
      recargar();
    } catch (err) {
      setMensajeHorarios({ tipo: 'error', texto: err.message });
    } finally {
      setOcupadoHorarios(false);
    }
  };

  const handleGuardarFranja = (e) => {
    e.preventDefault();
    if (franja.hora_fin <= franja.hora_inicio) {
      setMensajeHorarios({ tipo: 'error', texto: 'La franja tiene que terminar después de empezar.' });
      return;
    }
    ejecutarEnHorarios(() => guardarPreferencias(franja), 'Franja guardada: los planes nuevos la van a respetar.');
  };

  const handleGuardarDisponibilidad = (e) => {
    e.preventDefault();
    if (!tipoCompromiso.trim()) {
      setMensajeHorarios({ tipo: 'error', texto: 'Ponele un nombre al compromiso.' });
      return;
    }
    if (finCompromiso <= inicioCompromiso) {
      setMensajeHorarios({ tipo: 'error', texto: 'La hora de fin debe ser posterior a la de inicio.' });
      return;
    }
    const diasDestino = diaCompromiso === 'habiles' ? [0, 1, 2, 3, 4]
      : diaCompromiso === 'todos' ? [0, 1, 2, 3, 4, 5, 6] : [Number(diaCompromiso)];
    ejecutarEnHorarios(() => crearDisponibilidad({
      titulo: tipoCompromiso.trim(),
      dias: diasDestino,
      hora_inicio: aTextoHora(inicioCompromiso),
      hora_fin: aTextoHora(finCompromiso),
    }), `“${tipoCompromiso.trim()}” agregado.`);
  };

  const handleBorrarCompromiso = (grupo) => {
    ejecutarEnHorarios(
      () => Promise.all(grupo.ids.map((id) => borrarDisponibilidad(id))),
      `“${grupo.titulo}” borrado.`,
    );
  };

  // ---------- modal de meta de examen ----------
  const [modalExamenAbierto, setModalExamenAbierto] = useState(false);
  const [examenEnEdicion, setExamenEnEdicion] = useState(null);
  const [materiaMetaId, setMateriaMetaId] = useState(null);
  const [fechaMeta, setFechaMeta] = useState('');
  const [horaMeta, setHoraMeta] = useState('');
  const [unidadesMeta, setUnidadesMeta] = useState([]);
  const [errorMeta, setErrorMeta] = useState(null);
  const [ocupadoMeta, setOcupadoMeta] = useState(false);
  const materiaElegida = materias.find((m) => m.id === materiaMetaId);

  const abrirCrearExamen = () => {
    const primera = materias[0];
    setExamenEnEdicion(null);
    setMateriaMetaId(primera?.id ?? null);
    setFechaMeta('');
    setHoraMeta('');
    setUnidadesMeta(primera?.unidades?.length ? [primera.unidades[0].id] : []);
    setErrorMeta(null);
    setModalExamenAbierto(true);
  };

  const abrirEditarExamen = (meta) => {
    setExamenEnEdicion(meta);
    setMateriaMetaId(meta.materia_id);
    setFechaMeta(meta.fecha);
    setHoraMeta(meta.hora ? meta.hora.slice(0, 5) : '');
    setUnidadesMeta(meta.unidades.map((u) => u.id));
    setErrorMeta(null);
    setModalExamenAbierto(true);
  };

  const alternarUnidadMeta = (unidadId) => {
    setUnidadesMeta((prev) => (prev.includes(unidadId) ? prev.filter((u) => u !== unidadId) : [...prev, unidadId]));
  };

  const handleGuardarExamen = async (e) => {
    e.preventDefault();
    if (!materiaMetaId) {
      setErrorMeta('Elegí una materia.');
      return;
    }
    if (!fechaMeta) {
      setErrorMeta('Por favor seleccioná la fecha del examen.');
      return;
    }
    if (hoyISO && fechaMeta < hoyISO) {
      setErrorMeta('La fecha del examen ya pasó.');
      return;
    }
    if (unidadesMeta.length === 0) {
      setErrorMeta('Debés seleccionar al menos una unidad temática.');
      return;
    }
    setErrorMeta(null);
    setOcupadoMeta(true);
    const datosMeta = { materia_id: materiaMetaId, fecha: fechaMeta, hora: horaMeta || null, unidad_ids: unidadesMeta };
    try {
      if (examenEnEdicion) {
        await editarMeta(examenEnEdicion.id, datosMeta);
      } else {
        await crearMeta(datosMeta);
      }
      setModalExamenAbierto(false);
      setAviso({ tipo: 'ok', texto: examenEnEdicion ? 'Meta actualizada.' : 'Meta creada. Ahora podés armar su plan de estudio.' });
      recargar();
    } catch (err) {
      setErrorMeta(err.message);
    } finally {
      setOcupadoMeta(false);
    }
  };

  const pedirEliminarExamen = (meta) => {
    setConfirmacion({
      titulo: 'Eliminar meta de examen',
      mensaje: `Se borra el parcial de ${meta.materia} y también sus ${meta.bloques_total} bloques de estudio agendados.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
      accion: async () => {
        try {
          await borrarMeta(meta.id);
          setModalExamenAbierto(false);
          // sus bloques ya no existen: el panel de foco no puede seguir hablando de ellos
          setBloqueFocoId(null);
          setMensajeFoco(null);
          setAviso({ tipo: 'ok', texto: 'Meta eliminada junto con sus bloques.' });
          recargar();
        } catch (err) {
          setAviso({ tipo: 'error', texto: err.message });
        }
      },
    });
  };

  // ---------- modal "Armar plan" ----------
  const [planMeta, setPlanMeta] = useState(null);
  const [horasPlan, setHorasPlan] = useState('6');
  const [opcionesPlan, setOpcionesPlan] = useState(null);
  const [mensajePlan, setMensajePlan] = useState(null);
  const [ocupadoPlan, setOcupadoPlan] = useState(false);

  const abrirPlan = (meta) => {
    setPlanMeta(meta);
    setOpcionesPlan(null);
    setMensajePlan(null);
  };

  const buscarOpciones = async (avisoPrevio = null) => {
    const horas = Number(horasPlan);
    if (!horas || horas <= 0 || horas > 100) {
      setMensajePlan({ tipo: 'error', texto: 'Poné cuántas horas querés estudiar (entre 0,5 y 100).' });
      return;
    }
    setOcupadoPlan(true);
    setMensajePlan(avisoPrevio);
    try {
      const respuesta = await pedirPlanes({ meta_id: planMeta.id, horas });
      setOpcionesPlan(respuesta.opciones);
    } catch (err) {
      setOpcionesPlan(null);
      setMensajePlan({ tipo: 'error', texto: err.message });
    } finally {
      setOcupadoPlan(false);
    }
  };

  const elegirOpcion = async (opcion) => {
    setOcupadoPlan(true);
    setMensajePlan(null);
    try {
      await confirmarPlan({ meta_id: planMeta.id, bloques: opcion.bloques });
      setPlanMeta(null);
      setAviso({ tipo: 'ok', texto: `Plan ${opcion.nombre} agendado: ${opcion.bloques.length} bloques de estudio.` });
      recargar();
      setOcupadoPlan(false);
    } catch (err) {
      setOcupadoPlan(false);
      if (err.status === 409) {
        // la agenda cambió desde que se armaron las opciones: se piden de nuevo
        await buscarOpciones({ tipo: 'error', texto: `${err.message} Te mostramos opciones nuevas.` });
      } else {
        setMensajePlan({ tipo: 'error', texto: err.message });
      }
    }
  };

  // ---------- sugerencias de grupo (usa la agenda real de la semana) ----------
  const usuarioActual = {
    ...estudiantesDemo[0],
    agenda: dias.flatMap((dia) => itemsDelDia(dia).map((ev) => ({ dia: dia.id, inicio: ev.start, fin: ev.end }))),
  };

  const compromisos = agruparCompromisos(disponibilidad);

  const renderEvento = (evento, dia, enLista) => {
    const esEstudio = evento.type === 'study' || evento.type === 'done';
    const enFoco = esEstudio && evento.id === bloqueFocoId;
    const comun = {
      ...getBlockStyle(evento.type),
      cursor: esEstudio ? 'pointer' : 'default',
      outline: enFoco ? '2px solid var(--accent-purple)' : 'none',
    };
    const props = esEstudio
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: () => enfocar(evento),
          onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && enfocar(evento),
          title: 'Clic para ver el bloque',
        }
      : {};
    const titulo = evento.type === 'done' ? `${evento.title} ✓` : evento.title;

    if (enLista) {
      return (
        <div key={evento.id} {...props} style={{ ...comun, padding: '6px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', display: 'block', opacity: 0.85 }}>{formatearHora(evento.start)} - {formatearHora(evento.end)} hs</span>
            <span style={{ fontSize: '13px' }}>{titulo}</span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
            {evento.type === 'done' ? '✓ Listo' : evento.type === 'study' ? 'Estudio' : evento.type === 'exam' ? 'Examen' : 'Fijo'}
          </span>
        </div>
      );
    }

    const top = ((evento.start - HORA_INICIO) * alturaHora) + 2;
    const height = ((evento.end - evento.start) * alturaHora) - 4;
    return (
      <div
        key={evento.id}
        {...props}
        style={{
          ...comun, position: 'absolute', left: '4px', right: '4px', top: `${top}px`, height: `${Math.max(height, 14)}px`,
          borderRadius: '6px', padding: '6px', fontSize: '12px', lineHeight: 1.25, overflow: 'hidden', overflowWrap: 'anywhere',
          zIndex: esEstudio || evento.type === 'exam' ? 1 : 0,
        }}
      >
        {titulo}
      </div>
    );
  };

  return (
    <div className="week-page">
      <header className="week-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Tu semana
          </h1>

          <div style={{
            display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)', borderRadius: '8px', padding: '3px', gap: '4px',
          }}>
            {['calendario', 'lista'].map((modo) => (
              <button
                key={modo}
                type="button"
                onClick={() => setModoVista(modo)}
                style={{
                  border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px',
                  fontWeight: modoVista === modo ? '600' : '500',
                  backgroundColor: modoVista === modo ? 'var(--accent-purple)' : 'transparent',
                  color: modoVista === modo ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {modo === 'calendario' ? 'Calendario' : 'Lista'}
              </button>
            ))}
          </div>
        </div>

        <div className="week-navigation">
          <button aria-label="Semana anterior" onClick={() => setSemanasCorridas((s) => s - 1)}>&lt;</button>
          <span>{rangoSemana}</span>
          <button aria-label="Semana siguiente" onClick={() => setSemanasCorridas((s) => s + 1)}>&gt;</button>
        </div>

        <button className="week-hours-button" onClick={abrirHorarios} style={{ cursor: 'pointer' }}>
          Cambiar mis horarios
        </button>
      </header>

      {error && (
        <div role="alert" style={{ ...estiloError, fontSize: '13px', padding: '10px 12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span>No se pudo cargar tu semana: {error}</span>
          <button type="button" onClick={recargar} style={{ ...estiloBotonPeligro, padding: '4px 10px' }}>Reintentar</button>
        </div>
      )}
      {aviso && (
        <div role="status" style={{ ...(aviso.tipo === 'ok' ? estiloOk : estiloError), fontSize: '13px', padding: '10px 12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span>{aviso.texto}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div className="week-layout">
        <section className="week-calendar-card" aria-label="Calendario semanal" aria-busy={actualizando} style={{ opacity: actualizando && datos ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          {!inicioSemana || (!datos && !error) ? (
            <p className="week-loading">Cargando calendario...</p>
          ) : modoVista === 'calendario' ? (
            <div className="week-calendar-scroll">
              <div className="week-calendar">
                <div className="week-days-header">
                  <div aria-hidden="true"></div>
                  {dias.map((dia) => (
                    <div key={dia.id} className={`week-day-header ${dia.hoy ? 'is-today' : ''} ${dia.parcial ? 'has-exam' : ''}`}>
                      <span>{dia.hoy ? 'Hoy' : dia.parcial ? 'Parcial' : ' '}</span>
                      <strong>{dia.nombre}</strong>
                    </div>
                  ))}
                </div>

                <div className="week-time-grid" style={{ height: `${alturaTotal}px` }}>
                  <div className="week-time-labels">
                    {HORAS_GUIA.map((hora) => (
                      <span key={hora} style={{ top: `${Math.max(4, (hora - HORA_INICIO) * alturaHora - 7)}px` }}>
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
                        backgroundPositionY: `${((Math.ceil(HORA_INICIO / 2) * 2) - HORA_INICIO) * alturaHora}px`,
                      }}
                    >
                      {itemsDelDia(dia).map((evento) => renderEvento(evento, dia, false))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Vista Lista Cronológica (SCRUM-41) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: `${alturaTotal}px`, overflowY: 'auto', padding: '12px' }}>
              {dias.map((dia) => {
                const items = itemsDelDia(dia);
                return (
                  <div key={dia.id} style={{ backgroundColor: dia.hoy ? '#FAF4EC' : 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{dia.nombre}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{items.length} actividades</span>
                    </div>
                    {items.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin actividades</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {items.map((ev) => renderEvento(ev, dia, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="week-side-panels">
          <div style={estiloTarjeta}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Bloque en foco</h3>
            {bloqueFoco ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{describirHorario(bloqueFoco)}</span>
                <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{bloqueFoco.title}</p>
                {metaPorId.get(bloqueFoco.metaId) && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Para el parcial del {formatearDiaHumano(metaPorId.get(bloqueFoco.metaId).fecha)}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={alternarCompletado}
                    disabled={ocupadoFoco}
                    style={deshabilitado({
                      flex: 1, backgroundColor: bloqueFoco.completado ? '#C5E2BA' : '#E0ECD9', border: '1px solid #C4D8B8',
                      color: '#275E10', borderRadius: '8px', padding: '8px 10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                    }, ocupadoFoco)}
                  >
                    {bloqueFoco.completado ? 'Completado ✓' : 'Listo'}
                  </button>
                  <button
                    type="button"
                    onClick={pasarAOtroDia}
                    disabled={ocupadoFoco || bloqueFoco.completado}
                    title={bloqueFoco.completado ? 'Ya está completado' : 'Lo movemos al primer hueco libre'}
                    style={deshabilitado({
                      flex: 1, backgroundColor: '#EBE0D2', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                      borderRadius: '8px', padding: '8px 10px', fontWeight: '600', fontSize: '12px',
                      cursor: bloqueFoco.completado ? 'not-allowed' : 'pointer', opacity: bloqueFoco.completado ? 0.5 : 1,
                    }, ocupadoFoco)}
                  >
                    {ocupadoFoco ? 'Un momento…' : 'Pasar a otro día'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Tocá un bloque de estudio del calendario para marcarlo como listo o pasarlo a otro día.
              </p>
            )}
            {mensajeFoco && (
              <div role={mensajeFoco.tipo === 'error' ? 'alert' : 'status'} style={{ ...(mensajeFoco.tipo === 'ok' ? estiloOk : estiloError), marginTop: '10px' }}>
                {mensajeFoco.texto}
              </div>
            )}
          </div>

          <div style={estiloTarjeta}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Parciales</h3>
              <button type="button" onClick={abrirCrearExamen} style={estiloLink}>+ Agregar examen</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {datos && metas.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  No tenés exámenes cargados. Agregá uno para armar tu plan de estudio.
                </p>
              )}
              {metas.map((meta) => {
                const progreso = meta.bloques_total ? (meta.bloques_completados / meta.bloques_total) * 100 : 0;
                return (
                  <div key={meta.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => abrirEditarExamen(meta)}
                        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                        title="Clic para editar examen"
                      >
                        Parcial de {meta.materia}, {formatearDiaHumano(meta.fecha)}{meta.hora ? ` a las ${meta.hora.slice(0, 5)}` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => pedirEliminarExamen(meta)}
                        style={{ background: 'none', border: 'none', color: '#9B1C1C', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
                        aria-label={`Eliminar parcial de ${meta.materia}`}
                        title="Eliminar examen"
                      >
                        ✕
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {meta.unidades.map((u) => `U${u.numero_unidad}`).join(', ')}
                    </span>
                    <div style={{ height: '8px', borderRadius: '999px', backgroundColor: '#EAE2D5', overflow: 'hidden' }}>
                      <div style={{ width: `${progreso}%`, height: '100%', backgroundColor: colorDeMateria(meta.materia_id), borderRadius: '999px' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                        {meta.bloques_total ? `${meta.bloques_completados}/${meta.bloques_total} bloques` : 'Sin plan todavía'}
                      </span>
                      <button type="button" onClick={() => abrirPlan(meta)} style={estiloLink}>
                        {meta.bloques_total ? 'Sumar horas' : 'Armar plan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <SugerenciasEstudio usuarioActual={usuarioActual} estudiantes={estudiantesDemo} />
        </aside>
      </div>

      {/* SCRUM-37 / SCRUM-87: franja para estudiar y compromisos semanales fijos */}
      {modalHorariosAbierto && (
        <Modal titulo="Mis horarios" subtitulo="Cuándo querés estudiar y qué compromisos fijos tenés cada semana." ancho="420px">
          <form onSubmit={handleGuardarFranja} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={estiloLabel}>Estudio entre</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select aria-label="Estudiar desde" value={franja.hora_inicio} onChange={(e) => setFranja((f) => ({ ...f, hora_inicio: Number(e.target.value) }))} style={estiloInput}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00 hs</option>)}
              </select>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>y</span>
              <select aria-label="Estudiar hasta" value={franja.hora_fin} onChange={(e) => setFranja((f) => ({ ...f, hora_fin: Number(e.target.value) }))} style={estiloInput}>
                {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{h}:00 hs</option>)}
              </select>
              <button type="submit" disabled={ocupadoHorarios} style={deshabilitado({ ...estiloBotonPrimario, flex: 'none' }, ocupadoHorarios)}>Guardar</button>
            </div>
          </form>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={estiloLabel}>Compromisos fijos</span>
            {compromisos.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Todavía no cargaste ninguno.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {compromisos.map((g) => (
                  <li key={g.clave} style={{ ...getBlockStyle('work'), borderRadius: '6px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span>
                      <strong>{g.titulo}</strong> · {g.dias.sort((a, b) => a - b).map((d) => DIAS_CORTOS[d]).join(', ')} · {g.hora_inicio.slice(0, 5)} a {g.hora_fin.slice(0, 5)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBorrarCompromiso(g)}
                      disabled={ocupadoHorarios}
                      aria-label={`Borrar ${g.titulo}`}
                      style={{ background: 'none', border: 'none', color: '#9B1C1C', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleGuardarDisponibilidad} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <div>
              <label htmlFor="compromiso-nombre" style={estiloLabel}>Nuevo compromiso</label>
              <input
                id="compromiso-nombre"
                type="text"
                value={tipoCompromiso}
                onChange={(e) => setTipoCompromiso(e.target.value)}
                placeholder="Ej: Trabajo, Cursada, Gimnasio..."
                maxLength={100}
                style={estiloInput}
              />
            </div>

            <div>
              <label htmlFor="compromiso-dias" style={estiloLabel}>Días</label>
              <select id="compromiso-dias" value={diaCompromiso} onChange={(e) => setDiaCompromiso(e.target.value)} style={estiloInput}>
                <option value="habiles">Lunes a Viernes (días hábiles)</option>
                <option value="todos">Todos los días</option>
                {NOMBRES_DIAS.map((dia, idx) => <option key={idx} value={idx}>Todos los {dia}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label htmlFor="compromiso-desde" style={estiloLabel}>Desde</label>
                <select id="compromiso-desde" value={inicioCompromiso} onChange={(e) => setInicioCompromiso(Number(e.target.value))} style={estiloInput}>
                  {MEDIAS_HORAS.slice(0, -1).map((h) => <option key={h} value={h}>{formatearHora(h)} hs</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="compromiso-hasta" style={estiloLabel}>Hasta</label>
                <select id="compromiso-hasta" value={finCompromiso} onChange={(e) => setFinCompromiso(Number(e.target.value))} style={estiloInput}>
                  {MEDIAS_HORAS.slice(1).map((h) => <option key={h} value={h}>{formatearHora(h)} hs</option>)}
                </select>
              </div>
            </div>

            {mensajeHorarios && (
              <div role={mensajeHorarios.tipo === 'error' ? 'alert' : 'status'} style={mensajeHorarios.tipo === 'ok' ? estiloOk : estiloError}>
                {mensajeHorarios.texto}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button type="button" onClick={() => setModalHorariosAbierto(false)} style={estiloBotonSecundario}>Cerrar</button>
              <button type="submit" disabled={ocupadoHorarios} style={deshabilitado(estiloBotonPrimario, ocupadoHorarios)}>Agregar compromiso</button>
            </div>
          </form>
        </Modal>
      )}

      {/* SCRUM-38 / SCRUM-88: meta de examen */}
      {modalExamenAbierto && (
        <Modal
          titulo={examenEnEdicion ? 'Editar meta de examen' : 'Nueva meta de examen'}
          subtitulo={examenEnEdicion
            ? 'Modificá la fecha o las unidades a evaluar.'
            : 'Después vas a poder armar un plan de estudio hasta el día anterior.'}
        >
          {materias.length === 0 ? (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                Primero creá una materia con sus unidades en <a href="/materias" style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Mis materias</a>.
              </p>
              <button type="button" onClick={() => setModalExamenAbierto(false)} style={estiloBotonSecundario}>Cerrar</button>
            </>
          ) : (
            <form onSubmit={handleGuardarExamen} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label htmlFor="meta-materia" style={estiloLabel}>Materia</label>
                <select
                  id="meta-materia"
                  value={materiaMetaId ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const mat = materias.find((m) => m.id === id);
                    setMateriaMetaId(id);
                    setUnidadesMeta(mat?.unidades?.length ? [mat.unidades[0].id] : []);
                  }}
                  style={estiloInput}
                >
                  {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <div>
                  <label htmlFor="meta-fecha" style={estiloLabel}>Fecha del examen</label>
                  <input id="meta-fecha" type="date" value={fechaMeta} min={hoyISO ?? undefined} onChange={(e) => setFechaMeta(e.target.value)} style={estiloInput} />
                </div>
                <div>
                  <label htmlFor="meta-hora" style={estiloLabel}>Horario (opcional)</label>
                  <select id="meta-hora" value={horaMeta} onChange={(e) => setHoraMeta(e.target.value)} style={estiloInput}>
                    <option value="">Sin horario</option>
                    {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => {
                      const texto = `${String(h).padStart(2, '0')}:00`;
                      return <option key={h} value={texto}>{h}:00 hs</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <span style={{ ...estiloLabel, marginBottom: '6px' }}>Unidades a evaluar</span>
                {materiaElegida?.unidades?.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[...materiaElegida.unidades].sort((a, b) => a.numero_unidad - b.numero_unidad).map((u) => {
                      const seleccionada = unidadesMeta.includes(u.id);
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => alternarUnidadMeta(u.id)}
                          aria-pressed={seleccionada}
                          title={u.nombre_tema}
                          style={{
                            border: `1px solid ${seleccionada ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                            backgroundColor: seleccionada ? 'var(--accent-purple)' : 'var(--bg-page)',
                            color: seleccionada ? '#FFFFFF' : 'var(--text-primary)',
                            borderRadius: '6px', padding: '4px 10px', fontSize: '12px',
                            fontWeight: seleccionada ? 'bold' : 'normal', cursor: 'pointer',
                          }}
                        >
                          Unidad {u.numero_unidad}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Esta materia no tiene unidades cargadas.</p>
                )}
              </div>

              {errorMeta && <div role="alert" style={estiloError}>{errorMeta}</div>}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {examenEnEdicion && (
                  <button type="button" onClick={() => pedirEliminarExamen(examenEnEdicion)} style={estiloBotonPeligro}>Eliminar</button>
                )}
                <button type="button" onClick={() => setModalExamenAbierto(false)} style={estiloBotonSecundario}>Cancelar</button>
                <button type="submit" disabled={ocupadoMeta} style={deshabilitado(estiloBotonPrimario, ocupadoMeta)}>
                  {examenEnEdicion ? 'Guardar cambios' : 'Guardar meta'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* SCRUM-42: armar el plan de estudio de una meta (3 opciones) */}
      {planMeta && (
        <Modal
          titulo={`Plan para el parcial de ${planMeta.materia}`}
          subtitulo={`Hasta el ${formatearDiaHumano(planMeta.fecha)}, sin pisar tu agenda ni tus horarios fijos.`}
          ancho="520px"
        >
          {planMeta.bloques_total > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Esta meta ya tiene {planMeta.bloques_total} bloques agendados: lo que elijas ahora se suma.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              buscarOpciones();
            }}
            style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}
          >
            <div style={{ flex: 1 }}>
              <label htmlFor="plan-horas" style={estiloLabel}>¿Cuántas horas querés estudiar en total?</label>
              <input id="plan-horas" type="number" min="0.5" max="100" step="0.5" value={horasPlan} onChange={(e) => setHorasPlan(e.target.value)} style={estiloInput} />
            </div>
            <button type="submit" disabled={ocupadoPlan} style={deshabilitado({ ...estiloBotonPrimario, flex: 'none' }, ocupadoPlan)}>
              {ocupadoPlan && !opcionesPlan ? 'Buscando…' : 'Ver opciones'}
            </button>
          </form>

          {mensajePlan && (
            <div role={mensajePlan.tipo === 'error' ? 'alert' : 'status'} style={mensajePlan.tipo === 'ok' ? estiloOk : estiloError}>
              {mensajePlan.texto}
            </div>
          )}

          {opcionesPlan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {opcionesPlan.map((opcion) => (
                <div key={opcion.nombre} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{opcion.nombre}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {opcion.horas_planificadas} h en {opcion.dias_de_estudio} {opcion.dias_de_estudio === 1 ? 'día' : 'días'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{opcion.descripcion}</span>
                  {!opcion.completo && (
                    <div style={estiloError}>
                      {opcion.bloques.length === 0
                        ? 'No hay lugar libre en tu agenda antes del examen.'
                        : `Con tu agenda entran ${opcion.horas_planificadas} h: faltan ${opcion.faltan_horas} h. Probá con menos horas o liberá algún horario.`}
                    </div>
                  )}
                  {opcion.bloques.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                      {resumirBloques(opcion.bloques).map((linea) => <li key={linea}>{linea}</li>)}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => elegirOpcion(opcion)}
                    disabled={ocupadoPlan || opcion.bloques.length === 0}
                    style={deshabilitado({ ...estiloBotonPrimario, alignSelf: 'flex-end', flex: 'none', opacity: opcion.bloques.length === 0 ? 0.5 : 1 }, ocupadoPlan)}
                  >
                    Elegir {opcion.nombre}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => setPlanMeta(null)} style={estiloBotonSecundario}>Cerrar</button>
        </Modal>
      )}

      <DialogoConfirmacion confirmacion={confirmacion} onCerrar={() => setConfirmacion(null)} />
    </div>
  );
}
