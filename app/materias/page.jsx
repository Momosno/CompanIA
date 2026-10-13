'use client';

import { useState } from 'react';

export default function MateriasPage() {
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
          apuntes: [],
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Unidad {unidad.numero}: {unidad.nombre}
                  </h3>
                  <button style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                    Agregar apunte
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unidad.apuntes.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No hay apuntes cargados en esta unidad.</p>
                  ) : (
                    unidad.apuntes.map((apunte) => (
                      <div key={apunte.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <div>
                          <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{apunte.nombre}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{apunte.paginas} páginas</p>
                        </div>
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
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Acciones rápidas</h3>
          <button style={{ backgroundColor: '#EBE0D2', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', fontWeight: '600', cursor: 'pointer' }}>
            Cargar apuntes
          </button>
          <button style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', fontWeight: '600', cursor: 'pointer' }}>
            Crear unidad
          </button>
          {apuntesConError.length > 0 && (
            <div style={{ backgroundColor: '#FDE8E8', border: '1px solid #F8B4B4', borderRadius: '8px', padding: '10px', color: '#9B1C1C' }}>
              Hay {apuntesConError.length} archivo(s) con error de lectura.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
