"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Heart, Camera, Image as ImageIcon, X, Trash2, ChevronLeft, ChevronRight,
  Home as HomeIcon, MessageCircle, CalendarDays,
} from "lucide-react";
import { Dancing_Script } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { MOODS, getPartnerName } from "@/lib/config";
import MoodNavButton from "@/app/MoodNavButton";

const dancingFont = Dancing_Script({ subsets: ["latin"], weight: ["400", "600"] });

const PARTNER_AVATAR = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=200&auto=format&fit=crop";

// Categorías (mismos tipos y colores que la agenda)
const CATEGORIES = [
  { key: "Cita", label: "Citas", color: "#F2879D" },
  { key: "Viaje", label: "Viajes", color: "#8294C4" },
  { key: "Encuentro", label: "Encuentros", color: "#F9D949" },
  { key: "Cumpleaños", label: "Cumpleaños", color: "#95D2B3" },
  { key: "Otro", label: "Otros", color: "#9D76C1" },
];
const catColor = (key) => CATEGORIES.find((c) => c.key === key)?.color || "#9D76C1";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

// Achica la foto antes de subirla (máx. 1600px) para ahorrar espacio y datos
async function compressImage(file, maxSize = 1600, quality = 0.85) {
  try {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    return blob || file;
  } catch {
    return file;
  }
}

