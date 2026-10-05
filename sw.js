const CACHE_NAME = 'meu-financeiro-v1.5.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './fonts/Manrope-VariableFont_wght.ttf',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Para a página principal (navegação / index.html): tenta a rede primeiro,
// assim qualquer atualização publicada aparece na próxima abertura do app,
// sem depender de trocar o nome do cache a cada deploy. Cai pro cache só se
// estiver offline.
function isAppShellRequest(request) {
  return request.mode === 'navigate' || request.url.endsWith('/index.html') || request.url.endsWith('/');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (isAppShellRequest(event.request)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Demais arquivos (fontes, ícones, manifest): cache primeiro, já que
  // mudam raramente e isso deixa o carregamento mais rápido.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
