import { pedirApi as pedir } from './api';

// ---------- llamadas a la API de agenda (/usuarios/{id}/agenda/...) ----------

const conParametros = (ruta, parametros) => {
  const query = new URLSearchParams(Object.entries(parametros).filter(([, v]) => v != null));
  return query.toString() ? `${ruta}?${query}` : ruta;
};

// eventos (ocupados y bloques de estudio)
export const listarEventos = (desde, hasta) => pedir(conParametros('/agenda/eventos', { desde, hasta }));
export const marcarCompletado = (eventoId, completado) =>
  pedir(`/agenda/eventos/${eventoId}`, { method: 'PATCH', body: { completado } });
export const reprogramar = (eventoId, desde = null) =>
  pedir(`/agenda/eventos/${eventoId}/reprogramar`, { method: 'POST', body: desde ? { desde } : {} });

// disponibilidad semanal (compromisos fijos)
export const listarDisponibilidad = () => pedir('/agenda/disponibilidad');
export const crearDisponibilidad = ({ titulo, dias, hora_inicio, hora_fin }) =>
  pedir('/agenda/disponibilidad', { method: 'POST', body: { titulo, dias, hora_inicio, hora_fin } });
export const borrarDisponibilidad = (id) => pedir(`/agenda/disponibilidad/${id}`, { method: 'DELETE' });

// franja horaria para estudiar
export const obtenerPreferencias = () => pedir('/agenda/preferencias');
export const guardarPreferencias = ({ hora_inicio, hora_fin }) =>
  pedir('/agenda/preferencias', { method: 'PUT', body: { hora_inicio, hora_fin } });

// metas de examen
export const listarMetas = () => pedir('/agenda/metas');
export const crearMeta = ({ materia_id, fecha, hora, unidad_ids }) =>
  pedir('/agenda/metas', { method: 'POST', body: { materia_id, fecha, hora, unidad_ids } });
export const editarMeta = (id, cambios) => pedir(`/agenda/metas/${id}`, { method: 'PATCH', body: cambios });
export const borrarMeta = (id) => pedir(`/agenda/metas/${id}`, { method: 'DELETE' });

// planes de estudio
export const pedirPlanes = ({ meta_id, horas }) =>
  pedir('/agenda/planes', { method: 'POST', body: { meta_id, horas } });
export const confirmarPlan = ({ meta_id, bloques }) =>
  pedir('/agenda/estudio', { method: 'POST', body: { meta_id, bloques } });

// materias (con sus unidades), para el modal de metas
export const listarMaterias = () => pedir('/materias/');

// ---------- fechas ----------
// El backend devuelve las horas en hora argentina con zona: "2026-11-09T18:30:00-03:00".
// Se leen tal cual del texto para no depender de la zona horaria del navegador.

export const fechaISO = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

export const fechaDe = (iso) => iso.slice(0, 10);

export const horaDecimal = (iso) => Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60;

// "09:00:00" -> 9, "18:30:00" -> 18.5
export const horaDeTexto = (texto) => Number(texto.slice(0, 2)) + Number(texto.slice(3, 5)) / 60;

export const formatearHora = (horaDecimal) => {
  const horas = Math.floor(horaDecimal);
  const minutos = Math.round((horaDecimal - horas) * 60);
  return `${horas}:${String(minutos).padStart(2, '0')}`;
};

// "2026-11-09" -> Date local (sin corrimientos de zona)
export const fechaLocal = (iso) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

export const formatearDiaHumano = (iso) => {
  const fecha = fechaLocal(iso);
  const diaNombre = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(fecha);
  return `${diaNombre} ${fecha.getDate()}`;
};

// eventos que vienen del backend -> forma que usa la grilla
export const aBloque = (evento) => ({
  id: evento.id,
  fecha: fechaDe(evento.inicio),
  start: horaDecimal(evento.inicio),
  // si termina a las 00:00 del día siguiente, en la grilla va hasta las 24
  end: fechaDe(evento.fin) === fechaDe(evento.inicio) ? horaDecimal(evento.fin) : 24,
  title: evento.titulo,
  type: evento.tipo === 'estudio' ? (evento.completado ? 'done' : 'study') : 'work',
  metaId: evento.meta_id,
  materiaId: evento.materia_id,
  completado: evento.completado,
  inicio: evento.inicio,
  fin: evento.fin,
});
