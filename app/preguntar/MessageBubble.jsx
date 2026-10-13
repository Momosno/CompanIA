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

      {message.fuentes && message.fuentes.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          {message.fuentes.map((fuente, index) => (
            <div
              key={`${message.id}-${index}`}
              style={{
                backgroundColor: '#EFE9DD',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}
            >
              {fuente}
            </div>
          ))}
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