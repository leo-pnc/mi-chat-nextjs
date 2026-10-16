import './globals.css';
import ViewportHeightFix from './ViewportHeightFix';
import ServiceWorkerRegister from './ServiceWorkerRegister';

export const metadata = {
  title: 'Chat Pareja',
  description: 'Chat privado para dos personas',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chat Pareja',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  themeColor: '#0a0712',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Le pide al navegador que, cuando aparece el teclado, REDIMENSIONE el
  // viewport visible en vez de superponerlo y scrollear la página para
  // mostrar el campo enfocado (que es lo que hacía que el header "subiera"
  // y quedara fuera de la pantalla).
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ViewportHeightFix />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
