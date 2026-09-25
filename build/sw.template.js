/* TypingTestKaro service worker — offline practice. Version is injected at build time. */
var VERSION = "__VERSION__";
var CORE = "te-core-" + VERSION;
var PAGES = "te-pages-" + VERSION;
var PRECACHE = __PRECACHE__;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CORE && k !== PAGES; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1) {
    // pages: network first, fall back to cache, then to the offline page
    // "no-cache" = always revalidate with the server, so a new build is never hidden
    // behind the browser's HTTP cache; offline, fall back to the saved copy.
    e.respondWith(fetch(req, { cache: "no-cache" }).then(function (res) {
      var copy = res.clone();
      caches.open(PAGES).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match("/offline/"); });
    }));
    return;
  }
  // assets: cache first, refresh in the background
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
