"use client";
import { useState } from "react";
import { Mail, Lock, EyeOff, Eye, ArrowRight, Heart } from "lucide-react";
import { Dancing_Script } from 'next/font/google';
import Link from "next/link";

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '600', '700'] });

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Iniciando sesión con:", email, password);
    // Acá iría tu conexión con Supabase Auth
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col relative overflow-hidden font-sans text-zinc-200">
      
      {/* IMAGEN DE FONDO CON DEGRADADO */}
      <div className="absolute top-0 left-0 w-full h-[55vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/60 to-[#121212] z-10"></div>
        {/* Cambiá este src por el de tu imagen real, ej: "/fondo-login.jpg" */}
        <img 
          src="https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=800&auto=format&fit=crop" 
          alt="Fondo cálido" 
          className="w-full h-full object-cover object-center opacity-80"
        />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-10">
        
        {/* LOGO Y SUBTÍTULO */}
        <div className="flex flex-col items-center mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-center">
            <h1 className={`text-[56px] text-white leading-none tracking-wide ${dancingFont.className}`}>
              Tecito
            </h1>
            <Heart size={32} strokeWidth={2} className="text-[#F2879D] ml-2 mt-2" fill="transparent" />
          </div>
          <p className="text-sm text-zinc-400 font-light mt-1 tracking-wide">
            Tu lugar, siempre
          </p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-backwards">
          
          {/* EMAIL */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail size={18} className="text-zinc-500" />
            </div>
            <input 
              type="email" 
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1A1A1A]/80 backdrop-blur-sm border border-zinc-800/80 text-white rounded-full py-3.5 pl-11 pr-4 focus:outline-none focus:border-[#F2879D] transition-colors placeholder:text-zinc-600 text-sm"
              required
            />
          </div>

          {/* CONTRASEÑA */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} className="text-zinc-500" />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1A1A1A]/80 backdrop-blur-sm border border-zinc-800/80 text-white rounded-full py-3.5 pl-11 pr-12 focus:outline-none focus:border-[#F2879D] transition-colors placeholder:text-zinc-600 text-sm"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {/* RECORDAR CUENTA Y OLVIDÉ CLAVE */}
          <div className="flex items-center justify-between px-1 pt-1 pb-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#F2879D] border-[#F2879D]' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                {rememberMe && <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </div>
              <span className="text-[12px] text-zinc-400">Recordar mi cuenta</span>
            </label>
            
            <Link href="/olvide-password" className="text-[12px] text-[#F2879D] hover:text-[#F497A9] underline-offset-2 underline decoration-[#F2879D]/40">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* BOTÓN INICIAR SESIÓN */}
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-[#F497A9] to-[#F2879D] text-black font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(242,135,157,0.2)] text-sm"
          >
            Iniciar sesión <ArrowRight size={18} />
          </button>
        </form>

        {/* DIVISOR */}
        <div className="flex items-center gap-4 my-6 animate-in fade-in duration-700 delay-300 fill-mode-backwards">
          <div className="h-px bg-zinc-800 flex-1"></div>
          <span className="text-zinc-600 text-xs font-medium">o</span>
          <div className="h-px bg-zinc-800 flex-1"></div>
        </div>

        {/* BOTÓN DE GOOGLE */}
        <button 
          type="button"
          className="w-full bg-transparent border border-zinc-800 hover:bg-zinc-900/50 text-zinc-300 rounded-full py-3.5 flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-sm animate-in fade-in duration-700 delay-300 fill-mode-backwards"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuar con Google
        </button>

        {/* LINK DE REGISTRO */}
        <div className="mt-8 text-center animate-in fade-in duration-700 delay-500 fill-mode-backwards">
          <p className="text-[12px] text-zinc-500 mb-1">
            ¿No tienes una cuenta?
          </p>
          <Link href="/registro" className="text-sm text-[#F2879D] hover:text-[#F497A9] font-medium flex items-center justify-center gap-1">
            Registrate creando una <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}