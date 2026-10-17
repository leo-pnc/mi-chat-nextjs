"use client";
import { useState } from "react";
import { Mail, Lock, EyeOff, Eye, ArrowRight, Heart, User, Calendar, CheckCircle } from "lucide-react";
import { Dancing_Script } from 'next/font/google';
import Link from "next/link";

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '600', '700'] });

export default function RegistroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para validación y flujo
  const [errors, setErrors] = useState({});
  const [isEmailSent, setIsEmailSent] = useState(false); // Cambia la pantalla cuando se registra

  const validateForm = () => {
    let newErrors = {};

    // 1. Validar Nombre (Sin números ni símbolos raros)
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
      newErrors.name = "Solo letras y espacios. Sin números.";
    }

    // 2. Validar Fecha de Nacimiento
    if (!birthDate) {
      newErrors.birthDate = "Falta tu fecha de nacimiento.";
    } else {
      const selected = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - selected.getFullYear();
      if (today.getMonth() < selected.getMonth() || (today.getMonth() === selected.getMonth() && today.getDate() < selected.getDate())) {
        age--;
      }
      if (selected >= today) newErrors.birthDate = "La fecha no puede ser en el futuro.";
      else if (age < 13) newErrors.birthDate = "Debes tener al menos 13 años.";
    }

    // 3. Validar Email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Ingresá un correo válido.";
    }

    // 4. Validar Contraseña Segura
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = "Mín. 8 caracteres, 1 mayúscula y 1 número.";
    }

    // 5. Validar Confirmación
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Retorna true si no hay errores
  };

  const handleRegister = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      console.log("Datos válidos, registrando:", name, email, birthDate);
      // ACÁ VA LA LÓGICA DE SUPABASE: supabase.auth.signUp(...)
      
      // Simulamos que Supabase envió el correo correctamente:
      setIsEmailSent(true);
    }
  };

  // PANTALLA 2: VERIFICACIÓN DE CORREO (Anti cuentas fantasmas)
  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 text-center text-zinc-200">
        <div className="w-20 h-20 bg-[#F2879D]/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Mail size={40} className="text-[#F2879D]" />
        </div>
        <h2 className={`text-[42px] text-white leading-none mb-4 ${dancingFont.className}`}>¡Ya casi estamos!</h2>
        <p className="text-zinc-400 max-w-sm mb-8 text-sm leading-relaxed">
          Para proteger nuestra comunidad, enviamos un enlace de confirmación a <strong className="text-white">{email}</strong>. 
          Revisá tu bandeja de entrada (y el spam) para activar tu cuenta.
        </p>
        <Link href="/login" className="bg-[#F2879D] text-black font-semibold rounded-full px-8 py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          Ir a Iniciar sesión <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  // PANTALLA 1: FORMULARIO
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col relative font-sans text-zinc-200">
      
      {/* FONDO */}
      <div className="fixed top-0 left-0 w-full h-[40vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/80 to-[#121212] z-10"></div>
        <img 
          src="/tazas-inicio.png" 
          alt="Fondo registro" 
          className="w-full h-full object-cover object-center opacity-70"
        />
      </div>

      {/* CONTENIDO PRINCIPAL (Scrollable para los teléfonos más chicos) */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-10 overflow-y-auto custom-scrollbar">
        
        <div className="flex flex-col items-center mb-6 text-center mt-auto">
          <div className="flex items-center justify-center">
            <h1 className={`text-[48px] text-white leading-none tracking-wide ${dancingFont.className}`}>
              Crear cuenta
            </h1>
            <Heart size={28} strokeWidth={2.5} className="text-[#F2879D] ml-2 mt-2" fill="transparent" />
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* NOMBRE */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className={errors.name ? "text-red-400" : "text-zinc-500"} />
            </div>
            <input 
              type="text" 
              placeholder="¿Cómo te llamás?"
              value={name}
              onChange={(e) => {setName(e.target.value); setErrors({...errors, name: null})}}
              className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 pl-11 pr-4 focus:outline-none transition-colors text-sm ${errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
            />
            {errors.name && <p className="text-[10px] text-red-400 absolute -bottom-4 left-4">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* EMAIL */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className={errors.email ? "text-red-400" : "text-zinc-500"} />
              </div>
              <input 
                type="email" 
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => {setEmail(e.target.value); setErrors({...errors, email: null})}}
                className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 pl-11 pr-4 focus:outline-none transition-colors text-sm ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
              />
              {errors.email && <p className="text-[10px] text-red-400 absolute -bottom-4 left-4">{errors.email}</p>}
            </div>

            {/* FECHA DE NACIMIENTO */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar size={18} className={errors.birthDate ? "text-red-400" : "text-zinc-500"} />
              </div>
              <input 
                type="date" 
                value={birthDate}
                onChange={(e) => {setBirthDate(e.target.value); setErrors({...errors, birthDate: null})}}
                className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 pl-11 pr-4 focus:outline-none transition-colors text-sm [color-scheme:dark] ${errors.birthDate ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
              />
              {/* Placeholder falso para Date input */}
              {!birthDate && <span className="absolute left-11 top-1/2 -translate-y-1/2 text-zinc-600 text-sm pointer-events-none">Nacimiento</span>}
              {errors.birthDate && <p className="text-[10px] text-red-400 absolute -bottom-4 left-4">{errors.birthDate}</p>}
            </div>
          </div>

          {/* CONTRASEÑA */}
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} className={errors.password ? "text-red-400" : "text-zinc-500"} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Crear contraseña"
              value={password}
              onChange={(e) => {setPassword(e.target.value); setErrors({...errors, password: null})}}
              className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 pl-11 pr-12 focus:outline-none transition-colors text-sm ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            {errors.password && <p className="text-[10px] text-red-400 absolute -bottom-4 left-4">{errors.password}</p>}
          </div>

          {/* CONFIRMAR CONTRASEÑA */}
          <div className="relative mt-2 pb-1">
            <div className="absolute inset-y-0 left-0 pb-1 pl-4 flex items-center pointer-events-none">
              <CheckCircle size={18} className={errors.confirmPassword ? "text-red-400" : "text-zinc-500"} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Repetir contraseña"
              value={confirmPassword}
              onChange={(e) => {setConfirmPassword(e.target.value); setErrors({...errors, confirmPassword: null})}}
              className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 pl-11 pr-12 focus:outline-none transition-colors text-sm ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
            />
            {errors.confirmPassword && <p className="text-[10px] text-red-400 absolute bottom-[-10px] left-4">{errors.confirmPassword}</p>}
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-[#F497A9] to-[#F2879D] text-black font-semibold rounded-full py-3.5 mt-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(242,135,157,0.2)] text-sm"
          >
            Registrarme <ArrowRight size={18} />
          </button>
        </form>

        <div className="flex items-center gap-4 my-5">
          <div className="h-px bg-zinc-800 flex-1"></div>
          <span className="text-zinc-600 text-xs font-medium">o</span>
          <div className="h-px bg-zinc-800 flex-1"></div>
        </div>

        <button type="button" className="w-full bg-transparent border border-zinc-800 hover:bg-zinc-900/50 text-zinc-300 rounded-full py-3.5 flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-sm mb-6">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Registrarme con Google
        </button>

        <div className="text-center mt-auto">
          <Link href="/login" className="text-sm text-[#F2879D] hover:text-[#F497A9] font-medium inline-flex items-center justify-center gap-1">
            <span className="text-zinc-500 font-normal mr-1">¿Ya tenés una cuenta?</span> Iniciar sesión <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}