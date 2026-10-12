'use client';

import { useState } from 'react';

export default function MateriasPage() {
  // 1. Estructura de datos dinámica (Preparada para FastAPI + Supabase (acá el compa gemini ayudó porque no tengo idea de back :) ))
  const [materias, setMaterias] = useState([
    {
      id: 1,
      nombre: 'Análisis Matemático I',
      unidades: [
        {
          id: 101,
          numero: 1,
          nombre: 'Números reales y funciones',
          apuntes: [
            { id: 1, nombre: 'Teoría de Funciones y Dominio.pdf', paginas: 18, estado: 'listo' },
            { id: 2, nombre: 'Práctica 1 - Resueltos.pdf', paginas: 12, estado: 'listo' },
          ],
        },
        {
          id: 102,
          numero: 2,
          nombre: 'Límites y continuidad',
          apuntes: [
            { id: 3, nombre: 'Teórico Límites Cátedra.pdf', paginas: 24, estado: 'listo' },
          ],
        },
        {
          id: 103,
          numero: 3,
          nombre: 'Derivadas y aplicaciones',
          apuntes: [
            { id: 4, nombre: 'Apunte de cátedra unidad 3.pdf', paginas: 52, estado: 'listo' },
            { id: 5, nombre: 'Tabla de derivadas y ejercicios.pdf', paginas: 8, estado: 'listo' },
            { id: 6, nombre: 'Resumen parcial - Derivadas.pdf', paginas: 14, estado: 'procesando' },
          ],
        },
        {
          id: 104,
          numero: 4,
          nombre: 'Integrales',
          apuntes: [], // Unidad vacía para probar "Eliminar unidad"
        },
      ],
    },
    {
      id: 2,
      nombre: 'Física I',
      unidades: [
        {
          id: 201,
          numero: 1,
          nombre: 'Cinemática',
          apuntes: [
            { id: 7, nombre: 'Guía Cinemática 2024.pdf', paginas: 16, estado: 'listo' },
          ],
        },
        {
          id: 202,
          numero: 2,
          nombre: 'Dinámica y Leyes de Newton',
          apuntes: [
            { id: 8, nombre: 'Teoría Dinámica.pdf', paginas: 22, estado: 'listo' },
            { id: 9, nombre: 'Problemas resueltos unidad 2.pdf', paginas: 15, estado: 'listo' },
            { 
              id: 10, 
              nombre: 'Apuntes escaneados de la clase 4.pdf', 
              paginas: 10, 
              estado: 'error',
              errorDetalle: 'Parece una foto o escaneo sin texto seleccionable' 
            },
          ],
        },
      ],
    },
    {
      id: 3,
      nombre: 'Introducción a la Programación',
      unidades: [],
    },
  ]);

  const [selectedMateriaId, setSelectedMateriaId] = useState(1);
  const materiaActiva = materias.find((m) => m.id === selectedMateriaId) || materias[0];

  const totalUnidades = materiaActiva.unidades.length;
  const totalApuntes = materiaActiva.unidades.reduce((acc, u) => acc + u.apuntes.length, 0);

  const [unidadDestino, setUnidadDestino] = useState(materiaActiva.unidades[0]?.id || '');

  // Buscar si existen errores de procesamiento en cualquier apunte
  const apuntesConError = [];
  materias.forEach((m) => {
    m.unidades.forEach((u) => {
      u.apuntes.forEach((a) => {
        if (a.estado === 'error') {
          apuntesConError.push({
            materiaNombre: m.nombre,
            unidadNombre: `Unidad ${u.numero}: ${u.nombre}`,
            archivo: a.nombre,
            detalle: a.errorDetalle,
          });
        }
      });
    });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Selector de Materias (Pestañas) */}
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

        <button style={{
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
        }}>
          + Agregar materia
        </button>
      </div>

      {/* 2. Cabecera con título resaltado y botones de acción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'} · {totalApuntes} {totalApuntes === 1 ? 'apunte cargado' : 'apuntes cargados'}
          </p>
        </div>

        {/* Botones: Editar y Eliminar materia */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}>
            Editar materia
          </button>
          <button style={{
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

      {/* 3. Distribución Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        
        {/* Columna Izquierda: Unidades */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {materiaActiva.unidades.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px dashed var(--border-color)', 
              borderRadius: '12px', 
              padding: '32px', 
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              Todavía no creaste unidades para esta materia.
            </div>
          ) : (
            materiaActiva.unidades.map((u) => (
              <div 
                key={u.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Cabecera de la Unidad */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      Unidad {u.numero}: {u.nombre}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {u.apuntes.length === 0 
                        ? 'Sin apuntes todavía' 
                        : `${u.apuntes.length} ${u.apuntes.length === 1 ? 'apunte' : 'apuntes'}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      color: 'var(--accent-purple)',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}>
                      + Subir apunte
                    </button>
                    {u.apuntes.length === 0 && (
                      <button style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '12px',
                        color: '#9B1C1C',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}>
                        Eliminar unidad
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de apuntes cargados */}
                {u.apuntes.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px', 
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    {u.apuntes.map((apunte) => (
                      <div 
                        key={apunte.id}
                        style={{
                          backgroundColor: apunte.estado === 'error' ? '#FDF2F2' : 'var(--bg-page)',
                          border: apunte.estado === 'error' ? '1px solid #F8B4B4' : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 'bold', 
                            backgroundColor: apunte.estado === 'error' ? '#FBD5D5' : '#E0D6C8', 
                            padding: '2px 5px', 
                            borderRadius: '4px', 
                            color: apunte.estado === 'error' ? '#9B1C1C' : 'var(--text-primary)' 
                          }}>
                            PDF
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                            {apunte.nombre}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            ({apunte.paginas} págs.)
                          </span>
                        </div>

                        {apunte.estado === 'listo' && (
                          <span style={{ 
                            backgroundColor: '#E0ECD9', 
                            color: '#275E10', 
                            border: '1px solid #C4D8B8', 
                            borderRadius: '6px', 
                            padding: '3px 8px', 
                            fontSize: '11px', 
                            fontWeight: 'bold' 
                          }}>
                            Listo para preguntar ✓
                          </span>
                        )}
                        {apunte.estado === 'procesando' && (
                          <span style={{ 
                            backgroundColor: '#FDF4E3', 
                            color: '#8A6200', 
                            border: '1px solid #F0DEB4', 
                            borderRadius: '6px', 
                            padding: '3px 8px', 
                            fontSize: '11px', 
                            fontWeight: 'bold' 
                          }}>
                            Procesando texto...
                          </span>
                        )}
                        {apunte.estado === 'error' && (
                          <span style={{ 
                            backgroundColor: '#FDE8E8', 
                            color: '#9B1C1C', 
                            border: '1px solid #F8B4B4', 
                            borderRadius: '6px', 
                            padding: '3px 8px', 
                            fontSize: '11px', 
                            fontWeight: 'bold' 
                          }}>
                            Error de escaneo ✕
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          <button style={{
            backgroundColor: 'transparent',
            border: '1px dashed var(--border-color)',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--accent-purple)',
            cursor: 'pointer',
            textAlign: 'center'
          }}>
            + Agregar otra unidad a {materiaActiva.nombre}
          </button>
        </div>

        {/* Columna derecha: carga de archivos + alertas de errores con mayor tamaño de texto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Tarjeta de subida */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Subir nuevo apunte
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                Tiene que ser un PDF con texto, no escaneado, de hasta 25 MB.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                ¿A qué unidad pertenece?
              </label>
              <select 
                value={unidadDestino}
                onChange={(e) => setUnidadDestino(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-page)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              >
                {materiaActiva.unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unidad {u.numero}: {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '10px',
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-page)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#EBE0D2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                📄
              </div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Arrastrá tu archivo PDF acá
              </p>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                o hacé clic para buscar en tu compu
              </span>
            </div>

            <button style={{
              backgroundColor: 'var(--accent-purple)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              Subir apunte
            </button>
          </div>

          {/* Tarjeta de errores con tipografía más grande y espaciada */}
          {apuntesConError.length > 0 && (
            <div style={{
              backgroundColor: '#FDF2F2',
              border: '1px solid #F8B4B4',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#9B1C1C' }}>
                  Problema al procesar apunte
                </h3>
              </div>

              {apuntesConError.map((err, idx) => (
                <div key={idx} style={{ color: '#771D1D', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#9B1C1C' }}>
                    📄 {err.archivo}
                  </p>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#B91C1C' }}>
                    {err.materiaNombre} · {err.unidadNombre}
                  </p>
                  <p style={{ fontSize: '13px', lineHeight: '1.5', marginTop: '2px', color: '#771D1D' }}>
                    {err.detalle}. CompañÍA necesita PDFs con texto seleccionable para responder preguntas y armar tests.
                  </p>
                </div>
              ))}

              <button style={{
                alignSelf: 'flex-start',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#9B1C1C',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '4px 0 0 0'
              }}>
                Eliminar archivo y volver a subir
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}