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
