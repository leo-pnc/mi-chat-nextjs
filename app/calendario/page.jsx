"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Bell, CalendarHeart, Heart, Plus, ArrowRight, Plane, Film, Gift, Coffee, Home as HomeIcon, Image as ImageIcon, MessageCircle, CalendarDays, X, Clock, Calendar, Sparkles, Tag, Timer } from "lucide-react";
import { Dancing_Script } from 'next/font/google';

// Asegurate de que esta ruta apunte bien a tu archivo de conexión
import { supabase } from "@/lib/supabaseClient"; 

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '600'] });

const EVENT_COLORS = {
  'Cita': '#F2879D', 
  'Viaje': '#8294C4', 
  'Encuentro': '#F9D949', 
  'Cumpleaños': '#95D2B3', 
  'Otro': '#9D76C1' 
};

const EVENT_ICONS = {
  'Cita': Heart,
  'Viaje': Plane,
  'Encuentro': Film,
  'Cumpleaños': Gift,
  'Otro': Coffee
};

export default function CalendarioPage() {
  const router = useRouter();
  
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  // --- NUEVO: ESTADO PARA FECHA SELECCIONADA ---
  const [selectedDateStr, setSelectedDateStr] = useState(null);

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [newEventType, setNewEventType] = useState("Cita");
  const [isSurprise, setIsSurprise] = useState(false);

  // --- LÓGICA DE SWIPE VERTICAL (Modal de crear plan) ---
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(null);

  // --- NUEVO: LÓGICA DE SWIPE HORIZONTAL (Calendario) ---
  const calendarDragX = useRef(null);
  const handleCalTouchStart = (e) => { calendarDragX.current = e.touches[0].clientX; };
  const handleCalTouchMove = (e) => {
    if (calendarDragX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - calendarDragX.current;
    
    // Si arrastra más de 50px, cambiamos de mes y reseteamos
    if (diff > 50) { prevMonth(); calendarDragX.current = null; }
    else if (diff < -50) { nextMonth(); calendarDragX.current = null; }
  };
  const handleCalTouchEnd = () => { calendarDragX.current = null; };

  // --- OBTENER FECHA ACTUAL (Local) ---
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localNow = new Date(Date.now() - tzOffset);
  const todayDateStr = localNow.toISOString().split('T')[0]; 
  const currentTimeStr = localNow.toISOString().split('T')[1].substring(0, 5); 

  // --- CÁLCULO DE CUENTA REGRESIVA ---
  const getCountdownText = () => {
    if (!selectedDateStr) return null;
    
    const targetDate = new Date(selectedDateStr + 'T00:00:00'); // Inicio de ese día
    const diff = targetDate - new Date(); // Diferencia en milisegundos

    if (diff < 0 && selectedDateStr !== todayDateStr) {
      const daysPassed = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
      return `Pasó hace ${daysPassed} día${daysPassed > 1 ? 's' : ''}`;
    }

    if (selectedDateStr === todayDateStr) {
      return "¡Es hoy! ✨";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    if (days === 0) return `Faltan ${hours} horas`;
    return `Faltan ${days} d y ${hours} hs`;
  };

  const getMissingFields = () => {
    let missing = [];
    if (!newEventTitle.trim()) missing.push("Título");
    if (!newEventDate) missing.push("Fecha");
    if (!isAllDay && !newEventTime) missing.push("Hora");
    if (newEventDate === todayDateStr && !isAllDay && newEventTime && newEventTime < currentTimeStr) {
      missing.push("Hora (debe ser a futuro)");
    }
    return missing;
  };

  const missingFields = getMissingFields();
  const canSave = missingFields.length === 0;

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      if (data) setEvents(data);
    } catch (error) {
      console.error("Error cargando eventos:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!canSave) return; 
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        alert("Necesitas estar logueado para crear un plan."); return;
      }

      const eventToSave = {
        title: newEventTitle,
        date: newEventDate,
        time: isAllDay ? null : newEventTime,
        is_all_day: isAllDay,
        type: newEventType,
        is_surprise: isSurprise,
        creator: authData.user.id 
      };

      const { data, error } = await supabase.from('calendar_events').insert([eventToSave]).select(); 
      if (error) throw error;

      if (data) {
        setEvents((prev) => [...prev, data[0]].sort((a, b) => new Date(a.date) - new Date(b.date)));
        handleCloseAddEvent();
      }
    } catch (error) {
      console.error("Error guardando el plan:", error.message);
      alert("Hubo un error al guardar el plan. Revisa la consola.");
    }
  };

  // --- LÓGICA DE DÍAS Y MESES ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  const nextMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); setSelectedDateStr(null); };
  const prevMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); setSelectedDateStr(null); };

  // --- FILTRO DE EVENTOS ---
  // Si hay fecha seleccionada, mostramos solo esos. Si no, mostramos todos los planes de hoy en adelante.
  const displayedEvents = selectedDateStr 
    ? events.filter(e => e.date === selectedDateStr)
    : events.filter(e => e.date >= todayDateStr);

  const handleDayClick = (dateStr) => {
    if (selectedDateStr === dateStr) {
      setSelectedDateStr(null); // Desmarca si se toca la misma fecha
    } else {
      setSelectedDateStr(dateStr); // Selecciona la nueva fecha
    }
  };

  // Botón cerrar modal
  const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (dragStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  };
  const handleTouchEnd = () => {
    if (dragStartY.current === null) return;
    if (dragY > 120) handleCloseAddEvent();
    else setDragY(0); 
    dragStartY.current = null;
  };
  const handleCloseAddEvent = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowAddEvent(false); setIsClosing(false); setDragY(0);
      setNewEventTitle(""); setNewEventDate(""); setNewEventTime("");
      setIsAllDay(false); setNewEventType("Cita"); setIsSurprise(false);
    }, 300); 
  };
  
  const progress = Math.max(0, Math.min(dragY / 400, 1)); 
  const overlayOpacity = isClosing ? 0 : 0.6 * (1 - progress);
  const overlayBlur = isClosing ? 0 : 4 * (1 - progress);

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans relative flex flex-col h-screen overflow-hidden">
      
      {/* HEADER TIPO BANNER OSCURO */}
      <header className="px-6 pt-12 pb-6 bg-gradient-to-b from-[#2A1B1B] to-[#121212] flex-shrink-0 z-20">
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
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL (Scrollable) */}
      <main className="px-5 flex-1 overflow-y-auto pb-32 custom-scrollbar flex flex-col">
        
        {/* GRILLA DEL CALENDARIO CON ZONA SWIPEABLE */}
        <div 
          className="bg-[#1C1C1E] border border-zinc-800/80 rounded-[28px] p-5 mb-6 shadow-xl flex-shrink-0 touch-pan-y"
          onTouchStart={handleCalTouchStart}
          onTouchMove={handleCalTouchMove}
          onTouchEnd={handleCalTouchEnd}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-white ml-1">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-4">
              <button onClick={prevMonth} className="text-zinc-400 hover:text-white active:scale-90 transition-transform"><ChevronLeft size={20}/></button>
              <button onClick={nextMonth} className="text-zinc-400 hover:text-white active:scale-90 transition-transform"><ChevronRight size={20}/></button>
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
              
              const isToday = todayDateStr === dateStr;
              const isSelected = selectedDateStr === dateStr;

              // Estilos dinámicos para el circulito del día
              let dayStyles = "text-zinc-200 hover:bg-zinc-800/50"; 
              if (isToday && !isSelected) dayStyles = "bg-[#F2879D] text-black font-semibold shadow-md";
              if (isSelected) dayStyles = "bg-transparent border-2 border-[#F2879D] text-[#F2879D] font-bold shadow-[0_0_10px_rgba(242,135,157,0.3)]";

              return (
                <div key={day} className="flex flex-col items-center relative h-8 cursor-pointer" onClick={() => handleDayClick(dateStr)}>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all duration-200 ${dayStyles}`}>
                    {day}
                  </div>
                  {/* Puntitos de colores */}
                  <div className="flex gap-0.5 absolute -bottom-1">
                    {dayEvents.slice(0, 3).map((ev, idx) => ( 
                      <span key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: EVENT_COLORS[ev.type] || EVENT_COLORS['Otro'] }}></span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CABECERA DE LA LISTA DE EVENTOS */}
        <div className="flex justify-between items-end mb-4 px-1 flex-shrink-0">
          <div className="flex flex-col">
            <h3 className="text-sm text-zinc-200 font-medium tracking-wide flex items-center gap-2">
              {selectedDateStr ? 'Planes del día' : 'Próximos eventos'}
              {selectedDateStr && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{selectedDateStr.split('-').reverse().join('/')}</span>}
            </h3>
            
            {/* CUENTA REGRESIVA MAGNÉTICA */}
            {selectedDateStr && (
              <span className="text-[11px] text-[#F2879D] mt-1 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                <Timer size={12}/> {getCountdownText()}
              </span>
            )}
          </div>
        </div>

        {/* LISTA DE EVENTOS (Ahora scrollea perfectamente gracias al contenedor flex) */}
        {isLoading ? (
          <div className="text-center text-zinc-500 py-6 text-sm">Cargando nuestros planes...</div>
        ) : displayedEvents.length === 0 ? (
          <div className="bg-[#1C1C1E] border border-zinc-800/50 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center mt-2 flex-shrink-0">
            <CalendarHeart size={32} className="text-zinc-600 mb-3" />
            <p className="text-zinc-400 text-sm">No hay planes para mostrar.</p>
            {selectedDateStr && <p className="text-zinc-500 text-xs mt-1">Podés agendar algo para este día tocando el +.</p>}
          </div>
        ) : (
          <div className="space-y-3 flex-shrink-0">
            {displayedEvents.map((ev) => {
              const EventIcon = EVENT_ICONS[ev.type] || EVENT_ICONS['Otro'];
              const dateObj = new Date(ev.date + 'T00:00:00'); 
              const displayDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()].slice(0,3).toLowerCase()}`;

              return (
                <div key={ev.id} className="bg-[#1C1C1E] border border-zinc-800/80 rounded-2xl p-3 pl-0 flex items-center gap-3 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: EVENT_COLORS[ev.type] }}></div>
                  
                  <div className="w-12 h-12 rounded-xl ml-4 flex items-center justify-center shadow-inner" style={{ backgroundColor: `${EVENT_COLORS[ev.type]}20`, color: EVENT_COLORS[ev.type] }}>
                    <EventIcon size={22} strokeWidth={1.5} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white flex items-center gap-1.5 truncate">
                      {ev.is_surprise ? 'Sorpresa ✨' : ev.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {displayDate} • {ev.is_all_day ? 'Todo el día' : ev.time?.slice(0, 5) || 'Sin hora'}
                    </p>
                  </div>
                  
                  <ChevronRight size={16} className="text-zinc-600 mr-3" />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button 
        onClick={() => {
          // Si tocan "+" y hay una fecha seleccionada, la precargamos en el formulario
          if (selectedDateStr) setNewEventDate(selectedDateStr);
          setShowAddEvent(true);
        }}
        className="fixed bottom-20 right-6 w-14 h-14 bg-[#F2879D] text-black rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(242,135,157,0.4)] z-30 active:scale-95 transition-transform"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* ========================================= */}
      {/* NAVEGACIÓN INFERIOR Y BOTTOM SHEET (El resto del código se mantiene igual...) */}
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

      {/* BOTTOM SHEET: NUEVO EVENTO */}
      {(showAddEvent || isClosing) && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 transition-all duration-300"
            style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})`, backdropFilter: `blur(${overlayBlur}px)` }}
            onClick={handleCloseAddEvent}
          />
          
          <div 
            className="relative bg-[#1C1C1E] w-full h-[75vh] rounded-t-[32px] border-t border-zinc-800/80 p-6 flex flex-col shadow-2xl transition-transform duration-300"
            style={{ transform: `translateY(${isClosing ? '100%' : dragY + 'px'})` }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-16 flex items-start justify-center pt-3 touch-none z-10"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-12 h-1.5 bg-zinc-700 rounded-full shrink-0" />
            </div>
            
            <div className="flex justify-between items-center mb-6 shrink-0 mt-4">
              <h3 className="text-xl font-medium text-white flex items-center gap-2">
                Agendar plan <Sparkles size={20} className="text-[#F2879D]"/>
              </h3>
              <button onClick={handleCloseAddEvent} className="text-zinc-500 hover:text-white p-1 bg-zinc-800/50 rounded-full relative z-20">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pb-safe pr-1 custom-scrollbar">
              
              <div>
                <input 
                  type="text" 
                  placeholder="Ej: Cena en nuestro lugar..." 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className={`w-full bg-transparent border-b text-white text-xl p-2 pb-3 focus:outline-none transition-colors placeholder:text-zinc-600
                    ${!newEventTitle && missingFields.includes("Título") && !canSave && showAddEvent ? 'border-[#F2879D]/50' : 'border-zinc-700 focus:border-[#F2879D]'}
                  `}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5 flex flex-col cursor-pointer group">
                  <span className="text-[11px] text-zinc-500 group-focus-within:text-[#F2879D] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors">
                    <Calendar size={12}/> Fecha
                  </span>
                  <input 
                    type="date" 
                    value={newEventDate}
                    min={todayDateStr} 
                    onClick={(e) => e.target.showPicker?.()} 
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 text-white rounded-xl p-3 focus:outline-none focus:border-[#F2879D] [color-scheme:dark] transition-colors cursor-pointer"
                  />
                </label>

                <label className="space-y-1.5 flex flex-col cursor-pointer group">
                  <span className={`text-[11px] ${isAllDay ? 'text-zinc-700' : 'text-zinc-500 group-focus-within:text-[#F2879D]'} uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors`}>
                    <Clock size={12}/> Hora
                  </span>
                  <input 
                    type="time" 
                    value={newEventTime}
                    onClick={(e) => e.target.showPicker?.()} 
                    onChange={(e) => setNewEventTime(e.target.value)}
                    disabled={isAllDay}
                    className="w-full bg-[#121212] border border-zinc-800 text-white rounded-xl p-3 focus:outline-none focus:border-[#F2879D] disabled:opacity-20 disabled:cursor-not-allowed [color-scheme:dark] transition-colors cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 p-3 rounded-xl cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                <span className="text-sm font-medium text-zinc-300">Todo el día</span>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${isAllDay ? 'bg-[#A7C7E7]' : 'bg-zinc-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isAllDay ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </div>

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

            <div className="pt-4 shrink-0 flex flex-col items-center">
              {!canSave && (
                <span className="text-[11px] text-[#F2879D] font-medium mb-3">
                  Completar: {missingFields.join(" • ")}
                </span>
              )}
              
              <button 
                onClick={handleSaveEvent}
                disabled={!canSave}
                className="w-full bg-[#F2879D] text-black font-semibold rounded-xl py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale-[0.5] disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#F2879D]/20"
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