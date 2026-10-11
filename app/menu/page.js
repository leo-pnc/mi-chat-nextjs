'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Hand, CalendarCheck, Star, Check, CheckCheck, 
  Image as ImageIcon, MessageCircle, Heart, Menu, Home, RefreshCw 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { MOODS, getPartnerName, TOPIC_CHATS, CHAT_TITLES, CHAT_ICONS, getWeekStart, formatPreviewText } from '@/lib/config';
import { formatPreviewTime } from '@/lib/dateFormat';
import { enablePushNotifications } from '@/lib/push';
import { Dancing_Script } from 'next/font/google';

const dancingFont = Dancing_Script({ 
  subsets: ['latin'], 
  weight: ['400', '500'] 
});

// Puntitos decorativos fijos
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

const FORTUNES = [
  "Las mejores cosas de la vida también se disfrutan en pareja.",
  "Hoy es un gran día para recordarte lo mucho que te amo.",
  "Tu sonrisa es mi parte favorita de la rutina.",
  "Gracias por hacer que lo ordinario se vuelva extraordinario.",
  "Vale por un abrazo de 20 segundos apenas nos veamos."
];

export default function MenuPage() {
  const router = useRouter();
  
  // --- ESTADOS ORIGINALES ---
  const [currentUser, setCurrentUser] = useState(null);
  const [myMood, setMyMood] = useState('😴');
  const [partnerMood, setPartnerMood] = useState('?');
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [chatsSummary, setChatsSummary] = useState({});
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(null);
  const [checkinDoneThisWeek, setCheckinDoneThisWeek] = useState(true);

  // --- ESTADOS PARA LA GALLETA ---
  const [cookieText, setCookieText] = useState('Tocá para abrir tu galleta de hoy');
  const [cookieOpened, setCookieOpened] = useState(false);

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

    if (error) return;

    const summary = {};
    TOPIC_CHATS.forEach((key) => { summary[key] = { lastMessage: null, unreadCount: 0 }; });

    (data || []).forEach((msg) => {
      const s = summary[msg.chat_id];
      if (!s) return;
      s.lastMessage = msg;
      if (msg.sender === partnerName && !msg.read) s.unreadCount += 1;
    });
    setChatsSummary(summary);
  }, [partnerName]);

  const markMyMessagesDelivered = useCallback(async () => {
    if (!currentUser) return;
    await supabase.from('messages').update({ delivered: true }).eq('sender', currentUser).eq('delivered', false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !partnerName) return;

    loadChatsSummary();

    (async () => {
      const { data } = await supabase.from('user_status').select('*').eq('user_name', currentUser).maybeSingle();
      if (data) setMyMood(data.mood);
      else await supabase.from('user_status').upsert({ user_name: currentUser, mood: '😴' });
    })();

    (async () => {
      const { data } = await supabase.from('user_status').select('*').eq('user_name', partnerName).maybeSingle();
      if (data) setPartnerMood(data.mood);
    })();

    (async () => {
      const { data } = await supabase.from('weekly_checkins').select('user_name').eq('user_name', currentUser).eq('week_start', getWeekStart()).maybeSingle();
      setCheckinDoneThisWeek(!!data);
    })();

    const messagesChannel = supabase.channel('menu-messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
      const chatId = payload.new?.chat_id || payload.old?.chat_id;
      if (!TOPIC_CHATS.includes(chatId)) return;
      loadChatsSummary();
    }).subscribe();

    const statusChannel = supabase.channel('menu-status').on('postgres_changes', { event: '*', schema: 'public', table: 'user_status', filter: `user_name=eq.${partnerName}` }, (payload) => {
      if (payload.new) setPartnerMood(payload.new.mood);
    }).subscribe();

    const presenceChannel = supabase.channel('presence-room', { config: { presence: { key: currentUser } } });
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const isPartnerOnline = !!state[partnerName];
      setPartnerOnline(isPartnerOnline);
      if (isPartnerOnline) markMyMessagesDelivered();
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await presenceChannel.track({ user: currentUser, online_at: new Date().toISOString() });
    });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser, partnerName, loadChatsSummary, markMyMessagesDelivered]);

  // --- LÓGICA DE LA GALLETA ---
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('tecito_cookie_date');
    const savedMsg = localStorage.getItem('tecito_cookie_msg');
    
    if (lastDate === today && savedMsg) {
      setCookieText(savedMsg);
      setCookieOpened(true);
    }
  }, []);

  const openCookie = () => {
    if (cookieOpened) return;
    const today = new Date().toISOString().split('T')[0];
    const msg = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    localStorage.setItem('tecito_cookie_date', today);
    localStorage.setItem('tecito_cookie_msg', msg);
    setCookieText(msg);
    setCookieOpened(true);
  };

  async function handleMoodSelect(emoji) {
    setMyMood(emoji);
    await supabase.from('user_status').upsert({ user_name: currentUser, mood: emoji, updated_at: new Date().toISOString() });
  }

  function closeMoodPicker() {
    setShowMoodPicker(false);
    setDragY(0);
    dragStartY.current = null;
  }

  function handleHandlePointerDown(e) {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setDragY(0);
    function onMove(ev) {
      if (dragStartY.current === null) return;
      const delta = ev.clientY - dragStartY.current;
      setDragY(delta > 0 ? delta : 0);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragY((current) => {
        if (current > 90) setShowMoodPicker(false);
        return 0;
      });
      dragStartY.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function openChat(chatKey) { router.push(`/chat?chatKey=${chatKey}`); }


  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans pb-24 relative overflow-x-hidden">
      
      {/* Fondo de estrellas (Mantiene tus clases CSS actuales) */}
      <div className="menu-wallpaper opacity-30 pointer-events-none absolute inset-0" aria-hidden="true">
        {TWINKLE_DOTS.map((dot, i) => (
          <span
            key={i}
            className="menu-twinkle"
            style={{
              top: `${dot.top}%`, left: `${dot.left}%`, width: dot.size, height: dot.size,
              background: dot.color, animationDuration: `${dot.duration}s`, animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </div>

{/* HEADER TECITO */}
      <header className="flex justify-between items-center px-6 pt-10 pb-4 relative z-10">
        
        {/* Lado Izquierdo: Título y Corazón */}
        <div className="flex items-center">
          <h1 
            className={`text-[46px] text-[#FDF2F2] tracking-wide font-normal leading-none select-none mt-1 ${dancingFont.className}`}
          >
            Tecito
          </h1>
          
          {/* Corazón artesanal (Trazo más oscuro y natural) */}
          <svg 
            viewBox="0 0 24 24" 
            width="34" 
            height="34" 
            className="ml-1.5 mt-2 text-[#F2879D]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21.5 C12 21.5 2.5 14 3 8 C3.5 3.5 9.5 3.5 12 7.5 C14.5 3.5 20.5 3.5 21 8 C21.5 14 11.5 22 11.5 22" />
          </svg>
        </div>
        
        {/* Lado Derecho: Perfil de Pareja Minimalista */}
        <div className="flex items-center gap-2.5">
          
          {/* Foto Cuadrada con Bordes Redondos */}
          <div 
            className="w-12 h-12 rounded-[14px] border-[1.5px] flex-shrink-0 overflow-hidden shadow-sm relative transition-colors duration-300"
            style={{ borderColor: MOODS[partnerMood]?.color || '#52525B' }}
          >
            <img 
              src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=200&auto=format&fit=crop" 
              alt={partnerName || "Pareja"} 
              className="w-full h-full object-cover"
            />
            {/* Puntito de conexión */}
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-br-[12px] rounded-tl-lg border-2 border-[#121212] ${partnerOnline ? 'bg-green-500' : 'bg-zinc-600'}`} />
          </div>

          {/* Ícono de Estado de Ánimo de la pareja */}
          <div style={{ color: MOODS[partnerMood]?.color || '#A1A1AA' }} className="flex items-center justify-center">
            {(() => { 
              const PartnerMoodIcon = MOODS[partnerMood]?.Icon; 
              return PartnerMoodIcon ? <PartnerMoodIcon size={26} strokeWidth={2.2} /> : null; 
            })()}
          </div>

        </div>
      </header>

      <main className="px-6 space-y-6 relative z-10">
        
        {/* HERO BANNER */}
        <div className="relative w-full h-44 rounded-3xl overflow-hidden shadow-xl mt-2">
          <img 
            src="./../public/fondo_principal.png" 
            alt="Atardecer" 
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-5">
            <h2 className="text-2xl font-serif italic text-[#F4D1D1] leading-tight mb-1.5">
              Qué bueno tenerte acá ♡
            </h2>
            <p className="text-xs text-zinc-300 font-light">Seguimos construyendo nuestros momentos.</p>
          </div>
        </div>

        {/* GRILLA DE MÓDULOS */}
        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => router.push('/galeria')} className="bg-[#6E5A63] p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 aspect-square active:scale-95 transition-transform">
            <ImageIcon size={22} className="text-zinc-100" />
            <span className="block font-medium text-[11px]">Fotos</span>
          </button>
          
          <button onClick={() => openChat(TOPIC_CHATS[0])} className="bg-[#8A5A5C] p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 aspect-square active:scale-95 transition-transform">
            <MessageCircle size={22} className="text-zinc-100" />
            <span className="block font-medium text-[11px]">Chat</span>
          </button>

          <button onClick={() => router.push('/agreements')} className="bg-[#967454] p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 aspect-square active:scale-95 transition-transform">
            <Star size={22} className="text-zinc-100" />
            <span className="block font-medium text-[11px]">Acuerdos</span>
          </button>

          <button onClick={() => router.push('/checkin')} className="bg-[#5D6B5A] p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 aspect-square active:scale-95 transition-transform relative">
            <CalendarCheck size={22} className="text-zinc-100" />
            {!checkinDoneThisWeek && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />}
            <span className="block font-medium text-[11px]">Chequeo</span>
          </button>
        </div>

        {/* WIDGET GALLETA DE LA SUERTE */}
        <div 
          onClick={openCookie}
          className={`rounded-3xl p-5 border flex gap-4 items-center transition-all duration-300 ${cookieOpened ? 'bg-[#1C1C1E] border-zinc-800' : 'bg-[#967454]/20 border-[#967454] cursor-pointer active:scale-[0.98]'}`}
        >
          <div className="text-5xl drop-shadow-lg">{cookieOpened ? '🥠✨' : '🥠'}</div>
          <div className="flex-1">
            <h3 className="text-[10px] tracking-widest uppercase text-[#F4D1D1] font-semibold mb-1">
              {cookieOpened ? 'Mensaje del día' : 'Galleta de la suerte'}
            </h3>
            <p className={`text-sm font-serif italic mb-2 leading-snug ${cookieOpened ? 'text-zinc-200' : 'text-zinc-400'}`}>
              "{cookieText}"
            </p>
          </div>
        </div>

        {/* LISTA DE CHATS TEMÁTICOS (Tu código adaptado al dark mode) */}
        <div className="mt-6">
          <h3 className="text-[11px] tracking-widest uppercase text-zinc-500 font-semibold mb-3 px-1">Nuestras Charlas</h3>
          <div className="flex flex-col gap-2">
            {TOPIC_CHATS.map((key) => {
              const s = chatsSummary[key] || {};
              const preview = formatPreviewText(s.lastMessage, currentUser, partnerName);
              return (
                <div key={key} onClick={() => openChat(key)} className="bg-[#1C1C1E] border border-zinc-800/60 p-3.5 rounded-2xl flex items-center gap-3 active:bg-zinc-800 transition-colors">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                    {(() => { const TopicIcon = CHAT_ICONS[key]; return TopicIcon ? <TopicIcon size={22} /> : null; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="text-sm font-medium text-zinc-100 truncate">{CHAT_TITLES[key]}</h4>
                      {s.lastMessage && (
                        <span className="text-[10px] text-zinc-500">{formatPreviewTime(s.lastMessage.created_at)}</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 truncate flex items-center gap-1">
                      {preview ? (
                        <>
                          <span className="font-semibold text-zinc-300">{preview.who}:</span> {preview.text}
                          {s.lastMessage.sender === currentUser && !s.lastMessage.deleted && s.lastMessage.type !== 'timeout_start' && s.lastMessage.type !== 'timeout_end' && (
                            <span className={`ml-1 ${s.lastMessage.read ? 'text-[#8A5A5C]' : s.lastMessage.delivered ? 'text-zinc-500' : 'text-zinc-600'}`}>
                              {s.lastMessage.read || s.lastMessage.delivered ? <CheckCheck size={12} /> : <Check size={12} />}
                            </span>
                          )}
                        </>
                      ) : ('Aún no hay mensajes')}
                    </div>
                  </div>
                  {s.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-[#8A5A5C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {s.unreadCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* NAVEGACIÓN INFERIOR (Bottom Nav) */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#121212]/95 backdrop-blur-md border-t border-zinc-800/80 px-6 py-3 flex justify-between items-center z-40 pb-safe">
        <button className="flex flex-col items-center gap-1 text-[#F4D1D1]">
          <Home size={20} />
          <span className="text-[9px] font-medium">Inicio</span>
        </button>
        
        <button onClick={() => router.push('/galeria')} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <ImageIcon size={20} />
          <span className="text-[9px] font-medium">Fotos</span>
        </button>
        
        <button onClick={() => openChat(TOPIC_CHATS[0])} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors relative">
          <MessageCircle size={20} />
          <span className="text-[9px] font-medium">Chat</span>
        </button>
        
        {/* BOTÓN DE ÁNIMO (Dinámico según tu estado actual) */}
        <button 
          onClick={() => setShowMoodPicker(true)} 
          className="flex flex-col items-center gap-1 transition-colors active:scale-95"
          style={{ color: MOODS[myMood]?.color || '#71717a' }}
        >
          {(() => { 
            const MyMoodIcon = MOODS[myMood]?.Icon; 
            // Si por algún motivo no carga tu ícono, muestra el corazón por defecto
            return MyMoodIcon ? <MyMoodIcon size={20} strokeWidth={2.5} /> : <Heart size={20} />; 
          })()}
          <span className="text-[9px] font-medium text-zinc-500">Ánimo</span>
        </button>
      </nav>

      {/* MODAL DE MOOD (Se mantiene tu HTML y clases originales intactas) */}
      {showMoodPicker && (
        <div className="modal-backdrop active" onClick={closeMoodPicker}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `translateY(${dragY}px)`, transition: dragStartY.current !== null ? 'none' : 'transform 0.25s ease' }}
          >
            <div className="modal-handle-wrap" onPointerDown={handleHandlePointerDown}>
              <div className="modal-handle" />
            </div>
            <h3 className="text-zinc-800">¿Cómo estás?</h3>
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