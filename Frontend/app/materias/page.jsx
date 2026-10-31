'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL, getUsuarioActual } from '../lib/api';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const motivosError = {
  OCR_NEEDED: 'El PDF contiene imágenes o escaneos sin texto seleccionable. Requiere procesamiento OCR.',
  PASSWORD_PROTECTED: 'El archivo está protegido por contraseña.',
  CORRUPTED_FILE: 'El archivo está dañado o tiene un formato no compatible.',
  LIMIT_EXCEEDED: 'El archivo supera el límite de páginas o tamaño permitido.',
};

const INTERVALO_ESTADO_MS = 3000;

const estadoDeDocumento = (doc) => (
  doc.estado === 'ready' ? 'listo' : doc.estado === 'error' ? 'error' : 'procesando'
);

export default function MateriasPage() {
  const [usuario] = useState(getUsuarioActual);
  const [materias, setMaterias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [formMateria, setFormMateria] = useState(null);
  const [errorFormMateria, setErrorFormMateria] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState(null);
  const [errorEdicion, setErrorEdicion] = useState(null);
  const [temaUnidad, setTemaUnidad] = useState(null);
  const [errorUnidad, setErrorUnidad] = useState(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState(null);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);
  const [conectadoBackend, setConectadoBackend] = useState(false);
  const dialogRef = useRef(null);
  const materiaActiva = materias.find((m) => m.id === selectedMateriaId) || materias[0];
  const [unidadDestino, setUnidadDestino] = useState('');

  const cargarDatos = () => {
    if (!usuario) return;
    const pedir = (ruta) => fetch(`${API_URL}/usuarios/${usuario.id}/${ruta}/`).then((r) => {
      if (!r.ok) throw new Error(`Error al cargar ${ruta}`);
      return r.json();
    });

    Promise.all([pedir('materias'), pedir('documentos')])
    .then(([materiasData, documentosData]) => {
      if (materiasData && materiasData.length > 0) {
        const materiasAdaptadas = materiasData.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          cuatrimestre: m.cuatrimestre,
          unidades: (m.unidades || []).map((u) => ({
            id: u.id,
            numero: u.numero_unidad,
            nombre: u.nombre_tema,
            apuntes: (documentosData || [])
              .filter((doc) => doc.materia_id === m.id && (doc.unidad_id === u.id || (!doc.unidad_id && u.numero_unidad === 1)))
              .map((doc) => ({
                id: doc.id,
                nombre: doc.nombre_original,
                paginas: doc.paginas || 1,
                estado: estadoDeDocumento(doc)
              }))
          }))
        }));
        setMaterias(materiasAdaptadas);
        setSelectedMateriaId(materiasAdaptadas[0].id);
        setUnidadDestino(materiasAdaptadas[0].unidades[0]?.id || '');
        setConectadoBackend(true);
      }
    })
    .catch((err) => {
      console.warn('Error al cargar datos desde la API:', err);
      setErrorCarga('No pudimos cargar tus materias. Revisá que el backend esté corriendo.');
    })
    .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el usuario no cambia mientras la página está abierta
  }, []);

  // Los documentos reales tienen id de texto; los de ejemplo, numérico
  const hayProcesando = materias.some((m) => m.unidades.some((u) => u.apuntes.some(
    (a) => a.estado === 'procesando' && typeof a.id === 'string'
  )));

  // Actualiza solo los apuntes, para no cambiar la materia elegida ni pisar otras subidas
  useEffect(() => {
    if (!hayProcesando) return;

    const intervalo = setInterval(() => {
      fetch(`${API_URL}/usuarios/${usuario.id}/documentos/`)
        .then((r) => (r.ok ? r.json() : []))
        .then((documentos) => {
          setMaterias((actuales) => actuales.map((materia) => ({
            ...materia,
            unidades: materia.unidades.map((unidad) => ({
              ...unidad,
              apuntes: unidad.apuntes.map((apunte) => {
                const doc = documentos.find((d) => d.id === apunte.id);
                if (!doc) return apunte;
                return { ...apunte, paginas: doc.paginas || apunte.paginas, estado: estadoDeDocumento(doc) };
              }),
            })),
          })));
        })
        .catch((err) => {
          console.warn('No se pudo actualizar el estado de los apuntes:', err);
        });
    }, INTERVALO_ESTADO_MS);

    return () => clearInterval(intervalo);
  }, [hayProcesando, usuario]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (mostrarErrores && !dialog.open) dialog.showModal();
    if (!mostrarErrores && dialog.open) dialog.close();
  }, [mostrarErrores]);

  
  const validarArchivoPDF = (archivo) => {
    if (!archivo) return { valido: false, error: 'No se seleccionó ningún archivo.' };

    const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      return {
        valido: false,
        error: `"${archivo.name}" no es un documento PDF válido. Solo se admiten archivos .pdf`,
      };
    }

    if (archivo.size > MAX_FILE_SIZE_BYTES) {
      const pesoMB = (archivo.size / (1024 * 1024)).toFixed(1);
      return {
        valido: false,
        error: `"${archivo.name}" pesa ${pesoMB} MB y supera el límite máximo permitido de ${MAX_FILE_SIZE_MB} MB.`,
      };
    }

    return { valido: true };
  };

  const actualizarApunte = (materiaId, unidadId, apunteId, actualizar) => {
    setMaterias((materiasActuales) => materiasActuales.map((materia) => (
      materia.id !== materiaId ? materia : {
        ...materia,
        unidades: materia.unidades.map((unidad) => (
          unidad.id !== unidadId ? unidad : {
            ...unidad,
            apuntes: unidad.apuntes.map((apunte) => (
              apunte.id !== apunteId ? apunte : actualizar(apunte)
            )),
          }
        )),
      }
    )));
  };

  const quitarApunte = (materiaId, unidadId, apunteId) => {
    setMaterias((materiasActuales) => materiasActuales.map((materia) => (
      materia.id !== materiaId ? materia : {
        ...materia,
        unidades: materia.unidades.map((unidad) => (
          unidad.id !== unidadId ? unidad : {
            ...unidad,
            apuntes: unidad.apuntes.filter((apunte) => apunte.id !== apunteId),
          }
        )),
      }
    )));
  };

  const reintentarProcesamiento = (archivo) => {
    actualizarApunte(archivo.materiaId, archivo.unidadId, archivo.apunteId, (apunte) => ({
      ...apunte,
      estado: 'procesando',
      errorCode: undefined,
      errorDetalle: undefined,
    }));
    setMostrarErrores(false);
  };

  const reemplazarArchivo = (archivo, nuevoArchivo) => {
    const validacion = validarArchivoPDF(nuevoArchivo);
    if (!validacion.valido) {
      setErrorValidacion(validacion.error);
      return;
    }

    setErrorValidacion(null);
    actualizarApunte(archivo.materiaId, archivo.unidadId, archivo.apunteId, (apunte) => ({
      ...apunte,
      nombre: nuevoArchivo.name,
      estado: 'procesando',
      errorCode: undefined,
      errorDetalle: undefined,
    }));
    setMostrarErrores(false);
  };

  const eliminarApunte = (unidadId, apunteId) => {
    if (!window.confirm('¿Seguro que querés eliminar este apunte?')) return;

    setMaterias((prev) =>
      prev.map((materia) => {
        if (materia.id !== selectedMateriaId) return materia;
        return {
          ...materia,
          unidades: materia.unidades.map((u) => {
            if (u.id !== unidadId) return u;
            return {
              ...u,
              apuntes: u.apuntes.filter((a) => a.id !== apunteId),
            };
          }),
        };
      })
    );

    // Petición al backend si está conectado
    fetch(`${API_URL}/usuarios/${usuario.id}/documentos/${apunteId}`, {
      method: 'DELETE',
    }).catch((err) => {
      console.warn('Backend desconectado. Apunte eliminado solo en el cliente local:', err);
    });
  };

