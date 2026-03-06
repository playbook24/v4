const CACHE_NAME = 'orb-playbook-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './logo.png',
  './core/db.js',
  './core/state.js',
  './core/utils.js',
  './modules/board/board.html',
  './modules/board/board.css',
  './modules/board/board.js',
  './modules/board/animation.js',
  './modules/board/interaction.js',
  './modules/board/renderer.js',
  './modules/board/ui.js',
  './modules/calendar/calendar.html',
  './modules/calendar/calendar.css',
  './modules/calendar/calendar.js',
  './modules/library/library.html',
  './modules/planner/planner.html',
  './modules/planner/planner.css',
  './modules/planner/planner.js',
  './modules/roster/roster.html',
  './modules/roster/roster.css',
  './modules/roster/roster.js',
  './modules/settings/settings.html',
  './modules/sheet/sheet.html',
  './modules/sheet/sheet.css',
  './modules/sheet/sheet.js',
  './modules/help/help.html',
  'https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;500;600;700&display=swap'
];

// Installation du Service Worker et mise en cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Interception des requêtes avec une stratégie "Network First" (Réseau en priorité)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // On a internet : on met à jour le cache silencieusement avec la nouvelle version
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Pas internet : on sert la version en cache (Mode Hors-ligne)
        return caches.match(event.request);
      })
  );
});

// Nettoyage des anciens caches lors d'une mise à jour
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});