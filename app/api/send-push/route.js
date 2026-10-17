import { NextResponse } from 'next/server';
import { getPartnerName, MOODS } from '@/lib/config';
import { setupServer, getProfile, nicknameFor, sendToUser } from '@/lib/serverPush';

// Esta ruta la llaman los Database Webhooks de Supabase. Según la tabla que
// cambió, avisa a la otra persona (respetando lo que cada uno configuró):
//   - messages          (INSERT) → "X te escribió"        (+ sonido/silencio)
//   - calendar_events   (INSERT) → "X agendó un plan"
//   - user_status       (UPDATE) → "X actualizó su estado" (radar de humor)
//   - suggestions       (INSERT) → idea nueva para el programador

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;
const CREATOR_NAME = 'Leo';

async function handleMessage(admin, record) {
  // Los mensajes de sistema (inicio/fin de pausa) no generan notificación push
  if (record.type === 'timeout_start' || record.type === 'timeout_end') return { skipped: true };

  const sender = record.sender;
  const recipient = getPartnerName(sender);
  const rp = await getProfile(admin, recipient);

  const sent = await sendToUser(admin, recipient, {
    title: `${nicknameFor(rp, sender)} te escribió 💌`,
    body: (record.text || 'Nuevo mensaje').slice(0, 100),
    chatKey: record.chat_id,
    silent: rp?.chat_sound === false,
  });
  return { sent };
}

async function handlePlan(admin, record) {
  // "creator" es el id de la cuenta; buscamos a quién pertenece
  let creatorName = null;
  const { data: p } = await admin.from('profiles').select('user_name').eq('user_id', record.creator).maybeSingle();
  creatorName = p?.user_name || null;
  if (!creatorName) {
    const { data } = await admin.auth.admin.getUserById(record.creator);
    creatorName = data?.user?.app_metadata?.display_name || null;
  }
  if (!creatorName) return { skipped: true };

  const recipient = getPartnerName(creatorName);
  const rp = await getProfile(admin, recipient);
  if (rp && rp.notif_plans === false) return { skipped: true };

  const [y, m, d] = String(record.date).split('-').map(Number);
  const day = new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  const time = record.time ? ` · ${String(record.time).slice(0, 5)}` : '';

  const sent = await sendToUser(admin, recipient, {
    title: `${nicknameFor(rp, creatorName)} agendó un plan ✨`,
    body: record.is_surprise ? 'Es una sorpresa... 🤫' : `${record.title} · ${day}${time}`,
    url: '/calendario',
  });
  return { sent };
}

async function handleMood(admin, record, oldRecord) {
  if (!record?.user_name || !record.mood) return { skipped: true };
  if (oldRecord?.mood === record.mood) return { skipped: true };

  const sender = record.user_name;
  const recipient = getPartnerName(sender);
  const rp = await getProfile(admin, recipient);
  if (!rp?.notif_mood) return { skipped: true };

  const sp = await getProfile(admin, sender);
  const label = sp?.mood_labels?.[record.mood]?.trim() || MOODS[record.mood]?.text || record.mood;

  const sent = await sendToUser(admin, recipient, {
    title: `${nicknameFor(rp, sender)} actualizó su estado 💭`,
    body: `Ahora: ${label}`,
    url: '/menu',
  });
  return { sent };
}

async function handleSuggestion(admin, record) {
  if (!record?.text || record.from_user === CREATOR_NAME) return { skipped: true };
  const sent = await sendToUser(admin, CREATOR_NAME, {
    title: `💡 Nueva idea de ${record.from_user}`,
    body: record.text.slice(0, 100),
    url: '/configuracion',
  });
  return { sent };
}

export async function POST(request) {
  // 1. Verificar el secreto compartido (evita que cualquiera dispare pushes)
  if (WEBHOOK_SECRET) {
    const incomingSecret = request.headers.get('x-webhook-secret');
    if (incomingSecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const setup = setupServer();
  if (setup.error) return NextResponse.json({ error: setup.error }, { status: setup.status });
  const { admin } = setup;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const record = body.record;
  if (!record) return NextResponse.json({ error: 'no record' }, { status: 400 });

  // Si el webhook no manda la tabla, asumimos "messages" (como funcionaba antes)
  const table = body.table || 'messages';

  try {
    let result;
    if (table === 'calendar_events') result = await handlePlan(admin, record);
    else if (table === 'user_status') result = await handleMood(admin, record, body.old_record);
    else if (table === 'suggestions') result = await handleSuggestion(admin, record);
    else if (record.sender) result = await handleMessage(admin, record);
    else return NextResponse.json({ error: 'no record' }, { status: 400 });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error procesando webhook:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
