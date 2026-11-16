'use strict';
// Poznámky ke stroji – data v js/stroj-data.js, vlastní poznámky v localStorage (bona.stroj.<kategorie>).

(function () {
  const KAT = window.STROJ_KAT, DATA = window.STROJ_POZNAMKY;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ulozeno = (k) => { try { return JSON.parse(localStorage.getItem('bona.stroj.' + k)) || ''; } catch { return ''; } };
  const uloz = (k, v) => { try { localStorage.setItem('bona.stroj.' + k, JSON.stringify(v)); } catch { /* nedostupné */ } };

  let akt = (() => { try { return JSON.parse(localStorage.getItem('bona.strojKat')); } catch { return null; } })();
  if (!KAT.some((k) => k.id === akt)) akt = KAT[0].id;

  // poslední tlačítko není kategorie poznámek, ale odkaz na záložku Nová zakázka
  $('st-seg').innerHTML = KAT.map((k) => `<button class="seg-btn" data-st="${k.id}">${k.ikona} ${k.nazev}</button>`).join('') +
    '<button class="seg-btn" data-jdi="zakazka">📋 Nová zakázka</button>';

  const poznamka = (p, kat) =>
    `<details class="ref"><summary><span class="sb">${kat ? `<span class="st-kat">${esc(kat)}</span> ` : ''}${esc(p.t)}</span></summary>` +
    `<div class="rb"><pre class="txt">${esc(p.p)}</pre>` +
    (p.f && !window.BONA_BEZ_FOTEK ? `<div class="st-foto">${p.f.map((f) => `<a href="img/${esc(f)}" target="_blank" rel="noopener"><img src="img/${esc(f)}" loading="lazy" alt="${esc(p.t)}"></a>`).join('')}</div>` : '') +
    `</div></details>`;

  function vykresli() {
    const k = KAT.find((x) => x.id === akt);
    $('st-seg').querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.st === akt));
    $('st-nadpis').textContent = k.ikona + ' ' + k.nazev;
    $('st-popis').textContent = k.popis;
    const seznam = DATA[akt] || [];
    $('st-seznam').innerHTML = seznam.length
      ? seznam.map((p) => poznamka(p)).join('')
      : '<p class="hint">Zatím tu nejsou žádné poznámky.</p>';
    $('st-moje').value = ulozeno(akt);
    $('st-moje').placeholder = 'Moje poznámky – ' + k.nazev.toLowerCase() + '…';
    $('st-stav').textContent = '';
    pojistka?.obnov();
  }

  function ukaz(id) {
    if (!KAT.some((k) => k.id === id)) return;
    akt = id;
    try { localStorage.setItem('bona.strojKat', JSON.stringify(id)); } catch { /* nedostupné */ }
    $('st-hledat').value = '';
    hledej();
    vykresli();
  }
  window.strojUkaz = ukaz;

  $('st-seg').addEventListener('click', (e) => {
    const j = e.target.closest('[data-jdi]');
    if (j) { document.querySelector('.tab[data-tab="' + j.dataset.jdi + '"]')?.click(); return; }
    const b = e.target.closest('[data-st]'); if (b) ukaz(b.dataset.st);
  });

  const pojistka = window.hlidejText?.($('st-moje'), () => 'stroj.' + akt);
  let casovac;
  $('st-moje').addEventListener('input', () => {
    clearTimeout(casovac);
    const kat = akt, text = $('st-moje').value;
    $('st-stav').textContent = 'Ukládám…';
    casovac = setTimeout(() => {
      uloz(kat, text);
      $('st-stav').textContent = 'Uloženo ' + new Date().toLocaleTimeString('cs-CZ');
    }, 400);
  });

  // Hledání napříč všemi kategoriemi (poznámky v aplikaci i vlastní)
  function hledej() {
    const q = norm($('st-hledat').value.trim());
    $('st-obsah').hidden = !!q;
    $('st-vysledky').hidden = !q;
    if (!q) return;
    const slova = q.split(/\s+/);
    const sedi = (t) => slova.every((s) => norm(t).includes(s));
    let html = '';
    KAT.forEach((k) => {
      (DATA[k.id] || []).filter((p) => sedi(p.t + ' ' + p.p)).forEach((p) => { html += poznamka(p, k.nazev); });
      const moje = ulozeno(k.id);
      moje.split(/\n/).filter((r) => r.trim() && sedi(r)).forEach((r) => {
        html += `<div class="ref plain"><span class="sb"><span class="st-kat">${esc(k.nazev)} · moje</span> ${esc(r)}</span></div>`;
      });
    });
    $('st-vysledky').innerHTML = html || '<p class="hint">Nic nenalezeno.</p>';
    $('st-vysledky').querySelectorAll('details').forEach((d) => (d.open = true));
  }
  $('st-hledat').addEventListener('input', hledej);

  vykresli();
})();
