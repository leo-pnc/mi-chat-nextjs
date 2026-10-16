"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { MOODS } from "@/lib/config";

// Botón "Ánimo" de la barra inferior + su selector de estado de ánimo.
// Es autónomo: carga el ánimo del usuario y lo guarda solo, así se puede
// poner en la barra de cualquier pantalla.
export default function MoodNavButton() {
  const [userName, setUserName] = useState(null);
  const [myMood, setMyMood] = useState("😴");
  const [show, setShow] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.app_metadata?.display_name || null;
      setUserName(name);
      if (!name) return;
      const { data } = await supabase.from("user_status").select("*").eq("user_name", name).maybeSingle();
      if (data) setMyMood(data.mood);
    })();
  }, []);

  async function handleMoodSelect(emoji) {
    setMyMood(emoji);
    if (!userName) return;
    await supabase.from("user_status").upsert({ user_name: userName, mood: emoji, updated_at: new Date().toISOString() });
  }

  function closePicker() {
    setShow(false);
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragY((current) => {
        if (current > 90) setShow(false);
        return 0;
      });
      dragStartY.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const MyMoodIcon = MOODS[myMood]?.Icon;

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="flex flex-col items-center gap-1 transition-colors active:scale-95"
        style={{ color: MOODS[myMood]?.color || "#71717a" }}
      >
        {MyMoodIcon ? <MyMoodIcon size={20} strokeWidth={2.5} /> : <Heart size={20} />}
        <span className="text-[9px] font-medium text-zinc-500">Ánimo</span>
      </button>

      {/* Va en el body para que no lo afecte el blur de la barra */}
      {show && typeof document !== "undefined" && createPortal(
        <div className="modal-backdrop active" onClick={closePicker}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `translateY(${dragY}px)`, transition: dragStartY.current !== null ? "none" : "transform 0.25s ease" }}
          >
            <div className="modal-handle-wrap" onPointerDown={handleHandlePointerDown}>
              <div className="modal-handle" />
            </div>
            <h3>¿Cómo estás?</h3>
            <p className="mood-picker-hint">Elegí lo que mejor describe cómo te sentís ahora</p>
            <div className="mood-hero" style={{ "--mood-color": MOODS[myMood]?.color || "#988289" }}>
              <div key={myMood} className="mood-hero-icon">
                {MyMoodIcon && <MyMoodIcon size={28} strokeWidth={2.2} />}
              </div>
              <span key={`${myMood}-label`} className="mood-hero-label">{MOODS[myMood]?.text}</span>
              <span key={`${myMood}-underline`} className="mood-hero-underline" />
            </div>
            <div className="mood-strip">
              {Object.keys(MOODS).map((emoji) => {
                const MoodIcon = MOODS[emoji].Icon;
                return (
                  <button
                    key={emoji}
                    className={`mood-strip-btn ${emoji === myMood ? "selected" : ""}`}
                    onClick={() => handleMoodSelect(emoji)}
                    title={MOODS[emoji].text}
                    style={{ "--mood-color": MOODS[emoji].color }}
                  >
                    <MoodIcon size={17} strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
