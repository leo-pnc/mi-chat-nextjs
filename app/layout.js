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
  themeColor: '#1c1330',
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
