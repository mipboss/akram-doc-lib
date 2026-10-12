// Service worker: a script the browser keeps running in the background for this site, between the pages
// and the network. It lets the installed app open without internet:
// - the app's own code and styles (/_next/static/...) are kept after the first visit;
// - pages are fetched fresh when online, and the last copy of each is kept for when offline;
// - with no copy at all, an offline page explains what happened.
// PDFs, audio, the admin page and /api are never stored here.

// Change this name to discard everything stored by an older version of this file (e.g. after changing the icons).
const CACHE = 'pdf-library-v1';
const OFFLINE = '/offline.html';
// Documents saved by readers (see lib/offline.js). Kept across app updates; only readers remove them.
const FILES = 'pdf-library-files';
// Stored when the worker installs, so the offline page and its icon are always available.
const PRELOAD = [OFFLINE, '/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRELOAD))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FILES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // File names under /_next/static change whenever their content does, so a stored copy never goes stale.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || PRELOAD.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
        return res;
      })),
    );
    return;
  }

  // Pages: the network first, so readers see the latest catalog; the stored copy only when offline.
  // Besides real visits, the library asks for its own page (Accept: text/html) to keep it once documents are saved.
  if (request.mode === 'navigate' || request.headers.get('Accept') === 'text/html') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE))),
    );
  }
});
