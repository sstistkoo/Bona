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
      f: ['prehled-programu.jpg'],
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
          'V programu DIRAHOT1 (SPF) najít řádek W_OTVHO1(…), např. W_OTVHO1(217.707,184.19,185.5,1,2,,,0.034,0.22,0.2,). Parametry se zobrazí přes Zpětný překlad.',
          'Zkontrolovat kužel díry: KONUS (_KO), v příkladu 0.034.',
          'Zkontrolovat drsnost (posuv): POSUV (_F1) a POSUV RAD (_F2), v příkladu 0.22 a 0.2.',
        ],
      },
      {
        t: 'Kontrola VAR_DEF 1 a 2 (podpěrky, upnutí čelistí)',
        d: [
          'Zkontrolovat programy VAR_DEF_1 a VAR_DEF_2.',
          'Podpěrky („íčko“) jsou ve stejném programu (VAR_DEF): 97,7 (CHES4). Zjistit z předchozí zakázky, jak to má být, a přepsat do nové.',
          'Upnutí čelistí: Menu Select → Menu 1 → softklávesa Upínač. Čelisti se upnou na obrobek na nějakou hodnotu (Skutečná poloha). Od ní se nastavuje rozsah upnutí: minimum o 10 méně a maximum o 10 více, než na kolik se upnulo (pole „Dílec upnut“ – min. a max. mezní hodnota pro hlídání upínacího bodu; na fotce např. 219 a 239).',
          'Tyto hodnoty se zadávají do H2 a H3 v programu VAR_DEF (upnutí čelistí, max a min). Postup upnutí ještě upřesnit.',
        ],
        f: ['upinac-menu1.jpg'],
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
        'Nakonec: Program → softklávesa Obrobky → označit program → Nahrát HD → NC.',
      ],
      f: ['prehled-programu.jpg'],
    }]],
  ];
  const nove = () => VYCHOZI.map(([n, p]) => ({ n, p: p.map((x) => ({ t: x.t, d: x.d, f: x.f, ok: false })) }));
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

  /* ---------- Stroje a hodnoty pro nastavování ---------- */
  // sk = skupina, k = klíč, n = název, kde = kde se hodnota najde ve stroji
  const PAR = [
    { sk: 'Rozteč', k: 'rozt', n: 'Korekce rozteče (R23 = … + korekce)', kde: 'PARAMDER' },
    { sk: 'Kužel díry', k: 'ko', n: 'Konus _KO', kde: 'DIRAHOT1 / W_OTVHO1' },
    { sk: 'Drsnost', k: 'r', n: 'Rádius nože rε [mm]', kde: 'nástroj' },
    { sk: 'Drsnost', k: 'f1', n: 'Posuv _F1 [mm/ot]', kde: 'DIRAHOT1 / W_OTVHO1' },
    { sk: 'Drsnost', k: 'f2', n: 'Posuv RAD _F2 [mm/ot]', kde: 'DIRAHOT1 / W_OTVHO1' },
    { sk: 'Drsnost', k: 'ra', n: 'Drsnost Ra [µm]', kde: 'výkres' },
    { sk: 'Podpěrky', k: 'podp', n: 'Podpěrky („íčko“)', kde: 'VAR_DEF_1 / VAR_DEF_2' },
    { sk: 'Upnutí čelistí', k: 'upn', n: 'Rozsah upnutí H2 / H3 (max a min)', kde: 'VAR_DEF (skutečná poloha z Upínače)' },
    { sk: 'Uživatelská data', k: 'zero', n: 'Zero_Offset', kde: 'Parametry → Uživatelská data' },
    { sk: 'Uživatelská data', k: 'chuck', n: 'Chuck_Stat', kde: 'Parametry → Uživatelská data' },
    { sk: 'Uživatelská data', k: 'op', n: 'OP_Step', kde: 'Parametry → Uživatelská data' },
  ];
  const ZAKLAD = [{ id: 'ches4', nazev: 'CHES4', h: { rozt: '0,01', ko: '0,034', r: '', f1: '0,22', f2: '0,2', ra: '', podp: '97,7', upn: '±10', zero: '97,7', chuck: '0', op: '1' } }];
  let stroje = get('stroje', null) || JSON.parse(JSON.stringify(ZAKLAD));
  let strojAkt = get('strojAkt', stroje[0].id);
  const stroj = () => stroje.find((x) => x.id === strojAkt) || stroje[0];
  const cislo = (v) => parseFloat(String(v ?? '').replace(',', '.'));
  const f3 = (x) => x.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });

  function vykresliHodnoty() {
    const st = stroj();
    $('zk-stroj-nazev').textContent = st.nazev;
    $('zk-par-nadpis').textContent = 'Hodnoty pro ' + st.nazev;
    let html = '', sk = '';
    PAR.forEach((d) => {
      if (d.sk !== sk) { sk = d.sk; html += `<h3 class="sub">${esc(sk)}</h3>`; }
      const v = st.h[d.k];
      html += `<div class="zk-par"><span class="zk-par-n">${esc(d.n)}<small>${esc(d.kde)}</small></span><b>${v ? esc(v) : '–'}</b></div>`;
      // teoretická drsnost z posuvu a rádiusu: Ra ≈ f² / (32·rε)
      if ((d.k === 'f1' || d.k === 'f2') && cislo(st.h.r) > 0 && cislo(v) > 0) {
        html += `<p class="hint zk-ra">→ teoretická Ra ≈ ${f3(cislo(v) ** 2 / (32 * cislo(st.h.r)) * 1000)} µm</p>`;
      }
    });
    $('zk-parametry').innerHTML = html;
  }

  /* Okno (modal) se stroji */
  function vykresliModal() {
    const st = stroj();
    $('zkm-stroje').innerHTML = stroje.map((x) => `<button type="button" class="seg-btn${x.id === st.id ? ' active' : ''}" data-stroj="${esc(x.id)}">${esc(x.nazev)}</button>`).join('');
    let html = `<label>Název stroje<input type="text" data-nazev value="${esc(st.nazev)}"></label>`, sk = '';
    PAR.forEach((d) => {
      if (d.sk !== sk) { sk = d.sk; html += `<h3 class="sub">${esc(sk)}</h3>`; }
      html += `<label>${esc(d.n)} <small class="zk-kde">${esc(d.kde)}</small><input type="text" inputmode="decimal" data-par="${d.k}" value="${esc(st.h[d.k] || '')}"></label>`;
    });
    $('zkm-pole').innerHTML = html;
    $('zkm-smazat').textContent = '🗑 Smazat stroj ' + st.nazev;
    $('zkm-smazat').disabled = stroje.length < 2;
  }
  const otevriModal = () => { vykresliModal(); $('zk-modal').hidden = false; document.body.classList.add('zk-modal-on'); };
  const zavriModal = () => { $('zk-modal').hidden = true; document.body.classList.remove('zk-modal-on'); };
  $('zk-stroj-btn').addEventListener('click', otevriModal);
  $('zk-parametry').addEventListener('click', otevriModal);
  $('zkm-zavrit').addEventListener('click', zavriModal);
  $('zkm-hotovo').addEventListener('click', zavriModal);
  $('zk-modal').addEventListener('click', (e) => { if (e.target.id === 'zk-modal') zavriModal(); });
  $('zkm-stroje').addEventListener('click', (e) => {
    const b = e.target.closest('[data-stroj]'); if (!b) return;
    strojAkt = b.dataset.stroj; zmena(); vykresliModal();
  });
  $('zkm-pole').addEventListener('change', (e) => {
    const st = stroj();
    if (e.target.dataset.par) st.h[e.target.dataset.par] = e.target.value.trim();
    else if (e.target.dataset.nazev !== undefined) st.nazev = e.target.value.trim() || st.nazev;
    zmena(); vykresliModal();
  });
  function pridejStroj() {
    const n = $('zkm-novy').value.trim(); if (!n) return;
    const id = 's' + Date.now();
    stroje.push({ id, nazev: n, h: {} });
    strojAkt = id; $('zkm-novy').value = ''; zmena(); vykresliModal();
  }
  $('zkm-pridat').addEventListener('click', pridejStroj);
  $('zkm-novy').addEventListener('keydown', (e) => { if (e.key === 'Enter') pridejStroj(); });
  $('zkm-smazat').addEventListener('click', () => {
    if (stroje.length < 2) return;
    const st = stroj();
    if (!confirm(`Smazat stroj ${st.nazev} i s jeho hodnotami? (Jde vrátit tlačítkem ↶ Zpět.)`)) return;
    stroje = stroje.filter((x) => x.id !== st.id); strojAkt = stroje[0].id;
    zmena(); vykresliModal();
  });

  /* ---------- Krok zpět / dopředu ---------- */
  // Pamatuje se seznam (odškrtnutí, smazané a přidané body) a stroje s hodnotami. Poznámka má vlastní pojistku.
  const MAX_KROKU = 40;
  const stav = () => JSON.stringify({
    s: skupiny.map((g) => ({ n: g.n, p: g.p.map((p) => ({ t: p.t, ok: p.ok })) })),
    smazano, stroje, strojAkt,
  });
  let zpet = get('zpet', []), vpred = get('vpred', []), posledni = stav();
  function ulozVse() {
    set('seznam2', skupiny); set('smazano', smazano); set('stroje', stroje); set('strojAkt', strojAkt);
    set('zpet', zpet); set('vpred', vpred);
    $('zk-zpet').disabled = !zpet.length; $('zk-vpred').disabled = !vpred.length;
    vykresli(); vykresliHodnoty();
  }
  function zmena() {
    const ted = stav();
    if (ted !== posledni) { zpet.push(posledni); zpet = zpet.slice(-MAX_KROKU); vpred = []; posledni = ted; }
    ulozVse();
  }
  function nastav(json) {
    const z = JSON.parse(json);
    smazano = z.smazano || []; skupiny = slij(z.s); stroje = z.stroje; strojAkt = z.strojAkt;
    posledni = json; ulozVse();
    if (!$('zk-modal').hidden) vykresliModal();
  }
  $('zk-zpet').addEventListener('click', () => { if (!zpet.length) return; vpred.push(posledni); nastav(zpet.pop()); });
  $('zk-vpred').addEventListener('click', () => { if (!vpred.length) return; zpet.push(posledni); nastav(vpred.pop()); });

  /* ---------- Poznámka k zakázce ---------- */
  // Poznámka je v rozbalovací záložce; když je prázdná, zůstane sbalená.
  const stavPozn = () => {
    $('zk-pozn-stav').textContent = $('zk-pozn').value.trim() ? '· vyplněno' : '';
  };
  $('zk-pozn').value = get('pozn', '');
  $('zk-pozn-box').open = !!$('zk-pozn').value.trim();
  stavPozn();
  $('zk-pozn').addEventListener('input', () => { set('pozn', $('zk-pozn').value); stavPozn(); });
  const pojistka = window.hlidejText?.($('zk-pozn'), () => 'zakazka');

  /* ---------- Kontrolní seznam ---------- */
  function vykresli() {
    const hotovo = skupiny.reduce((a, g) => a + g.p.filter((x) => x.ok).length, 0);
    const celkem = skupiny.reduce((a, g) => a + g.p.length, 0);
    $('zk-postup').textContent = `Hotovo ${hotovo} z ${celkem}`;
    $('zk-seznam').innerHTML = skupiny.map((g, gi) =>
      `<h3 class="sub">${esc(g.n)}</h3><ul class="checklist">` +
      g.p.map((p, i) => `<li class="${p.ok ? 'done' : ''}${p.d ? ' has-d' : ''}"><label class="ck-l"><input type="checkbox" data-g="${gi}" data-i="${i}" ${p.ok ? 'checked' : ''}><span>${esc(p.t)}</span></label><button class="del" data-g="${gi}" data-del="${i}" aria-label="Smazat">✕</button>${p.d ? `<details class="zk-d"><summary>Postup</summary><ol>${p.d.map((k) => `<li>${esc(k)}</li>`).join('')}</ol>${(p.f || []).map((f) => `<a href="img/${esc(f)}" target="_blank" rel="noopener"><img class="zk-foto" src="img/${esc(f)}" loading="lazy" alt="${esc(p.t)}"></a>`).join('')}</details>` : ''}</li>`).join('') +
      `</ul><div class="row"><input type="text" data-add="${gi}" placeholder="Přidat do skupiny…"><button class="secondary" data-addbtn="${gi}">Přidat</button></div>`
    ).join('');
  }

  $('zk-seznam').addEventListener('change', (e) => {
    const { g, i } = e.target.dataset; if (g === undefined || i === undefined) return;
    skupiny[g].p[i].ok = e.target.checked; zmena();
  });
  $('zk-seznam').addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]');
    if (d) {
      const g = skupiny[d.dataset.g], p = g.p[d.dataset.del];
      if (VYCHOZI.some(([n, ps]) => n === g.n && ps.some((x) => x.t === p.t))) smazano.push(g.n + '|' + p.t);
      g.p.splice(d.dataset.del, 1); zmena(); return;
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
    skupiny[gi].p.push({ t, ok: false }); zmena();
  }

  // Obnovit vše: odškrtnout, vrátit smazané body, vymazat poznámku. Vlastní body a stroje zůstanou.
  $('zk-nova').addEventListener('click', () => {
    if (!confirm('Nová zakázka – obnovit vše?\nOdškrtne se seznam, vrátí se smazané body a vymaže se poznámka.\n(Seznam jde vrátit tlačítkem ↶ Zpět, poznámku tlačítkem „Vrátit smazaný text“.)')) return;
    if ($('zk-pozn').value.trim()) { try { localStorage.setItem('bona.smazanyText.zakazka', $('zk-pozn').value); } catch { /* nedostupné */ } }
    smazano = [];
    skupiny = slij(skupiny);
    skupiny.forEach((g) => g.p.forEach((p) => (p.ok = false)));
    $('zk-pozn').value = ''; set('pozn', '');
    stavPozn(); $('zk-pozn-box').open = false; pojistka?.obnov();
    zmena();
  });
  ulozVse();
})();
