'use client';

import { useEffect, useRef } from 'react';

// confirmacion: { titulo, mensaje, textoConfirmar, peligro, accion } o null si está cerrado
export default function DialogoConfirmacion({ confirmacion, onCerrar }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (confirmacion && !dialog.open) dialog.showModal();
    if (!confirmacion && dialog.open) dialog.close();
  }, [confirmacion]);

  const confirmar = () => {
    const { accion } = confirmacion;
    onCerrar();
    accion();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onCerrar}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCerrar();
      }}
      aria-labelledby="confirmacion-titulo"
      style={{ width: 'min(92vw, 30rem)' }}
      className="pdf-error-dialog overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/40"
    >
      <div className="pdf-error-dialog__header border-b border-[var(--border-color)]">
        <h2 id="confirmacion-titulo" className="text-lg font-bold">{confirmacion?.titulo}</h2>
      </div>
      <div style={{ padding: '20px' }}>
        <p className="text-sm" style={{ lineHeight: 1.5, overflowWrap: 'anywhere' }}>{confirmacion?.mensaje}</p>
        <div className="pdf-error-dialog__actions" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCerrar}
            className="pdf-error-dialog__action cursor-pointer rounded-md border border-[var(--border-color)] text-sm font-semibold hover:bg-[#EBE0D2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-purple)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            style={{ backgroundColor: confirmacion?.peligro ? '#9B1C1C' : 'var(--accent-purple)', cursor: 'pointer' }}
            className="pdf-error-dialog__action rounded-md text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-purple)]"
          >
            {confirmacion?.textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
