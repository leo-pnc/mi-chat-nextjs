'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { applyAccent } from '@/lib/profiles';

// Aplica el color de acento elegido en Configuración a toda la app.
// Primero el guardado en el dispositivo (instantáneo) y después el de la cuenta.
export default function AccentApplier() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tecito_accent');
      if (saved) applyAccent(saved);
    } catch {
      // sin storage
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.app_metadata?.display_name;
      if (!name) return;
      const { data } = await supabase.from('profiles').select('accent').eq('user_name', name).maybeSingle();
      if (data?.accent) applyAccent(data.accent);
    })();
  }, []);

  return null;
}
