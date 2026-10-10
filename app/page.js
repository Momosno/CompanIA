export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Encabezado */}
      <div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Jueves 22 de octubre
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Esta noche te tocan dos horas de estudio.
        </h1>
      </div>

      {/* Tarjeta Alerta de Parcial - Estilo Wireframe 1 */}
      <div style={{ 
        backgroundColor: 'var(--bg-card)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '12px', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px' 
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            backgroundColor: '#E6DCCC', 
            padding: '4px 8px', 
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: 'bold',
            border: '1px solid #D4C6B3'
          }}>
            Vie 23
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mañana es el parcial de Análisis Matemático I, unidades 1 a 3.
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Hiciste 5 de los 8 bloques que te armamos.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button style={{ 
            backgroundColor: 'var(--accent-purple)', 
            color: '#FFFFFF', 
            border: 'none', 
            padding: '10px 16px', 
            borderRadius: '8px', 
            fontWeight: '600', 
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            Hacer un test de práctica
          </button>

          <div>
            <button style={{ 
              backgroundColor: '#EBE0D2', 
              color: 'var(--text-primary)', 
              border: '1px solid #D4C6B3', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              fontWeight: '500', 
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              Preguntale a tus apuntes de Análisis I
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '2px' }}>
              Por ejemplo: ¿cuándo una función no es derivable?
            </p>
          </div>
        </div>
      </div>

      {/* Cronograma de bloques de estudio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Bloque 1 */}
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '10px', 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', width: '48px' }}>18:00</span>
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Análisis Matemático I</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Derivadas, unidad 3. Una hora.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ backgroundColor: '#E0ECD9', color: '#275E10', border: '1px solid #C4D8B8', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              Listo
            </button>
            <button style={{ backgroundColor: '#EBE0D2', color: 'var(--text-secondary)', border: '1px solid #D4C6B3', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
              Pasar a otro día
            </button>
          </div>
        </div>

        {/* Bloque Pausa */}
        <div style={{ 
          backgroundColor: 'transparent', 
          border: '1px dashed var(--border-color)', 
          borderRadius: '10px', 
          padding: '12px 16px', 
          display: 'flex', 
          gap: '20px', 
          fontSize: '12px', 
          color: 'var(--text-secondary)' 
        }}>
          <span style={{ fontWeight: 'bold', width: '48px', color: 'var(--text-primary)' }}>19:00</span>
          <span>Pausa de media hora.</span>
        </div>

        {/* Bloque 2 */}
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '10px', 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', width: '48px' }}>19:30</span>
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Física I</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cinemática, unidad 2. Una hora.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ backgroundColor: '#E0ECD9', color: '#275E10', border: '1px solid #C4D8B8', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              Listo
            </button>
            <button style={{ backgroundColor: '#EBE0D2', color: 'var(--text-secondary)', border: '1px solid #D4C6B3', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
              Pasar a otro dia
            </button>
          </div>
        </div>

        {/* Bloque Libre */}
        <div style={{ 
          backgroundColor: 'transparent', 
          border: '1px dashed var(--border-color)', 
          borderRadius: '10px', 
          padding: '12px 16px', 
          display: 'flex', 
          gap: '20px', 
          fontSize: '12px', 
          color: 'var(--text-secondary)' 
        }}>
          <span style={{ fontWeight: 'bold', width: '48px', color: 'var(--text-primary)' }}>20:30</span>
          <span>Libre. Mañana arrancás a las 9 en el trabajo.</span>
        </div>
      </div>

      {/* Sección Tus materias */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Tus materias</h2>
          <button style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
            Agregar materia
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Análisis Matemático I</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>4 unidades, 6 apuntes</p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Física I</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>3 unidades, 3 apuntes</p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Introducción a la Programación</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Todavia no cargaste apuntes</p>
          </div>
        </div>
      </div>
    </div>
  );
}