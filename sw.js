const CACHE_NAME = 'coachfolio-v3.5 - testes10';
// A lista de bagagem obrigatória (Ficheiros base e Ícones) — tem de funcionar sempre,
// mesmo sem internet nem acesso a CDNs externos.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// Biblioteca externa (tática → imagem). Guardada à parte, porque cache.addAll() é
// tudo-ou-nada: se isto falhasse dentro da lista principal, a instalação do service
// worker falhava por completo, incluindo os ficheiros base que são sempre fiáveis.
const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Timeout de rede: se a ligação não responder dentro deste prazo,
// serve a cache imediatamente em vez de deixar a app "encravada".
const NETWORK_TIMEOUT_MS = 2500;

self.addEventListener('install', (e) => {
  // Guarda imediatamente a lista obrigatória assim que instala a app
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(urlsToCache);
        // Tentativa "best effort": se o CDN falhar agora, não bloqueia a instalação.
        // A app vai tentar guardá-lo mais tarde, através do cache dinâmico do fetch().
        try {
          await cache.addAll(EXTERNAL_ASSETS);
        } catch (err) {
          console.warn('Não foi possível pré-cachear recursos externos:', err);
        }
      })
  );
  // IMPORTANTE: NÃO chamar self.skipWaiting() aqui.
  // A app fica à espera do clique no botão "Atualizar" do index.html
  // precisamente para não forçar um reload a meio de um jogo em curso.
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fica à escuta da mensagem do botão "Atualizar" do index.html
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  e.respondWith(
    fetch(e.request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        // Caching Dinâmico: Se houver net, guarda uma cópia na cache para usar offline
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, clone);
        });
        return response;
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Se falhar ou exceder o timeout (rede fraca/offline), serve da cache
        return caches.match(e.request);
      })
  );
});
