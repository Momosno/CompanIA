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
