'use strict';
// Chystání na novou zakázku – kontrolní seznam po skupinách (upravitelný) + údaje o zakázce. Ukládá se v prohlížeči.

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = (k, d) => { try { const v = localStorage.getItem('bona.zak.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem('bona.zak.' + k, JSON.stringify(v)); } catch { /* nedostupné */ } };

  const VYCHOZI = [
    ['Podklady', ['Výkres – správná revize', 'Technologický postup', 'NC program nahraný a zkontrolovaný', 'Polotovar – rozměry a přídavky']],
    ['Upnutí', ['Čelisti / upínače pro tento díl', 'Díl upnutý, vystředěný, kontrola házení']],
    ['Nástroje', ['Seznam nástrojů podle postupu', 'Destičky a držáky připravené', 'Nástroje změřené, korekce zapsané']],
    ['Stroj', ['Nulový bod nastaven', 'LIMS v programu odpovídá upnutí', 'Sonda zkontrolovaná (je-li potřeba)']],
    ['První kus', ['Program pomalu / s ověřením', 'Změřit a zapsat korekce', 'Kontrola rozměrů podle výkresu']],
  ];
  const nove = () => VYCHOZI.map(([n, p]) => ({ n, p: p.map((t) => ({ t, ok: false })) }));
  let skupiny = get('seznam', nove());

  const POLE = ['zk-cislo', 'zk-vykres', 'zk-mat', 'zk-prog'];
  POLE.forEach((id) => {
    $(id).value = get(id, '');
    $(id).addEventListener('input', () => set(id, $(id).value));
  });
  $('zk-pozn').value = get('pozn', '');
  $('zk-pozn').addEventListener('input', () => set('pozn', $('zk-pozn').value));

  function vykresli() {
    const hotovo = skupiny.reduce((a, g) => a + g.p.filter((x) => x.ok).length, 0);
    const celkem = skupiny.reduce((a, g) => a + g.p.length, 0);
    $('zk-postup').textContent = `Hotovo ${hotovo} z ${celkem}`;
    $('zk-seznam').innerHTML = skupiny.map((g, gi) =>
      `<h3 class="sub">${esc(g.n)}</h3><ul class="checklist">` +
      g.p.map((p, i) => `<li class="${p.ok ? 'done' : ''}"><label class="ck-l"><input type="checkbox" data-g="${gi}" data-i="${i}" ${p.ok ? 'checked' : ''}><span>${esc(p.t)}</span></label><button class="del" data-g="${gi}" data-del="${i}" aria-label="Smazat">✕</button></li>`).join('') +
      `</ul><div class="row"><input type="text" data-add="${gi}" placeholder="Přidat do skupiny…"><button class="secondary" data-addbtn="${gi}">Přidat</button></div>`
    ).join('');
  }
  const uloz = () => { set('seznam', skupiny); vykresli(); };

  $('zk-seznam').addEventListener('change', (e) => {
    const { g, i } = e.target.dataset; if (g === undefined || i === undefined) return;
    skupiny[g].p[i].ok = e.target.checked; uloz();
  });
  $('zk-seznam').addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { skupiny[d.dataset.g].p.splice(d.dataset.del, 1); uloz(); return; }
    const a = e.target.closest('[data-addbtn]');
    if (a) pridej(a.dataset.addbtn);
  });
  $('zk-seznam').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset.add !== undefined) pridej(e.target.dataset.add);
  });
  function pridej(gi) {
    const inp = $('zk-seznam').querySelector(`[data-add="${gi}"]`);
    const t = inp.value.trim(); if (!t) return;
    skupiny[gi].p.push({ t, ok: false }); uloz();
  }

  $('zk-reset').addEventListener('click', () => { skupiny.forEach((g) => g.p.forEach((p) => (p.ok = false))); uloz(); });
  $('zk-nova').addEventListener('click', () => {
    if (!confirm('Začít novou zakázku? Odškrtne se seznam a vymažou se údaje o zakázce.')) return;
    skupiny.forEach((g) => g.p.forEach((p) => (p.ok = false)));
    POLE.concat('zk-pozn').forEach((id) => { $(id).value = ''; set(id === 'zk-pozn' ? 'pozn' : id, ''); });
    uloz();
  });
  vykresli();
})();
