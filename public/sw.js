self.addEventListener('push', (event) => {
  let data = { title: 'Chat Pareja', body: 'Tenés un mensaje nuevo' };
  try {
    data = event.data.json();
  } catch (e) {
    // ignore, usar valores por defecto
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-badge-96.png',
      data: { chatKey: data.chatKey, url: data.url },
      silent: data.silent === true,
    })
  );
});

// Handler de fetch (aunque no lo usemos para cachear nada todavía): su sola
// presencia es parte de lo que el navegador chequea para considerar la app
// "instalable" como PWA.
self.addEventListener('fetch', () => {});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatKey = event.notification.data?.chatKey;
  const customUrl = event.notification.data?.url;
  const url = customUrl || (chatKey ? `/chat?chatKey=${chatKey}` : '/menu');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
