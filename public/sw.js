// Minimal service worker — installation only, no caching
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
// fetch handler required for Chrome to trigger beforeinstallprompt
self.addEventListener("fetch", () => {});
