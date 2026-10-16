"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, CalendarHeart } from "lucide-react";

export default function CalendarioPage() {
  const router = useRouter();
  
  // Estados para el Modal del Aniversario
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [wantsNotification, setWantsNotification] = useState(true);

  // Función provisoria para guardar el aniversario
  const handleSaveAnniversary = () => {
    if (!anniversaryDate) return;
    console.log("Aniversario guardado:", anniversaryDate, "Notificar:", wantsNotification);
    setShowOnboarding(false);
    // Acá conectaremos Supabase en el próximo paso
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans pb-24 selection:bg-[#F2879D]/30 relative">
      
      {/* HEADER SIMPLE */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4 bg-[#121212]/95 backdrop-blur-md sticky top-0 z-30 border-b border-zinc-800/80">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white p-2 -ml-2 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-medium tracking-wide">Nuestra Agenda</h1>
        <div className="w-8"></div> {/* Espaciador invisible para centrar el título */}
      </header>

      {/* CONTENEDOR DEL CALENDARIO (Próximo paso) */}
      <main className="px-6 mt-6">
        <p className="text-center text-zinc-500 mt-20">Acá irá la grilla del calendario...</p>
      </main>

      {/* POP-UP: AGENDÁ TU ANIVERSARIO */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F2879D]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <div className="w-16 h-16 bg-[#F2879D]/10 text-[#F2879D] rounded-full flex items-center justify-center mb-4">
                <CalendarHeart size={32} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl text-[#FDF2F2] font-semibold mb-2" style={{ fontFamily: 'cursive, "Brush Script MT"' }}>
                Agendá tu aniversario!
              </h2>
              <p className="text-sm text-zinc-400">
                Guardá esta fecha especial para que siempre esté marcada en nuestra historia.
              </p>
            </div>

            <div className="space-y-5 relative z-10">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Fecha de Aniversario</label>
                <input 
                  type="date" 
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                  className="bg-[#121212] border border-zinc-700 text-white rounded-xl p-3 focus:outline-none focus:border-[#F2879D] transition-colors"
                />
              </div>

              <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 p-3 rounded-xl cursor-pointer" onClick={() => setWantsNotification(!wantsNotification)}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${wantsNotification ? 'bg-[#F2879D]/20 text-[#F2879D]' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Bell size={18} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-zinc-200">Recordatorio mágico</span>
                    <span className="text-[10px] text-zinc-500">Aviso push 7 días antes</span>
                  </div>
                </div>
                {/* Custom Toggle Switch */}
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${wantsNotification ? 'bg-[#F2879D]' : 'bg-zinc-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${wantsNotification ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </div>

              <button 
                onClick={handleSaveAnniversary}
                disabled={!anniversaryDate}
                className="w-full bg-[#F2879D] text-black font-semibold rounded-xl py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                Guardar momento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}