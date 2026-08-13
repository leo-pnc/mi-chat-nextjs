'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Hand, CalendarCheck, Star, CircleCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { MOODS, getPartnerName, TOPIC_CHATS, CHAT_TITLES, CHAT_ICONS, getWeekStart, formatPreviewText } from '@/lib/config';
import { formatPreviewTime } from '@/lib/dateFormat';
import { enablePushNotifications } from '@/lib/push';

// Puntitos decorativos fijos (no random) para el fondo del menú
const TWINKLE_DOTS = [
  { top: 6, left: 12, size: 3, color: 'var(--wine-bright)', duration: 4.5, delay: 0 },
  { top: 14, left: 82, size: 2, color: 'var(--mauve)', duration: 5.2, delay: 0.6 },
  { top: 22, left: 45, size: 4, color: 'var(--dust)', duration: 3.8, delay: 1.1 },
  { top: 30, left: 68, size: 2, color: 'var(--wine-bright)', duration: 6, delay: 0.3 },
  { top: 9, left: 30, size: 2, color: 'var(--mauve)', duration: 4.2, delay: 1.8 },
  { top: 40, left: 8, size: 3, color: 'var(--dust)', duration: 5.6, delay: 0.9 },
  { top: 48, left: 90, size: 2, color: 'var(--wine-bright)', duration: 4.8, delay: 1.4 },
  { top: 55, left: 20, size: 3, color: 'var(--mauve)', duration: 5.4, delay: 0.2 },
  { top: 62, left: 60, size: 2, color: 'var(--dust)', duration: 4.1, delay: 2.1 },
  { top: 70, left: 38, size: 4, color: 'var(--wine-bright)', duration: 6.3, delay: 0.7 },
  { top: 78, left: 84, size: 2, color: 'var(--mauve)', duration: 3.9, delay: 1.6 },
  { top: 85, left: 15, size: 3, color: 'var(--dust)', duration: 5.1, delay: 0.5 },
  { top: 92, left: 55, size: 2, color: 'var(--wine-bright)', duration: 4.6, delay: 1.2 },
  { top: 18, left: 95, size: 2, color: 'var(--dust)', duration: 5.8, delay: 0.1 },
];

