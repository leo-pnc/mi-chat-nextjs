"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Bell, CalendarHeart, Heart, Plus, ArrowRight, Plane, Film, Gift, Coffee, Home as HomeIcon, Image as ImageIcon, MessageCircle, CalendarDays, X, Clock, Calendar, Sparkles, Tag } from "lucide-react";
import { Dancing_Script } from 'next/font/google';

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '600'] });

const EVENT_COLORS = {
  'Cita': '#F2879D', 
  'Viaje': '#8294C4', 
  'Encuentro': '#F9D949', 
  'Cumpleaños': '#95D2B3', 
  'Otro': '#9D76C1' 
};

export default function CalendarioPage() {
  const router = useRouter();
  
  // Estados Generales
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1));
  const [showOnboarding, setShowOnboarding] = useState(false); 

  // Estados del Bottom Sheet (Nuevo Evento)
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [newEventType, setNewEventType] = useState("Cita");
  const [isSurprise, setIsSurprise] = useState(false);

  // Lógica de fechas (Calendario)
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  // Función para cerrar y limpiar el formulario
  const handleCloseAddEvent = () => {
    setShowAddEvent(false);
    setTimeout(() => {
      setNewEventTitle(""); setNewEventDate(""); setNewEventTime("");
      setIsAllDay(false); setNewEventType("Cita"); setIsSurprise(false);
    }, 300); // Espera a que termine la animación para borrar los datos
  };

  const handleSaveEvent = () => {
    if (!newEventTitle || !newEventDate || (!isAllDay && !newEventTime)) return;
    console.log("Guardando evento:", { newEventTitle, newEventDate, newEventTime, isAllDay, newEventType, isSurprise });
    handleCloseAddEvent();
    // Fase futura: Conectar a Supabase
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans pb-28 relative">
      
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 bg-gradient-to-b from-[#2A1B1B] to-[#121212] sticky top-0 z-20">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => router.back()} className="text-zinc-300 hover:text-white -ml-2">
                <ChevronLeft size={28} />
              </button>
              <div className="flex items-center">
                <h1 className={`text-[36px] text-white leading-none ${dancingFont.className}`}>Calendario</h1>
                <Heart size={24} className="text-[#F2879D] ml-2 mt-1" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-light flex items-center gap-1.5 ml-2">
              Nuestros planes, en un solo lugar <Heart size={10} className="text-zinc-500" />
            </p>
          </div>
          
          <div className="relative mt-1">
            <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden shadow-inner">
              <img src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=200&auto=format&fit=crop" alt="Pareja" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 text-[#F2879D] bg-[#121212] rounded-full p-0.5">
              <Heart size={12} fill="currentColor" />
            </div>
          </div>
        </div>
      </header>

      <main className="px-5">
        {/* GRILLA DEL CALENDARIO */}
        <div className="bg-[#1C1C1E] border border-zinc-800/80 rounded-[28px] p-5 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-white ml-1">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-4">
              <button onClick={prevMonth} className="text-zinc-400 hover:text-white"><ChevronLeft size={20}/></button>
              <button onClick={nextMonth} className="text-zinc-400 hover:text-white"><ChevronRight size={20}/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-4 text-center">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <span key={d} className="text-[11px] text-zinc-400 font-medium">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-4 text-center">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = events.filter(e => e.date === dateStr);
              // Lógica de "Hoy" real:
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div key={day} className="flex flex-col items-center relative h-8">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${isToday ? 'bg-[#F2879D] text-black font-semibold shadow-md' : 'text-zinc-200'}`}>
                    {day}
                  </div>
                  <div className="flex gap-0.5 absolute -bottom-1">
                    {dayEvents.map((ev, idx) => (
                      <span key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: EVENT_COLORS[ev.type] }}></span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PRÓXIMOS EVENTOS */}
        <div className="flex justify-between items-end mb-4 px-1">
          <h3 className="text-sm text-zinc-200 font-medium tracking-wide">Próximos eventos</h3>
        </div>

        {events.length === 0 ? (
          <div className="bg-[#1C1C1E] border border-zinc-800/50 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <CalendarHeart size={32} className="text-zinc-600 mb-3" />
            <p className="text-zinc-400 text-sm">Aún no hay planes agendados.</p>
            <p className="text-zinc-500 text-xs mt-1">Tocá el botón + para armar algo lindo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Acá se mapearán los eventos cuando conectemos la DB */}
          </div>
        )}
      </main>

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#121212]/95 backdrop-blur-md border-t border-zinc-800/80 px-6 py-3 flex justify-between items-center z-20 pb-safe">
        <button onClick={() => router.push('/menu')} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <HomeIcon size={20} />
          <span className="text-[9px] font-medium">Inicio</span>
        </button>
        <button onClick={() => router.push('/galeria')} className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors">
          <ImageIcon size={20} />
          <span className="text-[9px] font-medium">Fotos</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-[#F4D1D1] transition-colors relative">
          <MessageCircle size={20} />
          <span className="text-[9px] font-medium">Chat</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#F2879D]">
          <CalendarDays size={20} />
          <span className="text-[9px] font-medium">Calendario</span>
        </button>
      </nav>

      {/* FAB: BOTÓN FLOTANTE */}
      <button 
        onClick={() => setShowAddEvent(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-[#F2879D] text-black rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(242,135,157,0.4)] z-30 active:scale-95 transition-transform"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* ========================================= */}
      {/* BOTTOM SHEET: NUEVO EVENTO                */}
      {/* ========================================= */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Fondo difuminado interactivo (Cierra el modal al tocarlo) */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={handleCloseAddEvent}
          />
          
          {/* Hoja Inferior (75% de la pantalla) */}
          <div className="relative bg-[#1C1C1E] w-full h-[75vh] rounded-t-[32px] border-t border-zinc-800/80 p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            
            {/* Tirador visual (Handle) */}
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6 shrink-0" />
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-medium text-white flex items-center gap-2">
                Agendar plan <Sparkles size={20} className="text-[#F2879D]"/>
              </h3>
              <button onClick={handleCloseAddEvent} className="text-zinc-500 hover:text-white p-1 bg-zinc-800/50 rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Contenido scrolleable del formulario */}
            <div className="flex-1 overflow-y-auto space-y-5 pb-safe pr-1 custom-scrollbar">
              
              {/* TÍTULO (Obligatorio) */}
              <div>
                <input 
                  type="text" 
                  placeholder="Ej: Cena en nuestro lugar..." 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-700 focus:border-[#F2879D] text-white text-xl p-2 pb-3 focus:outline-none transition-colors placeholder:text-zinc-600"
                />
              </div>

              {/* FECHA Y HORA (Obligatorios) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Calendar size={12}/> Fecha</label>
                  <input 
                    type="date" 
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 text-white rounded-xl p-3 focus:outline-none focus:border-zinc-600 [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Clock size={12}/> Hora</label>
                  <input 
                    type="time" 
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    disabled={isAllDay}
                    className="w-full bg-[#121212] border border-zinc-800 text-white rounded-xl p-3 focus:outline-none focus:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* SWITCH TODO EL DÍA */}
              <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 p-3 rounded-xl cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                <span className="text-sm font-medium text-zinc-300">Todo el día</span>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${isAllDay ? 'bg-[#A7C7E7]' : 'bg-zinc-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isAllDay ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </div>

              {/* CATEGORÍA (Opcional - predeterminado 'Cita') */}
              <div className="space-y-2.5 pt-2">
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Tag size={12}/> Etiqueta</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(EVENT_COLORS).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewEventType(type)}
                      className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${newEventType === type ? 'text-black shadow-md' : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                      style={{ 
                        backgroundColor: newEventType === type ? EVENT_COLORS[type] : 'transparent',
                        borderColor: newEventType === type ? EVENT_COLORS[type] : ''
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODO SORPRESA (Opcional) */}
              <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-[#F2879D]/10 to-transparent border border-[#F2879D]/20 p-4 rounded-xl cursor-pointer" onClick={() => setIsSurprise(!isSurprise)}>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-[#FDF2F2] flex items-center gap-1.5">
                    Modo Sorpresa <Sparkles size={14} className="text-[#F2879D]" />
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5">Ocultar los detalles en su celular hasta el día.</span>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 flex-shrink-0 ${isSurprise ? 'bg-[#F2879D]' : 'bg-zinc-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isSurprise ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </div>

            </div>

            {/* BOTÓN DE GUARDADO (Fijo abajo) */}
            <div className="pt-4 shrink-0">
              <button 
                onClick={handleSaveEvent}
                disabled={!newEventTitle || !newEventDate || (!isAllDay && !newEventTime)}
                className="w-full bg-[#F2879D] text-black font-semibold rounded-xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#F2879D]/20"
              >
                Crear plan <CalendarHeart size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}