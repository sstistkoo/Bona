'use strict';
// Chystání na novou zakázku – kontrolní seznam po skupinách (upravitelný) + údaje o zakázce. Ukládá se v prohlížeči.

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = (k, d) => { try { const v = localStorage.getItem('bona.zak.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem('bona.zak.' + k, JSON.stringify(v)); } catch { /* nedostupné */ } };

  // Výchozí seznam = postup z poznámek obsluhy. Položka může mít kroky (d), které se rozbalí.
  const VYCHOZI = [
    ['PC – program', [{
      t: 'Nahrát program z PC (CIMCO Edit) do stroje',
      d: [
        'Na PC otevřít CIMCO Edit.',
        'Záložka Databáze → Průzkumník (modrá ikona databáze s lupou).',
        'Vyhledat program podle čísla programu (u každé zakázky jiné).',
        'Vyhledat stroj – vyplňuje se v poli dole na stránce: CHES4 (Stroj).',
        'Odeslat – modrá šipka nahoru ve skupině Přenos, nebo pravým tlačítkem myši na program → Odeslat.',
      ],
    }]],
    ['Stroj – program', [{
      t: 'Nahrát program ve stroji (CIMCO) a navolit ho',
      d: [
        'Menu Select → Program (správa programů) → softklávesa CIMCO.',
        'Otevřít složku Down – je v ní program odeslaný z PC. Zatím je jen přijatý, v paměti stroje ještě není. (Složka Up je opačně: sem se dává program, který se má poslat do PC.)',
        'Označit program → Kopírovat → softklávesa Obrobky → Vložit (Kopírovat a Vložit jsou softklávesy vpravo).',
        'V Obrobky (Přehled programů) označit starý program, který má křížek X ve sloupci Zaveden → Odložit NC → HD. Křížek zmizí.',
        'Označit nový program → Nahrát HD → NC. Tím se navolí jako program, který se bude jet. U programu se objeví křížek X ve sloupci Zaveden.',
      ],
    }]],
    ['Seřizování – kontrola parametrů', [
      {
        t: 'Kontrola rozteče (PARAMDER)',
        d: [
          'Otevřít program PARAMDER (zůstává z předchozí zakázky).',
          'Najít řádek R23 = … + 0,01. Hodnota před plusem je jen příklad a mění se, důležitá je korekce za plusem.',
          'Zjistit z předchozí zakázky, jak to má být, a přepsat do nové. Pokud je korekce jiná, přepsat ji.',
        ],
      },
      {
        t: 'Kontrola kužele díry a drsnosti (W_OTVHO1)',
        d: [
          'V programu DIRAHOT1 (SPF) najít řádek W_OTVHO1(…), např. W_OTVHO1(217.707,184.19,185.5,1,2,,,0.034,0.22,0.2,).',
          'Zkontrolovat kužel díry.',
          'Zkontrolovat drsnost (posuv).',
        ],
      },
      {
        t: 'Kontrola VAR_DEF 1 a 2 (podpěrky, upnutí čelistí)',
        d: [
          'Zkontrolovat programy VAR_DEF_1 a VAR_DEF_2.',
          'Podpěrky („íčko“): 97,7 (CHES4). Zjistit z předchozí zakázky, jak to má být, a přepsat do nové.',
          'H2 a H3 v programu = upnutí čelistí, max a min (rozsah).',
          'Upínání: Menu Select → Menu 1, upínání −10 / +10 od skutečné.',
        ],
      },
    ]],
    ['Přepsání programu (nová zakázka)', [{
      t: 'Přepsat uživatelská data pro novou zakázku',
      d: [
        'Číslo programu se přepisuje na čtyřech místech.',
        'Menu Select → Parametry → Uživatelská data.',
        'Name_OF_Workpiece: přepsat na číslo programu nové zakázky (např. 155540, u každé zakázky jiné).',
        'Name_OF_TYPE: přepsat na stejné číslo programu.',
        'Zkontrolovat OP_Step: 1 (první operace).',
        'Zkontrolovat Zero_Offset = 97,7 (podložky).',
        'Zkontrolovat Chuck_Stat = 0 (čelisti).',
        'Na ovládacím panelu stisknout tlačítko upínač osazení (obrázek čelistí, vpravo vedle tlačítka C3).',
        'Na obrazovce Upínač osazení zadat číslo programu na dvou místech: první řádek seznamu „Nahlášené typy obrobku“ a pole „aktuální typ“ (třetí a čtvrté místo).',
      ],
    }]],
  ];
  const nove = () => VYCHOZI.map(([n, p]) => ({ n, p: p.map((x) => ({ t: x.t, d: x.d, ok: false })) }));
  // Kroky (d) a výchozí body se berou z kódu, aby se opravy projevily i v už uloženém seznamu.
  // Ukládá se jen odškrtnutí, vlastní body a smazané výchozí body.
  let smazano = get('smazano', []);
  function slij(ulozene) {
    const vys = nove();
    const ok = new Map();
    (ulozene || []).forEach((g) => g.p.forEach((p) => ok.set(g.n + '|' + p.t, p.ok)));
    vys.forEach((g) => {
      g.p = g.p.filter((p) => !smazano.includes(g.n + '|' + p.t));
      g.p.forEach((p) => { p.ok = ok.get(g.n + '|' + p.t) || false; });
    });
    (ulozene || []).forEach((g) => g.p.forEach((p) => {
      if (vys.some((v) => v.p.some((x) => v.n === g.n && x.t === p.t))) return;
      if (VYCHOZI.some(([n, ps]) => n === g.n && ps.some((x) => x.t === p.t))) return;
      let cil = vys.find((v) => v.n === g.n);
      if (!cil) vys.push((cil = { n: g.n, p: [] }));
      cil.p.push({ t: p.t, ok: p.ok });
    }));
    return vys;
  }
  let skupiny = slij(get('seznam2', null));

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
      g.p.map((p, i) => `<li class="${p.ok ? 'done' : ''}${p.d ? ' has-d' : ''}"><label class="ck-l"><input type="checkbox" data-g="${gi}" data-i="${i}" ${p.ok ? 'checked' : ''}><span>${esc(p.t)}</span></label><button class="del" data-g="${gi}" data-del="${i}" aria-label="Smazat">✕</button>${p.d ? `<details class="zk-d"><summary>Postup</summary><ol>${p.d.map((k) => `<li>${esc(k)}</li>`).join('')}</ol></details>` : ''}</li>`).join('') +
      `</ul><div class="row"><input type="text" data-add="${gi}" placeholder="Přidat do skupiny…"><button class="secondary" data-addbtn="${gi}">Přidat</button></div>`
    ).join('');
  }
  const uloz = () => { set('seznam2', skupiny); vykresli(); };

  $('zk-seznam').addEventListener('change', (e) => {
    const { g, i } = e.target.dataset; if (g === undefined || i === undefined) return;
    skupiny[g].p[i].ok = e.target.checked; uloz();
  });
  $('zk-seznam').addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]');
    if (d) {
      const g = skupiny[d.dataset.g], p = g.p[d.dataset.del];
      if (VYCHOZI.some(([n, ps]) => n === g.n && ps.some((x) => x.t === p.t))) { smazano.push(g.n + '|' + p.t); set('smazano', smazano); }
      g.p.splice(d.dataset.del, 1); uloz(); return;
    }
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
