// Offline režim: aplikace se uloží do telefonu a funguje i bez signálu.
// Strategie „nejdřív síť“: když je signál, načte se vždy nejnovější verze z GitHubu,
// bez signálu (nebo když síť neodpoví do LIMIT) se použije uložená kopie.
// Při změně souborů zvyš verzi: node scripts/verze.mjs (změní VERZE tady i v app.js).
const VERZE = 'bona-0.11.8';
const SOUBORY = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'js/vypocty.js', 'js/znamenka.js', 'js/sinumerik-data.js', 'js/nastroje.js', 'js/kuzel.js', 'js/kuzel-r.js', 'js/roztec.js', 'js/sinumerik.js', 'js/prevod-nm.js', 'js/dilna.js', 'js/stroj-data.js',
  'js/heslo.js', 'js/stroj.js', 'js/zakazka.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
];

// Fotky u poznámek se předem NEstahují: v režimu bez fotek (heslo) se nemají dostat do telefonu.
// Uloží se pro offline až ve chvíli, kdy se fotka opravdu zobrazí (viz fetch níže).

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERZE)
    .then((c) => c.addAll(SOUBORY))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERZE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Při slabém signálu síť často „visí“ desítky sekund, než selže. Když neodpoví do LIMIT ms
// a soubor je uložený v telefonu, použije se uložená kopie; síť se mezitím dotáhne na pozadí
// a uloží novou verzi pro příští otevření.
const LIMIT = 4000;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  let ulozit = Promise.resolve();
  const sit = fetch(req, { cache: 'no-cache' }) // vždy ověřit na serveru, ne z mezipaměti prohlížeče (jinak se míchají staré a nové soubory)
    .then((res) => {
      if (res.ok) { const kopie = res.clone(); ulozit = caches.open(VERZE).then((c) => c.put(req, kopie)); }
      return res;
    });
  // uložená kopie; stránka (ne obrázek) bez vlastní kopie dostane index.html
  const zTelefonu = () => caches.match(req, { ignoreSearch: true })
    .then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined));

  e.respondWith(new Promise((hotovo) => {
    let vraceno = false;
    const vrat = (r) => { if (r && !vraceno) { vraceno = true; hotovo(r); } };
    const casovac = setTimeout(() => zTelefonu().then(vrat), LIMIT);
    sit.then(
      (res) => { clearTimeout(casovac); vrat(res); },
      () => { clearTimeout(casovac); zTelefonu().then((r) => vrat(r || Response.error())); }
    );
  }));
  e.waitUntil(sit.then(() => ulozit, () => {})); // doběhnout uložení i po odpovědi z telefonu
});
