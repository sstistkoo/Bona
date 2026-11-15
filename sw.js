// Offline režim: aplikace se uloží do telefonu a funguje i bez signálu.
// Strategie „nejdřív síť“: když je signál, načte se vždy nejnovější verze z GitHubu,
// bez signálu se použije uložená kopie. Při změně souborů zvyš VERZE.
const VERZE = 'bona-0.8.63';
const SOUBORY = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'js/vypocty.js', 'js/sinumerik-data.js', 'js/nastroje.js', 'js/kuzel.js', 'js/sinumerik.js', 'js/prevod-nm.js', 'js/dilna.js', 'js/stroj-data.js',
  'js/heslo.js', 'js/stroj.js', 'js/zakazka.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
];

// Fotky u poznámek: názvy se najdou v datových souborech, takže nové fotky není potřeba sem dopisovat.
const S_FOTKAMI = ['js/stroj-data.js', 'js/zakazka.js'];
async function ulozFotky(c) {
  const texty = await Promise.all(S_FOTKAMI.map((f) => fetch(f).then((r) => r.text()).catch(() => '')));
  const nazvy = [...new Set(texty.join('\n').match(/[\w.-]+\.(?:jpe?g|png|webp)/gi) || [])];
  // každá zvlášť – chybějící fotka nesmí zablokovat instalaci aplikace
  await Promise.allSettled(nazvy.map((n) => c.add('img/' + n)));
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERZE)
    .then((c) => c.addAll(SOUBORY).then(() => ulozFotky(c)))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERZE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const kopie = res.clone(); caches.open(VERZE).then((c) => c.put(req, kopie)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
