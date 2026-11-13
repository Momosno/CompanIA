'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DialogoConfirmacion from '../DialogoConfirmacion';
import { getUsuarioActual } from '../lib/api';
import {
  corregirCuestionario, generarCuestionario, listarDocumentos, listarMaterias,
} from '../lib/cuestionarios';

const LARGOS = [
  { cantidad: 5, nombre: 'Corto', espera: 'hasta 30 s' },
  { cantidad: 10, nombre: 'Mediano', espera: 'hasta 30 s' },
  { cantidad: 30, nombre: 'Largo', espera: 'hasta 1 min' },
];
const DIFICULTADES = [
  { valor: 'mixta', nombre: 'Mixta' },
  { valor: 'facil', nombre: 'Fácil' },
  { valor: 'media', nombre: 'Media' },
  { valor: 'dificil', nombre: 'Difícil' },
];
const NOMBRE_DIFICULTAD = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };
const LETRAS = ['A', 'B', 'C', 'D'];

const ordenarUnidades = (unidades) => [...(unidades || [])].sort((a, b) => a.numero_unidad - b.numero_unidad);

// cuántos documentos listos tiene cada unidad (clave: unidad_id; null = sin unidad)
function contarListos(documentos) {
  const cuenta = {};
  for (const d of documentos) {
    if (d.estado === 'ready') cuenta[d.unidad_id ?? 'sin'] = (cuenta[d.unidad_id ?? 'sin'] || 0) + 1;
  }
  return cuenta;
}

