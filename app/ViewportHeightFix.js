'use client';

import { useEffect } from 'react';

// Algunos navegadores (sobre todo Chrome/Edge) no terminan de calcular bien
// la unidad `dvh` justo al cargar la página, lo que puede dejar el layout
// más alto de lo real hasta que algo fuerza un recálculo. Este componente
// mide la altura real de la ventana con JS y la deja en una variable CSS,
// para no depender solo de `dvh`.
export default function ViewportHeightFix() {
  useEffect(() => {
    function setAppHeight() {
      document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
    }
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  return null;
}
