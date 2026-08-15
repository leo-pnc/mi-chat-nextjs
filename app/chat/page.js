'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Pause, CircleCheck, Star, Pencil, Trash2, X,
  Check, CheckCheck, NotebookPen, Mail, TriangleAlert, Send, Smile,
  MessageCircle, Heart, HandHeart,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { MOODS, getPartnerName, CHAT_TITLES, CHAT_ICONS, CHAT_WALLPAPER_ICONS, REPAIR_MESSAGES } from '@/lib/config';
import { findProfanity } from '@/lib/profanity';
import { formatDayLabel, isSameDay } from '@/lib/dateFormat';

const EMOJI_OPTIONS = [
  '😀', '😂', '❤️', '🥰', '😘', '😊', '😍', '😉',
  '😢', '😭', '😡', '😔', '😫', '😴', '🤔', '😳',
  '🙇', '🙏', '👍', '👏', '🤗', '✨', '🔥', '🎉',
  '💔', '💕', '🙈', '🙃', '😬', '😅', '🥳', '🙌',
];

// Posiciones fijas (no random en cada render) para el patrón decorativo de fondo
const WALLPAPER_POSITIONS = [
  { top: '4%', left: '8%', rotate: -12, size: 30 },
  { top: '9%', left: '78%', rotate: 18, size: 26 },
  { top: '20%', left: '35%', rotate: -6, size: 22 },
  { top: '28%', left: '92%', rotate: 10, size: 30 },
  { top: '36%', left: '4%', rotate: 22, size: 24 },
  { top: '15%', left: '55%', rotate: 24, size: 20 },
  { top: '44%', left: '58%', rotate: -18, size: 28 },
  { top: '52%', left: '20%', rotate: 8, size: 22 },
  { top: '50%', left: '5%', rotate: -14, size: 20 },
  { top: '60%', left: '85%', rotate: -10, size: 26 },
  { top: '68%', left: '45%', rotate: 16, size: 24 },
  { top: '76%', left: '10%', rotate: -20, size: 30 },
  { top: '83%', left: '68%', rotate: 12, size: 22 },
  { top: '90%', left: '30%', rotate: -8, size: 26 },
  { top: '95%', left: '82%', rotate: 14, size: 20 },
];

