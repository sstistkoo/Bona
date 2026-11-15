'use strict';

const VERZE = '0.8.75';

/* ---------- Pomocné funkce ---------- */
const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat(String($(id).value).replace(',', '.'));
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–');

const store = {
  get(key, def) {
    try { const v = localStorage.getItem('bona.' + key); return v === null ? def : JSON.parse(v); }
    catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('bona.' + key, JSON.stringify(val)); } catch { /* úložiště nedostupné */ }
  },
};

function casText(min) {
  if (!Number.isFinite(min)) return '–';
  const s = Math.round(min * 60);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ' h ' : '') + m + ' min ' + sec + ' s';
}

/* ---------- Záložky ---------- */
const lista = document.querySelector('.tabs');
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const zmena = !btn.classList.contains('active');
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === btn.dataset.tab));
    store.set('tab', btn.dataset.tab);
    // posunout jen lištu (ne stránku), aby byla aktivní záložka uprostřed
    lista.scrollTo({ left: btn.offsetLeft - (lista.clientWidth - btn.offsetWidth) / 2, behavior: zmena ? 'smooth' : 'auto' });
    if (zmena) window.scrollTo(0, 0); // nová záložka začíná nahoře
    ukazAktualni();
  });
});
const tabBtn = (id) => [...document.querySelectorAll('.tab')].find((b) => b.dataset.tab === id);
// kategorie poznámek ke stroji (#sonda, #poruchy…) otevírají záložku Stroj
const strojKat = (id) => window.STROJ_KAT.find((k) => k.id === id);
// Řezné podmínky, Čas obrábění a Drsnost jsou jedna sekce s přepínačem nahoře.
// Staré odkazy (#drsnost, #cas) a položky menu vedou na odpovídající pohled.
const POHLEDY = { rez: null, cas: '⏱️ Čas obrábění', drs: '🔬 Drsnost povrchu' };
const ALIAS = { drsnost: 'drs', cas: 'cas' };
function kalkPohled(p) {
  if (!(p in POHLEDY)) p = 'rez';
  for (const k of Object.keys(POHLEDY)) document.getElementById('kalk-' + k).hidden = k !== p;
  document.querySelectorAll('[data-kpohled]').forEach((b) => b.classList.toggle('active', b.dataset.kpohled === p));
  store.set('kalkPohled', p);
  ukazAktualni();
}
document.querySelectorAll('[data-kpohled]').forEach((b) => b.addEventListener('click', () => kalkPohled(b.dataset.kpohled)));
function otevri(id) {
  if (id in ALIAS) { tabBtn('kalk').click(); kalkPohled(ALIAS[id]); return; }
  const k = strojKat(id);
  if (k) {
    store.set('strojKat', k.id);
    window.strojUkaz?.(k.id);
    tabBtn('stroj').click();
    ukazAktualni();
  } else tabBtn(id)?.click();
}
function zalozkaZAdresy() {
  const id = decodeURIComponent(location.hash.slice(1));
  const ok = !!(tabBtn(id) || strojKat(id) || id in ALIAS);
  if (ok) { otevri(id); window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 0); }
  return ok;
}

/* ---------- Menu ☰ – všechny nástroje na jedné obrazovce ---------- */
const MENU = [
  ['Výpočty', [['kalk', '⚙️'], ['tol', '📏'], ['kuzel', '🔺'], ['teplo', '🌡️']]],
  ['Programování', [['sinumerik', '🏭'], ['rez', '◢'], ['geo', '⌒'], ['trig', '📐'], ['calc', '🔢']]],
  ['Nástroje', [['vbd', '💎'], ['nm', '🔧'], ['prevod', '🔄']]],
  ['Stroj', window.STROJ_KAT.map((k) => [k.id, k.ikona, k.nazev])],
  ['Dílna', [['zakazka', '📋'], ['smena', '✅'], ['poznamky', '📝']]],
];
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menu-btn');
const menuHledat = document.getElementById('menu-hledat');
const POLOZKY = {}; // id → { ic, txt }
MENU.forEach(([, items]) => items.forEach(([id, ic, txt]) => { POLOZKY[id] = { ic, txt: txt || tabBtn(id).textContent }; }));
document.getElementById('menu-in').innerHTML = MENU.map(([g, items]) =>
  `<div class="menu-sek"><p class="menu-g">${g}</p><div class="menu-grid">` +
  items.map(([id]) => `<button type="button" class="menu-i" data-go="${id}"><span>${POLOZKY[id].ic}</span>${POLOZKY[id].txt}</button>`).join('') + '</div></div>').join('');

