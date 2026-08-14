'use client';

import { useEffect } from 'react';

// Registra el service worker apenas carga la app, sin esperar a que el
// usuario acepte notificaciones. Esto es lo que hace que el navegador
// considere la app "instalable" (junto con el manifest.json).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  }, []);

  return null;
}
