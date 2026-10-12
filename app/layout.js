import './globals.css';
import LayoutWrapper from './LayoutWrapper';

export const metadata = {
  title: 'CompañÍA - Asistente de Estudio',
  description: 'Plataforma de planificación de estudio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}