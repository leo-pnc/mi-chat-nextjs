"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Heart, Copy, Check, ArrowRight, Loader2 } from "lucide-react";
import { Dancing_Script } from 'next/font/google';

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '700'] });

export default function SalaEsperaPage() {
  const router = useRouter();
  
  // Estados para el código propio
  const [myCode, setMyCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [isLoadingCode, setIsLoadingCode] = useState(true);

  // Estados para conectar con la pareja
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    cargarUsuarioYCodigo();
  }, []);

  // 1. CARGAR USUARIO Y SU CÓDIGO
  const cargarUsuarioYCodigo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      const email = session.user.email;
      setCurrentUserEmail(email);

      // Buscamos si el usuario ya tiene un perfil en Supabase
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('*')
        .eq('email', email)
        .single();

      if (perfil) {
        // Si ya está vinculado con alguien, lo mandamos al menú
        if (perfil.pareja_email) {
          router.push("/menu");
          return;
        }
        // Si no está vinculado pero ya tenía código, se lo mostramos
        if (perfil.codigo_conexion) {
          setMyCode(perfil.codigo_conexion);
        } else {
          generarYGuardarCodigo(email);
        }
      } else {
        // Si no tiene perfil en la BD, se lo creamos con un código nuevo
        generarYGuardarCodigo(email, session.user.user_metadata?.first_name);
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setIsLoadingCode(false);
    }
  };

  // 2. GENERADOR DE CÓDIGO ALEATORIO
  const generarYGuardarCodigo = async (email, firstName = "") => {
    // Generamos un código de 6 caracteres (ej: AB89XQ)
    const nuevoCodigo = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMyCode(nuevoCodigo);

    await supabase.from('perfiles').upsert({
      email: email,
      nombre: firstName,
      codigo_conexion: nuevoCodigo
    });
  };

  // 3. FUNCIÓN PARA COPIAR EL CÓDIGO
  const copyToClipboard = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 4. LÓGICA PARA CONECTARSE
  const handleConnect = async (e) => {
    e.preventDefault();
    if (partnerCodeInput.trim() === myCode) {
      setErrorMsg("No podés conectarte con tu propio código.");
      return;
    }

    setIsConnecting(true);
    setErrorMsg(null);

    try {
      // Buscamos a quién le pertenece el código ingresado
      const { data: pareja } = await supabase
        .from('perfiles')
        .select('*')
        .eq('codigo_conexion', partnerCodeInput.trim().toUpperCase())
        .single();

      if (!pareja) {
        setErrorMsg("El código no existe o es incorrecto.");
        setIsConnecting(false);
        return;
      }

      // Si existe, nos vinculamos mutuamente
      // A mí me pone el email de mi pareja
      await supabase.from('perfiles').update({ pareja_email: pareja.email }).eq('email', currentUserEmail);
      
      // A mi pareja le pone mi email
      await supabase.from('perfiles').update({ pareja_email: currentUserEmail }).eq('email', pareja.email);

      // ¡Conectados! Redirigimos al menú
      router.push("/menu");

    } catch (error) {
      console.error("Error al conectar:", error);
      setErrorMsg("Hubo un error al intentar vincular las cuentas.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    // ACÁ ARREGLAMOS EL SCROLL: overflow-y-auto en lugar de overflow-hidden
    <div className="min-h-screen bg-[#121212] flex flex-col relative overflow-y-auto font-sans text-zinc-200 pb-10">
      
      {/* HEADER SIN LA FOTO */}
      <header className="flex justify-between items-center px-6 pt-10 pb-4 relative z-10">
        <div className="flex items-center">
          <h1 className={`text-[38px] text-[#FDF2F2] tracking-wide font-normal leading-none mt-1 ${dancingFont.className}`}>
            Tecito
          </h1>
          <Heart size={24} strokeWidth={2.5} className="text-[#F2879D] ml-2 mt-1" fill="transparent" />
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col px-6 pt-6 relative z-10">
        
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-[0_0_20px_rgba(242,135,157,0.1)]">
            <Heart size={28} className="text-[#F2879D]" fill="#F2879D" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Conectá con tu pareja</h2>
          <p className="text-sm text-zinc-400 font-light leading-relaxed px-4">
            Para empezar a compartir su espacio privado, necesitás vincular tu cuenta con la de esa persona especial.
          </p>
        </div>

        {/* TU CÓDIGO */}
        <div className="bg-[#1A1A1A]/80 border border-zinc-800/80 rounded-3xl p-6 mb-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F497A9] to-[#F2879D]"></div>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 text-center">
            Compartile este código
          </p>
          
          <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 rounded-2xl p-4">
            {isLoadingCode ? (
              <div className="w-full flex justify-center"><Loader2 className="animate-spin text-[#F2879D]" size={24} /></div>
            ) : (
              <span className="text-3xl font-mono tracking-[0.2em] text-white font-bold ml-2">
                {myCode}
              </span>
            )}
            <button 
              onClick={copyToClipboard}
              disabled={isLoadingCode}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
                copied ? 'bg-green-500/20 text-green-400' : 'bg-[#1C1C1E] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          <p className="text-xs text-zinc-500 text-center mt-4">
            Tu pareja debe ingresarlo en su pantalla de Tecito.
          </p>
        </div>

        <div className="flex items-center gap-4 my-4 animate-in fade-in duration-700 delay-300">
          <div className="h-px bg-zinc-800 flex-1"></div>
          <span className="text-zinc-600 text-xs font-medium">O INGRESÁ EL SUYO</span>
          <div className="h-px bg-zinc-800 flex-1"></div>
        </div>

        {/* INGRESAR CÓDIGO */}
        <form onSubmit={handleConnect} className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-400 text-center font-medium">{errorMsg}</p>
            </div>
          )}

          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="Ej: AB89XQ"
              value={partnerCodeInput}
              onChange={(e) => {setPartnerCodeInput(e.target.value.toUpperCase()); setErrorMsg(null);}}
              maxLength={6}
              className="w-full bg-[#1A1A1A]/80 border border-zinc-800/80 text-white font-mono text-center tracking-[0.2em] text-lg rounded-2xl py-4 focus:outline-none focus:border-[#F2879D] transition-colors placeholder:text-zinc-700"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isConnecting || partnerCodeInput.length < 6}
            className="w-full bg-gradient-to-r from-[#F497A9] to-[#F2879D] text-black font-semibold rounded-full py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(242,135,157,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <><Loader2 className="animate-spin" size={20} /> Conectando...</>
            ) : (
              <>Vincular cuentas <ArrowRight size={18} /></>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}