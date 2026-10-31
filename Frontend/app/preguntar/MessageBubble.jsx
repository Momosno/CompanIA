import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

export default function MessageBubble({ message }) {
  if (message.remitente === 'user') {
    return (
      <div style={{ alignSelf: 'flex-start' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
          Vos
        </span>
        <div style={{
          backgroundColor: '#EBE0D2',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: 'var(--text-primary)',
          maxWidth: '650px'
        }}>
          {message.texto}
        </div>
      </div>
    );
  }

  return (
    <article
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '1100px'
      }}
    >
      <div className="assistant-message-content">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false, strict: 'ignore' }]]}
        >
          {message.texto}
        </ReactMarkdown>
      </div>

      {/* Lo agregado por fuera de los apuntes, siempre separado de la respuesta */}
      {message.complemento && (
        <div style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '8px',
          padding: '10px 12px',
          color: '#78350F',
          fontSize: '14px',
        }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
            El apunte no lo nombra explícitamente. Información agregada para profundizar:
          </span>
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false, strict: 'ignore' }]]}
          >
            {message.complemento}
          </ReactMarkdown>
        </div>
      )}

      {/* Citas de fuentes (SCRUM-91) */}
      {message.fuentes && message.fuentes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fuentes consultadas
          </span>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {message.fuentes.map((fuente, index) => {
              // Soporta formato objeto { documento, pagina } o texto plano tradicional
              const esObjeto = typeof fuente === 'object' && fuente !== null;
              const nombreDoc = esObjeto ? (fuente.documento || fuente.nombre || 'Documento') : fuente;
              const numeroPagina = esObjeto ? (fuente.pagina || fuente.page) : null;

              return (
                <div
                  key={`${message.id}-${index}`}
                  style={{
                    backgroundColor: '#F5EFEB',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {nombreDoc}
                  </span>

                  {numeroPagina && (
                    <span
                      style={{
                        backgroundColor: '#DFD7FA',
                        color: '#4334A6',
                        border: '1px solid #C5B8F0',
                        borderRadius: '6px',
                        padding: '1px 6px',
                        fontSize: '10px',
                        fontWeight: '700',
                      }}
                    >
                      Pág. {numeroPagina}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {message.sinFuente && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No hay fuente confiable dentro de tus apuntes para responder esto.
        </div>
      )}
    </article>
  );
}