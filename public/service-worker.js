/* eslint-disable no-restricted-globals */
/**
 * Service Worker der SGFH-App (PWA).
 *
 * Bewusst ohne Build-Abhängigkeiten gehalten:
 * - Seitenaufrufe (Navigation): Netzwerk zuerst, offline die zuletzt geladene App-Shell.
 * - Gehashte Build-Dateien unter /static/: Cache zuerst (Dateinamen ändern sich mit jedem Build).
 * - Übrige gleiche-Herkunft-GET-Anfragen (Icons, Manifest): Cache, im Hintergrund aktualisiert.
 * - Fremde Domains (Firestore, Firebase Auth, Google-Fonts …) werden nie zwischengespeichert.
 *
 * Neue Versionen warten, bis die App „Neu laden“ auslöst (Nachricht SKIP_WAITING).
 */
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `sgfh-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `sgfh-static-${CACHE_VERSION}`;
const SHELL_URL = '/index.html';
// Alte, gehashte Build-Dateien sammeln sich sonst über viele Releases an.
const MAX_STATIC_ENTRIES = 80;

function trimCache(cacheName, maxEntries) {
  return caches.open(cacheName).then((cache) => cache.keys().then((keys) => {
    if (keys.length <= maxEntries) return undefined;
    return Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([SHELL_URL, '/manifest.json', '/icon-192.png'])),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('sgfh-') && key !== SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Versionsprüfung der App (asset-manifest.json) und ausdrücklich ungecachte Anfragen immer direkt ans Netz
  if (request.cache === 'no-store' || url.pathname === '/asset-manifest.json') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL_URL)),
    );
    return;
  }

  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE)
            .then((cache) => cache.put(request, copy))
            .then(() => trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES));
        }
        return response;
      })),
    );
    return;
  }

  event.respondWith(
    caches.open(SHELL_CACHE).then((cache) => cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })),
  );
});