// aktuální sekce: id záložky, u Stroje vybraná kategorie
function aktualniId() {
  const t = document.querySelector('.tab.active')?.dataset.tab;
  return t === 'stroj' ? store.get('strojKat', window.STROJ_KAT[0].id) : t;
}

/* Spodní lišta (mobil) – rychlé sekce + Vše */
const BNAV = ['kalk', 'tol', 'sinumerik', 'stroj'];
const bnav = document.getElementById('bnav');
bnav.innerHTML = BNAV.map((id) => {
  const p = id === 'stroj' ? { ic: '🛠️', txt: 'Stroj' } : POLOZKY[id];
  return `<button type="button" class="bnav-i" data-bn="${id}"><span>${p.ic}</span>${p.txt.replace(' 840D', '').replace('Řezné podm.', 'Řezné')}</button>`;
}).join('') + '<button type="button" class="bnav-i" id="bnav-vse"><span>☰</span>Vše</button>';
bnav.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'bnav-vse') { menuOtevrit(menu.hidden); return; }
  menuOtevrit(false);
  tabBtn(b.dataset.bn).click();
});

function ukazAktualni() {
  const t = document.querySelector('.tab.active')?.dataset.tab;
  const p = POLOZKY[aktualniId()] || POLOZKY[t];
  const nazev = t === 'kalk' ? POHLEDY[store.get('kalkPohled', 'rez')] : null;
  document.getElementById('cur-tab').textContent = nazev || (p ? p.ic + ' ' + p.txt : '');
  document.title = nazev ? nazev.slice(3) + ' – Bona' : p ? p.txt + ' – Bona' : 'Bona – CNC pomocník';
  bnav.querySelectorAll('[data-bn]').forEach((b) => b.classList.toggle('active', b.dataset.bn === t && menu.hidden));
  zapisNedavne(aktualniId());
  zapisHistorii(aktualniId());
  document.getElementById('top-calc').classList.toggle('active', t === 'calc');
}

/* Naposledy použité – nahoře v menu */
const NEDAVNE_MAX = 4;
function zapisNedavne(id) {
  if (!POLOZKY[id]) return;
  const a = store.get('nedavne', []);
  if (a[0] === id) return;
  store.set('nedavne', [id, ...a.filter((x) => x !== id && POLOZKY[x])].slice(0, NEDAVNE_MAX + 1));
}
function vykresliNedavne() {
  const akt = aktualniId();
  const ids = store.get('nedavne', []).filter((x) => x !== akt && POLOZKY[x]).slice(0, NEDAVNE_MAX);
  const el = document.getElementById('menu-nedavne');
  el.hidden = !ids.length;
  el.innerHTML = '<p class="menu-g">Naposledy</p><div class="menu-recent">' +
    ids.map((id) => `<button type="button" class="menu-r" data-go="${id}"><span>${POLOZKY[id].ic}</span>${POLOZKY[id].txt}</button>`).join('') + '</div>';
}
// změna kategorie Stroje přepíše titulek (stroj.js se načítá až po app.js)
document.getElementById('st-seg')?.addEventListener('click', () => setTimeout(ukazAktualni, 0));

function menuFiltr() {
  const q = norm(menuHledat.value);
  let nic = true;
  menu.querySelectorAll('.menu-sek').forEach((s) => {
    let vid = false;
    s.querySelectorAll('.menu-i').forEach((b) => {
      const ok = !q || norm(b.textContent + ' ' + b.dataset.go).includes(q);
      b.hidden = !ok; vid ||= ok;
    });
    s.hidden = !vid; nic &&= !vid;
  });
  document.getElementById('menu-nic').hidden = !nic;
  if (q) document.getElementById('menu-nedavne').hidden = true;
  else vykresliNedavne();
}
function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
menuHledat.addEventListener('input', menuFiltr);
menuHledat.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const b = menu.querySelector('.menu-i:not([hidden])');
  if (b) { otevri(b.dataset.go); menuOtevrit(false); }
});

