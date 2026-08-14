'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Posiciones fijas (no random en cada render) para los destellos de fondo
const LOGIN_TWINKLE_DOTS = [
  { top: 10, left: 15, size: 3, duration: 4.8, delay: 0.2 },
  { top: 18, left: 80, size: 2, duration: 5.4, delay: 0.8 },
  { top: 28, left: 40, size: 4, duration: 4.1, delay: 1.4 },
  { top: 35, left: 65, size: 2, duration: 6.1, delay: 0.4 },
  { top: 8, left: 55, size: 2, duration: 4.6, delay: 1.9 },
  { top: 45, left: 12, size: 3, duration: 5.7, delay: 1.0 },
  { top: 55, left: 88, size: 2, duration: 4.3, delay: 1.6 },
  { top: 62, left: 25, size: 3, duration: 5.9, delay: 0.3 },
  { top: 70, left: 70, size: 2, duration: 4.4, delay: 2.2 },
  { top: 78, left: 48, size: 4, duration: 6.4, delay: 0.9 },
  { top: 85, left: 90, size: 2, duration: 4.0, delay: 1.7 },
  { top: 92, left: 20, size: 3, duration: 5.3, delay: 0.6 },
  { top: 20, left: 95, size: 2, duration: 5.0, delay: 1.3 },
  { top: 90, left: 60, size: 2, duration: 4.9, delay: 0.1 },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session) {
        router.replace('/menu');
        return;
      }
      setCheckingSession(false);
    })();
    return () => { active = false; };
  }, [router]);

  async function handleLogin() {
    setError('');

    if (!email || !pass) {
      setError('Ingrese email y contraseña.');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    setLoading(false);

    if (authError) {
      setError('Email o contraseña incorrecta.');
      return;
    }

    router.push('/menu');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  if (checkingSession) {
    return <div className="login-page" />;
  }

  return (
    <div className="login-page">
      <div className="login-wallpaper" aria-hidden="true">
        <div className="login-sheen" />
        {LOGIN_TWINKLE_DOTS.map((dot, i) => (
          <span
            key={i}
            className="login-twinkle"
            style={{
              top: `${dot.top}%`,
              left: `${dot.left}%`,
              width: dot.size,
              height: dot.size,
              animationDuration: `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="login-container">
      <h1 className="login-title">
        <span className="login-heart-glow">
          <Heart size={22} className="inline-icon" fill="currentColor" />
        </span>
        Chat Pareja
      </h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="username"
      />

      <div className="password-field">
        <input
          type={showPass ? 'text' : 'password'}
          placeholder="Contraseña"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="current-password"
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPass((v) => !v)}
          title={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          <span key={showPass ? 'on' : 'off'} className="password-toggle-icon">
            {showPass ? <EyeOff size={19} /> : <Eye size={19} />}
          </span>
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      </div>
    </div>
  );
}
