// Mazot Takip — Servis Çalışanı (Service Worker)
// Uygulamayı bir kere ziyaret ettikten sonra internet olmasa da açılabilmesini sağlar.
// Not: Google Haritalar, konum, döviz gibi özellikler yine internet ister; ama uygulamanın
// kendisi (kayıtlar, formlar, hesaplamalar) tamamen çevrimdışı çalışır.

const ONBELLEK_ADI = 'mazot-takip-v1';
const ONBELLEKLENECEKLER = [
  './',
  './mazot-takip.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ONBELLEK_ADI).then((cache) => cache.addAll(ONBELLEKLENECEKLER))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((isimler) =>
      Promise.all(
        isimler
          .filter((isim) => isim !== ONBELLEK_ADI)
          .map((isim) => caches.delete(isim))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini önbellekten karşıla; dış servisleri (harita, döviz vb.) etkileme
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((onbellekYaniti) => {
      if (onbellekYaniti) return onbellekYaniti;

      return fetch(event.request)
        .then((agYaniti) => {
          // Aynı origin'deki (kendi dosyalarımız) başarılı yanıtları önbelleğe ekle
          if (event.request.url.startsWith(self.location.origin) && agYaniti.ok) {
            const kopya = agYaniti.clone();
            caches.open(ONBELLEK_ADI).then((cache) => cache.put(event.request, kopya));
          }
          return agYaniti;
        })
        .catch(() => {
          // Ana sayfa isteği başarısız olursa (tamamen çevrimdışıysa) önbellekteki ana sayfayı ver
          if (event.request.mode === 'navigate') {
            return caches.match('./mazot-takip.html');
          }
        });
    })
  );
});
