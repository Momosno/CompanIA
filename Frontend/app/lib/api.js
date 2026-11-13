export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CLAVE_USUARIO = 'compania_usuario_actual';

// Devuelve siempre el mismo objeto mientras no cambie lo guardado (lo exige useSyncExternalStore)
let guardadoCache = null;
let usuarioCache = null;

export function getUsuarioActual() {
  try {
    const guardado = localStorage.getItem(CLAVE_USUARIO);
    if (guardado !== guardadoCache) {
      usuarioCache = guardado ? JSON.parse(guardado) : null;
      guardadoCache = guardado;
    }
    return usuarioCache;
  } catch {
    return null;
  }
}

export function setUsuarioActual({ id, nombre }) {
  try {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify({ id, nombre }));
  } catch (err) {
    console.warn('No se pudo guardar el usuario actual:', err);
  }
}

// El backend responde `detail` como texto (errores nuestros) o como lista (validación de FastAPI)
function mensajeDeError(detail, status) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => String(d.msg || '').replace(/^Value error, /, '')).join(' · ');
  }
  return `Algo salió mal (error ${status}). Probá de nuevo.`;
}

// Llama a /usuarios/{id}{ruta} del usuario actual. Si falla, tira un Error con el mensaje del
// backend y el código en `error.status` (0 si no se pudo conectar).
export async function pedirApi(ruta, { method = 'GET', body } = {}) {
  const usuario = getUsuarioActual();
  if (!usuario) throw new Error('No hay un usuario seleccionado.');

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/usuarios/${usuario.id}${ruta}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error('No se pudo conectar con el servidor. ¿Está levantado el backend?');
    error.status = 0;
    throw error;
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = new Error(mensajeDeError(datos?.detail, respuesta.status));
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

// Lee una respuesta text/event-stream y llama a alRecibir(evento, datos) por cada evento
export async function leerEventos(respuesta, alRecibir) {
  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  let pendiente = '';

  while (true) {
    const { done, value } = await lector.read();
    if (done) return;

    pendiente += decodificador.decode(value, { stream: true });
    const bloques = pendiente.split('\n\n');
    pendiente = bloques.pop();

    for (const bloque of bloques) {
      const lineas = bloque.split('\n');
      const evento = lineas.find((l) => l.startsWith('event: '))?.slice(7);
      const datos = lineas.find((l) => l.startsWith('data: '))?.slice(6);
      if (evento && datos) alRecibir(evento, JSON.parse(datos));
    }
  }
}
