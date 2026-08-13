'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Handshake } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { TOPIC_CHATS, CHAT_TITLES, CHAT_ICONS } from '@/lib/config';

const WALLPAPER_ICONS = [Star, Handshake];
const WALLPAPER_POSITIONS = [
  { top: '4%', left: '8%', rotate: -12, size: 28 },
  { top: '9%', left: '78%', rotate: 18, size: 24 },
  { top: '20%', left: '35%', rotate: -6, size: 20 },
  { top: '28%', left: '92%', rotate: 10, size: 28 },
  { top: '36%', left: '4%', rotate: 22, size: 22 },
  { top: '15%', left: '55%', rotate: 24, size: 18 },
  { top: '48%', left: '58%', rotate: -18, size: 26 },
  { top: '58%', left: '18%', rotate: 8, size: 20 },
  { top: '68%', left: '85%', rotate: -10, size: 24 },
  { top: '78%', left: '45%', rotate: 16, size: 22 },
  { top: '88%', left: '10%', rotate: -20, size: 28 },
  { top: '95%', left: '70%', rotate: 12, size: 20 },
];

export default function AgreementsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAgreements = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('chat_id', TOPIC_CHATS)
      .eq('important', true)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando acuerdos:', error);
      return;
    }
    setAgreements(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setCurrentUser(session.user.app_metadata?.display_name || null);
      await loadAgreements();
      setLoading(false);
    })();
  }, [router, loadAgreements]);

  useEffect(() => {
    const channel = supabase
      .channel('agreements-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadAgreements();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadAgreements]);

  async function unmark(id) {
    setAgreements((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from('messages').update({ important: false }).eq('id', id);
    if (error) {
      console.error('Error quitando marca de importante:', error);
      loadAgreements();
    }
  }

  if (loading || !currentUser) return null;

  return (
    <div className="agreements-container">
      <header className="agreements-header">
        <button className="icon-only-btn" onClick={() => router.push('/menu')} title="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="agreements-title-header inline-icon-text">
          Acuerdos <Star size={18} />
        </div>
        <div style={{ width: 32 }} />
      </header>

      <div className="agreements-body">
        <div className="agreements-wallpaper" aria-hidden="true">
          {WALLPAPER_POSITIONS.map((p, i) => {
            const WIcon = WALLPAPER_ICONS[i % WALLPAPER_ICONS.length];
            return (
              <WIcon
                key={i}
                size={p.size}
                strokeWidth={1.75}
                className="agreements-wallpaper-icon"
                style={{ top: p.top, left: p.left, transform: `rotate(${p.rotate}deg)` }}
              />
            );
          })}
        </div>
        <div className="agreements-scroll-inner">
        {agreements.length === 0 && (
          <p className="agreements-empty inline-icon-text">
            Todavía no marcaron ningún mensaje como importante. Tocá la estrella <Star size={14} /> en un mensaje
            de cualquier chat para guardarlo acá como un acuerdo.
          </p>
        )}

        {agreements.map((msg) => (
          <div key={msg.id} className="agreement-card">
            <div className="agreement-meta">
              <span className="agreement-chat-tag inline-icon-text">
                {(() => { const TopicIcon = CHAT_ICONS[msg.chat_id]; return TopicIcon ? <TopicIcon size={14} /> : null; })()} {CHAT_TITLES[msg.chat_id] || msg.chat_id}
              </span>
              <span className="agreement-date">
                {new Date(msg.created_at).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="agreement-text">{msg.text}</div>
            <div className="agreement-footer">
              <span className="agreement-sender">— {msg.sender}</span>
              <button className="agreement-unmark-btn inline-icon-text" onClick={() => unmark(msg.id)} title="Quitar de acuerdos">
                Quitar <Star size={13} />
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
