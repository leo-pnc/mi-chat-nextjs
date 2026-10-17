"use client";
import { useState } from "react";
import { Heart, Copy, Check, ArrowRight, MessageCircle, Mail, Coffee } from "lucide-react";
import { Dancing_Script } from 'next/font/google';
import Image from "next/image";

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '600', '700'] });

export default function SalaEsperaPage() {
  const [inviteCode] = useState("TECI-8X9P"); // Código generado (simulado)
  const [enteredCode, setEnteredCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Foto de perfil del usuario logueado
  const USER_AVATAR = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=100&auto=format&fit=crop";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `¡Hola! Creé nuestro espacio en Tecito ☕❤️.\n\nIngresá este código mágico para conectarte conmigo: *${inviteCode}*\n\n¡Te espero!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!enteredCode.trim()) return;
    console.log("Intentando unir con código:", enteredCode);
    // Acá iría la lógica de Supabase para buscar el código y vincular cuentas
  };

  return (
    <div className="min-h-screen bg-[#101010] text-zinc-200 font-sans p-6 flex flex-col overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mt-6 mb-3">
        <h1 className={`text-[46px] text-white flex items-center gap-1 leading-none ${dancingFont.className}`}>
          Sala de Espera 
          <Heart size={30} className="text-[#F2879D] ml-1 mt-2" strokeWidth={2.5} fill="transparent" />
        </h1>
        
        {/* Avatar del usuario (Arriba a la derecha) */}
        <div className="w-11 h-11 rounded-full border border-zinc-700 overflow-hidden shadow-sm flex-shrink-0">
          <img src={USER_AVATAR} alt="Mi perfil" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* SUBTÍTULO */}
      <p className="text-[13px] text-zinc-400 font-light leading-relaxed mb-8 pr-4 tracking-wide">
        Aún no están conectados... pero ya es un gran paso.<br/>
        Elijan cómo quieren empezar su historia en Tecito. <Heart size={12} className="inline text-[#F2879D]" />
      </p>

      {/* TARJETA - OPCIÓN A */}
      <div className="bg-[#161616] border border-zinc-800/80 rounded-[24px] p-6 mb-5 shadow-lg relative overflow-hidden">
        
        {/* Ilustración simulada (Tazas) */}
        <div className="mb-4 flex items-center justify-start gap-1 text-[#F497A9]">
          <div className="relative">
            <Coffee size={40} strokeWidth={1.5} />
            <Heart size={14} className="absolute -top-1 -right-2 text-[#F2879D]" fill="#F2879D"/>
          </div>
          <div className="relative mt-3 ml-1">
            <Coffee size={36} strokeWidth={1.5} />
            <Heart size={12} className="absolute top-1 right-2 text-[#F2879D]" />
          </div>
        </div>

        <div className="inline-block bg-[#F2879D]/15 text-[#F2879D] text-[10px] font-bold px-3 py-1 rounded-full mb-3">
          Opción A
        </div>
        
        <h2 className={`text-[28px] text-white leading-none mb-2 ${dancingFont.className}`}>
          Crear nuestro espacio
        </h2>
        
        <p className="text-xs text-zinc-400 leading-relaxed mb-5 pr-2">
          Generá un código de pareja y compartilo con tu persona. ¡Así podrán empezar a usar la app juntos!
        </p>

        {/* Caja de Código */}
        <div className="flex items-center justify-between bg-[#0F0F0F] border border-zinc-800/80 rounded-2xl p-1 pl-5 mb-5 w-4/5 mx-auto">
          <span className="text-[#F2879D] font-mono text-sm font-medium tracking-widest">
            {inviteCode}
          </span>
          <button 
            onClick={handleCopyCode}
            className="p-3 text-zinc-400 hover:text-white transition-colors border-l border-zinc-800/80"
          >
            {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>

        {/* Botón WhatsApp */}
        <button 
          onClick={handleShareWhatsApp}
          className="w-full bg-[#F2879D] text-black font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-[13px] shadow-[0_4px_15px_rgba(242,135,157,0.15)]"
        >
          <MessageCircle size={18} />
          Compartir invitación por WhatsApp <ArrowRight size={16} />
        </button>
      </div>

      {/* TARJETA - OPCIÓN B */}
      <div className="bg-[#161616] border border-zinc-800/80 rounded-[24px] p-6 mb-8 shadow-lg relative overflow-hidden">
        
        {/* Ilustración simulada (Carta) */}
        <div className="mb-4 text-[#F497A9] relative w-12">
          <Mail size={42} strokeWidth={1.2} />
          <Heart size={16} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#F2879D]" fill="#F2879D" />
          <div className="absolute -top-1 -right-4 flex flex-col gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-[#F2879D]/60"></div>
             <div className="w-1 h-1 rounded-full bg-[#F2879D]/40 ml-2"></div>
          </div>
        </div>

        <div className="inline-block bg-[#F2879D]/15 text-[#F2879D] text-[10px] font-bold px-3 py-1 rounded-full mb-3">
          Opción B
        </div>
        
        <h2 className={`text-[28px] text-white leading-none mb-2 ${dancingFont.className}`}>
          Tengo un código de mi pareja
        </h2>
        
        <p className="text-xs text-zinc-400 leading-relaxed mb-5 pr-4">
          Ingresá el código que te pasaron y conectate.
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <input 
            type="text" 
            placeholder="Ej: TECI-8X9P"
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
            className="w-full bg-[#0F0F0F] border border-zinc-800/80 text-white font-mono rounded-2xl p-4 focus:outline-none focus:border-[#F2879D] transition-colors placeholder:text-zinc-600 text-sm tracking-wider uppercase text-center"
          />

          <button 
            type="submit"
            disabled={!enteredCode.trim()}
            className="w-full bg-[#F2879D] text-black font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unirme <ArrowRight size={16} />
          </button>
        </form>
      </div>

      {/* FOOTER - DIVISOR */}
      <div className="mt-auto mb-6 flex flex-col items-center justify-center animate-in fade-in duration-1000 delay-500">
        <div className="flex items-center w-full max-w-[200px] mb-3 opacity-30">
          <div className="h-px bg-zinc-600 flex-1"></div>
          <Heart size={14} className="text-zinc-500 mx-3" />
          <div className="h-px bg-zinc-600 flex-1"></div>
        </div>
        <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
          Dos personas, un mismo lugar <Heart size={10} className="inline text-[#F2879D] ml-0.5" />
        </p>
      </div>

    </div>
  );
}