export default function PracticarPage() {
  const [usuario] = useState(getUsuarioActual);
  const [paso, setPaso] = useState('armar'); // armar | rendir | resultados

  // armar
  const [materias, setMaterias] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [materiaId, setMateriaId] = useState(null);
  const [listosPorUnidad, setListosPorUnidad] = useState(null); // null = cargando
  const [unidadIds, setUnidadIds] = useState([]);
  const [cantidad, setCantidad] = useState(5);
  const [dificultad, setDificultad] = useState('mixta');
  const [generando, setGenerando] = useState(false);
  const [errorGenerar, setErrorGenerar] = useState(null); // { mensaje, reintentable }

  // rendir
  const [cuestionario, setCuestionario] = useState(null);
  const [actual, setActual] = useState(0);
  const [respuestas, setRespuestas] = useState({}); // { numero: [posiciones] }
  const [confirmacion, setConfirmacion] = useState(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [errorCorregir, setErrorCorregir] = useState(null);

  // resultados
  const [resultado, setResultado] = useState(null);

  const materia = materias?.find((m) => m.id === materiaId) || null;
  const unidades = ordenarUnidades(materia?.unidades);

  const elegirMateria = (id, todasLasMaterias = materias) => {
    setMateriaId(id);
    setListosPorUnidad(null);
    setUnidadIds([]);
    setErrorGenerar(null);
    if (id == null) return;
    listarDocumentos(id)
      .then((documentos) => {
        const cuenta = contarListos(documentos);
        setListosPorUnidad(cuenta);
        // por defecto, todas las unidades que tienen apuntes listos
        const elegida = todasLasMaterias.find((m) => m.id === id);
        setUnidadIds(ordenarUnidades(elegida?.unidades).filter((u) => cuenta[u.id]).map((u) => u.id));
      })
      .catch((err) => {
        setListosPorUnidad({});
        setErrorGenerar({ mensaje: `No pudimos ver tus apuntes: ${err.message}`, reintentable: false });
      });
  };

  useEffect(() => {
    if (!usuario) return; // LayoutWrapper redirige a /usuarios
    listarMaterias()
      .then((lista) => {
        setMaterias(lista);
        elegirMateria(lista[0]?.id ?? null, lista);
      })
      .catch((err) => setErrorCarga(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se carga una sola vez al abrir la página
  }, []);

  const alternarUnidad = (id) => {
    setUnidadIds((elegidas) => (elegidas.includes(id) ? elegidas.filter((u) => u !== id) : [...elegidas, id]));
  };

  const armar = async () => {
    if (generando || !materia || unidadIds.length === 0) return;
    setGenerando(true);
    setErrorGenerar(null);
    try {
      const nuevo = await generarCuestionario({ materia_id: materia.id, unidad_ids: unidadIds, cantidad, dificultad });
      setCuestionario(nuevo);
      setRespuestas({});
      setActual(0);
      setResultado(null);
      setErrorCorregir(null);
      setPaso('rendir');
    } catch (err) {
      setErrorGenerar({ mensaje: err.message, reintentable: err.status === 502 || err.status === 0 });
    } finally {
      setGenerando(false);
    }
  };

  const marcar = (pregunta, posicion) => {
    setRespuestas((todas) => {
      const marcadas = todas[pregunta.numero] || [];
      if (!pregunta.multiple) return { ...todas, [pregunta.numero]: [posicion] };
      const nuevas = marcadas.includes(posicion) ? marcadas.filter((p) => p !== posicion) : [...marcadas, posicion];
      return { ...todas, [pregunta.numero]: nuevas };
    });
  };

  const corregir = async () => {
    if (corrigiendo) return;
    setCorrigiendo(true);
    setErrorCorregir(null);
    try {
      const corregido = await corregirCuestionario({
        materia_id: cuestionario.materia_id,
        preguntas: cuestionario.preguntas,
        respuestas: Object.entries(respuestas).map(([numero, marcadas]) => ({ numero: Number(numero), marcadas })),
      });
      setResultado(corregido);
      setPaso('resultados');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErrorCorregir(err.message);
    } finally {
      setCorrigiendo(false);
    }
  };

  const terminar = () => {
    const sinResponder = cuestionario.preguntas.filter((p) => !(respuestas[p.numero] || []).length).length;
    if (sinResponder === 0) {
      corregir();
      return;
    }
    setConfirmacion({
      titulo: 'Te quedan preguntas sin responder',
      mensaje: sinResponder === 1
        ? 'Hay 1 pregunta sin responder: va a contar como error. ¿Querés terminar igual?'
        : `Hay ${sinResponder} preguntas sin responder: van a contar como error. ¿Querés terminar igual?`,
      textoConfirmar: 'Terminar igual',
      accion: corregir,
    });
  };

  const otroCuestionario = () => {
    setPaso('armar');
    setCuestionario(null);
    setResultado(null);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="practica">
      {paso === 'armar' && (
        <PasoArmar
          materias={materias}
          errorCarga={errorCarga}
          materia={materia}
          unidades={unidades}
          listosPorUnidad={listosPorUnidad}
          unidadIds={unidadIds}
          cantidad={cantidad}
          dificultad={dificultad}
          generando={generando}
          errorGenerar={errorGenerar}
          onMateria={(id) => elegirMateria(id)}
          onUnidad={alternarUnidad}
          onCantidad={setCantidad}
          onDificultad={setDificultad}
          onArmar={armar}
        />
      )}

      {paso === 'rendir' && cuestionario && (
        <PasoRendir
          cuestionario={cuestionario}
          actual={actual}
          respuestas={respuestas}
          corrigiendo={corrigiendo}
          errorCorregir={errorCorregir}
          onMarcar={marcar}
          onIr={setActual}
          onTerminar={terminar}
        />
      )}

      {paso === 'resultados' && resultado && (
        <PasoResultados
          cuestionario={cuestionario}
          resultado={resultado}
          onOtro={otroCuestionario}
        />
      )}

      <DialogoConfirmacion confirmacion={confirmacion} onCerrar={() => setConfirmacion(null)} />
    </div>
  );
}

// ---------- paso 1: armar ----------

function PasoArmar({
  materias, errorCarga, materia, unidades, listosPorUnidad, unidadIds, cantidad, dificultad,
  generando, errorGenerar, onMateria, onUnidad, onCantidad, onDificultad, onArmar,
}) {
  if (errorCarga) {
    return <p className="practica-error" role="alert">No pudimos cargar tus materias: {errorCarga}</p>;
  }
  if (materias === null) return <p className="practica-ayuda">Cargando tus materias…</p>;
  if (materias.length === 0) {
    return (
      <div className="practica-tarjeta">
        <h1 className="practica-titulo">Practicar</h1>
        <p>Todavía no tenés materias. <Link href="/materias" className="practica-link">Creá una en Materias y apuntes</Link> y subí tus apuntes para poder practicar.</p>
      </div>
    );
  }

  const cargandoApuntes = listosPorUnidad === null;
  const totalListos = listosPorUnidad ? Object.values(listosPorUnidad).reduce((a, b) => a + b, 0) : 0;
  const sinUnidad = listosPorUnidad?.sin || 0;
  const largo = LARGOS.find((l) => l.cantidad === cantidad);

  return (
    <>
      <div>
        <h1 className="practica-titulo">Practicar</h1>
        <p className="practica-ayuda">Elegí qué unidades repasar y armamos un cuestionario con tus apuntes.</p>
      </div>

      <div className="practica-tarjeta">
        <label className="practica-campo">
          <span className="practica-etiqueta">Materia</span>
          <select
            value={materia?.id ?? ''}
            onChange={(e) => onMateria(Number(e.target.value))}
            disabled={generando}
            className="practica-select"
          >
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>

        <fieldset className="practica-campo" disabled={generando}>
          <legend className="practica-etiqueta">Unidades</legend>
          {cargandoApuntes ? (
            <p className="practica-ayuda">Buscando tus apuntes…</p>
          ) : totalListos === 0 ? (
            <p className="practica-aviso">
              Esta materia no tiene apuntes listos.{' '}
              <Link href="/materias" className="practica-link">Subí uno en Materias y apuntes</Link> y volvé cuando esté procesado.
            </p>
          ) : unidades.length === 0 ? (
            <p className="practica-aviso">
              Esta materia no tiene unidades. <Link href="/materias" className="practica-link">Agregalas en Materias y apuntes</Link>.
            </p>
          ) : (
            <div className="practica-unidades">
              {unidades.map((u) => {
                const listos = listosPorUnidad[u.id] || 0;
                return (
                  <label key={u.id} className={`practica-unidad ${listos ? '' : 'practica-unidad--off'}`}>
                    <input
                      type="checkbox"
                      checked={unidadIds.includes(u.id)}
                      disabled={!listos}
                      onChange={() => onUnidad(u.id)}
                    />
                    <span className="practica-unidad__nombre">U{u.numero_unidad} · {u.nombre_tema}</span>
                    <span className="practica-unidad__cuenta">
                      {listos ? `${listos} ${listos === 1 ? 'apunte listo' : 'apuntes listos'}` : 'sin apuntes listos'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {sinUnidad > 0 && (
            <p className="practica-ayuda">
              {sinUnidad === 1 ? 'Hay 1 apunte listo sin unidad: no entra' : `Hay ${sinUnidad} apuntes listos sin unidad: no entran`} en el cuestionario.
            </p>
          )}
        </fieldset>

        <div className="practica-fila">
          <fieldset className="practica-campo" disabled={generando}>
            <legend className="practica-etiqueta">Largo</legend>
            <div className="practica-segmentos">
              {LARGOS.map((l) => (
                <button
                  key={l.cantidad}
                  type="button"
                  aria-pressed={cantidad === l.cantidad}
                  className={`practica-segmento ${cantidad === l.cantidad ? 'practica-segmento--on' : ''}`}
                  onClick={() => onCantidad(l.cantidad)}
                >
                  {l.nombre} ({l.cantidad})
                </button>
              ))}
            </div>
          </fieldset>

          <label className="practica-campo">
            <span className="practica-etiqueta">Dificultad</span>
            <select
              value={dificultad}
              onChange={(e) => onDificultad(e.target.value)}
              disabled={generando}
              className="practica-select"
            >
              {DIFICULTADES.map((d) => <option key={d.valor} value={d.valor}>{d.nombre}</option>)}
            </select>
          </label>
        </div>

        {errorGenerar && (
          <div className="practica-error" role="alert">
            <p>{errorGenerar.mensaje}</p>
            {errorGenerar.reintentable && (
              <button type="button" className="practica-boton practica-boton--secundario" onClick={onArmar}>
                Reintentar
              </button>
            )}
          </div>
        )}

        <div className="practica-acciones">
          <button
            type="button"
            className="practica-boton"
            onClick={onArmar}
            disabled={generando || cargandoApuntes || unidadIds.length === 0}
          >
            {generando ? 'Generando…' : 'Armar cuestionario'}
          </button>
          {generando && (
            <p className="practica-ayuda" role="status">
              Generando cuestionario… puede tardar {largo?.espera || 'hasta 30 s'}.
            </p>
          )}
          {!generando && !cargandoApuntes && totalListos > 0 && unidadIds.length === 0 && (
            <p className="practica-ayuda">Elegí al menos una unidad.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- paso 2: rendir ----------

function PasoRendir({ cuestionario, actual, respuestas, corrigiendo, errorCorregir, onMarcar, onIr, onTerminar }) {
  const { preguntas } = cuestionario;
  const pregunta = preguntas[actual];
  const marcadas = respuestas[pregunta.numero] || [];
  const ultima = actual === preguntas.length - 1;
  const respondidas = preguntas.filter((p) => (respuestas[p.numero] || []).length).length;

  return (
    <>
      <div>
        <h1 className="practica-titulo">Cuestionario de {cuestionario.materia}</h1>
        {cuestionario.cantidad < cuestionario.cantidad_solicitada && (
          <p className="practica-aviso">
            Se generaron {cuestionario.cantidad} de {cuestionario.cantidad_solicitada} preguntas.
          </p>
        )}
      </div>

      <div className="practica-tarjeta">
        <div className="practica-progreso">
          <div className="practica-progreso__texto">
            <span>Pregunta {actual + 1} de {preguntas.length}</span>
            <span className="practica-ayuda">{respondidas} respondidas</span>
          </div>
          <div
            className="practica-progreso__barra"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={preguntas.length}
            aria-valuenow={actual + 1}
          >
            <div style={{ width: `${((actual + 1) / preguntas.length) * 100}%` }} />
          </div>
        </div>

        <fieldset className="practica-pregunta" key={pregunta.numero}>
          <legend className="practica-pregunta__enunciado">
            <span className={`practica-chip practica-chip--${pregunta.dificultad}`}>
              {NOMBRE_DIFICULTAD[pregunta.dificultad] || pregunta.dificultad}
            </span>
            {pregunta.pregunta}
          </legend>
          {pregunta.multiple && <p className="practica-ayuda">Elegí todas las correctas.</p>}

          <div className="practica-opciones">
            {pregunta.opciones.map((opcion, i) => (
              <label key={i} className={`practica-opcion ${marcadas.includes(i) ? 'practica-opcion--on' : ''}`}>
                <input
                  type={pregunta.multiple ? 'checkbox' : 'radio'}
                  name={`pregunta-${pregunta.numero}`}
                  checked={marcadas.includes(i)}
                  onChange={() => onMarcar(pregunta, i)}
                  disabled={corrigiendo}
                />
                <span className="practica-opcion__letra">{LETRAS[i]}</span>
                <span>{opcion}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {errorCorregir && <p className="practica-error" role="alert">No pudimos corregir: {errorCorregir}</p>}

        <div className="practica-navegacion">
          <button
            type="button"
            className="practica-boton practica-boton--secundario"
            onClick={() => onIr(actual - 1)}
            disabled={actual === 0 || corrigiendo}
          >
            Anterior
          </button>
          {ultima ? (
            <button type="button" className="practica-boton" onClick={onTerminar} disabled={corrigiendo}>
              {corrigiendo ? 'Corrigiendo…' : 'Terminar'}
            </button>
          ) : (
            <button type="button" className="practica-boton" onClick={() => onIr(actual + 1)} disabled={corrigiendo}>
              Siguiente
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- paso 3: resultados ----------

function referencia(p) {
  if (!p.fuente && !p.unidad) return null;
  return (
    <p className="practica-ayuda">
      Sale de {p.fuente ? <em>{p.fuente}</em> : 'tus apuntes'}{p.unidad ? ` · ${p.unidad}` : ''}
    </p>
  );
}

function PasoResultados({ cuestionario, resultado, onOtro }) {
  const [abiertas, setAbiertas] = useState(
    () => new Set(resultado.detalle.filter((d) => !d.acertada).map((d) => d.numero)),
  );
  const alternar = (numero) => setAbiertas((actuales) => {
    const nuevas = new Set(actuales);
    if (nuevas.has(numero)) nuevas.delete(numero); else nuevas.add(numero);
    return nuevas;
  });
  const textos = (d, posiciones) => posiciones.map((i) => `${LETRAS[i]}) ${d.opciones[i]}`);

  return (
    <>
      <h1 className="practica-titulo">Resultados · {cuestionario.materia}</h1>

      <div className="practica-tarjeta">
        <div className="practice-summary-row practica-resumen">
          <h2 className="practica-subtitulo">
            {resultado.aciertos === resultado.total
              ? '¡Respondiste todo bien!'
              : `Acertaste ${resultado.aciertos} de ${resultado.total} preguntas.`}
          </h2>
          <div className="practica-puntaje">
            <span className="practica-ayuda">Corrección</span>
            <strong>{resultado.aciertos}/{resultado.total}</strong>
            <span className="practica-ayuda">{Math.round(resultado.porcentaje)} %</span>
          </div>
        </div>

        {resultado.puntos_debiles.length > 0 && (
          <div className="practica-repaso">
            <h3 className="practica-repaso__titulo">Puntos débiles para repasar</h3>
            {resultado.puntos_debiles.map((d) => (
              <div key={d.unidad_id ?? 'sin'} className="practica-repaso__fila">
                <div>
                  <p className="practica-repaso__unidad">{d.unidad}</p>
                  <p className="practica-ayuda">
                    {d.errores} de {d.total} {d.total === 1 ? 'pregunta' : 'preguntas'} mal · {d.preguntas.length === 1 ? 'pregunta' : 'preguntas'} {d.preguntas.join(', ')}
                  </p>
                </div>
                {d.unidad_id != null && (
                  <Link
                    href={`/preguntar?${new URLSearchParams({ materia: cuestionario.materia_id, q: `Explicame ${d.unidad}` })}`}
                    className="practica-boton practica-boton--secundario practica-boton--chico"
                  >
                    Preguntar sobre esto
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="practica-acciones">
          <button type="button" className="practica-boton" onClick={onOtro}>Otro cuestionario</button>
          <Link href="/" className="practica-boton practica-boton--secundario">Volver al inicio</Link>
        </div>
      </div>

      <div className="practica-desglose">
        {resultado.detalle.map((d) => {
          const abierta = abiertas.has(d.numero);
          return (
            <div key={d.numero} className="practica-tarjeta practica-detalle">
              <button
                type="button"
                className="practica-detalle__cabecera"
                onClick={() => alternar(d.numero)}
                aria-expanded={abierta}
              >
                <span className="practica-detalle__numero">{d.numero}</span>
                <span className={`practica-detalle__enunciado ${d.acertada ? '' : 'practica-detalle__enunciado--mal'}`}>
                  {d.pregunta}
                </span>
                <span className={`practica-marca ${d.acertada ? 'practica-marca--bien' : 'practica-marca--mal'}`}>
                  {d.acertada ? '✓' : '✕'}
                  <span className="sr-only">{d.acertada ? 'Correcta' : 'Incorrecta'}</span>
                </span>
              </button>

              {abierta && (
                <div className="practica-detalle__cuerpo">
                  {!d.acertada && (
                    <p className="practica-detalle__mal">
                      {d.respondida ? `Marcaste: ${textos(d, d.marcadas).join(' · ')}` : 'No la respondiste.'}
                    </p>
                  )}
                  <p className="practica-detalle__bien">
                    {d.correctas.length > 1 ? 'Correctas' : 'Correcta'}: {textos(d, d.correctas).join(' · ')}
                  </p>
                  {d.explicacion && <p>{d.explicacion}</p>}
                  {referencia(d)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
