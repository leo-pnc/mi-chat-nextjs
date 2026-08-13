import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Esta ruta la llama un Database Webhook de Supabase cada vez que se
// inserta una fila en la tabla "messages". Busca las suscripciones push
// del destinatario (el que NO mandó el mensaje) y le manda la notificación.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getPartnerName = (userName) => (userName === 'Leo' ? 'Estefi' : 'Leo');

export async function POST(request) {
  // 1. Verificar el secreto compartido (evita que cualquiera dispare pushes)
  if (WEBHOOK_SECRET) {
    const incomingSecret = request.headers.get('x-webhook-secret');
    if (incomingSecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Faltan VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ error: 'Supabase admin not configured' }, { status: 500 });
  }

  webpush.setVapidDetails('mailto:contacto@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const record = body.record;
  if (!record || !record.sender) {
    return NextResponse.json({ error: 'no record' }, { status: 400 });
  }

  // Los mensajes de sistema (inicio/fin de pausa) no generan notificación push
  if (record.type === 'timeout_start' || record.type === 'timeout_end') {
    return NextResponse.json({ skipped: true });
  }

  const sender = record.sender;
  const recipient = getPartnerName(sender);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_name', recipient);

  if (error) {
    console.error('Error buscando suscripciones push:', error);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({
    title: `${sender} te escribió 💌`,
    body: (record.text || 'Nuevo mensaje').slice(0, 100),
    chatKey: record.chat_id,
  });

  let sent = 0;
  const toRemove = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
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
    await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', toRemove);
  }

  return NextResponse.json({ sent });
}