const TIMEOUT_DURATION_SECONDS = 20 * 60;

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const chatKey = params.get('chatKey');

  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerMood, setPartnerMood] = useState('?');
  const [blockedWarning, setBlockedWarning] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFields, setTemplateFields] = useState({ situacion: '', sentimiento: '', necesidad: '' });
  const [templateDragY, setTemplateDragY] = useState(0);
  const templateDragStartY = useRef(null);
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [repairDragY, setRepairDragY] = useState(0);
  const repairDragStartY = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef(null);
  const messageContainerRef = useRef(null);
  const lastMessageRowRef = useRef(null);
  const textareaRef = useRef(null);
  const msgChannelRef = useRef(null);
  const typingResetRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      if (!chatKey) {
        router.push('/menu');
        return;
      }
      setCurrentUser(session.user.app_metadata?.display_name || null);
    })();
  }, [router, chatKey]);

  const partnerName = currentUser ? getPartnerName(currentUser) : null;

  const markPartnerMessagesRead = useCallback(async () => {
    if (!currentUser || !chatKey || !partnerName) return;
    await supabase
      .from('messages')
      .update({ read: true, delivered: true })
      .eq('chat_id', chatKey)
      .eq('sender', partnerName)
      .eq('read', false);
  }, [currentUser, chatKey, partnerName]);

  // Marca mis propios mensajes enviados como "entregados" en cuanto detecto
  // (vía presencia, que ya sabemos que anda en tiempo real) que mi pareja está online.
  const markMyMessagesDelivered = useCallback(async () => {
    if (!currentUser) return;
    await supabase
      .from('messages')
      .update({ delivered: true })
      .eq('sender', currentUser)
      .eq('delivered', false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !chatKey || !partnerName) return;

    // Cargar historial completo (persistencia real desde Supabase)
    (async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatKey)
        .order('created_at', { ascending: true });

      if (error) console.error(error);
      setMessages(data || []);
      markPartnerMessagesRead();
    })();

    // Mood actual de la pareja
    (async () => {
      const { data } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_name', partnerName)
        .maybeSingle();
      if (data) setPartnerMood(data.mood);
    })();

    // Realtime: mensajes nuevos y actualizados (leídos / importantes) de este chat, y "escribiendo..."
    const msgChannel = supabase
      .channel(`chat-${chatKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatKey}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.sender === partnerName) markPartnerMessagesRead();
          setPartnerTyping(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatKey}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user === partnerName) {
          setPartnerTyping(true);
          clearTimeout(typingResetRef.current);
          typingResetRef.current = setTimeout(() => setPartnerTyping(false), 3000);
        }
      })
      .subscribe();

    msgChannelRef.current = msgChannel;

    // Realtime: mood de la pareja
    const statusChannel = supabase
      .channel(`chat-status-${chatKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status', filter: `user_name=eq.${partnerName}` },
        (payload) => {
          if (payload.new) setPartnerMood(payload.new.mood);
        }
      )
      .subscribe();

    // Presence: online/offline de la pareja
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
          await presenceChannel.track({ user: currentUser });
        }
      });

    return () => {
      clearTimeout(typingResetRef.current);
      msgChannelRef.current = null;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser, chatKey, partnerName, markPartnerMessagesRead, markMyMessagesDelivered]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize del cuadro de texto: arranca en una línea y crece con el contenido hasta el máximo del CSS
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Si el último mensaje todavía asoma (aunque sea un poco) en el área visible del chat,
  // subo la vista al tocar para escribir, así sigue viéndose con el teclado abierto.
  // Si el último mensaje ya no se ve nada (estoy leyendo algo más viejo), no toco el scroll.
  function handleInputFocus() {
    const container = messageContainerRef.current;
    const lastMsg = lastMessageRowRef.current;
    if (!container || !lastMsg) return;
    const containerRect = container.getBoundingClientRect();
    const lastMsgRect = lastMsg.getBoundingClientRect();
    const lastMessageStillVisible = lastMsgRect.top < containerRect.bottom;
    if (lastMessageStillVisible) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
      }, 300);
    }
  }

  // Reloj para la cuenta regresiva del "tiempo fuera"
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Encuentra si hay una pausa activa mirando el último mensaje de tipo timeout_*
  const lastTimeoutMsg = [...messages].reverse().find((m) => m.type === 'timeout_start' || m.type === 'timeout_end');
  const timeoutEndsAt = lastTimeoutMsg?.type === 'timeout_start'
    ? new Date(lastTimeoutMsg.created_at).getTime() + TIMEOUT_DURATION_SECONDS * 1000
    : null;
  const activeTimeout = timeoutEndsAt && timeoutEndsAt > now ? lastTimeoutMsg : null;
  const remainingSeconds = activeTimeout ? Math.max(0, Math.round((timeoutEndsAt - now) / 1000)) : 0;

  async function startTimeout() {
    if (!currentUser || !chatKey || activeTimeout) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const msg = {
      id,
      chat_id: chatKey,
      sender: currentUser,
      text: String(TIMEOUT_DURATION_SECONDS / 60),
      type: 'timeout_start',
      important: false,
      read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    const { error } = await supabase.from('messages').insert(msg);
    if (error) console.error('Error activando tiempo fuera:', error);
  }

  async function endTimeout() {
    if (!currentUser || !chatKey || !activeTimeout) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const msg = {
      id,
      chat_id: chatKey,
      sender: currentUser,
      text: '',
      type: 'timeout_end',
      important: false,
      read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    const { error } = await supabase.from('messages').insert(msg);
    if (error) console.error('Error terminando tiempo fuera:', error);
  }

  function openTemplateModal() {
    setShowRepairPanel(false);
    setTemplateFields({ situacion: '', sentimiento: '', necesidad: '' });
    setTemplateDragY(0);
    setShowTemplateModal(true);
  }

  function closeTemplateModal() {
    setShowTemplateModal(false);
    setTemplateDragY(0);
    templateDragStartY.current = null;
  }

  function handleTemplateHandlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    templateDragStartY.current = e.clientY;
  }

  function handleTemplateHandlePointerMove(e) {
    if (templateDragStartY.current === null) return;
    const delta = e.clientY - templateDragStartY.current;
    if (delta > 0) setTemplateDragY(delta);
  }

  function handleTemplateHandlePointerUp() {
    if (templateDragY > 90) {
      closeTemplateModal();
      return;
    }
    templateDragStartY.current = null;
    setTemplateDragY(0);
  }

  function applyTemplate() {
    const { situacion, sentimiento, necesidad } = templateFields;
    if (!situacion.trim() && !sentimiento.trim() && !necesidad.trim()) {
      closeTemplateModal();
      return;
    }
    const text = `Cuando pasa ${situacion.trim() || '___'}, yo siento ${sentimiento.trim() || '___'}, y necesito ${necesidad.trim() || '___'}.`;
    setInput(text);
    closeTemplateModal();
    setEditingId(null);
    setReplyTo(null);
  }

  async function sendRepairMessage(text) {
    if (!currentUser || !chatKey || activeTimeout) return;
    setShowRepairPanel(false);

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const optimisticMsg = {
      id,
      chat_id: chatKey,
      sender: currentUser,
      text,
      reply_to_id: null,
      important: false,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from('messages').insert({
      id,
      chat_id: chatKey,
      sender: currentUser,
      text,
      reply_to_id: null,
    });

    if (error) console.error('Error enviando reparación rápida:', error);
  }

  function closeRepairPanel() {
    setShowRepairPanel(false);
    setRepairDragY(0);
    repairDragStartY.current = null;
  }

  function handleRepairPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    repairDragStartY.current = e.clientY;
  }

  function handleRepairPointerMove(e) {
    if (repairDragStartY.current === null) return;
    const delta = e.clientY - repairDragStartY.current;
    if (delta > 0) setRepairDragY(delta);
  }

  function handleRepairPointerUp() {
    if (repairDragY > 40) {
      closeRepairPanel();
      return;
    }
    repairDragStartY.current = null;
    setRepairDragY(0);
  }

  function notifyTyping() {
    const channel = msgChannelRef.current;
    if (!channel || !currentUser) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    channel.send({ type: 'broadcast', event: 'typing', payload: { user: currentUser } });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !currentUser || !chatKey || activeTimeout) return;

    const bad = findProfanity(text);
    if (bad) {
      setBlockedWarning('Ese mensaje tiene una grosería, corregilo antes de enviarlo.');
      return;
    }
    setBlockedWarning('');

    if (editingId) {
      const id = editingId;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, edited: true } : m)));
      setEditingId(null);
      setInput('');

      const { error } = await supabase
        .from('messages')
        .update({ text, edited: true })
        .eq('id', id);

      if (error) console.error('Error editando mensaje:', error);
      return;
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // Optimista: lo mostramos ya mismo en pantalla
    const optimisticMsg = {
      id,
      chat_id: chatKey,
      sender: currentUser,
      text,
      reply_to_id: replyTo?.id || null,
      important: false,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    setReplyTo(null);

    const { error } = await supabase.from('messages').insert({
      id,
      chat_id: chatKey,
      sender: currentUser,
      text,
      reply_to_id: optimisticMsg.reply_to_id,
    });

    if (error) {
      console.error('Error enviando mensaje:', error);
    } else if (partnerOnline) {
      markMyMessagesDelivered();
    }
  }

  function insertEmoji(emoji) {
    setInput((prev) => prev + emoji);
  }

  async function markImportant(id) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, important: true } : m)));
    await supabase.from('messages').update({ important: true }).eq('id', id);
  }

  function startEdit(msg) {
    setEditingId(msg.id);
    setInput(msg.text);
    setReplyTo(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setInput('');
  }

  async function deleteMessage(id) {
    if (!window.confirm('¿Borrar este mensaje? No se puede deshacer.')) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, text: '' } : m)));
    const { error } = await supabase
      .from('messages')
      .update({ deleted: true, text: '' })
      .eq('id', id);
    if (error) console.error('Error borrando mensaje:', error);
  }

  if (!currentUser || !chatKey) return null;

  const ChatIcon = CHAT_ICONS[chatKey];
  const shortTitle = (CHAT_TITLES[chatKey] || chatKey).split(' (')[0];
  const PartnerMoodIcon = MOODS[partnerMood]?.Icon;

  return (
    <div className="chat-container">
      <header className="chat-header">
        <button className="icon-only-btn" onClick={() => router.push('/menu')} title="Volver">
          <ArrowLeft size={20} />
        </button>
        {ChatIcon && <ChatIcon size={20} className="header-chat-icon" />}
        <div className="header-title-block">
          <div className="chat-title-header">{shortTitle}</div>
          <div className={partnerTyping ? 'typing' : (partnerOnline ? 'online' : 'offline')}>
            {partnerTyping ? (
              <span className="inline-icon-text">
                Escribiendo
                <span className="typing-dots"><span></span><span></span><span></span></span>
              </span>
            ) : partnerOnline ? (
              <span className="inline-icon-text">
                En línea
                {PartnerMoodIcon && (
                  <span
                    className="partner-mood-badge"
                    style={{ color: MOODS[partnerMood]?.color || 'currentColor' }}
                    title={MOODS[partnerMood]?.text}
                  >
                    <PartnerMoodIcon size={12} strokeWidth={2.5} />
                  </span>
                )}
              </span>
            ) : (
              'Desconectado/a'
            )}
          </div>
        </div>
        {!activeTimeout && (
          <button className="timeout-header-btn" onClick={startTimeout} title="Activar tiempo fuera">
            <Pause size={18} />
          </button>
        )}
      </header>

      {activeTimeout && (
        <div className="timeout-banner">
          <span>
            <Pause size={14} className="inline-icon" /> {activeTimeout.sender === currentUser ? 'Activaste' : `${activeTimeout.sender} activó`} una pausa
            {' — '}quedan {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:
            {String(remainingSeconds % 60).padStart(2, '0')}
          </span>
          <button onClick={endTimeout}>Terminar pausa</button>
        </div>
      )}

      <div className={`message-container msg-bg-${chatKey}`} ref={messageContainerRef}>
        <div className="chat-wallpaper" aria-hidden="true">
          {WALLPAPER_POSITIONS.map((p, i) => {
            const icons = CHAT_WALLPAPER_ICONS[chatKey] || [];
            const WIcon = icons[i % icons.length];
            if (!WIcon) return null;
            return (
              <WIcon
                key={i}
                size={p.size}
                strokeWidth={1.75}
                className="chat-wallpaper-icon"
                style={{ top: p.top, left: p.left, transform: `rotate(${p.rotate}deg)` }}
              />
            );
          })}
        </div>
        <div className="message-scroll-inner">
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const showDateSeparator = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);
          const dateSeparator = showDateSeparator ? (
            <div className="date-separator"><span>{formatDayLabel(msg.created_at)}</span></div>
          ) : null;

          if (msg.type === 'timeout_start' || msg.type === 'timeout_end') {
            return (
              <div key={msg.id} className="message-row system" ref={idx === messages.length - 1 ? lastMessageRowRef : null}>
                {dateSeparator}
                <div className="system-message">
                  {msg.type === 'timeout_start' ? (
                    <span className="inline-icon-text"><Pause size={14} /> {msg.sender} activó una pausa de {msg.text} min</span>
                  ) : (
                    <span className="inline-icon-text"><CircleCheck size={14} /> {msg.sender} terminó la pausa. ¿Seguimos?</span>
                  )}
                </div>
              </div>
            );
          }

          const isMe = msg.sender === currentUser;
          const repliedMsg = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null;

          return (
            <div
              key={msg.id}
              className={`message-row ${isMe ? 'me' : 'them'}`}
              ref={idx === messages.length - 1 ? lastMessageRowRef : null}
            >
              {dateSeparator}
              <div
              className={`chat-message ${isMe ? 'me' : 'them'} ${msg.important ? 'important' : ''}`}
              onClick={() => !isMe && setReplyTo(msg)}
            >
              {repliedMsg && (
                <span className="reply-box">
                  <span className="reply-sender">
                    {repliedMsg.sender === currentUser ? 'Tú' : partnerName}
                  </span>
                  <span className="reply-text">{repliedMsg.text.slice(0, 50)}</span>
                </span>
              )}
              <div className="message-content">
                {msg.deleted ? <em>Mensaje eliminado</em> : msg.text}
              </div>
              <div className="meta-info">
                {msg.important ? <Star size={12} className="inline-icon" fill="currentColor" /> : ''}
                {msg.edited && !msg.deleted ? <span title="Editado">(editado)</span> : ''}
                <span className="timestamp">
                  {new Date(msg.created_at).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {isMe && (
                  <span className={`status-icon ${msg.read ? 'read' : msg.delivered ? 'delivered' : ''}`}>
                    {msg.read || msg.delivered ? <CheckCheck size={14} /> : <Check size={14} />}
                  </span>
                )}
              </div>
              {isMe && !msg.deleted && (
                <div className="message-actions">
                  {!msg.important && (
                    <button
                      className="mark-important-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markImportant(msg.id);
                      }}
                      title="Marcar como importante"
                    >
                      <Star size={13} />
                    </button>
                  )}
                  <button
                    className="msg-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(msg);
                    }}
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="msg-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMessage(msg.id);
                    }}
                    title="Borrar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
        </div>
      </div>

      {editingId && (
        <div className="replying-to-container">
          <span>Editando mensaje...</span>
          <button onClick={cancelEdit}><X size={14} /></button>
        </div>
      )}

      {replyTo && !editingId && (
        <div className="replying-to-container">
          <span>Respondiendo a: &quot;{replyTo.text.slice(0, 30)}...&quot;</span>
          <button onClick={() => setReplyTo(null)}><X size={14} /></button>
        </div>
      )}

      {showRepairPanel && (
        <div className="emoji-picker-backdrop" onClick={closeRepairPanel} />
      )}

      <div className="input-area">
        <div
          className={`repair-panel ${showRepairPanel ? 'open' : ''}`}
          style={{
            transform: showRepairPanel && repairDragY > 0 ? `translateY(${repairDragY}px)` : undefined,
            transition: repairDragStartY.current !== null ? 'none' : undefined,
          }}
        >
          <div
            className="repair-panel-handle-wrap"
            onPointerDown={handleRepairPointerDown}
            onPointerMove={handleRepairPointerMove}
            onPointerUp={handleRepairPointerUp}
            onPointerCancel={handleRepairPointerUp}
          >
            <div className="repair-panel-handle" />
          </div>
          {REPAIR_MESSAGES.map((r) => (
            <button
              key={r.text}
              className="repair-option-btn"
              onClick={() => sendRepairMessage(r.text)}
            >
              <r.Icon size={14} className="inline-icon" /> {r.text}
            </button>
          ))}
        </div>

        <div className="message-input-bar">
        <div className="message-input-wrap">
          <button
            type="button"
            className="input-icon-btn emoji-btn"
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="Emojis"
          >
            <Smile size={20} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onPointerDown={handleInputFocus}
            onChange={(e) => {
              setInput(e.target.value);
              if (blockedWarning) setBlockedWarning('');
              if (showRepairPanel) setShowRepairPanel(false);
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escribí un mensaje..."
          />

          <div className="input-trailing-icons">
            {chatKey === 'discutir' && !editingId && (
              <button type="button" className="input-icon-btn" onClick={openTemplateModal} title="Usar plantilla para plantear el problema">
                <NotebookPen size={18} />
              </button>
            )}
            {!editingId && (
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowRepairPanel((v) => !v)}
                title="Reparaciones rápidas"
              >
                <Mail size={18} />
              </button>
            )}
          </div>

          {showEmojiPicker && (
            <>
              <div className="emoji-picker-backdrop" onClick={() => setShowEmojiPicker(false)} />
              <div className="emoji-picker">
                {EMOJI_OPTIONS.map((e) => (
                  <button key={e} type="button" onClick={() => insertEmoji(e)}>{e}</button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim()}
          title={editingId ? 'Guardar' : 'Enviar'}
        >
          {editingId ? <Check size={18} /> : <Send size={18} />}
        </button>
        </div>
      </div>
      {blockedWarning && (
        <p className="error inline-icon-text" style={{ justifyContent: 'center', padding: '4px 12px' }}>
          <TriangleAlert size={14} /> {blockedWarning}
        </p>
      )}

      {showTemplateModal && (
        <div className="modal-backdrop active" onClick={closeTemplateModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translateY(${templateDragY}px)`,
              transition: templateDragStartY.current !== null ? 'none' : 'transform 0.25s ease',
            }}
          >
            <div
              className="modal-handle-wrap"
              onPointerDown={handleTemplateHandlePointerDown}
              onPointerMove={handleTemplateHandlePointerMove}
              onPointerUp={handleTemplateHandlePointerUp}
              onPointerCancel={handleTemplateHandlePointerUp}
            >
              <div className="modal-handle" />
            </div>

            <div className="template-hero">
              <div className="template-hero-icon"><NotebookPen size={24} strokeWidth={2.2} /></div>
              <h3>Plantear un problema sin acusar</h3>
              <p className="template-hint">
                Completá lo que puedas. Ayuda a que {partnerName} no se ponga a la defensiva.
              </p>
            </div>

            <label className="template-field">
              <span className="inline-icon-text"><MessageCircle size={14} /> Cuando pasa...</span>
              <textarea
                value={templateFields.situacion}
                onChange={(e) => setTemplateFields((f) => ({ ...f, situacion: e.target.value }))}
                placeholder="ej: llegás tarde sin avisar"
                rows={2}
              />
            </label>
            <label className="template-field">
              <span className="inline-icon-text"><Heart size={14} /> yo siento...</span>
              <textarea
                value={templateFields.sentimiento}
                onChange={(e) => setTemplateFields((f) => ({ ...f, sentimiento: e.target.value }))}
                placeholder="ej: ansiedad y un poco de enojo"
                rows={2}
              />
            </label>
            <label className="template-field">
              <span className="inline-icon-text"><HandHeart size={14} /> y necesito...</span>
              <textarea
                value={templateFields.necesidad}
                onChange={(e) => setTemplateFields((f) => ({ ...f, necesidad: e.target.value }))}
                placeholder="ej: que me avises con un mensaje"
                rows={2}
              />
            </label>
            <div className="template-actions">
              <button className="template-cancel-btn" onClick={closeTemplateModal}>Cancelar</button>
              <button className="template-apply-btn" onClick={applyTemplate}>Usar esta frase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
