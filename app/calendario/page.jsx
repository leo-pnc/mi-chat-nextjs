"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Bell, CalendarHeart, Heart, Plus, ArrowRight, Plane, Film, Gift, Coffee, Home as HomeIcon, Image as ImageIcon, MessageCircle, CalendarDays } from "lucide-react";
import { Dancing_Script } from 'next/font/google';

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '600'] });

// Colores de los eventos (como en tu referencia)
const EVENT_COLORS = {
  'Cita': '#F2879D', // Rosa
  'Viaje': '#8294C4', // Azul pastel
  'Encuentro': '#F9D949', // Amarillo/Naranja
  'Cumpleaños': '#95D2B3', // Verde pastel
  'Otro': '#9D76C1' // Morado
};

export default function CalendarioPage() {
  const router = useRouter();
  
  // Modal de Onboarding (Oculto por defecto para que veas el diseño)
  const [showOnboarding, setShowOnboarding] = useState(false); 
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [wantsNotification, setWantsNotification] = useState(true);

  // Estados del calendario
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // Octubre 2026 para coincidir con tu foto
  
  // Eventos de prueba basados en tu imagen
// Borramos los eventos falsos y preparamos el estado real
  const [events, setEvents] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Lógica de fechas
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Ajuste para que empiece en Lunes (Lun=0, Dom=6)
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  // Formateador de fecha
  const handleDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setAnniversaryDate(value);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans pb-28 relative">
      
      {/* HEADER TIPO BANNER OSCURO */}
      <header className="px-6 pt-12 pb-6 bg-gradient-to-b from-[#2A1B1B] to-[#121212] sticky top-0 z-30">
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
          
          {/* Avatar Pareja */}
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

          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-4 text-center">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <span key={d} className="text-[11px] text-zinc-400 font-medium">{d}</span>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-y-4 text-center">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = dummyEvents.filter(e => e.date === dateStr);
              const isToday = day === 3; // Forzado para simular tu captura (3 de Octubre)

              return (
                <div key={day} className="flex flex-col items-center relative h-8">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${isToday ? 'bg-[#F2879D] text-black font-semibold shadow-md' : 'text-zinc-200'}`}>
                    {day}
                  </div>
                  {/* Puntitos de eventos */}
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
          <button className="text-[11px] text-zinc-400 flex items-center gap-1 hover:text-white">
            Ver todo <ArrowRight size={12} />
          </button>
        </div>

        <div className="space-y-3">
          {dummyEvents.map((ev) => (
            <div key={ev.id} className="bg-[#1C1C1E] border border-zinc-800/80 rounded-2xl p-3 pl-0 flex items-center gap-3 shadow-sm relative overflow-hidden">
              {/* Borde lateral de color */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: EVENT_COLORS[ev.type] }}></div>
              
              {/* Ícono */}
              <div className="w-12 h-12 rounded-xl ml-4 flex items-center justify-center shadow-inner" style={{ backgroundColor: `${EVENT_COLORS[ev.type]}20`, color: EVENT_COLORS[ev.type] }}>
                <ev.icon size={22} strokeWidth={1.5} />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white flex items-center gap-1.5 truncate">
                  {ev.title} {ev.type === 'Cita' && <Heart size={12} />}
                </h4>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {/* Fake date string for UI */}
                  {ev.date.split('-')[2]} oct • {ev.time}
                </p>
              </div>

              {/* Avatares (superpuestos) */}
              <div className="flex mr-2">
                <div className="w-7 h-7 rounded-full border-2 border-[#1C1C1E] bg-zinc-700 z-10 -mr-2 overflow-hidden"><img src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=100&auto=format&fit=crop" alt="A" /></div>
                <div className="w-7 h-7 rounded-full border-2 border-[#1C1C1E] bg-zinc-600 overflow-hidden"><img src="https://images.unsplash.com/photo-1476820897991-4b5cb38d2f50?q=80&w=100&auto=format&fit=crop" alt="B" /></div>
              </div>
              
              <ChevronRight size={16} className="text-zinc-600 mr-1" />
            </div>
          ))}
        </div>
      </main>

      {/* FAB: BOTÓN FLOTANTE PARA AGREGAR EVENTO */}
      <button onClick={() => setShowAddEvent(true)}className="fixed bottom-20 right-6 w-12 h-12 bg-[#F2879D] text-black rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(242,135,157,0.3)] z-40 active:scale-95 transition-transform">
        <Plus size={24} strokeWidth={2} />
      </button>

      {/* NAVEGACIÓN INFERIOR (Bottom Nav) */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#121212]/95 backdrop-blur-md border-t border-zinc-800/80 px-6 py-3 flex justify-between items-center z-40 pb-safe">
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

      {/* MODAL ONBOARDING (Oculto por ahora) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           {/* Acá va el código del pop-up que armamos antes... */}
        </div>
      )}
    </div>
  );
}