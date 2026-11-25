// عامل خدمة بسيط: يجعل الموقع قابلاً للتثبيت فقط، دون تخزين بيانات (النظام يتطلب اتصالاً).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
