const CACHE = 'amfels-v9';
const BASE  = 'https://apfels-team-default-rtdb.europe-west1.firebasedatabase.app/amfels';
const OFFLINE_URLS = ['/'];

// Liest den aktiven Mandanten (Restaurant) aus dem Cache, den die App dort ablegt
function tenantNotifUrl() {
  return caches.open('gf-meta')
    .then(c => c.match('/tenant'))
    .then(r => r ? r.text() : '')
    .then(t => t ? (BASE + '/t/' + t + '/notifications/latest.json') : (BASE + '/notifications/latest.json'))
    .catch(() => BASE + '/notifications/latest.json');
}

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
    tenantNotifUrl()
      .then(url => fetch(url))
      .then(r => r.json())
      .then(data => {
        const title = (data && data.title) ? data.title : 'GastroFlow';
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
      .catch(() => self.registration.showNotification('GastroFlow', {
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
