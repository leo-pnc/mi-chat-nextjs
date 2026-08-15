'use client';

import { useEffect } from 'react';

// Algunos navegadores (sobre todo Chrome/Edge) no terminan de calcular bien
// la unidad `dvh` justo al cargar la página, lo que puede dejar el layout
// más alto de lo real hasta que algo fuerza un recálculo (como enfocar un
// input). Este componente mide la altura real de la ventana con JS y la
// deja en una variable CSS. Mide varias veces al arrancar (no solo una)
// porque a veces la primera medición ocurre antes de que el navegador
// termine de acomodar barras/scrollbars.
export default function ViewportHeightFix() {
  useEffect(() => {
    function setAppHeight() {
      document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
    }

    setAppHeight();
    const raf = requestAnimationFrame(setAppHeight);
    const timeouts = [100, 300, 800].map((ms) => setTimeout(setAppHeight, ms));

    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  return null;
}