const agregarApunteAUnidad = (unidadId, archivo) => {
    const validacion = validarArchivoPDF(archivo);
    if (!validacion.valido) {
      setErrorValidacion(validacion.error);
      return;
    }

    setErrorValidacion(null);
    const tempId = Date.now();
    const nuevoApunte = {
      id: tempId,
      nombre: archivo.name,
      paginas: 1,
      estado: 'subiendo',
      progreso: 15,
    };

    setMaterias((prev) =>
      prev.map((materia) => {
        if (materia.id !== selectedMateriaId) return materia;
        return {
          ...materia,
          unidades: materia.unidades.map((u) => {
            if (u.id !== unidadId) return u;
            return {
              ...u,
              apuntes: [...u.apuntes, nuevoApunte],
            };
          }),
        };
      })
    );

    // Barra de progreso de subida visual (SCRUM-26)
    let p = 15;
    const timer = setInterval(() => {
      p += 25;
      if (p >= 100) {
        clearInterval(timer);
        actualizarApunte(selectedMateriaId, unidadId, tempId, (a) => ({ ...a, estado: 'procesando', progreso: 100 }));

        // Enviar archivo al backend de FastAPI (código de tu compañero)
        const formData = new FormData();
        formData.append('materia_id', selectedMateriaId);
        if (unidadId) formData.append('unidad_id', unidadId);
        formData.append('archivo', archivo);

        fetch(`${API_URL}/usuarios/${usuario.id}/documentos/`, {
          method: 'POST',
          body: formData,
        })
          .then(async (res) => {
            const datos = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof datos.detail === 'string' ? datos.detail : 'Error al subir el archivo');
            return datos;
          })
          .then((documento) => {
            actualizarApunte(selectedMateriaId, unidadId, tempId, (a) => ({ ...a, id: documento.id }));
          })
          .catch((err) => {
            console.warn('No se pudo subir el archivo:', err);
            quitarApunte(selectedMateriaId, unidadId, tempId);
            const motivo = err instanceof TypeError ? 'no hay conexión con el backend' : err.message;
            setErrorValidacion(`No pudimos subir "${archivo.name}": ${motivo}.`);
          });
      } else {
        actualizarApunte(selectedMateriaId, unidadId, tempId, (a) => ({ ...a, progreso: p }));
      }
    }, 150);
  };

  const crearMateria = (e) => {
    e.preventDefault();
    setErrorFormMateria(null);

    fetch(`${API_URL}/usuarios/${usuario.id}/materias/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: formMateria.nombre.trim(),
        cuatrimestre: formMateria.cuatrimestre.trim(),
        unidades: [{ numero_unidad: 1, nombre_tema: formMateria.tema.trim() }],
      }),
    })
      .then(async (res) => {
        const datos = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof datos.detail === 'string' ? datos.detail : 'No pudimos crear la materia.');
        return datos;
      })
      .then((materia) => {
        const nueva = {
          id: materia.id,
          nombre: materia.nombre,
          cuatrimestre: materia.cuatrimestre,
          unidades: materia.unidades.map((u) => ({
            id: u.id,
            numero: u.numero_unidad,
            nombre: u.nombre_tema,
            apuntes: [],
          })),
        };
        setMaterias((prev) => [...prev, nueva]);
        setSelectedMateriaId(nueva.id);
        setUnidadDestino(nueva.unidades[0]?.id || '');
        setErrorCarga(null);
        setFormMateria(null);
      })
      .catch((err) => {
        console.warn('No se pudo crear la materia:', err);
        setErrorFormMateria(err instanceof TypeError ? 'No hay conexión con el backend.' : err.message);
      });
  };

  const estiloCampo = {
    flex: '1 1 180px',
    minWidth: 0,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const campoMateria = (campo, etiqueta, ejemplo) => (
    <input
      value={formMateria[campo]}
      onChange={(e) => setFormMateria((prev) => ({ ...prev, [campo]: e.target.value }))}
      placeholder={ejemplo}
      aria-label={etiqueta}
      required
      style={estiloCampo}
    />
  );

  const barraMaterias = (
    <>
      {/* Selector superior de materias */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {materias.map((m) => {
          const isActive = m.id === selectedMateriaId;
          return (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMateriaId(m.id);
                setUnidadDestino(m.unidades[0]?.id || '');
                setErrorValidacion(null);
                setNombreEdicion(null);
                setTemaUnidad(null);
              }}
              style={{
                backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                borderBottom: isActive ? '2px solid var(--accent-purple)' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {m.nombre}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setErrorFormMateria(null);
            setFormMateria({ nombre: '', cuatrimestre: '', tema: '' });
          }}
          style={{
            backgroundColor: 'transparent',
            border: '1px dashed var(--border-color)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--accent-purple)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: '4px'
          }}
        >
          + Agregar materia
        </button>
      </div>

      {formMateria && (
        <form onSubmit={crearMateria} style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Nueva materia</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {campoMateria('nombre', 'Nombre de la materia', 'Nombre (ej. Física I)')}
            {campoMateria('cuatrimestre', 'Cuatrimestre', 'Cuatrimestre (ej. 1C 2026)')}
            {campoMateria('tema', 'Tema de la primera unidad', 'Tema de la unidad 1')}
          </div>
          {errorFormMateria && (
            <p role="alert" style={{ fontSize: '13px', color: '#9B1C1C' }}>{errorFormMateria}</p>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{
              backgroundColor: 'var(--accent-purple)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Crear materia
            </button>
            <button type="button" onClick={() => setFormMateria(null)} style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </>
  );

  if (!materiaActiva) {
    return (
      <div className="subjects-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {barraMaterias}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          fontSize: '14px',
          color: errorCarga ? '#9B1C1C' : 'var(--text-secondary)'
        }}>
          {errorCarga || (cargando ? 'Cargando tus materias...' : 'Todavía no tenés materias. Creá la primera para subir tus apuntes.')}
        </div>
      </div>
    );
  }

  const totalUnidades = materiaActiva.unidades.length;
  const totalApuntes = materiaActiva.unidades.reduce((acc, u) => acc + u.apuntes.length, 0);

  const guardarNombreMateria = (e) => {
    e.preventDefault();
    setErrorEdicion(null);
    const nombre = nombreEdicion.trim();

    fetch(`${API_URL}/usuarios/${usuario.id}/materias/${materiaActiva.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    })
      .then(async (res) => {
        const datos = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof datos.detail === 'string' ? datos.detail : 'No pudimos guardar el nombre.');
      })
      .then(() => {
        setMaterias((prev) => prev.map((m) => (m.id === materiaActiva.id ? { ...m, nombre } : m)));
        setNombreEdicion(null);
      })
      .catch((err) => {
        console.warn('No se pudo editar la materia:', err);
        setErrorEdicion(err instanceof TypeError ? 'No hay conexión con el backend.' : err.message);
      });
  };

  const crearUnidad = (e) => {
    e.preventDefault();
    setErrorUnidad(null);
    const materiaId = materiaActiva.id;
    const numero = Math.max(0, ...materiaActiva.unidades.map((u) => u.numero)) + 1;

    fetch(`${API_URL}/usuarios/${usuario.id}/materias/${materiaId}/unidades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero_unidad: numero, nombre_tema: temaUnidad.trim() }),
    })
      .then(async (res) => {
        const datos = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof datos.detail === 'string' ? datos.detail : 'No pudimos crear la unidad.');
        return datos;
      })
      .then((unidad) => {
        const nueva = { id: unidad.id, numero: unidad.numero_unidad, nombre: unidad.nombre_tema, apuntes: [] };
        setMaterias((prev) => prev.map((m) => (
          m.id === materiaId ? { ...m, unidades: [...m.unidades, nueva] } : m
        )));
        setUnidadDestino((actual) => actual || nueva.id);
        setTemaUnidad(null);
      })
      .catch((err) => {
        console.warn('No se pudo crear la unidad:', err);
        setErrorUnidad(err instanceof TypeError ? 'No hay conexión con el backend.' : err.message);
      });
  };

  const eliminarMateria = () => {
    const aviso = `¿Seguro que querés eliminar "${materiaActiva.nombre}"? Se borrarán sus unidades y ${totalApuntes} ${totalApuntes === 1 ? 'apunte' : 'apuntes'}.`;
    if (!window.confirm(aviso)) return;

    fetch(`${API_URL}/usuarios/${usuario.id}/materias/${materiaActiva.id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('Error al eliminar la materia');
        const restantes = materias.filter((m) => m.id !== materiaActiva.id);
        setMaterias(restantes);
        setSelectedMateriaId(restantes[0]?.id ?? null);
        setUnidadDestino(restantes[0]?.unidades[0]?.id || '');
        setNombreEdicion(null);
        setErrorValidacion(null);
      })
      .catch((err) => {
        console.warn('No se pudo eliminar la materia:', err);
        setErrorValidacion(`No pudimos eliminar "${materiaActiva.nombre}". Probá de nuevo.`);
      });
  };

  const apuntesConError = [];
  materias.forEach((m) => {
    m.unidades.forEach((u) => {
      u.apuntes.forEach((a) => {
        if (a.estado === 'error') {
          apuntesConError.push({
            materiaId: m.id,
            unidadId: u.id,
            apunteId: a.id,
            materiaNombre: m.nombre,
            unidadNombre: `Unidad ${u.numero}: ${u.nombre}`,
            archivo: a.nombre,
            detalle: motivosError[a.errorCode] || a.errorDetalle || 'No se pudo procesar este archivo.',
          });
        }
      });
    });
  });

  return (
    <div className="subjects-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {barraMaterias}

      {/* Banner de error de validación preventiva (ej. > 25 MB o no PDF) */}
      {errorValidacion && (
        <div style={{
          backgroundColor: '#FDE8E8',
          border: '1px solid #F8B4B4',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          color: '#9B1C1C',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{errorValidacion}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorValidacion(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9B1C1C',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '2px 6px'
            }}
            title="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Encabezado de la materia activa */}
      <div className="subjects-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px' }}>
            <span style={{
              backgroundColor: '#DFD7FA',
              padding: '2px 10px',
              borderRadius: '8px',
              border: '1px solid #C5B8F0'
            }}>
              {materiaActiva.nombre}
            </span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'} · {totalApuntes} {totalApuntes === 1 ? 'apunte cargado' : 'apuntes cargados'} · Máx. 25 MB por archivo
          </p>
        </div>

        <div className="subjects-actions" style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setErrorEdicion(null);
              setNombreEdicion(materiaActiva.nombre);
            }}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            Editar materia
          </button>
          <button type="button" onClick={eliminarMateria} style={{
            backgroundColor: '#FDE8E8',
            border: '1px solid #F8B4B4',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#9B1C1C',
            cursor: 'pointer'
          }}>
            Eliminar materia
          </button>
        </div>
      </div>

      {nombreEdicion !== null && (
        <form onSubmit={guardarNombreMateria} style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <input
              value={nombreEdicion}
              onChange={(e) => setNombreEdicion(e.target.value)}
              aria-label="Nuevo nombre de la materia"
              required
              style={estiloCampo}
            />
            <button type="submit" style={{
              backgroundColor: 'var(--accent-purple)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Guardar
            </button>
            <button type="button" onClick={() => setNombreEdicion(null)} style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}>
              Cancelar
            </button>
          </div>
          {errorEdicion && (
            <p role="alert" style={{ fontSize: '13px', color: '#9B1C1C' }}>{errorEdicion}</p>
          )}
        </form>
      )}

      {/* Disposición en dos columnas */}
      <div className="subjects-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        
        {/* Columna izquierda: Unidades y apuntes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {materiaActiva.unidades.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              Esta materia todavía no tiene unidades cargadas.
            </div>
          ) : (
            materiaActiva.unidades.map((unidad) => (
              <div key={unidad.id} style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div className="subject-unit-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Unidad {unidad.numero}: {unidad.nombre}
                  </h3>

                  {/* Botón para agregar apunte directo a esta unidad con validación */}
                  <label
                    htmlFor={`agregar-apunte-${unidad.id}`}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'inline-block'
                    }}
                  >
                    Agregar apunte
                    <input
                      id={`agregar-apunte-${unidad.id}`}
                      type="file"
                      accept="application/pdf,.pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) agregarApunteAUnidad(unidad.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unidad.apuntes.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No hay apuntes cargados en esta unidad.</p>
                  ) : (
                    unidad.apuntes.map((apunte) => (
                      <div key={apunte.id} className="subject-note-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <div>
                          <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{apunte.nombre}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{apunte.paginas} páginas</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {apunte.estado === 'subiendo' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', minWidth: '110px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-purple)' }}>
                                Subiendo... {apunte.progreso || 0}%
                              </span>
                              <div style={{ width: '100%', height: '5px', backgroundColor: '#EBE0D2', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${apunte.progreso || 0}%`, height: '100%', backgroundColor: 'var(--accent-purple)', transition: 'width 0.15s ease' }} />
                              </div>
                            </div>
                          ) : (
                            <span style={{
                              backgroundColor: apunte.estado === 'error' ? '#FDE8E8' : apunte.estado === 'procesando' ? '#EBE0D2' : '#E0ECD9',
                              color: apunte.estado === 'error' ? '#9B1C1C' : apunte.estado === 'procesando' ? '#6B4A2A' : '#275E10',
                              border: '1px solid',
                              borderColor: apunte.estado === 'error' ? '#F8B4B4' : apunte.estado === 'procesando' ? '#D4C6B3' : '#C4D8B8',
                              borderRadius: '999px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {apunte.estado}
                            </span>
                          )}

                          {apunte.estado !== 'subiendo' && (
                            <button
                              type="button"
                              onClick={() => eliminarApunte(unidad.id, apunte.id)}
                              title="Eliminar apunte"
                              style={{
                                backgroundColor: '#FDE8E8',
                                border: '1px solid #F8B4B4',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#9B1C1C',
                                cursor: 'pointer',
                                lineHeight: '1.2',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FCDADA')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FDE8E8')}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Columna derecha: Acciones rápidas y alertas */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Acciones rápidas</h3>
          
          {/* Cargar apuntes (asigna a la unidad seleccionada o primera unidad) */}
          <label
            htmlFor="cargar-apuntes-rapido"
            style={{
              backgroundColor: '#EBE0D2',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontWeight: '600',
              fontSize: '13px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'block'
            }}
          >
            Cargar apuntes
            <input
              id="cargar-apuntes-rapido"
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                const destino = unidadDestino || materiaActiva.unidades[0]?.id;
                if (!destino) {
                  setErrorValidacion('Primero debés crear una unidad para poder subir apuntes.');
                  return;
                }
                if (file) agregarApunteAUnidad(destino, file);
                e.target.value = '';
              }}
            />
          </label>

          {temaUnidad === null ? (
            <button
              type="button"
              onClick={() => {
                setErrorUnidad(null);
                setTemaUnidad('');
              }}
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', fontWeight: '600', cursor: 'pointer' }}
            >
              Crear unidad
            </button>
          ) : (
            <form onSubmit={crearUnidad} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                value={temaUnidad}
                onChange={(e) => setTemaUnidad(e.target.value)}
                placeholder="Tema de la unidad"
                aria-label="Tema de la unidad"
                autoFocus
                required
                style={{ ...estiloCampo, flex: 'none' }}
              />
              {errorUnidad && (
                <p role="alert" style={{ fontSize: '13px', color: '#9B1C1C' }}>{errorUnidad}</p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Crear
                </button>
                <button type="button" onClick={() => setTemaUnidad(null)} style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '7px 10px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {apuntesConError.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarErrores(true)}
              aria-haspopup="dialog"
              aria-expanded={mostrarErrores}
              className="w-full rounded-lg border border-[#F8B4B4] bg-[#FDE8E8] p-3 text-left text-sm font-semibold text-[#9B1C1C] transition-colors hover:bg-[#fbdede] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B1C1C]"
            >
              Hay {apuntesConError.length} archivo(s) con error de lectura. Ver detalles
            </button>
          )}
        </div>
      </div>

      {/* Modal para ver y corregir archivos con error */}
      <dialog
        ref={dialogRef}
        onClose={() => setMostrarErrores(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setMostrarErrores(false);
        }}
        aria-labelledby="errores-lectura-titulo"
        className="pdf-error-dialog w-[min(92vw,44rem)] max-h-[85dvh] overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/40"
      >
        <div className="pdf-error-dialog__header flex items-start justify-between gap-4 border-b border-[var(--border-color)]">
          <div>
            <h2 id="errores-lectura-titulo" className="text-lg font-bold">Archivos con error de lectura</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Revisá el motivo y elegí cómo continuar (máx. 25 MB por archivo).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarErrores(false)}
            className="pdf-error-dialog__close shrink-0 rounded-md border border-[var(--border-color)] text-sm font-semibold hover:bg-[#EBE0D2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-purple)]"
          >
            Cerrar
          </button>
        </div>
        <div className="pdf-error-dialog__list max-h-[calc(85dvh-5.5rem)] overflow-y-auto">
          {apuntesConError.map((archivo) => (
            <article key={archivo.apunteId} className="pdf-error-dialog__item rounded-lg border border-[var(--border-color)] bg-white/60">
              <h3 className="break-words font-bold">{archivo.archivo}</h3>
              <p className="pdf-error-dialog__item-meta text-sm text-[var(--text-secondary)]">
                {archivo.materiaNombre} · {archivo.unidadNombre}
              </p>
              <p className="pdf-error-dialog__item-reason text-sm">{archivo.detalle}</p>
              <div className="pdf-error-dialog__actions">
                <button
                  type="button"
                  onClick={() => reintentarProcesamiento(archivo)}
                  className="pdf-error-dialog__action rounded-md bg-[var(--accent-purple)] text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-purple)]"
                >
                  Reintentar procesamiento
                </button>
                <label
                  htmlFor={`reemplazar-apunte-${archivo.apunteId}`}
                  className="pdf-error-dialog__action cursor-pointer rounded-md border border-[var(--border-color)] text-sm font-semibold hover:bg-[#EBE0D2] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent-purple)]"
                >
                  Reemplazar archivo
                  <input
                    id={`reemplazar-apunte-${archivo.apunteId}`}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(event) => {
                      const nuevoArchivo = event.target.files?.[0];
                      if (nuevoArchivo) reemplazarArchivo(archivo, nuevoArchivo);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </dialog>
    </div>
  );
}
