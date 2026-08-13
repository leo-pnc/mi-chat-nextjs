const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a, b) {
  const dA = new Date(a);
  const dB = new Date(b);
  return dA.getFullYear() === dB.getFullYear() && dA.getMonth() === dB.getMonth() && dA.getDate() === dB.getDate();
}

// "Hoy", "Ayer", el nombre del día si fue esta semana, o la fecha completa si ya pasó más tiempo.
export function formatDayLabel(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays > 1 && diffDays < 7) return DAYS[date.getDay()];

  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Formato corto para previsualizaciones de lista (estilo WhatsApp):
// hora si es hoy, "Ayer", día abreviado si fue esta semana, o fecha corta.
export function formatPreviewTime(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays > 1 && diffDays < 7) return DAYS[date.getDay()].slice(0, 3);

  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
}
