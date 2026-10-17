import { NextResponse } from 'next/server';
import { setupServer, getProfile, sendToUser } from '@/lib/serverPush';

// Recordatorio de "mañana tenés un plan". Hay que llamarla una vez por día
// (por ejemplo con un cron). Acepta el secreto compartido del webhook
// (x-webhook-secret) o el CRON_SECRET de Vercel (Authorization: Bearer ...).

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;
const USERS = ['Leo', 'Estefi'];

function isAuthorized(request) {
  if (!WEBHOOK_SECRET && !CRON_SECRET) return true;
  if (WEBHOOK_SECRET && request.headers.get('x-webhook-secret') === WEBHOOK_SECRET) return true;
  if (CRON_SECRET && request.headers.get('authorization') === `Bearer ${CRON_SECRET}`) return true;
  return false;
}

// "Mañana" en hora de Argentina (UTC-3), como 'YYYY-MM-DD'
function tomorrowInArgentina() {
  const ar = new Date(Date.now() - 3 * 60 * 60 * 1000);
  ar.setUTCDate(ar.getUTCDate() + 1);
  return ar.toISOString().slice(0, 10);
}

async function run(request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const setup = setupServer();
  if (setup.error) return NextResponse.json({ error: setup.error }, { status: setup.status });
  const { admin } = setup;

  const tomorrow = tomorrowInArgentina();
  const { data: events, error } = await admin.from('calendar_events').select('*').eq('date', tomorrow);
  if (error) {
    console.error('Error buscando planes de mañana:', error);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }
  if (!events || events.length === 0) return NextResponse.json({ date: tomorrow, sent: 0 });

  let sent = 0;
  for (const userName of USERS) {
    const profile = await getProfile(admin, userName);
    if (profile && profile.notif_reminders === false) continue;

    for (const ev of events) {
      const time = ev.is_all_day ? 'Todo el día' : ev.time ? String(ev.time).slice(0, 5) : '';
      sent += await sendToUser(admin, userName, {
        title: ev.is_surprise ? 'Mañana hay una sorpresa ✨' : `Mañana: ${ev.title}`,
        body: ev.is_surprise ? 'Preparate... 🤫' : time || 'Un plan los espera',
        url: '/calendario',
      });
    }
  }

  return NextResponse.json({ date: tomorrow, events: events.length, sent });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