function menuOtevrit(ano) {
  menu.hidden = !ano;
  menuBtn.setAttribute('aria-expanded', String(ano));
  menuBtn.textContent = ano ? '✕' : '☰';
  document.body.classList.toggle('menu-open', ano);
  document.getElementById('bnav-vse').classList.toggle('active', ano);
  if (ano) {
    menu.style.setProperty('--menu-top', document.querySelector('.top').getBoundingClientRect().bottom + 'px');
    const akt = aktualniId();
    menu.querySelectorAll('.menu-i').forEach((b) => b.classList.toggle('active', b.dataset.go === akt));
    menuHledat.value = ''; menuFiltr();
  }
  ukazAktualni();
}
menuBtn.addEventListener('click', () => menuOtevrit(menu.hidden));
menu.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) otevri(b.dataset.go);
  if (b || e.target === menu) menuOtevrit(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) menuOtevrit(false); });

/* ---------- Tlačítka vpravo nahoře: 🔢 kalkulačka · ⛶ celá obrazovka · ✕ zavřít ---------- */
// Historie sekcí v tomto spuštění – ✕ vrací na předchozí (jako zavření okna ve SKICE)
const historie = [];
function zapisHistorii(id) {
  if (POLOZKY[id] && historie[historie.length - 1] !== id) historie.push(id);
  if (historie.length > 30) historie.shift();
}
function zpet() {
  if (!menu.hidden) { menuOtevrit(false); return; }
  historie.pop();                       // aktuální sekce
  const pred = historie.pop();          // předchozí (po otevření se znovu zapíše)
  if (pred) otevri(pred);
  else menuOtevrit(true);               // není kam se vrátit → přehled všech nástrojů
}
document.getElementById('top-zavrit').addEventListener('click', zpet);
document.getElementById('top-calc').addEventListener('click', () => {
  if (document.querySelector('.tab.active')?.dataset.tab === 'calc' && menu.hidden) { zpet(); return; }
  menuOtevrit(false);
  tabBtn('calc').click();
});
// Celá obrazovka (Android/PC). iPhone ji pro stránky nepodporuje → tlačítko se neukáže.
const fullBtn = document.getElementById('top-full');
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
  fullBtn.hidden = false;
  fullBtn.addEventListener('click', () => {
    const d = document.documentElement;
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (d.requestFullscreen || d.webkitRequestFullscreen).call(d)?.catch?.(() => {});
  });
  const fsStav = () => {
    const on = !!fsEl();
    fullBtn.classList.toggle('on', on);
    fullBtn.title = on ? 'Ukončit celou obrazovku' : 'Celá obrazovka';
    fullBtn.setAttribute('aria-label', fullBtn.title);
  };
  document.addEventListener('fullscreenchange', fsStav);
  document.addEventListener('webkitfullscreenchange', fsStav);
}

// Po spuštění se vždy otevře kalkulačka (nejčastěji používaná); odkaz s #záložkou má přednost
kalkPohled(store.get('kalkPohled', 'rez')); // pamatuje si poslední pohled sekce Řezné podmínky
if (!zalozkaZAdresy()) tabBtn('calc').click();
window.addEventListener('hashchange', zalozkaZAdresy);

