const CACHE = 'amfels-v6';
const DB    = 'https://apfels-team-default-rtdb.europe-west1.firebasedatabase.app/amfels';
const OFFLINE_URLS = ['/'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}}))
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  e.waitUntil(
    fetch(DB + '/notifications/latest.json')
      .then(r => r.json())
      .then(data => {
        const title = (data && data.title) ? data.title : 'Am Fels Team';
        const body  = (data && data.body)  ? data.body  : 'Neue Benachrichtigung';
        return self.registration.showNotification(title, {
          body,
          icon:      'https://amfels98.github.io/amfels-team-app/icon-192.png',
          badge:     'https://amfels98.github.io/amfels-team-app/icon-192.png',
          tag:       'amfels',
          renotify:  true,
          vibrate:   [200, 100, 200],
          data:      { url: self.location.origin }
        });
      })
      .catch(() => self.registration.showNotification('Am Fels Team', {
        body: 'Neue Benachrichtigung',
        icon: 'https://amfels98.github.io/amfels-team-app/icon-192.png'
      }))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return clients.openWindow(self.location.origin + '/');
    })
  );
});
