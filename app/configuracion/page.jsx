"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Camera, Heart, Bell, Palette, Wrench, User, Check, Image as ImageIcon,
  RotateCcw, LogOut, Send, Sparkles, Inbox,
} from "lucide-react";
import { Dancing_Script } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { MOODS, getPartnerName } from "@/lib/config";
import { enablePushNotifications } from "@/lib/push";
import {
  useProfiles, ACCENTS, applyAccent, prepareImage, forgetSignedUrl, formatTogether,
  CREATOR_NAME, APP_VERSION,
} from "@/lib/profiles";

const dancingFont = Dancing_Script({ subsets: ["latin"], weight: ["400", "600"] });

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-[11px] tracking-widest uppercase text-zinc-500 font-semibold mb-3 px-1 flex items-center gap-2">
        <Icon size={14} className="text-[#F2879D]" /> {title}
      </h2>
      <div className="bg-[#1C1C1E] border border-zinc-800/80 rounded-3xl px-4 divide-y divide-zinc-800/70">
        {children}
      </div>
    </section>
  );
}

function Row({ title, desc, children, stacked = false }) {
  return (
    <div className={stacked ? "py-4" : "py-3.5 flex items-center justify-between gap-4"}>
      <div className={stacked ? "mb-3" : "min-w-0"}>
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        {desc && <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full p-1 flex-shrink-0 transition-colors duration-300 ${checked ? "bg-[#F2879D]" : "bg-zinc-700"}`}
    >
      <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function ConfiguracionPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const partnerName = currentUser ? getPartnerName(currentUser) : null;
  const { ready, me, couple, reload, avatarOf, chatBgUrl } = useProfiles(currentUser);

  const [form, setForm] = useState(null);
  const hydrated = useRef(false);
  const [anniversary, setAnniversary] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);

  const [pushPermission, setPushPermission] = useState("default");

  const [suggestion, setSuggestion] = useState("");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [received, setReceived] = useState([]);

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  // Sesión
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

  useEffect(() => {
    if (typeof Notification !== "undefined") setPushPermission(Notification.permission);
  }, []);

  // Cargamos el formulario una sola vez, cuando llegan los datos
  useEffect(() => {
    if (!ready || !me || hydrated.current) return;
    hydrated.current = true;
    setForm({
      my_nickname: me.my_nickname || "",
      partner_nickname: me.partner_nickname || "",
      mood_labels: me.mood_labels || {},
      default_surprise: me.default_surprise,
      counter_format: me.counter_format,
      notif_plans: me.notif_plans,
      notif_reminders: me.notif_reminders,
      notif_mood: me.notif_mood,
      chat_sound: me.chat_sound,
      accent: me.accent,
      avatar_path: me.avatar_path,
      chat_bg_path: me.chat_bg_path,
    });
  }, [ready, me]);

  useEffect(() => {
    setAnniversary(couple?.anniversary || "");
  }, [couple]);

  // Pedidos recibidos (solo los ve el programador)
  const loadReceived = useCallback(async () => {
    const { data } = await supabase.from("suggestions").select("*").order("created_at", { ascending: false }).limit(20);
    setReceived(data || []);
  }, []);

  useEffect(() => {
    if (currentUser === CREATOR_NAME) loadReceived();
  }, [currentUser, loadReceived]);

  async function save(patch) {
    setForm((f) => ({ ...f, ...patch }));
    const { error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_name", currentUser);
    if (error) {
      console.error("Error guardando configuración:", error.message);
      flash("No se pudo guardar");
      return false;
    }
    flash("Guardado ✓");
    return true;
  }

  async function saveAnniversary(value) {
    setAnniversary(value);
    if (!value) return;
    const { error } = await supabase
      .from("couple_settings")
      .upsert({ id: 1, anniversary: value, updated_at: new Date().toISOString() });
    if (error) {
      console.error("Error guardando aniversario:", error.message);
      flash("No se pudo guardar");
      return;
    }
    flash("Guardado ✓");
    reload();
  }

  // ---- Fotos: avatar y fondo del chat ----
  async function uploadImage(file, kind) {
    const isAvatar = kind === "avatar";
    const setBusy = isAvatar ? setUploadingAvatar : setUploadingBg;
    const field = isAvatar ? "avatar_path" : "chat_bg_path";
    setBusy(true);
    try {
      const blob = await prepareImage(file, isAvatar ? { maxSize: 512, square: true } : { maxSize: 1200 });
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${user.id}/${isAvatar ? "avatar" : "chatbg"}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const oldPath = form[field];
      const ok = await save({ [field]: path });
      if (ok && oldPath) {
        await supabase.storage.from("photos").remove([oldPath]);
        forgetSignedUrl(oldPath);
      }
      await reload();
    } catch (err) {
      console.error("Error subiendo imagen:", err?.message || err);
      flash("No se pudo subir la foto");
    }
    setBusy(false);
  }

  function onPickImage(e, kind) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file && file.type.startsWith("image/")) uploadImage(file, kind);
  }

  async function removeChatBg() {
    const oldPath = form.chat_bg_path;
    const ok = await save({ chat_bg_path: null });
    if (ok && oldPath) {
      await supabase.storage.from("photos").remove([oldPath]);
      forgetSignedUrl(oldPath);
    }
    reload();
  }

  // ---- Estados de ánimo ----
  function setMoodLabel(emoji, value) {
    setForm((f) => ({ ...f, mood_labels: { ...f.mood_labels, [emoji]: value } }));
  }

  function commitMoodLabels() {
    const clean = {};
    Object.entries(form.mood_labels).forEach(([k, v]) => {
      if (v && v.trim()) clean[k] = v.trim();
    });
    save({ mood_labels: clean });
  }

  async function resetMoodLabels() {
    await save({ mood_labels: {} });
  }

  // ---- Notificaciones en este dispositivo ----
  async function activatePush() {
    await enablePushNotifications(currentUser);
    if (typeof Notification !== "undefined") setPushPermission(Notification.permission);
  }

  // ---- Buzón de deseos ----
  async function sendSuggestion() {
    const text = suggestion.trim();
    if (!text || sendingSuggestion) return;
    setSendingSuggestion(true);
    const { error } = await supabase.from("suggestions").insert({ from_user: currentUser, text });
    setSendingSuggestion(false);
    if (error) {
      console.error("Error enviando sugerencia:", error.message);
      flash("No se pudo enviar");
      return;
    }
    setSuggestion("");
    flash("¡Enviado! ✨");
    if (currentUser === CREATOR_NAME) loadReceived();
  }

  async function toggleDone(s) {
    setReceived((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
    await supabase.from("suggestions").update({ done: !s.done }).eq("id", s.id);
  }

  // ---- Cerrar sesión ----
  async function handleLogout() {
    if (!window.confirm("¿Querés cerrar sesión?")) return;
    try {
      // Dejamos de recibir avisos en este dispositivo
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          await sub.unsubscribe();
        }
      }
    } catch (err) {
      console.error("No se pudo quitar la suscripción push:", err?.message || err);
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!currentUser || !form) return null;

  const together = formatTogether(anniversary, form.counter_format);
  const partnerShown = form.partner_nickname.trim() || partnerName;

  return (
    <div className="bg-[#121212] text-zinc-200 font-sans h-screen flex flex-col overflow-hidden relative">

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#2a2a2c] border border-zinc-700 text-zinc-100 text-xs font-medium px-4 py-2 rounded-full shadow-lg photo-fade">
          {toast}
        </div>
      )}

      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e, "avatar")} />
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e, "bg")} />

      {/* HEADER */}
      <header className="px-5 pt-12 pb-4 bg-gradient-to-b from-[#2A1B1B] to-[#121212] flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Volver" className="text-zinc-200 active:scale-90 transition-transform">
            <ArrowLeft size={26} />
          </button>
          <div className="flex items-center">
            <h1 className={`text-[38px] text-white leading-none ${dancingFont.className}`}>Configuración</h1>
            <Heart size={22} className="text-[#F2879D] ml-2 mt-1" />
          </div>
        </div>
        <p className="text-xs text-zinc-400 font-light mt-2 ml-9">Hacé la app a tu manera</p>
      </header>

      <main className="px-5 flex-1 overflow-y-auto pb-16 pt-2 custom-scrollbar">

        {/* ================= SUS PERFILES ================= */}
        <Section icon={User} title="Sus perfiles">
          <div className="py-5 flex items-center gap-4">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#F2879D] flex-shrink-0 active:scale-95 transition-transform"
              aria-label="Cambiar foto de perfil"
            >
              <img src={avatarOf(currentUser)} alt="Tu foto" className="w-full h-full object-cover" />
              <span className="absolute inset-0 bg-black/45 flex items-center justify-center text-white">
                {uploadingAvatar ? <span className="text-[10px]">Subiendo...</span> : <Camera size={22} />}
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100">Tu foto de perfil</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                Aparece en el calendario, en el inicio y en los chats de tu pareja.
              </p>
            </div>
          </div>

          <Row title="Cómo te llama la app" desc="Tu apodo, en vez de tu nombre real." stacked>
            <input
              type="text"
              value={form.my_nickname}
              maxLength={24}
              placeholder={currentUser}
              onChange={(e) => setForm((f) => ({ ...f, my_nickname: e.target.value }))}
              onBlur={() => save({ my_nickname: form.my_nickname.trim() || null })}
              className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F2879D] transition-colors"
            />
          </Row>

          <Row title="Cómo llamás a tu pareja" desc={`Así la app va a nombrar a ${partnerName}. Ej: «${partnerShown} agendó un plan».`} stacked>
            <input
              type="text"
              value={form.partner_nickname}
              maxLength={24}
              placeholder={partnerName}
              onChange={(e) => setForm((f) => ({ ...f, partner_nickname: e.target.value }))}
              onBlur={() => save({ partner_nickname: form.partner_nickname.trim() || null })}
              className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F2879D] transition-colors"
            />
          </Row>

          <Row
            title="Estados de ánimo"
            desc="Ponele tus propias palabras a cada uno. Tu pareja los ve así."
            stacked
          >
            <div className="space-y-2">
              {Object.keys(MOODS).map((emoji) => {
                const M = MOODS[emoji];
                return (
                  <div key={emoji} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${M.color}22`, color: M.color }}
                    >
                      <M.Icon size={18} strokeWidth={2.2} />
                    </div>
                    <input
                      type="text"
                      value={form.mood_labels[emoji] || ""}
                      maxLength={30}
                      placeholder={M.text}
                      onChange={(e) => setMoodLabel(emoji, e.target.value)}
                      onBlur={commitMoodLabels}
                      className="flex-1 min-w-0 bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F2879D] transition-colors"
                    />
                  </div>
                );
              })}
              {Object.values(form.mood_labels).some((v) => v && v.trim()) && (
                <button onClick={resetMoodLabels} className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1 active:scale-95 transition-transform">
                  <RotateCcw size={12} /> Restaurar los originales
                </button>
              )}
            </div>
          </Row>
        </Section>

        {/* ================= NUESTRO VÍNCULO ================= */}
        <Section icon={Heart} title="Nuestro vínculo">
          <Row title="Fecha de aniversario" desc="Para corregirla si hubo un error." stacked>
            <input
              type="date"
              value={anniversary}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => saveAnniversary(e.target.value)}
              className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F2879D] [color-scheme:dark] transition-colors"
            />
          </Row>

          <Row title="Formato del contador" desc="Cómo ver el tiempo juntos en el inicio." stacked>
            <div className="bg-[#121212] border border-zinc-800 rounded-full p-1 flex">
              {[
                { key: "years_months", label: "Años y meses" },
                { key: "days", label: "Días totales" },
              ].map((o) => {
                const active = form.counter_format === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => save({ counter_format: o.key })}
                    className="flex-1 py-2 rounded-full text-xs font-medium transition-colors"
                    style={active ? { backgroundColor: "var(--accent)", color: "#1a0d10" } : { color: "#a1a1aa" }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2.5 text-center">
              {together ? `Se vería así: ${together.main} ${together.sub}` : "Cargá la fecha de aniversario para verlo."}
            </p>
          </Row>

          <Row title="Modo Sorpresa por defecto" desc="Todos los planes nuevos vienen con «Sorpresa» activada.">
            <Toggle checked={form.default_surprise} onChange={(v) => save({ default_surprise: v })} label="Modo Sorpresa por defecto" />
          </Row>
        </Section>

        {/* ================= NOTIFICACIONES ================= */}
        <Section icon={Bell} title="Notificaciones mágicas">
          <Row title="Nuevo plan agendado" desc="Te avisamos cuando tu pareja agenda algo.">
            <Toggle checked={form.notif_plans} onChange={(v) => save({ notif_plans: v })} label="Aviso de nuevo plan" />
          </Row>
          <Row title="Recordatorio 24 hs antes" desc="Un aviso el día anterior a cada plan.">
            <Toggle checked={form.notif_reminders} onChange={(v) => save({ notif_reminders: v })} label="Recordatorio de planes" />
          </Row>
          <Row title="Radar de humor" desc="Te avisamos cuando tu pareja cambia su estado de ánimo.">
            <Toggle checked={form.notif_mood} onChange={(v) => save({ notif_mood: v })} label="Radar de humor" />
          </Row>
          <Row title="Sonido de mensajes" desc="Apagalo para recibir los avisos del chat en silencio.">
            <Toggle checked={form.chat_sound} onChange={(v) => save({ chat_sound: v })} label="Sonido de mensajes" />
          </Row>
          {pushPermission !== "granted" && (
            <Row title="Avisos en este dispositivo" desc={pushPermission === "denied" ? "Están bloqueados en el navegador: activalos desde sus ajustes." : "Todavía no están activados."}>
              {pushPermission !== "denied" && (
                <button onClick={activatePush} className="px-3.5 py-2 rounded-full text-xs font-semibold bg-[#F2879D] text-[#1a0d10] active:scale-95 transition-transform flex-shrink-0">
                  Activar
                </button>
              )}
            </Row>
          )}
        </Section>

        {/* ================= PERSONALIZACIÓN ================= */}
        <Section icon={Palette} title="Personalización">
          <Row title="Color de acento" desc="Tiñe los botones y detalles de la app." stacked>
            <div className="flex gap-3">
              {ACCENTS.map((a) => {
                const active = form.accent.toLowerCase() === a.color.toLowerCase();
                return (
                  <button
                    key={a.key}
                    onClick={() => {
                      applyAccent(a.color);
                      save({ accent: a.color });
                    }}
                    aria-label={a.name}
                    className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                  >
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: a.color, boxShadow: active ? `0 0 0 2px #1C1C1E, 0 0 0 4px ${a.color}` : "none" }}
                    >
                      {active && <Check size={18} className="text-[#1a0d10]" strokeWidth={3} />}
                    </span>
                    <span className="text-[10px] text-zinc-400">{a.name}</span>
                  </button>
                );
              })}
            </div>
          </Row>

          <Row title="Fondo del chat" desc="Una foto de ustedes, difuminada detrás de los mensajes." stacked>
            <div className="flex items-center gap-3">
              <div className="relative w-20 h-28 rounded-2xl overflow-hidden bg-[#121212] border border-zinc-800 flex-shrink-0">
                {chatBgUrl ? (
                  <img src={chatBgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(4px) brightness(0.6)" }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                    <ImageIcon size={22} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => bgInputRef.current?.click()}
                  disabled={uploadingBg}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#F2879D] text-[#1a0d10] active:scale-95 transition-transform disabled:opacity-60"
                >
                  {uploadingBg ? "Subiendo..." : "Elegir foto"}
                </button>
                {form.chat_bg_path && (
                  <button onClick={removeChatBg} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-zinc-700 text-zinc-300 active:scale-95 transition-transform">
                    Quitar fondo
                  </button>
                )}
              </div>
            </div>
          </Row>
        </Section>

        {/* ================= RINCÓN DEL CREADOR ================= */}
        <Section icon={Wrench} title="El rincón del creador">
          <Row title="Buzón de deseos" desc={`¿Querés una función nueva? Pedísela al programador${currentUser === CREATOR_NAME ? "" : ` (${CREATOR_NAME})`}.`} stacked>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Me encantaría que la app pudiera..."
              className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F2879D] transition-colors resize-none"
            />
            <button
              onClick={sendSuggestion}
              disabled={!suggestion.trim() || sendingSuggestion}
              className="mt-3 w-full bg-[#F2879D] text-[#1a0d10] font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              {sendingSuggestion ? "Enviando..." : <>Pedirle una nueva función <Send size={15} /></>}
            </button>
          </Row>

          {currentUser === CREATOR_NAME && (
            <div className="py-4">
              <p className="text-sm font-medium text-zinc-100 flex items-center gap-2 mb-3">
                <Inbox size={15} className="text-[#F2879D]" /> Pedidos recibidos
              </p>
              {received.length === 0 ? (
                <p className="text-[11px] text-zinc-500">Todavía no llegó ninguno.</p>
              ) : (
                <div className="space-y-2">
                  {received.map((s) => (
                    <div key={s.id} className="bg-[#121212] border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug break-words ${s.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{s.text}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          {s.from_user} · {new Date(s.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleDone(s)}
                        aria-label="Marcar como hecho"
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${s.done ? "bg-[#F2879D] border-transparent text-[#1a0d10]" : "border-zinc-700 text-zinc-500"}`}
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ================= SESIÓN ================= */}
        <button
          onClick={handleLogout}
          className="w-full bg-[#1C1C1E] border border-zinc-800/80 text-red-400 rounded-2xl py-3.5 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>

        <div className="text-center mt-8 mb-2">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            {APP_VERSION} <Sparkles size={10} className="text-[#F2879D]" />
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            Hecho con ♡ por {CREATOR_NAME} · © {new Date().getFullYear()} Todos los derechos reservados
          </p>
        </div>
      </main>
    </div>
  );
}
