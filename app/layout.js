import './globals.css';
import ViewportHeightFix from './ViewportHeightFix';

export const metadata = {
  title: 'Chat Pareja',
  description: 'Chat privado para dos personas',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ViewportHeightFix />
        {children}
      </body>
    </html>
  );
}
