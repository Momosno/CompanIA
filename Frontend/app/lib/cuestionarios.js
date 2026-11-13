import { pedirApi } from './api';

// ---------- llamadas a la API de cuestionarios (/usuarios/{id}/cuestionarios/...) ----------
// Si fallan, tiran un Error con el `detail` del backend y el código en `error.status`.

export const listarMaterias = () => pedirApi('/materias/');

export const listarDocumentos = (materiaId) =>
  pedirApi(`/documentos/?${new URLSearchParams({ materia_id: materiaId })}`);

// Arma un cuestionario nuevo con IA (tarda: entre 5 s y 1 min según la cantidad)
export const generarCuestionario = ({ materia_id, unidad_ids, cantidad, dificultad }) =>
  pedirApi('/cuestionarios/', {
    method: 'POST',
    body: { materia_id, unidad_ids, cantidad, dificultad },
  });

// respuestas: [{ numero, marcadas: [posiciones] }]. No guarda nada.
export const corregirCuestionario = ({ materia_id, preguntas, respuestas }) =>
  pedirApi('/cuestionarios/corregir', {
    method: 'POST',
    body: { materia_id, preguntas, respuestas },
  });