export default function GaleriaPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [partnerMood, setPartnerMood] = useState("?");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [viewerId, setViewerId] = useState(null);

  // Agregar fotos
  const [showAdd, setShowAdd] = useState(false);
  const [pending, setPending] = useState([]); // [{ file, preview }]
  const [uploadCategory, setUploadCategory] = useState("Otro");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState("");

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const urlCache = useRef(new Map());
  const viewerTouchX = useRef(null);

  const partnerName = currentUser ? getPartnerName(currentUser) : null;

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

  const loadPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error cargando fotos:", error.message);
      setLoading(false);
      return;
    }
    const rows = data || [];
    const missing = rows.map((r) => r.path).filter((p) => !urlCache.current.has(p));
    if (missing.length) {
      const { data: signed } = await supabase.storage.from("photos").createSignedUrls(missing, 60 * 60 * 6);
      (signed || []).forEach((s) => {
        if (s.signedUrl) urlCache.current.set(s.path, s.signedUrl);
      });
    }
    setPhotos(rows.map((r) => ({ ...r, url: urlCache.current.get(r.path) || null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadPhotos();

    if (partnerName) {
      (async () => {
        const { data } = await supabase.from("user_status").select("*").eq("user_name", partnerName).maybeSingle();
        if (data) setPartnerMood(data.mood);
      })();
    }

    // Las fotos de tu pareja aparecen en vivo
    const channel = supabase
      .channel("photos-gallery")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, () => loadPhotos())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, partnerName, loadPhotos]);

  const filtered = filter === "all" ? photos : photos.filter((p) => p.category === filter);
  const viewerPhoto = viewerId ? photos.find((p) => p.id === viewerId) : null;
  const viewerIndex = viewerPhoto ? filtered.findIndex((p) => p.id === viewerPhoto.id) : -1;

  async function toggleFavorite(p) {
    const next = !p.is_favorite;
    setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_favorite: next } : x)));
    const { error } = await supabase.from("photos").update({ is_favorite: next }).eq("id", p.id);
    if (error) {
      console.error("Error al marcar favorita:", error.message);
      loadPhotos();
    }
  }

  async function changeCategory(p, category) {
    if (p.category === category) return;
    setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, category } : x)));
    const { error } = await supabase.from("photos").update({ category }).eq("id", p.id);
    if (error) {
      console.error("Error al cambiar categoría:", error.message);
      loadPhotos();
    }
  }

  async function deletePhoto(p) {
    if (!window.confirm("¿Borrar esta foto para siempre?")) return;
    const { error } = await supabase.from("photos").delete().eq("id", p.id);
    if (error) {
      alert("No se pudo borrar la foto.");
      return;
    }
    await supabase.storage.from("photos").remove([p.path]);
    urlCache.current.delete(p.path);
    setViewerId(null);
    loadPhotos();
  }

  function goViewer(dir) {
    const next = filtered[viewerIndex + dir];
    if (next) setViewerId(next.id);
  }

  // ---------- Agregar fotos ----------
  function handleFilesChosen(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    setUploadError("");
    setPending((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
  }

  function removePending(index) {
    setPending((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function closeAdd() {
    if (uploading) return;
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setPending([]);
    setUploadError("");
    setShowAdd(false);
  }

  async function handleUpload() {
    if (!pending.length || uploading) return;
    setUploading(true);
    setUploadError("");
    setProgress({ done: 0, total: pending.length });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUploadError("Tenés que iniciar sesión de nuevo.");
      setUploading(false);
      return;
    }
    const userId = session.user.id;
    const name = session.user.app_metadata?.display_name;

    const failedItems = [];
    for (const item of pending) {
      try {
        const blob = await compressImage(item.file);
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("photos")
          .upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase
          .from("photos")
          .insert({ path, uploader: name, category: uploadCategory });
        if (dbErr) {
          await supabase.storage.from("photos").remove([path]);
          throw dbErr;
        }
        URL.revokeObjectURL(item.preview);
      } catch (err) {
        console.error("Error subiendo foto:", err?.message || err);
        failedItems.push(item);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setUploading(false);
    await loadPhotos();

    if (failedItems.length) {
      setPending(failedItems);
      setUploadError(`No se pudo subir ${failedItems.length} foto${failedItems.length > 1 ? "s" : ""}. Probá de nuevo.`);
    } else {
      setPending([]);
      setShowAdd(false);
    }
  }

  if (!currentUser) return null;

  return (
    <div className="bg-[#121212] text-zinc-200 font-sans relative flex flex-col h-screen overflow-hidden">

      {/* Inputs ocultos: cámara y galería / archivos */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFilesChosen} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesChosen} />

      {/* HEADER */}
      <header className="px-5 pt-12 pb-3 bg-gradient-to-b from-[#2A1B1B] to-[#121212] flex-shrink-0 z-20">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/menu")} aria-label="Volver" className="text-zinc-200 active:scale-90 transition-transform">
                <ArrowLeft size={26} />
              </button>
              <div className="flex items-center">
                <h1 className={`text-[40px] text-white leading-none ${dancingFont.className}`}>Fotos</h1>
                <Heart size={24} className="text-[#F2879D] ml-2 mt-1" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-light flex items-center gap-1.5 mt-2">
              Nuestros momentos, siempre <Heart size={10} className="text-[#F2879D]" />
            </p>
          </div>

          <div
            className="w-12 h-12 rounded-full border-[1.5px] flex-shrink-0 overflow-hidden shadow-sm transition-colors duration-300"
            style={{ borderColor: MOODS[partnerMood]?.color || "#52525B" }}
          >
            <img src={PARTNER_AVATAR} alt={partnerName || "Pareja"} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* FILTROS por categoría */}
        <div
          className="mt-4 bg-[#1C1C1E] border border-zinc-800/80 rounded-full p-1.5 flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {[{ key: "all", label: "Todas", color: "#F2879D" }, ...CATEGORIES].map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={active ? { backgroundColor: c.color, color: "#1a0d10" } : { color: "#a1a1aa" }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* GRILLA */}
      <main className="px-5 flex-1 overflow-y-auto pb-36 pt-2 custom-scrollbar">
        {loading ? (
          <p className="text-center text-zinc-500 text-sm py-16">Cargando fotos...</p>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-zinc-700 rounded-3xl py-14 px-6 flex flex-col items-center text-center mt-4">
            <div className="w-14 h-14 rounded-full bg-[#1C1C1E] flex items-center justify-center text-[#F2879D] mb-3">
              <Camera size={26} />
            </div>
            <p className="text-sm text-zinc-300">
              {photos.length === 0 ? "Todavía no hay fotos." : "No hay fotos en esta categoría."}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Tocá la cámara para agregar una.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setViewerId(p.id)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1C1C1E] border border-zinc-800/80 cursor-pointer active:scale-[0.97] transition-transform"
              >
                {p.url ? (
                  <img src={p.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                    <ImageIcon size={22} />
                  </div>
                )}
                <span className="absolute top-2 left-2 w-2 h-2 rounded-full shadow" style={{ backgroundColor: catColor(p.category) }} />
                <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-7 bg-gradient-to-t from-black/75 to-transparent flex items-center justify-between">
                  <span className="text-[10px] text-zinc-200">{fmtDate(p.created_at)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(p);
                    }}
                    aria-label="Favorita"
                    className="p-1 -m-1 active:scale-90 transition-transform"
                  >
                    <Heart size={16} className={p.is_favorite ? "text-[#F2879D]" : "text-zinc-200"} fill={p.is_favorite ? "#F2879D" : "none"} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BOTÓN CÁMARA */}
      <button
        onClick={() => setShowAdd(true)}
        aria-label="Agregar foto"
        className="fixed bottom-20 right-6 w-14 h-14 bg-[#F2879D] text-[#1a0d10] rounded-full shadow-[0_6px_20px_rgba(242,135,157,0.4)] flex items-center justify-center z-30 active:scale-90 transition-transform"
      >
        <Camera size={24} />
      </button>

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#121212]/95 backdrop-blur-md border-t border-zinc-800/80 px-6 py-3 flex justify-between items-center z-20 pb-safe">
        <button onClick={() => router.push("/menu")} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <HomeIcon size={20} />
          <span className="text-[9px] font-medium">Inicio</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#F2879D]">
          <ImageIcon size={20} />
          <span className="text-[9px] font-medium">Fotos</span>
        </button>
        <button onClick={() => router.push("/chats")} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <MessageCircle size={20} />
          <span className="text-[9px] font-medium">Chat</span>
        </button>
        <button onClick={() => router.push("/calendario")} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <CalendarDays size={20} />
          <span className="text-[9px] font-medium">Agenda</span>
        </button>
        <MoodNavButton />
      </nav>

      {/* HOJA: AGREGAR FOTO */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end photo-fade" onClick={closeAdd}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-[#1C1C1E] border-t border-zinc-800/80 rounded-t-[32px] px-6 pt-3 pb-8 photo-sheet max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />

            {pending.length === 0 ? (
              <>
                <h3 className={`text-2xl text-white mb-1 ${dancingFont.className}`}>Agregar foto</h3>
                <p className="text-xs text-zinc-400 mb-5">Sacá una ahora o sumá una que ya tengas.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="bg-[#121212] border border-zinc-800 rounded-2xl py-6 flex flex-col items-center gap-2 text-[#F2879D] active:scale-95 transition-transform"
                  >
                    <Camera size={28} />
                    <span className="text-sm font-medium text-zinc-200">Sacar foto</span>
                  </button>
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="bg-[#121212] border border-zinc-800 rounded-2xl py-6 flex flex-col items-center gap-2 text-[#8294C4] active:scale-95 transition-transform"
                  >
                    <ImageIcon size={28} />
                    <span className="text-sm font-medium text-zinc-200">Elegir de otro lado</span>
                    <span className="text-[10px] text-zinc-500 -mt-1">Galería o archivos</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className={`text-2xl text-white mb-4 ${dancingFont.className}`}>
                  {pending.length} foto{pending.length > 1 ? "s" : ""} lista{pending.length > 1 ? "s" : ""}
                </h3>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  {pending.map((item, i) => (
                    <div key={item.preview} className="relative aspect-square rounded-xl overflow-hidden bg-[#121212]">
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      {!uploading && (
                        <button
                          onClick={() => removePending(i)}
                          aria-label="Quitar"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!uploading && (
                  <div className="flex gap-2 mb-5">
                    <button onClick={() => cameraInputRef.current?.click()} className="flex-1 bg-[#121212] border border-zinc-800 rounded-xl py-2.5 text-xs text-zinc-300 flex items-center justify-center gap-2">
                      <Camera size={14} /> Sacar otra
                    </button>
                    <button onClick={() => galleryInputRef.current?.click()} className="flex-1 bg-[#121212] border border-zinc-800 rounded-xl py-2.5 text-xs text-zinc-300 flex items-center justify-center gap-2">
                      <ImageIcon size={14} /> Agregar más
                    </button>
                  </div>
                )}

                <p className="text-xs text-zinc-400 mb-2">Categoría</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {CATEGORIES.map((c) => {
                    const active = uploadCategory === c.key;
                    return (
                      <button
                        key={c.key}
                        disabled={uploading}
                        onClick={() => setUploadCategory(c.key)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
                        style={active ? { backgroundColor: c.color, borderColor: c.color, color: "#1a0d10" } : { borderColor: "#3f3f46", color: "#a1a1aa" }}
                      >
                        {c.key}
                      </button>
                    );
                  })}
                </div>

                {uploadError && <p className="text-xs text-red-400 mb-3">{uploadError}</p>}

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-[#F2879D] text-[#1a0d10] font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-70"
                >
                  {uploading
                    ? `Subiendo ${Math.min(progress.done + 1, progress.total)} de ${progress.total}...`
                    : `Subir ${pending.length} foto${pending.length > 1 ? "s" : ""}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* VISOR DE FOTO */}
      {viewerPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col photo-fade">
          <div className="flex items-center justify-between px-4 pt-10 pb-3">
            <button onClick={() => setViewerId(null)} aria-label="Cerrar" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
              <X size={20} />
            </button>
            <div className="text-center">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${catColor(viewerPhoto.category)}25`, color: catColor(viewerPhoto.category) }}
              >
                {viewerPhoto.category}
              </span>
              <p className="text-[11px] text-zinc-400 mt-1">
                {fmtDate(viewerPhoto.created_at)} · {viewerPhoto.uploader === currentUser ? "Subida por vos" : `Subida por ${viewerPhoto.uploader}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleFavorite(viewerPhoto)}
                aria-label="Favorita"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Heart size={20} className={viewerPhoto.is_favorite ? "text-[#F2879D]" : "text-white"} fill={viewerPhoto.is_favorite ? "#F2879D" : "none"} />
              </button>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 relative flex items-center justify-center px-2"
            onTouchStart={(e) => (viewerTouchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (viewerTouchX.current === null) return;
              const dx = e.changedTouches[0].clientX - viewerTouchX.current;
              viewerTouchX.current = null;
              if (dx > 60) goViewer(-1);
              else if (dx < -60) goViewer(1);
            }}
          >
            {viewerPhoto.url && <img src={viewerPhoto.url} alt="" className="max-h-full max-w-full object-contain rounded-xl" />}
            {viewerIndex > 0 && (
              <button onClick={() => goViewer(-1)} aria-label="Anterior" className="absolute left-2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center">
                <ChevronLeft size={22} />
              </button>
            )}
            {viewerIndex >= 0 && viewerIndex < filtered.length - 1 && (
              <button onClick={() => goViewer(1)} aria-label="Siguiente" className="absolute right-2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center">
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          <div className="px-4 pt-3 pb-8 flex items-center gap-3">
            <div className="flex-1 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
              {CATEGORIES.map((c) => {
                const active = viewerPhoto.category === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => changeCategory(viewerPhoto, c.key)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={active ? { backgroundColor: c.color, borderColor: c.color, color: "#1a0d10" } : { borderColor: "#3f3f46", color: "#a1a1aa" }}
                  >
                    {c.key}
                  </button>
                );
              })}
            </div>
            {viewerPhoto.uploader === currentUser && (
              <button
                onClick={() => deletePhoto(viewerPhoto)}
                aria-label="Borrar foto"
                className="w-10 h-10 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
