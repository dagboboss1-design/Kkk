// DAGBO Service Worker — cache-first for same-origin, network-first for APIs
const CACHE = 'dagbo-v3';
const CORE = ['./', './index.html', './manifest.json', './js/config.js', './js/utils.js', './js/state.js', './js/notify.js', './js/data.js', './js/trading.js', './js/ai.js', './js/charting.js', './js/router.js', './js/ui-home.js', './js/ui-swing.js', './js/ui-journal.js', './js/ui-settings.js', './js/news-spike.js', './js/main.js'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.hostname !== location.hostname) return; // don't cache cross-origin APIs
    e.respondWith(
        caches.match(req).then(r => r || fetch(req).then(res => {
            if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return res;
        }).catch(() => caches.match('./index.html')))
    );
});
