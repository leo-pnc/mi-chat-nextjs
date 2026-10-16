"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Heart, Search, ChevronRight, Check, CheckCheck, Home as HomeIcon, Image as ImageIcon, MessageCircle, CalendarDays } from "lucide-react";
import { Dancing_Script } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { MOODS, getPartnerName, TOPIC_CHATS, CHAT_TITLES, CHAT_ICONS, formatPreviewText } from "@/lib/config";
import { formatPreviewTime } from "@/lib/dateFormat";

const dancingFont = Dancing_Script({ subsets: ["latin"], weight: ["400", "600"] });

// Color de identidad de cada chat (franja lateral + ícono)
const CHAT_COLORS = {
  discutir: "#F2879D",
  consolar: "#95D2B3",
  debatir: "#8294C4",
};

const PARTNER_AVATAR = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=200&auto=format&fit=crop";

export default function ChatsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [partnerMood, setPartnerMood] = useState("?");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [chatsSummary, setChatsSummary] = useState({});
  const [search, setSearch] = useState("");

  const partnerName = currentUser ? getPartnerName(currentUser) : null;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setCurrentUser(session.user.app_metadata?.display_name || null);
    })();
  }, [router]);

  const loadChatsSummary = useCallback(async () => {
    if (!partnerName) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in("chat_id", TOPIC_CHATS)
      .order("created_at", { ascending: true });
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

  useEffect(() => {
    if (!currentUser || !partnerName) return;

    loadChatsSummary();

    (async () => {
      const { data } = await supabase.from("user_status").select("*").eq("user_name", partnerName).maybeSingle();
      if (data) setPartnerMood(data.mood);
    })();

    const messagesChannel = supabase
      .channel("chats-list-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const chatId = payload.new?.chat_id || payload.old?.chat_id;
        if (!TOPIC_CHATS.includes(chatId)) return;
        loadChatsSummary();
      })
      .subscribe();

    const presenceChannel = supabase.channel("presence-room", { config: { presence: { key: currentUser } } });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        setPartnerOnline(!!presenceChannel.presenceState()[partnerName]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await presenceChannel.track({ user: currentUser, online_at: new Date().toISOString() });
      });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser, partnerName, loadChatsSummary]);

  const openChat = (key) => router.push(`/chat?chatKey=${key}`);

  const filteredChats = TOPIC_CHATS.filter((key) =>
    CHAT_TITLES[key].toLowerCase().includes(search.trim().toLowerCase())
  );

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans relative flex flex-col h-screen overflow-hidden">

      {/* HEADER */}
      <header className="px-6 pt-12 pb-5 bg-gradient-to-b from-[#2A1B1B] to-[#121212] flex-shrink-0 z-20">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center">
              <h1 className={`text-[40px] text-white leading-none ${dancingFont.className}`}>Chats</h1>
              <Heart size={24} className="text-[#F2879D] ml-2 mt-1" strokeWidth={2} />
            </div>
            <p className="text-xs text-zinc-400 font-light flex items-center gap-1.5 mt-2">
              Siempre hay un momento para hablar <Heart size={10} className="text-[#F2879D]" />
            </p>
          </div>

          {/* Foto de la pareja con borde del color de su ánimo */}
          <div
            className="w-12 h-12 rounded-[14px] border-[1.5px] flex-shrink-0 overflow-hidden shadow-sm relative transition-colors duration-300"
            style={{ borderColor: MOODS[partnerMood]?.color || "#52525B" }}
          >
            <img src={PARTNER_AVATAR} alt={partnerName || "Pareja"} className="w-full h-full object-cover" />
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-br-[12px] rounded-tl-lg border-2 border-[#121212] ${partnerOnline ? "bg-green-500" : "bg-zinc-600"}`} />
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="px-5 flex-1 overflow-y-auto pb-28 custom-scrollbar">

        {/* Buscador */}
        <div className="bg-[#1C1C1E] border border-zinc-800/80 rounded-2xl px-4 py-3 flex items-center gap-3 mb-5">
          <Search size={18} className="text-zinc-500 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar chats..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Lista de chats */}
        <div className="space-y-3">
          {filteredChats.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-8">No se encontraron chats.</p>
          )}

          {filteredChats.map((key) => {
            const s = chatsSummary[key] || {};
            const color = CHAT_COLORS[key] || "#9D76C1";
            const Icon = CHAT_ICONS[key];
            const preview = formatPreviewText(s.lastMessage, currentUser, partnerName);
            const lastIsMine = s.lastMessage?.sender === currentUser
              && !s.lastMessage.deleted
              && s.lastMessage.type !== "timeout_start"
              && s.lastMessage.type !== "timeout_end";

            return (
              <div
                key={key}
                onClick={() => openChat(key)}
                className="bg-[#1C1C1E] border border-zinc-800/80 rounded-2xl p-3 pl-0 flex items-center gap-3 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] active:bg-zinc-800/60 transition-all"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />

                <div
                  className="w-14 h-14 rounded-2xl ml-4 flex items-center justify-center shadow-inner flex-shrink-0"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {Icon && <Icon size={26} strokeWidth={1.5} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className={`text-xl text-white truncate flex items-center gap-1.5 ${dancingFont.className}`}>
                      {CHAT_TITLES[key]}
                      <Heart size={12} style={{ color }} />
                    </h4>
                    {s.lastMessage && (
                      <span className="text-[11px] text-zinc-500 flex-shrink-0 ml-2">
                        {formatPreviewTime(s.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 truncate flex items-center gap-1">
                    {preview ? (
                      <>
                        <span className="truncate">
                          <span className="font-semibold text-zinc-300">{preview.who}:</span> {preview.text}
                        </span>
                        {lastIsMine && (
                          <span className={`flex-shrink-0 ml-1 ${s.lastMessage.read ? "text-[#F2879D]" : "text-zinc-500"}`}>
                            {s.lastMessage.read || s.lastMessage.delivered ? <CheckCheck size={12} /> : <Check size={12} />}
                          </span>
                        )}
                      </>
                    ) : (
                      "Aún no hay mensajes"
                    )}
                  </div>
                </div>

                <div className="mr-3 flex items-center justify-center w-6 flex-shrink-0">
                  {s.unreadCount > 0 ? (
                    <div className="min-w-[22px] h-[22px] px-1.5 bg-[#F2879D] text-black text-[11px] font-bold rounded-full flex items-center justify-center">
                      {s.unreadCount}
                    </div>
                  ) : (
                    <ChevronRight size={18} className="text-zinc-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#121212]/95 backdrop-blur-md border-t border-zinc-800/80 px-6 py-3 flex justify-between items-center z-20 pb-safe">
        <button onClick={() => router.push("/menu")} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <HomeIcon size={20} />
          <span className="text-[9px] font-medium">Inicio</span>
        </button>
        <button onClick={() => router.push("/galeria")} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <ImageIcon size={20} />
          <span className="text-[9px] font-medium">Fotos</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#F2879D]">
          <MessageCircle size={20} />
          <span className="text-[9px] font-medium">Chat</span>
        </button>
        <button onClick={() => router.push("/calendario")} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <CalendarDays size={20} />
          <span className="text-[9px] font-medium">Calendario</span>
        </button>
      </nav>
    </div>
  );
}
