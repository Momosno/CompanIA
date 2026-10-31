const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * @typedef {import('./estudiantes').MateriaEstudiante} MateriaEstudiante
 * @typedef {import('./estudiantes').BloqueOcupado} BloqueOcupado
 * @typedef {import('./estudiantes').Estudiante} Estudiante
 * @typedef {{ dia: number, inicio: number, fin: number }} HorarioSugerido
 * @typedef {{ estudiante: Estudiante, materiasCompartidas: string[], horario: HorarioSugerido }} SugerenciaEstudio
 */

/** @param {BloqueOcupado[]} agenda @param {number} dia @param {number} horaInicio @param {number} horaFin */
function obtenerDisponibilidad(agenda, dia, horaInicio, horaFin) {
  const ocupados = agenda
    .filter((bloque) => bloque.dia === dia && bloque.fin > horaInicio && bloque.inicio < horaFin)
    .map((bloque) => ({
      inicio: Math.max(horaInicio, bloque.inicio),
      fin: Math.min(horaFin, bloque.fin),
    }))
    .sort((a, b) => a.inicio - b.inicio);

  const libres = [];
  let cursor = horaInicio;

  ocupados.forEach((bloque) => {
    if (bloque.inicio > cursor) libres.push({ inicio: cursor, fin: bloque.inicio });
    cursor = Math.max(cursor, bloque.fin);
  });

  if (cursor < horaFin) libres.push({ inicio: cursor, fin: horaFin });
  return libres;
}

/** @param {MateriaEstudiante[]} actuales @param {MateriaEstudiante[]} candidatas */
function encontrarMateriasCompartidas(actuales, candidatas) {
  const materiasActivas = new Set(
    actuales.filter((materia) => materia.activa).map((materia) => materia.nombre.trim().toLocaleLowerCase())
  );

  return candidatas
    .filter((materia) => materia.activa && materiasActivas.has(materia.nombre.trim().toLocaleLowerCase()))
    .map((materia) => materia.nombre);
}

/**
 * Sugiere estudiantes que comparten materias activas y al menos un bloque libre.
 * Los días usan el índice de la semana de "Tu semana": lunes = 0 y domingo = 6.
 *
 * @param {Estudiante} usuarioActual
 * @param {Estudiante[]} estudiantes
 * @param {{ horaInicio?: number, horaFin?: number, duracionMinima?: number, duracionMaxima?: number }} [opciones]
 * @returns {SugerenciaEstudio[]}
 */
export function sugerirCompaneros(usuarioActual, estudiantes, {
  horaInicio = 8,
  horaFin = 22,
  duracionMinima = 1,
  duracionMaxima = 2,
} = {}) {
  return estudiantes
    .filter((estudiante) => estudiante.id !== usuarioActual.id)
    .flatMap((estudiante) => {
      const materiasCompartidas = encontrarMateriasCompartidas(
        usuarioActual.materiasActivas,
        estudiante.materiasActivas
      );
      if (materiasCompartidas.length === 0) return [];

      let mejorHorario = null;
      for (let dia = 0; dia < DIAS.length; dia += 1) {
        const libresActual = obtenerDisponibilidad(usuarioActual.agenda, dia, horaInicio, horaFin);
        const libresEstudiante = obtenerDisponibilidad(estudiante.agenda, dia, horaInicio, horaFin);

        libresActual.forEach((bloqueActual) => {
          libresEstudiante.forEach((bloqueEstudiante) => {
            const inicio = Math.max(bloqueActual.inicio, bloqueEstudiante.inicio);
            const fin = Math.min(bloqueActual.fin, bloqueEstudiante.fin);
            if (fin - inicio < duracionMinima) return;

            const finSugerido = Math.min(fin, inicio + duracionMaxima);
            if (!mejorHorario || finSugerido - inicio > mejorHorario.fin - mejorHorario.inicio) {
              mejorHorario = { dia, inicio, fin: finSugerido };
            }
          });
        });
      }

      return mejorHorario ? [{ estudiante, materiasCompartidas, horario: mejorHorario }] : [];
    })
    .sort((a, b) => (b.horario.fin - b.horario.inicio) - (a.horario.fin - a.horario.inicio));
}

export { DIAS };