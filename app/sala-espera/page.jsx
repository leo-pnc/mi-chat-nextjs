"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Heart, Copy, Check, ArrowRight, Loader2, User } from "lucide-react";
import { Dancing_Script } from 'next/font/google';

const dancingFont = Dancing_Script({ subsets: ['latin'], weight: ['400', '700'] });

export default function SalaEsperaPage() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [myCode, setMyCode] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    cargarEstado();
  }, []);

  const cargarEstado = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }

      // 1. Consultamos my_couple
      const { data: estado, error } = await supabase.rpc('my_couple');
      if (error) throw error;

      // Extraemos los datos sabiendo ahora que la llave es invite_code
      const inviteCode = estado?.invite_code;
      const coupleId = estado?.couple_id;
      
      // Si hay un ID de pareja pero NO hay código de invitación, ya están unidos
      if (coupleId && !inviteCode) {
        router.push("/menu");
        return;
      }

      // Si tiene código generado, lo mostramos
      if (inviteCode) {
        setMyCode(inviteCode);
      } else {
        // Si no tiene nada, probamos si sabemos su nombre
        const metadataName = session.user.user_metadata?.first_name;
        
        if (metadataName) {
          await generarCodigo(metadataName);
        } else {
          setNeedsName(true);
        }
      }
    } catch (error) {
      console.error("Error cargando estado:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generarCodigo = async (nombre) => {
    try {
      setIsSavingName(true);
      setErrorMsg("");
      
      const { data: respuesta, error } = await supabase.rpc('create_couple', { 
        p_display_name: nombre 
      });

      if (error) throw error;
      
      // ACÁ ESTABA EL ERROR: Ahora leemos 'invite_code' exactamente como lo devuelve la BD
      const codigoReal = respuesta?.invite_code;
      
      if (codigoReal) {
        setMyCode(codigoReal);
        setNeedsName(false);
      } else {
        throw new Error("La base de datos no devolvió el código.");
      }
      
    } catch (error) {
      console.error("Error generando código:", error);
      setErrorMsg("No pudimos generar tu código: " + (error.message || "Error desconocido"));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    await generarCodigo(nameInput.trim());
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (partnerCodeInput.trim() === myCode) {
      setErrorMsg("No podés conectarte con tu propio código.");
      return;
    }

    setIsConnecting(true);
    setErrorMsg("");

    try {
      const { data: resultado, error } = await supabase.rpc('join_couple', { 
        p_code: partnerCodeInput.trim().toUpperCase(),
        p_display_name: nameInput.trim() || undefined
      });

      if (error) throw error;

      if (resultado?.error) {
        setErrorMsg(String(resultado.error));
        setIsConnecting(false);
        return;
      }

      // ¡Conectados!
      router.push("/menu");

    } catch (error) {
      console.error("Error al conectar:", error);
      // TRUCO PARA VER EL ERROR REAL EN PANTALLA:
      setErrorMsg("Error real: " + (error.message || error.details || JSON.stringify(error)));
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#F2879D]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col relative overflow-y-auto font-sans text-zinc-200 pb-10">
      <header className="flex justify-between items-center px-6 pt-10 pb-4 relative z-10">
        <div className="flex items-center">
          <h1 className={`text-[38px] text-[#FDF2F2] tracking-wide font-normal leading-none mt-1 ${dancingFont.className}`}>
            Tecito
          </h1>
          <Heart size={24} strokeWidth={2.5} className="text-[#F2879D] ml-2 mt-1" fill="transparent" />
        </div>
      </header>

      <div className="flex-1 flex flex-col px-6 pt-6 relative z-10">
        
        {needsName ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <User size={28} className="text-[#F2879D]" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">¿Cómo te llamás?</h2>
              <p className="text-sm text-zinc-400 font-light px-4">
                Como ingresaste con Google o correo nuevo, necesitamos saber tu nombre para la app.
              </p>
            </div>

            <form onSubmit={handleSaveName} className="space-y-6">
              {errorMsg && <p className="text-xs text-red-400 text-center font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20">{errorMsg}</p>}
              <input 
                type="text" 
                placeholder="Tu nombre (ej: Estefi)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-[#1A1A1A]/80 border border-zinc-800/80 text-white text-center text-lg rounded-2xl py-4 focus:outline-none focus:border-[#F2879D] transition-colors"
                required
              />
              <button 
                type="submit"
                disabled={isSavingName || !nameInput.trim()}
                className="w-full bg-gradient-to-r from-[#F497A9] to-[#F2879D] text-black font-semibold rounded-full py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSavingName ? <><Loader2 className="animate-spin" size={20} /> Guardando...</> : <>Continuar <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-[0_0_20px_rgba(242,135,157,0.1)]">
                <Heart size={28} className="text-[#F2879D]" fill="#F2879D" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Conectá con tu pareja</h2>
              <p className="text-sm text-zinc-400 font-light px-4">
                Para empezar a compartir su espacio, necesitás vincular tu cuenta.
              </p>
            </div>

            <div className="bg-[#1A1A1A]/80 border border-zinc-800/80 rounded-3xl p-6 mb-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F497A9] to-[#F2879D]"></div>
              <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 text-center">Compartile este código</p>
              
              <div className="flex items-center justify-between bg-[#121212] border border-zinc-800 rounded-2xl p-4">
                <span className="text-3xl font-mono tracking-[0.2em] text-white font-bold ml-2">
                  {myCode}
                </span>
                <button 
                  onClick={copyToClipboard}
                  className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${copied ? 'bg-green-500/20 text-green-400' : 'bg-[#1C1C1E] text-zinc-400 hover:text-white border border-zinc-800'}`}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 my-4 animate-in fade-in duration-700 delay-300">
              <div className="h-px bg-zinc-800 flex-1"></div>
              <span className="text-zinc-600 text-xs font-medium">O INGRESÁ EL SUYO</span>
              <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            <form onSubmit={handleConnect} className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
              {errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4"><p className="text-xs text-red-400 text-center font-medium">{errorMsg}</p></div>}
              <div className="relative mb-6">
                <input 
                  type="text" 
                  placeholder="Ej: AB89XQ"
                  value={partnerCodeInput}
                  onChange={(e) => {setPartnerCodeInput(e.target.value.toUpperCase()); setErrorMsg("");}}
                  maxLength={6}
                  className="w-full bg-[#1A1A1A]/80 border border-zinc-800/80 text-white font-mono text-center tracking-[0.2em] text-lg rounded-2xl py-4 focus:outline-none focus:border-[#F2879D] transition-colors placeholder:text-zinc-700"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isConnecting || partnerCodeInput.length < 6}
                className="w-full bg-gradient-to-r from-[#F497A9] to-[#F2879D] text-black font-semibold rounded-full py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isConnecting ? <><Loader2 className="animate-spin" size={20} /> Conectando...</> : <>Vincular cuentas <ArrowRight size={18} /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}