/* ---------- Tlačítko ± u polí se zápornými hodnotami (číselná klávesnice iOS nemá mínus) ---------- */
document.querySelectorAll('input[data-neg]').forEach((inp) => {
  const wrap = document.createElement('span');
  wrap.className = 'negwrap';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'negbtn'; b.textContent = '±'; b.title = 'Změnit znaménko';
  b.addEventListener('mousedown', (e) => e.preventDefault()); // nebrat fokus poli
  b.addEventListener('click', () => {
    const v = inp.value.trim();
    inp.value = v.startsWith('-') ? v.slice(1) : '-' + v.replace(/^\+/, '');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  wrap.appendChild(b);
});

/* ---------- Křížek ✕ k vymazání u vyhledávacích polí ---------- */
document.querySelectorAll('input[type=search]').forEach((inp) => {
  if (!inp.placeholder) inp.placeholder = ' '; // viditelnost křížku řídí CSS :placeholder-shown
  const wrap = document.createElement('span');
  wrap.className = 'srch';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'srch-x'; b.textContent = '✕'; b.setAttribute('aria-label', 'Vymazat hledání');
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', () => { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); });
  wrap.appendChild(b);
});

/* ---------- Kalkulačka Vc ↔ n ---------- */
function vypisKalk() {
  const d = num('k-d'), vc = num('k-vc'), n = num('k-n'), lims = num('k-lims');
  let html = `n = <b>${fmt(n, 1)}</b> ot/min &nbsp;·&nbsp; Vc = <b>${fmt(vc, 1)}</b> m/min`;
  if (lims > 0 && n > lims) {
    const vcSkut = (Math.PI * d * lims) / 1000;
    html += `<div class="warn">Otáčky přesahují LIMS ${fmt(lims, 0)} – stroj omezí na ${fmt(lims, 0)} ot/min, skutečná Vc bude jen ${fmt(vcSkut, 1)} m/min.</div>`;
  }
  if (lims > 0 && d > 0) {
    const dMez = (1000 * vc) / (Math.PI * lims);
    html += `<p class="hint">Pod průměrem ${fmt(dMez, 0)} mm už se uplatní LIMS (Vc začne klesat).</p>`;
  }
  $('k-out').innerHTML = html;
}
function zDaVc() {
  const d = num('k-d'), vc = num('k-vc');
  if (d > 0 && vc > 0) $('k-n').value = ((1000 * vc) / (Math.PI * d)).toFixed(1);
  vypisKalk();
}
function zN() {
  const d = num('k-d'), n = num('k-n');
  if (d > 0 && n > 0) $('k-vc').value = ((Math.PI * d * n) / 1000).toFixed(1);
  vypisKalk();
}
['k-d', 'k-vc'].forEach((id) => $(id).addEventListener('input', zDaVc));
$('k-n').addEventListener('input', zN);
$('k-lims').addEventListener('input', vypisKalk);
zDaVc();

/* ---------- Posuv a drsnost ---------- */
function vypisPosuv() {
  const f = num('p-f'), n = num('p-n');
  $('p-out').innerHTML = `Posuv za minutu Vf = <b>${fmt(f * n, 1)}</b> mm/min`;
}
['p-f', 'p-n'].forEach((id) => $(id).addEventListener('input', vypisPosuv));
vypisPosuv();

/* ---------- Čas čelního soustružení s G96 a LIMS ---------- */
function vypisCelni() {
  const d1 = num('c-d1'), d2 = num('c-d2'), vc = num('c-vc'), f = num('c-f'), lims = num('c-lims');
  const pocet = Math.max(1, Math.round(num('c-pocet')) || 1);
  if (!(d1 > d2 && d2 >= 0 && vc > 0 && f > 0)) { $('c-out').innerHTML = 'Zadej D1 > D2 a kladné Vc a f.'; return; }

  // numerická integrace po poloměru: dt = dr / (f · n(r))
  const kroky = 2000;
  const r1 = d1 / 2, r2 = d2 / 2, dr = (r1 - r2) / kroky;
  let t = 0;
  for (let i = 0; i < kroky; i++) {
    const r = r1 - (i + 0.5) * dr;
    let n = (1000 * vc) / (Math.PI * 2 * r);
    if (lims > 0) n = Math.min(n, lims);
    t += dr / (f * n);
  }
  const nMin = (1000 * vc) / (Math.PI * d1);
  const nMax = lims > 0 ? Math.min((1000 * vc) / (Math.PI * Math.max(d2, 0.001)), lims) : (1000 * vc) / (Math.PI * Math.max(d2, 0.001));
  $('c-out').innerHTML =
    `Čas 1 třísky: <b>${casText(t)}</b><br>` +
    `Celkem (${pocet}×): <b>${casText(t * pocet)}</b><br>` +
    `<span class="hint">Otáčky od ${fmt(nMin, 1)} do ${fmt(nMax, 1)} ot/min. Bez najíždění a rychloposuvů.</span>`;
}
['c-d1', 'c-d2', 'c-vc', 'c-f', 'c-lims', 'c-pocet'].forEach((id) => $(id).addEventListener('input', vypisCelni));
vypisCelni();

/* ---------- Čas podélného soustružení ---------- */
function vypisPodelny() {
  const l = num('l-l'), d = num('l-d'), vc = num('l-vc'), f = num('l-f');
  const pocet = Math.max(1, Math.round(num('l-pocet')) || 1);
  if (!(l > 0 && d > 0 && vc > 0 && f > 0)) { $('l-out').innerHTML = 'Zadej kladnou délku, průměr, Vc a posuv.'; return; }
  const n = (1000 * vc) / (Math.PI * d);
  const t = l / (f * n);
  $('l-out').innerHTML =
    `n = ${fmt(n, 1)} ot/min, Vf = ${fmt(f * n, 1)} mm/min<br>` +
    `Čas 1 třísky: <b>${casText(t)}</b><br>Celkem (${pocet}×): <b>${casText(t * pocet)}</b>`;
}
['l-l', 'l-d', 'l-vc', 'l-f', 'l-pocet'].forEach((id) => $(id).addEventListener('input', vypisPodelny));
vypisPodelny();

/* ---------- Tahák Sinumerik 840D ---------- */
const TAHAK = [
  { skupina: 'Pohyby', polozky: [
    ['G0', 'Rychloposuv', 'G0 X500 Z10'],
    ['G1', 'Lineární interpolace pracovním posuvem', 'G1 X460 Z-20 F0.4'],
    ['G2 / G3', 'Kruhová interpolace ve směru / proti směru hodin', 'G2 X480 Z-30 CR=10'],
    ['G33', 'Řezání závitu (konstantní stoupání)', 'G33 Z-50 K2'],
    ['G4', 'Časová prodleva: F = sekundy, S = otáčky vřetene', 'G4 F2'],
  ]},
  { skupina: 'Rozměry a souřadnice', polozky: [
    ['G90 / G91', 'Absolutní / přírůstkové zadání', ''],
    ['AC() / IC()', 'Absolutně / přírůstkově jen pro jednu osu', 'G90 X100 Z=IC(-5)'],
    ['DIAMON / DIAMOF', 'X jako průměr / jako poloměr', ''],
    ['G18', 'Rovina ZX (standard pro soustružení)', ''],
    ['G54…G57', 'Posunutí nulového bodu (nastavitelné), G505…G599 další', ''],
    ['G500', 'Zrušení nastavitelného posunutí', ''],
    ['G53 / SUPA', 'Potlačení posunutí v daném bloku', 'G53 G0 Z0'],
    ['TRANS / ATRANS', 'Programovatelné posunutí (absolutní / aditivní)', 'ATRANS Z-2.5'],
  ]},
  { skupina: 'Vřeteno a posuv', polozky: [
    ['G96 S…', 'Konstantní řezná rychlost Vc [m/min]', 'G96 S120 LIMS=200 M3'],
    ['LIMS=', 'Omezení max. otáček při G96 — u velkých kol a upínačů vždy kontrolovat!', 'LIMS=150'],
    ['G97', 'Konstantní otáčky (vypnutí G96)', 'G97 S80'],
    ['G95', 'Posuv v mm/ot', 'G95 F0.6'],
    ['G94', 'Posuv v mm/min', 'G94 F200'],
    ['M3 / M4 / M5', 'Vřeteno vpravo / vlevo / stop', ''],
    ['SPOS=', 'Polohování vřetene (úhel)', 'SPOS=90'],
  ]},
  { skupina: 'Nástroje a korekce', polozky: [
    ['T… D…', 'Volba nástroje a korekce (výměna dle nastavení stroje)', 'T3 D1'],
    ['G40', 'Zrušení korekce rádiusu břitu', ''],
    ['G41 / G42', 'Korekce rádiusu vlevo / vpravo od kontury', 'G42 G1 X500 Z0'],
    ['D0', 'Vypnutí korekcí nástroje (délky i rádiusu)', ''],
  ]},
  { skupina: 'Dráha a kontura', polozky: [
    ['G60 / G9', 'Přesné zastavení (modálně / jen v bloku)', ''],
    ['G64', 'Plynulý přechod mezi bloky', ''],
    ['CHF= / CHR=', 'Sražení hrany (délka sražení / délka strany)', 'G1 X500 CHF=2'],
    ['RND=', 'Zaoblení rohu', 'G1 Z-40 RND=5'],
  ]},
  { skupina: 'Program', polozky: [
    ['M0 / M1', 'Programový stop / volitelný stop', ''],
    ['M2 / M30', 'Konec programu', ''],
    ['M17 / RET', 'Konec podprogramu', ''],
    ['M8 / M9', 'Chlazení zap / vyp (závisí na stroji)', ''],
    ['MSG()', 'Zpráva na obrazovce', 'MSG("Zkontroluj upnuti")'],
    ['R1=…', 'Aritmetický parametr', 'R1=920 G1 X=R1'],
    ['DEF', 'Definice proměnné', 'DEF REAL PRUMER=920'],
    ['GOTOF / GOTOB', 'Skok dopředu / dozadu na návěští', 'IF R1>900 GOTOF KONEC'],
    ['REPEAT', 'Opakování úseku programu', 'REPEAT ZAC KON P=3'],
    ['STOPRE', 'Zastavení předběžného zpracování bloků', ''],
  ]},
  { skupina: 'Cykly (soustružení)', polozky: [
    ['CYCLE95', 'Odebírání materiálu podle kontury (starší cyklus)', ''],
    ['CYCLE951 / 952', 'Odebírání materiálu / podle kontury (novější)', ''],
    ['CYCLE93 / 930', 'Zapichování', ''],
    ['CYCLE94 / 96', 'Odlehčovací zápich / zápich pro závit', ''],
    ['CYCLE97 / 99', 'Řezání závitu', ''],
  ]},
  { skupina: 'Železniční kolo – pojmy', polozky: [
    ['S1002', 'Běžný jízdní profil obruče kola (dle EN 13715)', ''],
    ['Měřicí kružnice', 'Rovina průměru kola, obvykle 70 mm od vnitřního čela', ''],
    ['Sd', 'Tloušťka okolku', ''],
    ['Sh', 'Výška okolku', ''],
    ['qR', 'Strmost okolku', ''],
  ]},
];

function vykresliTahak(filtr = '') {
  const f = filtr.trim().toLowerCase();
  const html = TAHAK.map(({ skupina, polozky }) => {
    const radky = polozky.filter((p) => !f || p.join(' ').toLowerCase().includes(f) || skupina.toLowerCase().includes(f));
    if (!radky.length) return '';
    return `<div class="code-group"><h3>${skupina}</h3>` + radky.map(([kod, popis, pr]) =>
      `<div class="code-item"><code>${esc(kod)}</code><div>${esc(popis)}${pr ? `<span class="ex">${esc(pr)}</span>` : ''}</div></div>`
    ).join('') + '</div>';
  }).join('');
  $('t-seznam').innerHTML = html || '<p class="hint">Nic nenalezeno.</p>';
}
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
$('t-hledat').addEventListener('input', (e) => vykresliTahak(e.target.value));
vykresliTahak();

/* ---------- Kontrolní seznam směny ---------- */
const VYCHOZI_SEZNAM = [
  'Kontrola hladiny oleje a chladicí kapaliny',
  'Kontrola upínačů a čelistí',
  'Kontrola stavu nástrojů a destiček',
  'Kontrola LIMS v programu vs. upnutí',
  'Referenční najetí os',
  'Kontrola měřidel (kalibrace)',
  'Úklid třísek z pracovního prostoru',
];
let seznam = store.get('seznam', VYCHOZI_SEZNAM.map((t) => ({ t, ok: false })));

function vykresliSeznam() {
  $('s-seznam').innerHTML = seznam.map((p, i) =>
    `<li class="${p.ok ? 'done' : ''}"><label class="ck-l"><input type="checkbox" data-i="${i}" ${p.ok ? 'checked' : ''}><span>${esc(p.t)}</span></label><button class="del" data-del="${i}" title="Smazat" aria-label="Smazat">✕</button></li>`
  ).join('');
}
$('s-seznam').addEventListener('change', (e) => {
  const i = e.target.dataset.i; if (i === undefined) return;
  seznam[i].ok = e.target.checked; store.set('seznam', seznam); vykresliSeznam();
});
$('s-seznam').addEventListener('click', (e) => {
  const i = e.target.dataset.del; if (i === undefined) return;
  seznam.splice(i, 1); store.set('seznam', seznam); vykresliSeznam();
});
function pridej() {
  const t = $('s-novy').value.trim(); if (!t) return;
  seznam.push({ t, ok: false }); $('s-novy').value = ''; store.set('seznam', seznam); vykresliSeznam();
}
$('s-pridat').addEventListener('click', pridej);
$('s-novy').addEventListener('keydown', (e) => { if (e.key === 'Enter') pridej(); });
$('s-reset').addEventListener('click', () => { seznam.forEach((p) => (p.ok = false)); store.set('seznam', seznam); vykresliSeznam(); });
vykresliSeznam();

/* ---------- Počítadlo kusů ---------- */
let kusy = store.get('kusy', 0);
const ukazKusy = () => { $('ks-pocet').textContent = kusy; store.set('kusy', kusy); };
$('ks-plus').addEventListener('click', () => { kusy++; ukazKusy(); });
$('ks-minus').addEventListener('click', () => { if (kusy > 0) kusy--; ukazKusy(); });
$('ks-reset').addEventListener('click', () => { if (confirm('Opravdu vynulovat počítadlo?')) { kusy = 0; ukazKusy(); } });
ukazKusy();

/* ---------- Poznámky ---------- */
$('n-text').value = store.get('poznamky', '');
let casovac;
$('n-text').addEventListener('input', () => {
  clearTimeout(casovac);
  $('n-stav').textContent = 'Ukládám…';
  casovac = setTimeout(() => {
    store.set('poznamky', $('n-text').value);
    $('n-stav').textContent = 'Uloženo ' + new Date().toLocaleTimeString('cs-CZ');
  }, 400);
});

/* ---------- Záloha a obnova dat (všechny klíče bona.*) ---------- */
const ZAL_VYNECHAT = new Set(['bona.pristup']); // přístup se nezálohuje
function zalKlice() {
  const k = [];
  try { for (let i = 0; i < localStorage.length; i++) { const x = localStorage.key(i); if (x.startsWith('bona.') && !ZAL_VYNECHAT.has(x)) k.push(x); } }
  catch { /* úložiště nedostupné */ }
  return k.sort();
}
$('zal-ulozit').addEventListener('click', () => {
  const data = {};
  zalKlice().forEach((k) => { data[k] = localStorage.getItem(k); });
  const obsah = JSON.stringify({ aplikace: 'bona', verze: VERZE, datum: new Date().toISOString(), data }, null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([obsah], { type: 'application/json' }));
  a.download = 'bona-zaloha-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  $('zal-stav').textContent = `Uloženo ${Object.keys(data).length} položek do souboru ${a.download}.`;
});
$('zal-obnovit').addEventListener('click', () => $('zal-soubor').click());
$('zal-soubor').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const z = JSON.parse(await f.text());
    if (z?.aplikace !== 'bona' || typeof z.data !== 'object') throw new Error('Tohle není záloha aplikace Bona.');
    const klice = Object.keys(z.data).filter((k) => k.startsWith('bona.') && !ZAL_VYNECHAT.has(k) && typeof z.data[k] === 'string');
    const kdy = z.datum ? new Date(z.datum).toLocaleString('cs-CZ') : '?';
    if (!confirm(`Obnovit zálohu z ${kdy} (${klice.length} položek)?\nSoučasné poznámky a nastavení se nahradí.`)) return;
    zalKlice().forEach((k) => localStorage.removeItem(k));
    klice.forEach((k) => localStorage.setItem(k, z.data[k]));
    alert('Záloha obnovena. Aplikace se znovu načte.');
    location.reload();
  } catch (err) {
    $('zal-stav').textContent = 'Obnova se nepovedla: ' + (err.message || err);
  }
});

$('verze').textContent = 'verze ' + VERZE;

/* ---------- Offline režim (service worker) – jen na https (GitHub Pages) ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
// prohlížeč po načtení odroluje na #kotvu – vrátit stránku nahoru
window.addEventListener('load', () => { if (location.hash) setTimeout(() => window.scrollTo(0, 0), 0); });
