/* Mini@ᯇᴗᯇ — Service Worker
 * 策略：
 *  - 安装时预缓存应用外壳（HTML/CSS/JS/图标/manifest）
 *  - 导航请求：网络优先，失败回退缓存（保证更新能拿到）
 *  - 其他同源静态资源：缓存优先
 *  - 一切运行时缓存的上限 60 条，旧的先淘汰
 */
const CACHE = 'miniat.v4';
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // AI API 等跨域请求不拦

  // 页面导航：网络优先，离线回退外壳
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 静态资源：缓存优先
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      if (fresh.ok) {
        cache.put(req, fresh.clone());
        if (cache.keys && cache.keys instanceof Function) {
          const keys = await cache.keys();
          if (keys.length > 60) await cache.delete(keys[0]);
        }
      }
      return fresh;
    } catch (err) {
      return hit || Response.error();
    }
  })());
});

// 让页面能触发"立即更新"
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
