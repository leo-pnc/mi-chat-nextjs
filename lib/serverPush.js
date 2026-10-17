// Utilidades de servidor para mandar notificaciones push (solo se usan en /api/*)
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Devuelve { admin } listo para usar, o { error, status } si falta configuración
export function setupServer() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Faltan VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    return { error: 'VAPID keys not configured', status: 500 };
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    return { error: 'Supabase admin not configured', status: 500 };
  }
  webpush.setVapidDetails('mailto:contacto@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return { admin: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) };
}

// Perfil (apodos y preferencias) de una persona; null si todavía no tiene
export async function getProfile(admin, userName) {
  const { data } = await admin.from('profiles').select('*').eq('user_name', userName).maybeSingle();
  return data || null;
}

// Cómo `viewerName` ve el nombre de `otherName` (con su apodo si lo definió)
export function nicknameFor(viewerProfile, otherName) {
  return viewerProfile?.partner_nickname?.trim() || otherName;
}

// Manda una notificación a todos los dispositivos de una persona.
// payload: { title, body, chatKey?, url?, silent? }
export async function sendToUser(admin, userName, payload) {
  const { data: subs, error } = await admin.from('push_subscriptions').select('*').eq('user_name', userName);
  if (error) {
    console.error('Error buscando suscripciones push:', error);
    return 0;
  }
  if (!subs || subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;
  const toRemove = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent += 1;
      } catch (err) {
        // Suscripción vencida/inválida: la borramos para no seguir intentando
        if (err.statusCode === 404 || err.statusCode === 410) {
          toRemove.push(sub.endpoint);
        } else {
          console.error('Error enviando push:', err.message);
        }
      }
    })
  );

  if (toRemove.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', toRemove);
  }
  return sent;
}
