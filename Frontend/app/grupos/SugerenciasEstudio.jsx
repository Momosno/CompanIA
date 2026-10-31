'use client';

import { useState } from 'react';
import { DIAS, sugerirCompaneros } from './matching';

const formatearHora = (hora) => {
  const minutosTotales = Math.round(hora * 60);
  const horas = Math.floor(minutosTotales / 60).toString().padStart(2, '0');
  const minutos = (minutosTotales % 60).toString().padStart(2, '0');
  return `${horas}:${minutos}`;
};

/** @param {{ usuarioActual: import('./estudiantes').Estudiante, estudiantes: import('./estudiantes').Estudiante[] }} props */
export default function SugerenciasEstudio({ usuarioActual, estudiantes }) {
  const [invitacionPreparada, setInvitacionPreparada] = useState(null);
  const sugerencias = sugerirCompaneros(usuarioActual, estudiantes);

  return (
    <section className="study-match-widget" aria-labelledby="study-matches-title">
      <div className="study-match-header">
        <h3 id="study-matches-title" className="study-match-title">
          Compañeros sugeridos
        </h3>
        <span className="study-match-count">
          {sugerencias.length}
        </span>
      </div>

      {sugerencias.length ? (
        <ul className="study-match-list">
          {sugerencias.map(({ estudiante, materiasCompartidas, horario }) => (
            <li key={estudiante.id} className="study-match-suggestion">
              <div className="study-match-student">
                <div
                  className="study-match-avatar"
                  style={{ color: estudiante.color, backgroundColor: estudiante.bgInicial, borderColor: estudiante.color }}
                  aria-hidden="true"
                >
                  {estudiante.inicial}
                </div>
                <div className="study-match-student-details">
                  <p className="study-match-student-name">{estudiante.nombre}</p>
                  <span className="study-match-subject">
                    {materiasCompartidas[0]}
                  </span>
                </div>
              </div>

              <div className="study-match-time">
                <span>Coinciden</span>
                <strong>
                  {DIAS[horario.dia]} {formatearHora(horario.inicio)} - {formatearHora(horario.fin)}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => setInvitacionPreparada(estudiante.nombre)}
                className="study-match-invite"
              >
                Coordinar estudio
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="study-match-empty">
          Todavía no hay compañeros con materias y horarios compatibles.
        </p>
      )}

      {invitacionPreparada && (
        <p className="study-match-status" role="status" aria-live="polite">
          Invitación preparada para coordinar con {invitacionPreparada}.
        </p>
      )}
    </section>
  );
}