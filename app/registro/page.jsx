"use client";
import { useState } from "react";
import { Mail, Lock, EyeOff, Eye, ArrowRight, Heart, User, Calendar, CheckCircle } from "lucide-react";
import { Dancing_Script } from 'next/font/google';
import Link from "next/link";

// IMPORTAMOS SUPABASE (Asegurate de que esta ruta sea correcta en tu proyecto)
import { supabase } from "@/lib/supabaseClient"; 

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '600', '700'] });

export default function RegistroPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState(""); 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); 

  // Formateo automático de DD/MM/AAAA mientras se escribe
  const handleDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value.length > 8) value = value.slice(0, 8);
    
    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    
    setBirthDate(value);
    setErrors({ ...errors, birthDate: null });
  };

  const validateForm = () => {
    let newErrors = {};
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

    if (!nameRegex.test(firstName)) newErrors.firstName = "Solo letras.";
    if (!nameRegex.test(lastName)) newErrors.lastName = "Solo letras.";

    if (birthDate.length !== 10) {
      newErrors.birthDate = "Formato DD/MM/AAAA.";
    } else {
      const [day, month, year] = birthDate.split("/");
      const dayInt = parseInt(day, 10);
      const monthInt = parseInt(month, 10);
      const yearInt = parseInt(year, 10);
      
      const selected = new Date(yearInt, monthInt - 1, dayInt);
      const today = new Date();
      
      if (selected.getFullYear() !== yearInt || selected.getMonth() !== monthInt - 1 || selected.getDate() !== dayInt) {
        newErrors.birthDate = "Fecha inválida.";
      } else {
        let age = today.getFullYear() - selected.getFullYear();
        if (today.getMonth() < selected.getMonth() || (today.getMonth() === selected.getMonth() && today.getDate() < selected.getDate())) {
          age--;
        }
        if (selected >= today) newErrors.birthDate = "No puede ser futura.";
        else if (age < 13) newErrors.birthDate = "Debe ser mayor de 13 años.";
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Correo válido.";
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = "Mín. 8 caracteres, 1 mayúscula y 1 número.";
    }
    if (password !== confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/sala-espera`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) throw error;

    } catch (error) {
      console.error("Error con Google:", error.message);
      setErrors({ ...errors, email: "Hubo un error al intentar abrir Google." });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsRegistering(true);
      
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              birth_date: birthDate,
            }
          }
        });

        if (error) throw error;

        // LA MAGIA ANTI-HACKERS: 
        // Si el usuario ya existe, Supabase devuelve identities vacío.
        if (data?.user?.identities?.length === 0) {
          setErrors({ ...errors, email: "Este correo ya tiene un espacio. Tocá 'Iniciar sesión'." });
          setIsRegistering(false);
          return; // Cortamos la ejecución acá para que no avance
        }

        // Si pasó todo bien, mostramos la pantalla de éxito
        setIsEmailSent(true);

      } catch (error) {
        console.error("Error al registrar:", error.message);
        if (error.message.includes("already registered") || error.message.includes("User already registered")) {
            setErrors({ ...errors, email: "Este correo ya tiene un espacio. Tocá 'Iniciar sesión' abajo." });
        } else {
          alert("Hubo un error: " + error.message);
        }
      } finally {
        setIsRegistering(false);
      }
    }
  };

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
        <Link href="page.js" className="bg-[#F2879D] text-black font-semibold rounded-full px-8 py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(242,135,157,0.2)]">
          Ir a Iniciar sesión <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col relative font-sans text-zinc-200">
      
      <div className="fixed top-0 left-0 w-full h-[35vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/80 to-[#121212] z-10"></div>
        <img 
          src="/tazas-inicio.png" 
          alt="Fondo registro" 
          className="w-full h-full object-cover object-center opacity-70"
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-12 pb-8 overflow-y-auto custom-scrollbar">
        
        <div className="flex flex-col items-center mb-6 text-center mt-auto">
          <div className="flex items-center justify-center">
            <h1 className={`text-[48px] text-white leading-none tracking-wide ${dancingFont.className}`}>
              Crear cuenta
            </h1>
            <Heart size={28} strokeWidth={2.5} className="text-[#F2879D] ml-2 mt-2" fill="transparent" />
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            {/* NOMBRE */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className={errors.firstName ? "text-red-400" : "text-zinc-500"} />
              </div>
              <input 
                type="text" 
                placeholder="Nombre"
                value={firstName}
                onChange={(e) => {setFirstName(e.target.value); setErrors({...errors, firstName: null})}}
                className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 pl-11 pr-4 focus:outline-none transition-colors text-sm ${errors.firstName ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
              />
              {errors.firstName && <p className="text-[10px] text-red-400 absolute -bottom-4 left-4">{errors.firstName}</p>}
            </div>

            {/* APELLIDO */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Apellido"
                value={lastName}
                onChange={(e) => {setLastName(e.target.value); setErrors({...errors, lastName: null})}}
                className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 px-4 focus:outline-none transition-colors text-sm ${errors.lastName ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
              />
              {errors.lastName && <p className="text-[10px] text-red-400 absolute -bottom-4 left-4">{errors.lastName}</p>}
            </div>
          </div>

          {/* EMAIL */}
          <div className="relative mt-2">
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
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Calendar size={18} className={errors.birthDate ? "text-red-400" : "text-zinc-500"} />
            </div>
            <input 
              type="tel"
              placeholder="Nacimiento (DD/MM/AAAA)"
              value={birthDate}
              onChange={handleDateChange}
              className={`w-full bg-[#1A1A1A]/90 border text-white rounded-full py-3.5 pl-11 pr-4 focus:outline-none transition-colors text-sm ${errors.birthDate ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800/80 focus:border-[#F2879D]'}`}
            />
            {errors.birthDate && <p className="text-[10px] text-red-400 absolute -bottom-4 left-4">{errors.birthDate}</p>}
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
            disabled={isRegistering}
            className="w-full bg-gradient-to-r from-[#F497A9] to-[#F2879D] text-black font-semibold rounded-full py-3.5 mt-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(242,135,157,0.2)] text-sm disabled:opacity-70"
          >
            {isRegistering ? "Creando cuenta..." : "Registrarme"} <ArrowRight size={18} />
          </button>
        </form>

        {/* DIVISOR */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-zinc-800 flex-1"></div>
          <span className="text-zinc-600 text-xs font-medium">o</span>
          <div className="h-px bg-zinc-800 flex-1"></div>
        </div>

        {/* BOTÓN DE GOOGLE */}
        <button 
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-transparent border border-zinc-800 hover:bg-zinc-900/50 text-zinc-300 rounded-full py-3.5 flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Registrarme con Google
        </button>

        <div className="text-center mt-auto">
          <Link href="page.js" className="text-sm text-[#F2879D] hover:text-[#F497A9] font-medium inline-flex items-center justify-center gap-1">
            <span className="text-zinc-500 font-normal mr-1">¿Ya tenés una cuenta?</span> Iniciar sesión <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}