'use strict';
// Příručka Sinumerik 840D – data v js/sinumerik-data.js (převzaté ze SKICA 2D CAD/CAM).

(function () {
  const S = window.SINUMERIK;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const NOTE_DET = 'Orientační přehled – přesné znění a čísla se liší podle verze SW, jazyka a projektu stroje. Rozhoduje obrazovka, diagnostika a dokumentace výrobce.';

  // Každá sekce převedená na jednotný tvar: { groups: {název: [klíče]}, items: [{key, title, sub, detail, mono, examples:[{title, code, description}]}] }
  const fromRef = (d, detail) => ({
    groups: d.groups,
    items: d.items.map((i) => ({ key: i.name, title: i.name, sub: i.description, detail: i.syntax, mono: !detail, examples: i.examples || [], stav: i.stav, pozn: i.pozn, puvodni: i.puvodni })),
  });
  // Štítky z oprav dat (scripts/opravy-sinumerik.mjs)
  const STITEK = {
    iso: ['Fanuc / ISO', 'b-iso'],
    ne: ['nejspíš neexistuje', 'b-ne'],
    stroj: ['dle výrobce stroje', 'b-stroj'],
    oprava: ['opraveno', 'b-ok'],
  };
  const SKRYVAT = ['iso', 'ne'];
  let skrytNe = (() => { try { return localStorage.getItem('bona.snSkryt') !== '0'; } catch { return true; } })();
  const SEKCE = [
    { id: 'gkody', icon: '⚙️', title: 'G kódy', desc: 'Pohybové a přípravné funkce', data: fromRef(S.gkody) },
    { id: 'mkody', icon: '🔧', title: 'M kódy', desc: 'Pomocné strojní funkce', data: fromRef(S.mkody) },
    { id: 'prikazy', icon: '💻', title: 'Příkazy', desc: 'Příkazy & syntax programování', data: fromRef(S.prikazy) },
    { id: 'promenne', icon: '📊', title: 'Proměnné', desc: 'Systémové proměnné ($P_, $AA_…)', data: {
      groups: Object.fromEntries(Object.entries(S.promenne).map(([g, a]) => [g, a.map((v) => v.name)])),
      items: Object.values(S.promenne).flat().map((v) => ({ key: v.name, title: v.name, sub: v.desc, examples: [] })),
    } },
    { id: 'zkratky', icon: '⌨️', title: 'Zkratky', desc: 'Klávesové zkratky displeje', data: {
      groups: Object.fromEntries(S.zkratky.map((g) => [g.title, g.items.map((x, i) => g.title + '#' + i)])),
      items: S.zkratky.flatMap((g) => g.items.map((x, i) => ({ key: g.title + '#' + i, title: x.keys, sub: x.desc, examples: [], kbd: true }))),
    } },
    { id: 'ukazky', icon: '📝', title: 'Ukázky', desc: 'Ukázky CNC kódů s komentáři', data: {
      groups: {},
      items: S.ukazky.map((u) => ({ key: u.title, title: u.title, sub: '', examples: [{ title: '', code: u.code, description: '' }], notes: u.notes })),
    } },
    { id: 'nastroje', icon: '🛠️', title: 'Nástroje', desc: 'Data nástroje, data břitu, 2 suporty', data: fromRef(S.nastroje, true), note: NOTE_DET },
    { id: 'alarmy', icon: '🚨', title: 'Alarmy', desc: 'Alarmy a chybová hlášení', data: fromRef(S.alarmy, true), note: NOTE_DET },
    { id: 'tahak', icon: '📋', title: 'Rychlý tahák', desc: 'To nejdůležitější pro karusel na jedné stránce' },
  ];

  $('sn-tiles').innerHTML = SEKCE.map((s) =>
    `<button type="button" class="tile" data-s="${s.id}"><span class="ti">${s.icon}</span><b>${s.title}</b><small>${s.desc}</small>` +
    (s.data ? `<em>${s.data.items.length}</em>` : '') + '</button>').join('');

  let akt = null, skupina = null;

  function polozkaHtml(i, open) {
    const ex = i.examples.map((e) =>
      (e.title ? `<p class="ex-t">${esc(e.title)}</p>` : '') + `<pre class="code">${esc(e.code)}</pre>` + (e.description ? `<p class="hint">${esc(e.description)}</p>` : '')).join('');
    const notes = i.notes ? '<ul class="notes">' + i.notes.map((n) => `<li>${esc(n)}</li>`).join('') + '</ul>' : '';
    const det = i.detail ? `<pre class="${i.mono ? 'code' : 'txt'}">${esc(i.detail)}</pre>` : '';
    const st = i.stav && STITEK[i.stav];
    const varovani = (i.pozn ? `<div class="warn">${esc(i.pozn)}</div>` : '') +
      (i.puvodni ? `<p class="hint">Původní popis ve SKICE: „${esc(i.puvodni)}“</p>` : '');
    const body = varovani + det + ex + notes;
    const head = `<span class="${i.kbd ? 'kbd' : 'nm'}">${esc(i.title)}</span><span class="sb">${esc(i.sub)}${st ? ` <span class="badge-s ${st[1]}">${st[0]}</span>` : ''}</span>`;
    return body ? `<details class="ref"${open ? ' open' : ''}><summary>${head}</summary><div class="rb">${body}</div></details>` : `<div class="ref plain">${head}</div>`;
  }

  function kresliSeznam() {
    const d = akt.data;
    const q = norm($('sn-hledat').value.trim());
    let items = d.items;
    const pocetSkrytych = items.filter((i) => SKRYVAT.includes(i.stav)).length;
    $('sn-skryt-wrap').hidden = !pocetSkrytych;
    $('sn-skryt-n').textContent = pocetSkrytych;
    if (skrytNe) items = items.filter((i) => !SKRYVAT.includes(i.stav));
    if (skupina) { const set = new Set(d.groups[skupina]); items = items.filter((i) => set.has(i.key)); }
    if (q) items = items.filter((i) => norm([i.title, i.sub, i.detail, (i.notes || []).join(' '), i.examples.map((e) => e.code).join(' ')].join(' ')).includes(q));
    // seřadit podle pořadí ve skupině, když je vybraná
    if (skupina) { const ord = d.groups[skupina]; items = [...items].sort((a, b) => ord.indexOf(a.key) - ord.indexOf(b.key)); }
    $('sn-list').innerHTML = items.length ? items.map((i) => polozkaHtml(i, akt.id === 'ukazky')).join('') : '<p class="hint">Nic nenalezeno.</p>';
  }

  function otevri(id, hledat = '') {
    akt = SEKCE.find((s) => s.id === id);
    $('sn-hub').hidden = true;
    if (id === 'tahak') { $('sn-tahak').hidden = false; window.scrollTo(0, 0); return; }
    $('sn-view').hidden = false;
    $('sn-title').textContent = akt.icon + ' ' + akt.title;
    $('sn-note').textContent = akt.note || 'Orientační přehled. Vždy platí dokumentace stroje a technologie vašeho podniku.';
    skupina = null;
    $('sn-hledat').value = hledat;
    const g = Object.keys(akt.data.groups);
    $('sn-groups').hidden = !g.length;
    $('sn-groups').innerHTML = ['Vše', ...g].map((n, i) => `<button type="button" class="chip${i === 0 ? ' active' : ''}" data-g="${i === 0 ? '' : esc(n)}">${esc(n)}</button>`).join('');
    kresliSeznam();
    window.scrollTo(0, 0);
  }
  function zpet() {
    $('sn-view').hidden = true; $('sn-tahak').hidden = true; $('sn-hub').hidden = false;
  }

  $('sn-tiles').addEventListener('click', (e) => { const t = e.target.closest('.tile'); if (t) otevri(t.dataset.s); });
  $('sn-back').addEventListener('click', zpet);
  document.querySelector('#sn-tahak [data-back]').addEventListener('click', zpet);
  $('sn-hledat').addEventListener('input', kresliSeznam);
  $('sn-skryt').checked = skrytNe;
  $('sn-skryt').addEventListener('change', () => {
    skrytNe = $('sn-skryt').checked;
    try { localStorage.setItem('bona.snSkryt', skrytNe ? '1' : '0'); } catch { /* nedostupné */ }
    kresliSeznam();
  });
  $('sn-groups').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    $('sn-groups').querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === b));
    skupina = b.dataset.g || null; kresliSeznam();
  });

  // Hledání napříč všemi sekcemi
  $('sn-vsude').addEventListener('input', () => {
    const q = norm($('sn-vsude').value.trim());
    if (q.length < 2) { $('sn-vysledky').innerHTML = ''; $('sn-tiles').hidden = false; return; }
    const hits = [];
    for (const s of SEKCE) {
      if (!s.data) continue;
      for (const i of s.data.items) {
        if (skrytNe && SKRYVAT.includes(i.stav)) continue; // stejně jako v seznamu sekce
        const inTitle = norm(i.title).includes(q);
        if (inTitle || norm([i.sub, i.detail].join(' ')).includes(q)) hits.push({ s, i, score: norm(i.title) === q ? 0 : inTitle ? 1 : 2 });
      }
    }
    hits.sort((a, b) => a.score - b.score);
    $('sn-tiles').hidden = hits.length > 0;
    $('sn-vysledky').innerHTML = hits.length
      ? `<p class="hint">Nalezeno ${hits.length}${hits.length > 40 ? ' (zobrazeno 40)' : ''}</p>` + hits.slice(0, 40).map(({ s, i }) => `<div class="hit-sec">${s.icon} ${s.title}</div>` + polozkaHtml(i, false)).join('')
      : '<p class="hint">Nic nenalezeno.</p>';
  });

  // Opakované klepnutí na záložku Sinumerik (když už je otevřená) vrátí na rozcestník
  const tab = document.querySelector('.tab[data-tab="sinumerik"]');
  let bylaAktivni = false;
  tab.addEventListener('pointerdown', () => { bylaAktivni = tab.classList.contains('active'); });
  tab.addEventListener('click', () => { if (bylaAktivni) zpet(); bylaAktivni = false; });
})();
