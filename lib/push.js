import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Pide permiso de notificaciones y registra la suscripción push para el usuario actual.
// No hace nada si el navegador no soporta push, o si el usuario ya rechazó el permiso.
export async function enablePushNotifications(currentUser) {
  if (!currentUser) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en .env.local');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  // Si ya había una suscripción guardada en el navegador, verificamos que
  // esté atada a la MISMA clave VAPID que usa la app ahora mismo. Si en
  // algún momento se regeneró el par de claves (como pasó el 14/08), las
  // suscripciones viejas quedan "mudas": el navegador cree que sigue
  // suscripto, pero el servidor no puede firmar los envos con esa clave.
  // Por eso las descartamos y creamos una nueva automáticamente.
  if (subscription) {
    const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const currentKey = new Uint8Array(subscription.options?.applicationServerKey || []);
    const matches =
      currentKey.length === expectedKey.length &&
      currentKey.every((byte, i) => byte === expectedKey[i]);

    if (!matches) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();

  await supabase.from('push_subscriptions').upsert({
    endpoint: json.endpoint,
    user_name: currentUser,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
}
