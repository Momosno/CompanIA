/** @typedef {{ nombre: string, activa: boolean }} MateriaEstudiante */
/** @typedef {{ dia: number, inicio: number, fin: number }} BloqueOcupado */
/**
 * @typedef {Object} Estudiante
 * @property {number} id
 * @property {string} nombre
 * @property {string} inicial
 * @property {string} color
 * @property {string} bgInicial
 * @property {string} materias
 * @property {MateriaEstudiante[]} materiasActivas
 * @property {BloqueOcupado[]} agenda
 * @property {boolean} esUltimaVez
 */

/** @type {Estudiante[]} */
export const estudiantesDemo = [
  {
    id: 1,
    nombre: 'Jimmy',
    materias: 'Análisis Matemático I, Física I',
    materiasActivas: [
      { nombre: 'Análisis Matemático I', activa: true },
      { nombre: 'Física I', activa: true },
      { nombre: 'Introducción a la Programación', activa: true },
    ],
    agenda: [],
    inicial: 'J',
    color: 'var(--accent-purple)',
    bgInicial: '#DFD7FA',
    esUltimaVez: true,
  },
  {
    id: 2,
    nombre: 'Sofía',
    materias: 'Análisis Matemático I, Química General',
    materiasActivas: [
      { nombre: 'Análisis Matemático I', activa: true },
      { nombre: 'Química General', activa: true },
    ],
    agenda: [
      { dia: 0, inicio: 9, fin: 18 },
      { dia: 1, inicio: 9, fin: 18 },
      { dia: 2, inicio: 9, fin: 20 },
      { dia: 3, inicio: 8, fin: 20.5 },
      { dia: 4, inicio: 9, fin: 20 },
    ],
    inicial: 'S',
    color: '#0D7A5F',
    bgInicial: '#D0F2E7',
    esUltimaVez: false,
  },
  {
    id: 3,
    nombre: 'Martín',
    materias: 'Todavía no cargó materias',
    materiasActivas: [],
    agenda: [],
    inicial: 'M',
    color: '#B45309',
    bgInicial: '#FDE68A',
    esUltimaVez: false,
  },
];