export default function MenuPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [myMood, setMyMood] = useState('😴');
  const [partnerMood, setPartnerMood] = useState('?');
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [chatsSummary, setChatsSummary] = useState({});
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(null);
  const [checkinDoneThisWeek, setCheckinDoneThisWeek] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setCurrentUser(session.user.app_metadata?.display_name || null);
      enablePushNotifications(session.user.app_metadata?.display_name);
    })();
  }, [router]);

  const partnerName = currentUser ? getPartnerName(currentUser) : null;

  const loadChatsSummary = useCallback(async () => {
    if (!partnerName) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('chat_id', TOPIC_CHATS)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error cargando resumen de chats:', error);
      return;
    }

    const summary = {};
    TOPIC_CHATS.forEach((key) => {
      summary[key] = { lastMessage: null, unreadCount: 0 };
    });

    (data || []).forEach((msg) => {
      const s = summary[msg.chat_id];
      if (!s) return;
      s.lastMessage = msg;
      if (msg.sender === partnerName && !msg.read) s.unreadCount += 1;
    });

    setChatsSummary(summary);
  }, [partnerName]);

  // Marca mis propios mensajes enviados (en cualquier chat) como "entregados"
  // en cuanto detecto por presencia que mi pareja está online.
  const markMyMessagesDelivered = useCallback(async () => {
    if (!currentUser) return;
    await supabase
      .from('messages')
      .update({ delivered: true })
      .eq('sender', currentUser)
      .eq('delivered', false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !partnerName) return;

    loadChatsSummary();

    // Cargar / crear mi estado de mood
    (async () => {
      const { data } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_name', currentUser)
        .maybeSingle();

      if (data) {
        setMyMood(data.mood);
      } else {
        await supabase.from('user_status').upsert({ user_name: currentUser, mood: '😴' });
      }
    })();

    // Cargar mood actual de la pareja
    (async () => {
      const { data } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_name', partnerName)
        .maybeSingle();
      if (data) setPartnerMood(data.mood);
    })();

    // Ver si ya respondí el chequeo semanal de esta semana
    (async () => {
      const { data } = await supabase
        .from('weekly_checkins')
        .select('user_name')
        .eq('user_name', currentUser)
        .eq('week_start', getWeekStart())
        .maybeSingle();
      setCheckinDoneThisWeek(!!data);
    })();

    // Realtime: mensajes nuevos/actualizados en los chats temáticos
    const messagesChannel = supabase
      .channel('menu-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const chatId = payload.new?.chat_id || payload.old?.chat_id;
        if (!TOPIC_CHATS.includes(chatId)) return;
        loadChatsSummary();
      })
      .subscribe();

    // Realtime: cambio de mood de la pareja
    const statusChannel = supabase
      .channel('menu-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status', filter: `user_name=eq.${partnerName}` },
        (payload) => {
          if (payload.new) setPartnerMood(payload.new.mood);
        }
      )
      .subscribe();

    // Presence: saber si la pareja está online AHORA
    const presenceChannel = supabase.channel('presence-room', {
      config: { presence: { key: currentUser } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const isPartnerOnline = !!state[partnerName];
        setPartnerOnline(isPartnerOnline);
        if (isPartnerOnline) markMyMessagesDelivered();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user: currentUser, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser, partnerName, loadChatsSummary, markMyMessagesDelivered]);

  async function handleMoodSelect(emoji) {
    setMyMood(emoji);
    await supabase
      .from('user_status')
      .upsert({ user_name: currentUser, mood: emoji, updated_at: new Date().toISOString() });
  }

  function closeMoodPicker() {
    setShowMoodPicker(false);
    setDragY(0);
    dragStartY.current = null;
  }

  function handleHandlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
  }

  function handleHandlePointerMove(e) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }

  function handleHandlePointerUp() {
    if (dragY > 90) {
      closeMoodPicker();
      return;
    }
    dragStartY.current = null;
    setDragY(0);
  }

  function openChat(chatKey) {
    router.push(`/chat?chatKey=${chatKey}`);
  }

  function logout() {
    supabase.auth.signOut();
    router.push('/');
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Buenas noches';
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  if (!currentUser) return null;

  const twinkleDots = TWINKLE_DOTS;

  return (
    <div className="menu-container">
      <div className="menu-wallpaper" aria-hidden="true">
        {twinkleDots.map((dot, i) => (
          <span
            key={i}
            className="menu-twinkle"
            style={{
              top: `${dot.top}%`,
              left: `${dot.left}%`,
              width: dot.size,
              height: dot.size,
              background: dot.color,
              animationDuration: `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </div>

      <header className="menu-header">
        <div className="menu-header-text">
          <span className="menu-greeting-eyebrow">{getGreeting()}</span>
          <h2>
            {currentUser} <Hand size={20} className="inline-icon" />
          </h2>
          <p className={partnerOnline ? 'online' : 'offline'}>
            <span className={`status-dot ${partnerOnline ? 'online' : 'offline'}`} aria-hidden="true" />
            {partnerOnline
              ? `${partnerName} está en línea (${MOODS[partnerMood]?.text || '?'})`
              : `${partnerName} está desconectado/a`}
          </p>
        </div>
        <button
          className="my-mood-chip"
          onClick={() => setShowMoodPicker(true)}
          title={`Mood actual: ${MOODS[myMood]?.text || ''} — tocar para cambiar`}
          style={{ '--mood-color': MOODS[myMood]?.color || '#988289' }}
        >
          {(() => { const MyMoodIcon = MOODS[myMood]?.Icon; return MyMoodIcon ? <MyMoodIcon size={18} strokeWidth={2.5} /> : null; })()}
        </button>
      </header>

      <div className="menu-scroll">
        <div className="chat-list">
          {TOPIC_CHATS.map((key) => {
            const s = chatsSummary[key] || {};
            const preview = formatPreviewText(s.lastMessage, currentUser, partnerName);
            return (
              <div key={key} className="chat-item" onClick={() => openChat(key)}>
                <div className="chat-icon">
                  {(() => { const TopicIcon = CHAT_ICONS[key]; return TopicIcon ? <TopicIcon size={26} /> : null; })()}
                </div>
                <div className="chat-info">
                  <div className="chat-info-top">
                    <div className="chat-title">{CHAT_TITLES[key]}</div>
                    {s.lastMessage && (
                      <span className="chat-item-time">{formatPreviewTime(s.lastMessage.created_at)}</span>
                    )}
                  </div>
                  <div className="last-message">
                    {preview ? (
                      <>
                        <span className="last-message-sender">{preview.who}:</span> {preview.text}
                      </>
                    ) : (
                      'Aún no hay mensajes'
                    )}
                  </div>
                </div>
                {s.unreadCount > 0 && <div className="unread-count">{s.unreadCount}</div>}
              </div>
            );
          })}

          <div className="chat-item" onClick={() => router.push('/checkin')}>
            <div className="chat-icon"><CalendarCheck size={26} /></div>
            <div className="chat-info">
              <div className="chat-title">Chequeo semanal</div>
              <div className="last-message">
                {checkinDoneThisWeek ? (
                  <span className="inline-icon-text">
                    Ya respondiste esta semana <CircleCheck size={14} />
                  </span>
                ) : (
                  '¿Cómo estamos como pareja esta semana?'
                )}
              </div>
            </div>
            {!checkinDoneThisWeek && <div className="unread-count">!</div>}
          </div>

          <div className="chat-item" onClick={() => router.push('/agreements')}>
            <div className="chat-icon"><Star size={26} /></div>
            <div className="chat-info">
              <div className="chat-title">Acuerdos</div>
              <div className="last-message">Mensajes importantes de todos los chats</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 12 }}>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#888', fontSize: 13 }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {showMoodPicker && (
        <div className="modal-backdrop active" onClick={closeMoodPicker}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translateY(${dragY}px)`,
              transition: dragStartY.current !== null ? 'none' : 'transform 0.25s ease',
            }}
          >
            <div
              className="modal-handle-wrap"
              onPointerDown={handleHandlePointerDown}
              onPointerMove={handleHandlePointerMove}
              onPointerUp={handleHandlePointerUp}
              onPointerCancel={handleHandlePointerUp}
            >
              <div className="modal-handle" />
            </div>

            <h3>¿Cómo estás?</h3>
            <p className="mood-picker-hint">Elegí lo que mejor describe cómo te sentís ahora</p>

            <div className="mood-hero" style={{ '--mood-color': MOODS[myMood]?.color || '#988289' }}>
              <div key={myMood} className="mood-hero-icon">
                {(() => { const MyMoodIcon = MOODS[myMood]?.Icon; return MyMoodIcon ? <MyMoodIcon size={28} strokeWidth={2.2} /> : null; })()}
              </div>
              <span key={`${myMood}-label`} className="mood-hero-label">{MOODS[myMood]?.text}</span>
              <span key={`${myMood}-underline`} className="mood-hero-underline" />
            </div>

            <div className="mood-strip">
              {Object.keys(MOODS).map((emoji) => {
                const MoodIcon = MOODS[emoji].Icon;
                const selected = emoji === myMood;
                return (
                  <button
                    key={emoji}
                    className={`mood-strip-btn ${selected ? 'selected' : ''}`}
                    onClick={() => handleMoodSelect(emoji)}
                    title={MOODS[emoji].text}
                    style={{ '--mood-color': MOODS[emoji].color }}
                  >
                    <MoodIcon size={17} strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
