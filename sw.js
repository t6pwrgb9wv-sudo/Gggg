/* سرویس‌ورکر: اجرای آفلاین. نسخه را بالا ببرید تا کش قدیمی پاک شود */
var CACHE = 'khata-v2';
var CORE = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './offline-bot.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js'
];
var OFFLINE_HTML = '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>آفلاین</title><body style="font-family:sans-serif;text-align:center;padding:40px 20px"><h2>اینترنت نیست</h2><p>این برنامه باید یک بار با اینترنت باز شود تا بعد آفلاین کار کند.<br>یک بار با اینترنت باز کنید، چند ثانیه صبر کنید و دوباره امتحان کنید.</p></body></html>';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function offlinePage() {
  return caches.match('./index.html').then(function (m) {
    return m || caches.match('./');
  }).then(function (m) {
    return m || new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  /* درخواست‌های دیتابیس و ورود را کش نکن؛ خود Firebase آفلاین را مدیریت می‌کند */
  if (/firestore\.googleapis|identitytoolkit|securetoken|googleapis\.com\/(drive|upload)|accounts\.google|anthropic/.test(url.href)) return;
  var isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html');
  if (isPage) { /* اول اینترنت (نسخهٔ تازه)، اگر نبود کش */
    e.respondWith(fetch(req).then(function (r) {
      if (r && r.status === 200) {
        var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
      }
      return r;
    }).catch(offlinePage));
    return;
  }
  e.respondWith(caches.match(req).then(function (m) { /* اول کش، بعد اینترنت */
    return m || fetch(req).then(function (r) {
      if (r && (r.status === 200 || r.type === 'opaque')) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return r;
    });
  }));
});
