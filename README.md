# Chat Pareja — Next.js + Supabase + Vercel + Notificaciones Push

## Estado actual del proyecto

- **Persistencia real**: mensajes guardados en Postgres (Supabase), no se
  pierden si alguien está desconectado.
- **Tiempo real**: Supabase Realtime (mensajes, mood, "escribiendo...",
  online/offline vía Presence).
- **Login**: Supabase Auth real (email + contraseña), ya no las contraseñas
  hardcodeadas "1"/"2".
- **Funciones extra**: editar/borrar mensajes, marcar importantes, pausas
  ("tiempo fuera" de 20 min), filtro de groserías, notificaciones push.

## 1. Base de datos (Supabase)

1. En el **SQL Editor** de tu proyecto, pegá y corré TODO el contenido de
   `supabase/schema.sql`. Es seguro volver a correrlo si ya lo habías hecho
   antes (usa `if not exists` en todos lados).

2. **Crear los 2 usuarios de login**: andá a **Authentication → Users →
   Add user**, y creá uno para Leo y otro para Estefi, con el email y
   contraseña que van a usar para entrar a la app. Anotá los dos emails.

3. Volvé al **SQL Editor** y corré esto (cambiando los emails por los
   reales que usaste):

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"display_name": "Leo"}'::jsonb
   where email = 'EMAIL_DE_LEO_AQUI';

   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"display_name": "Estefi"}'::jsonb
   where email = 'EMAIL_DE_ESTEFI_AQUI';
   ```

   Esto es lo que le dice a la app "quién sos" después de loguearte.

## 2. Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Project
  Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY` → **la misma pantalla**, pero la clave
  "service_role" (¡es secreta! nunca la pongas en variables `NEXT_PUBLIC_`,
  ni la subas a git — solo va en el servidor).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` → un par de claves
  para las notificaciones push. Si no las tenés, generalas así:

  ```bash
  npx web-push generate-vapid-keys
  ```

- `SUPABASE_WEBHOOK_SECRET` → cualquier string aleatorio largo (por
  ejemplo `openssl rand -hex 24` en una terminal), es solo para que tu API
  de notificaciones sepa que el pedido viene realmente de Supabase.

## 3. Probarlo local

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 y probá loguearte con los emails que creaste.

## 4. Deployar en Vercel

1. Subí el proyecto a GitHub y conectalo en vercel.com.
2. En **Environment Variables**, cargá las 6 variables del `.env.local`
   (las mismas, tal cual).
3. Deploy.

## 5. Activar el envío real de notificaciones push

Esto es lo último: conectar Supabase con tu API para que cuando llegue un
mensaje nuevo, se dispare la notificación.

1. En Supabase, andá a **Database → Webhooks → Create a new webhook**.
2. Configuralo así:
   - **Table**: `messages`
   - **Events**: solo `Insert`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://TU-APP.vercel.app/api/send-push`
   - **HTTP Headers**: agregá uno con key `x-webhook-secret` y como valor
     el mismo string que pusiste en `SUPABASE_WEBHOOK_SECRET`.
3. Guardalo.

Ahora, cada vez que alguien mande un mensaje, Supabase le va a avisar a tu
API, que busca las suscripciones push de la otra persona y le manda la
notificación (si tiene el navegador cerrado, le va a llegar como
notificación del sistema operativo).

**Importante**: para que la persona reciba notificaciones, primero tiene
que entrar a la app y aceptar el permiso de notificaciones del navegador
(esto pasa automáticamente al entrar al menú, vía `enablePushNotifications`
en `lib/push.js`). Si lo rechaza, no va a recibir pushes hasta que lo
habilite manualmente desde la configuración del navegador/sitio.

## Notas de seguridad

- La `service_role` key tiene acceso total a la base saltándose RLS.
  Nunca la expongas en el cliente ni la subas a git — solo debe vivir en
  las variables de entorno del servidor (Vercel la mantiene privada
  automáticamente si no la marcás como pública).
- Las políticas de RLS ahora exigen `auth.role() = 'authenticated'`, así
  que un usuario no logueado ya no puede leer ni escribir mensajes (a
  diferencia de la primera versión, que era completamente abierta).
