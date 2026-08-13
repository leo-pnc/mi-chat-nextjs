// Configuración compartida de la app (moods, chats temáticos)
import {
  Heart, Smile, Moon, Angry, Frown, CloudLightning, Brain, Meh,
  Flame, HeartHandshake, Lightbulb,
  HandHeart, PartyPopper,
  Wind, CloudRain, Sparkles,
} from 'lucide-react';

export const getPartnerName = (userName) => (userName === 'Leo' ? 'Estefi' : 'Leo');

// NOTA: las claves siguen siendo las mismas que antes (por compatibilidad
// con lo que ya está guardado en la base de datos), solo cambia cómo se
// dibujan: ahora con un ícono de lucide-react en vez del emoji crudo.
export const MOODS = {
  '😍': { text: 'Enamorado', class: 'mood-enamorado', color: '#ff6fa5', Icon: Heart },
  '😊': { text: 'Feliz', class: 'mood-happy', color: '#ffcf56', Icon: Smile },
  '😴': { text: 'Cansado/a', class: 'mood-cansado', color: '#9b97e8', Icon: Moon },
  '😡': { text: 'Enojado/a', class: 'mood-enojado', color: '#ff5c5c', Icon: Angry },
  '😔': { text: 'Triste', class: 'mood-triste', color: '#5b9bf0', Icon: Frown },
  '😫': { text: 'Estresado/a', class: 'mood-estresado', color: '#ff9d4d', Icon: CloudLightning },
  '🤯': { text: 'Ansioso/a', class: 'mood-ansioso', color: '#c67dff', Icon: Brain },
  '😐': { text: 'Neutral', class: 'mood-neutral', color: '#b8b8c2', Icon: Meh },
};

export const TOPIC_CHATS = ['discutir', 'consolar', 'debatir'];

export const CHAT_TITLES = {
  discutir: 'Desahogo',
  consolar: 'Apoyo',
  debatir: 'Tópico Neutro',
};

export const CHAT_ICONS = {
  discutir: Flame,
  consolar: HeartHandshake,
  debatir: Lightbulb,
};

// Un par de íconos complementarios por chat, usados como patrón decorativo
// de fondo (bien tenue) para darle identidad visual propia a cada tema.
export const CHAT_WALLPAPER_ICONS = {
  discutir: [Flame, Wind],
  consolar: [HeartHandshake, CloudRain],
  debatir: [Lightbulb, Sparkles],
};

export const REPAIR_MESSAGES = [
  { Icon: HandHeart, text: 'Perdón, me pasé' },
  { Icon: Heart, text: 'Necesito un abrazo' },
  { Icon: Smile, text: '¿Seguimos mañana?' },
  { Icon: Heart, text: 'Te amo igual' },
];

// Chequeo semanal: cómo sentimos que está la relación esta semana (no el mood individual)
// Las claves ('mal', 'regular', etc.) son lo que se guarda en la base de datos.
export const CHECKIN_MOODS = [
  { key: 'mal', text: 'Mal', score: 1, color: '#e05c5c', Icon: Frown },
  { key: 'regular', text: 'Regular', score: 2, color: '#e0a15c', Icon: Meh },
  { key: 'neutral', text: 'Neutral', score: 3, color: '#9a8aab', Icon: Smile },
  { key: 'bien', text: 'Bien', score: 4, color: '#e0668f', Icon: Heart },
  { key: 'excelente', text: 'Excelente', score: 5, color: '#ffcf56', Icon: PartyPopper },
];

// Lunes de la semana ISO a la que pertenece `date`, como 'YYYY-MM-DD'
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Etiqueta legible para una semana: "Esta semana", "Semana pasada", o el rango de fechas
// si ya pasó más tiempo (ej: '11 - 17 ago')
export function formatWeekLabel(weekStartStr) {
  const currentWeekStart = getWeekStart();
  if (weekStartStr === currentWeekStart) return 'Esta semana';

  const prevWeekDate = new Date(`${currentWeekStart}T00:00:00`);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  if (weekStartStr === prevWeekDate.toISOString().slice(0, 10)) return 'Semana pasada';

  const start = new Date(`${weekStartStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endMonth = end.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  return `${startDay} - ${endDay} ${endMonth}`;
}

// Busca la definición de un mood de chequeo semanal por su key (o por el
// emoji viejo, por si hay datos guardados de antes del cambio a íconos)
export function getCheckinMood(value) {
  return CHECKIN_MOODS.find((m) => m.key === value) || null;
}

// Arma el texto corto de previsualización del último mensaje de un chat,
// para la lista del menú: quién lo mandó + un resumen legible del contenido
// (maneja mensajes borrados y los eventos de pausa/"tiempo fuera").
export function formatPreviewText(msg, currentUser, partnerName) {
  if (!msg) return null;

  const who = msg.sender === currentUser ? 'Vos' : partnerName;

  if (msg.type === 'timeout_start') {
    return { who, text: `activó una pausa de ${msg.text} min` };
  }
  if (msg.type === 'timeout_end') {
    return { who, text: 'terminó la pausa' };
  }
  if (msg.deleted) {
    return { who, text: 'Mensaje eliminado' };
  }

  const text = msg.text.length > 42 ? `${msg.text.slice(0, 42)}...` : msg.text;
  return { who, text };
}
