/* Telecaller CRM Web Push service worker (push-only — no fetch/caching handler, so it can't
 * interfere with the app's cache strategy). Shows a browser notification when a doctor replies
 * even if the tab/app is fully closed. Paired with hooks/use-web-push.ts + backend web-push. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = data.title || 'WhatsApp reply';
  const options = {
    body: data.body || 'A doctor replied — open the CRM to respond.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.url || 'wa-reply',
    data: { url: data.url || '/' },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
