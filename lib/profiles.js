'use client';
// Perfiles, apodos, avatares y preferencias de cada persona + datos de la pareja.
import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { MOODS, getPartnerName } from './config';

// Los usuarios de la app (para el buzón de sugerencias: quién es el programador)
export const CREATOR_NAME = 'Leo';
export const APP_VERSION = 'Tecito v1.0';

// Colores de acento disponibles (el rosa pastel es el original)
export const ACCENTS = [
  { key: 'rosa', name: 'Rosa', color: '#F2879D' },
  { key: 'matcha', name: 'Matcha', color: '#95D2B3' },
  { key: 'lavanda', name: 'Lavanda', color: '#B8A4E3' },
  { key: 'cielo', name: 'Cielo', color: '#8EC5F0' },
  { key: 'durazno', name: 'Durazno', color: '#F5B88A' },
];

export const DEFAULT_ACCENT = '#F2879D';

// Aplica el color de acento a toda la app (variable CSS) y lo recuerda
export function applyAccent(color) {
  if (typeof document === 'undefined' || !color) return;
  document.documentElement.style.setProperty('--accent', color);
  try {
    localStorage.setItem('tecito_accent', color);
  } catch {
    // sin storage, no pasa nada
  }
}

// Avatar por defecto: círculo oscuro con la inicial, sin depender de internet
export function defaultAvatar(name = '?') {
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#2a2a2c'/><text x='50' y='50' dy='.35em' text-anchor='middle' font-family='Georgia,serif' font-size='46' fill='#F2879D'>${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Achica (y opcionalmente recorta cuadrada) una imagen antes de subirla
export async function prepareImage(file, { maxSize = 1200, square = false, quality = 0.85 } = {}) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (square) {
    const s = Math.min(sw, sh);
    sx = (sw - s) / 2;
    sy = (sh - s) / 2;
    sw = s;
    sh = s;
  }
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  if (bitmap.close) bitmap.close();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return blob;
}

// "2 años y 3 meses" o "824 días", según el formato elegido
export function formatTogether(dateStr, format) {
  if (!dateStr) return null;
  const [sy, sm, sd] = dateStr.split('-').map(Number);
  const now = new Date();
  const start = new Date(sy, sm - 1, sd);
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((todayMid - start) / 86400000);

  if (days < 0) {
    const left = -days;
    return { main: `${left} día${left === 1 ? '' : 's'}`, sub: 'para su aniversario' };
  }
  if (format === 'days') {
    return { main: `${days.toLocaleString('es-AR')} día${days === 1 ? '' : 's'}`, sub: 'juntos' };
  }

  let months = (now.getFullYear() - sy) * 12 + (now.getMonth() - (sm - 1));
  if (now.getDate() < sd) months -= 1;
  const years = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} año${years === 1 ? '' : 's'}`);
  if (m > 0) parts.push(`${m} mes${m === 1 ? '' : 'es'}`);
  return {
    main: parts.length ? parts.join(' y ') : `${days} día${days === 1 ? '' : 's'}`,
    sub: 'juntos',
  };
}

// URLs firmadas de las imágenes privadas (se guardan en memoria para no pedirlas de nuevo)
const urlCache = new Map();

async function signMissing(paths) {
  const missing = paths.filter((p) => !urlCache.has(p));
  if (missing.length) {
    const { data } = await supabase.storage.from('photos').createSignedUrls(missing, 60 * 60 * 6);
    (data || []).forEach((s) => {
      if (s.signedUrl) urlCache.set(s.path, s.signedUrl);
    });
  }
  const out = {};
  paths.forEach((p) => {
    if (urlCache.has(p)) out[p] = urlCache.get(p);
  });
  return out;
}

export function forgetSignedUrl(path) {
  if (path) urlCache.delete(path);
}

// Hook principal: perfiles de los dos, datos de la pareja y helpers de visualización.
// Todo está pensado desde el punto de vista de quien mira la pantalla.
export function useProfiles(currentUser) {
  const [profiles, setProfiles] = useState({});
  const [urls, setUrls] = useState({});
  const [couple, setCouple] = useState(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const [profilesRes, coupleRes, userRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('couple_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.auth.getUser(),
    ]);

    const rows = profilesRes.data || [];
    const map = {};
    rows.forEach((r) => {
      map[r.user_name] = r;
    });

    // Aseguramos que exista MI fila (y que tenga mi id, para identificar mis planes)
    const userId = userRes.data?.user?.id || null;
    if (!map[currentUser] || (userId && map[currentUser].user_id !== userId)) {
      const { data: saved } = await supabase
        .from('profiles')
        .upsert({ user_name: currentUser, user_id: userId }, { onConflict: 'user_name' })
        .select()
        .maybeSingle();
      if (saved) map[currentUser] = saved;
    }

    setProfiles(map);
    setCouple(coupleRes.data || null);

    const paths = Object.values(map).flatMap((r) => [r.avatar_path, r.chat_bg_path]).filter(Boolean);
    setUrls(await signMissing(paths));
    setReady(true);
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const me = currentUser ? profiles[currentUser] || null : null;

  // Cómo se muestra el nombre de alguien (apodo si lo definí, si no el nombre real)
  const nameOf = (userName) => {
    if (!userName) return '';
    if (userName === currentUser) return me?.my_nickname?.trim() || userName;
    if (userName === getPartnerName(currentUser)) return me?.partner_nickname?.trim() || userName;
    return userName;
  };

  const avatarOf = (userName) => {
    const p = profiles[userName];
    return (p?.avatar_path && urls[p.avatar_path]) || defaultAvatar(userName);
  };

  const avatarByUserId = (userId) => {
    const p = Object.values(profiles).find((x) => x.user_id === userId);
    if (p) return avatarOf(p.user_name);
    // Si la otra persona todavía no abrió la app con perfiles, asumimos que es la pareja
    return avatarOf(me && userId === me.user_id ? currentUser : getPartnerName(currentUser));
  };

  // Texto del estado de ánimo de alguien (con sus palabras si las personalizó)
  const moodLabel = (userName, emoji) =>
    profiles[userName]?.mood_labels?.[emoji]?.trim() || MOODS[emoji]?.text || '';

  const chatBgUrl = me?.chat_bg_path ? urls[me.chat_bg_path] || null : null;

  return {
    ready,
    profiles,
    me,
    couple,
    reload: load,
    nameOf,
    avatarOf,
    avatarByUserId,
    moodLabel,
    chatBgUrl,
  };
}
