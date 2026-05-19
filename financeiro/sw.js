// ===== Finança PWA — Service Worker =====
const CACHE_NAME = 'financa-v1';

// Arquivos para cache inicial (só o essencial offline)
const PRECACHE = [
  './',
  './index.html'
];

// INSTALL: pré-cache dos arquivos principais
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).catch(function() {
      // Se falhar no pré-cache, continua normalmente
    })
  );
});

// ACTIVATE: limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// FETCH: Network First — tenta rede, cai no cache se offline
self.addEventListener('fetch', function(event) {
  // Ignora requisições não-GET e chamadas de API externas
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Deixa Supabase, Google Fonts e CDNs passarem direto (sem cache)
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('googleapi')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Guarda cópia no cache se for resposta válida
        if (response && response.status === 200 && response.type === 'basic') {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Offline: tenta retornar do cache
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
