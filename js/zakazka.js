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
        'Vyhledat stroj – vyplňuje se v poli dole na stránce: {stroj} (Stroj).',
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
          'Najít řádek R23 = … + {rozt}. Hodnota před plusem je jen příklad a mění se, důležitá je korekce za plusem.',
          'Zjistit z předchozí zakázky, jak to má být, a přepsat do nové. Pokud je korekce jiná, přepsat ji.',
        ],
      },
      {
        t: 'Kontrola kužele díry a drsnosti (W_OTVHO1)',
        d: [
          'V programu DIRAHOT1 (SPF) najít řádek W_OTVHO1(…), např. W_OTVHO1(217.707,184.19,185.5,1,2,,,0.034,0.22,0.2,). Parametry se zobrazí přes Zpětný překlad.',
          'Zkontrolovat kužel díry: KONUS (_KO), u stroje {ko}.',
          'Zkontrolovat drsnost (posuv): POSUV (_F1) a POSUV RAD (_F2), u stroje {f1} a {f2}.',
        ],
      },
      {
        t: 'Spodní rádius díry – jen když je špatně napojený (W_SPRAD1)',
        d: [
          'Dělá se jen tehdy, když je rádius zespodu kola špatně napojený. Jinak bod přeskočit (odškrtnout).',
          'V programu W_OTVHO1 najít řádek W_SPRAD1 (spodní rádius díry) a otevřít ho přes Zpětný překlad – okno W_SRAD „Cyklus pro rozváděcí drážku a spodní rádius“ (softklávesa SPOD RAD.).',
          'Upravuje se VYSKA NABOJE _Z1 (na fotce 197.840).',
          'Když se délka ubere (_Z1 menší), zdvihne se dojezd – nástroj dojede výš.',
        ],
        f: ['spodni-radius-w-srad.jpg'],
      },
      {
        t: 'Kontrola VAR_DEF 1 a 2 (podpěrky, upnutí čelistí)',
        d: [
          'Zkontrolovat programy VAR_DEF_1 a VAR_DEF_2.',
          'Podpěrky („íčko“) jsou ve stejném programu (VAR_DEF): {podp} ({stroj}). Zjistit z předchozí zakázky, jak to má být, a přepsat do nové.',
          'Upnutí čelistí: Menu Select → Menu 1 → softklávesa Upínač. Čelisti se upnou na obrobek na nějakou hodnotu (Skutečná poloha). Od ní se nastavuje rozsah upnutí: minimum o 10 méně a maximum o 10 více, než na kolik se upnulo (pole „Dílec upnut“ – min. a max. mezní hodnota pro hlídání upínacího bodu; na fotce např. 219 a 239).',
          'Tyto hodnoty se zadávají do H2 a H3 v programu VAR_DEF (upnutí čelistí, max a min). Výpočet min a max je hned nad postupem.',
          'Rozepnutí: v obrazovce Upínač je i Otevřít upínač – H8 (min) a H9 (max), hranice k uložení dílu. Čelisti se rozepnou na skutečnou polohu (např. 99) a meze jsou ±10 kolem ní (90 a 110).',
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
        'Zkontrolovat OP_Step: {op} (první operace).',
        'Zkontrolovat Zero_Offset = {zero} (podložky).',
        'Zkontrolovat Chuck_Stat = {chuck} (čelisti).',
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
  // Přejmenované výchozí body: starý název → nový (jinak by starý zůstal jako vlastní bod navíc)
  const PREJMENOVANO = {
    'Úprava spodního rádiusu díry (W_SPRAD1)': 'Spodní rádius díry – jen když je špatně napojený (W_SPRAD1)',
  };
  const novyNazev = (t) => PREJMENOVANO[t] || t;
  const prejmenujSmazane = (a) => (a || []).map((k) => { const i = k.indexOf('|'); return k.slice(0, i + 1) + novyNazev(k.slice(i + 1)); });
  smazano = prejmenujSmazane(smazano);
  function slij(ulozene) {
    const vys = nove();
    const ok = new Map();
    ulozene = (ulozene || []).map((g) => ({ ...g, p: g.p.map((p) => ({ ...p, t: novyNazev(p.t) })) }));
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
    { sk: 'Rozteč', k: 'rozt', kr: 'Korekce R23 +', n: 'Korekce rozteče (R23 = … + korekce)', kde: 'PARAMDER' },
    { sk: 'Kužel díry', k: 'ko', kr: 'Konus _KO', n: 'Konus _KO', kde: 'DIRAHOT1 / W_OTVHO1' },
    { sk: 'Drsnost', k: 'r', kr: 'Rádius rε', n: 'Rádius nože rε [mm]', kde: 'nástroj' },
    { sk: 'Drsnost', k: 'f1', kr: 'Posuv _F1', n: 'Posuv _F1 [mm/ot]', kde: 'DIRAHOT1 / W_OTVHO1' },
    { sk: 'Drsnost', k: 'f2', kr: 'Posuv RAD _F2', n: 'Posuv RAD _F2 [mm/ot]', kde: 'DIRAHOT1 / W_OTVHO1' },
    { sk: 'Drsnost', k: 'ra', kr: 'Drsnost Ra', n: 'Drsnost Ra [µm]', kde: 'výkres' },
    { sk: 'Podpěrky', k: 'podp', kr: 'Podpěrky', n: 'Podpěrky („íčko“)', kde: 'VAR_DEF_1 / VAR_DEF_2' },
    { sk: 'Upnutí čelistí', k: 'cel', kr: 'Čelisti Ø', n: 'Rozsahy čelistí Spann-Ø (od-do; …)', kde: 'štítek na čelisti' },
    { sk: 'Upnutí čelistí', k: 'otv', kr: 'Otevření H8/H9', n: 'Rozsah otevření H8 / H9 (min a max)', kde: 'Upínač → Otevřít upínač (uložení dílu)' },
    { sk: 'Upnutí čelistí', k: 'upn', kr: 'Upnutí H2/H3', n: 'Rozsah upnutí H2 / H3 (max a min)', kde: 'VAR_DEF (skutečná poloha z Upínače)' },
    { sk: 'Uživatelská data', k: 'zero', kr: 'Zero_Offset', n: 'Zero_Offset', kde: 'Parametry → Uživatelská data' },
    { sk: 'Uživatelská data', k: 'chuck', kr: 'Chuck_Stat', n: 'Chuck_Stat', kde: 'Parametry → Uživatelská data' },
    { sk: 'Uživatelská data', k: 'op', kr: 'OP_Step', n: 'OP_Step', kde: 'Parametry → Uživatelská data' },
  ];
  // Které hodnoty stroje se ukážou u kterého bodu kontrolního seznamu
  const HODNOTY_U_BODU = {
    'Kontrola rozteče (PARAMDER)': ['rozt'],
    'Kontrola kužele díry a drsnosti (W_OTVHO1)': ['ko', 'f1', 'f2', 'r', 'ra'],
    'Kontrola VAR_DEF 1 a 2 (podpěrky, upnutí čelistí)': ['podp', 'upn', 'otv'],
    'Přepsat uživatelská data pro novou zakázku': ['zero', 'chuck', 'op'],
  };
  const ZAKLAD = [{ id: 'ches4', nazev: 'CHES4', h: { rozt: '0,01', ko: '0,034', r: '', f1: '0,22', f2: '0,2', ra: '', podp: '97,7', cel: '864-938; 1084-1158; 1304-1378', upn: '±10', otv: '±10', zero: '97,7', chuck: '0', op: '1' } }];
  let stroje = get('stroje', null) || JSON.parse(JSON.stringify(ZAKLAD));
  // CHES4 uložený starší verzí nemá novější pole – doplnit výchozí hodnoty (ne přepsat)
  const doplnStroje = (a) => { (a || []).forEach((x) => { x.h = x.h || {}; if (x.id === 'ches4') Object.keys(ZAKLAD[0].h).forEach((k) => { if (x.h[k] === undefined) x.h[k] = ZAKLAD[0].h[k]; }); }); return a; };
  doplnStroje(stroje);
  let strojAkt = get('strojAkt', stroje[0].id);
  const stroj = () => stroje.find((x) => x.id === strojAkt) || stroje[0];
  const cislo = (v) => parseFloat(String(v ?? '').replace(',', '.'));
  const f3 = (x) => x.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });

  const raText = (f, r) => (cislo(r) > 0 && cislo(f) > 0 ? `→ teoretická Ra ≈ ${f3(cislo(f) ** 2 / (32 * cislo(r)) * 1000)} µm` : '');
  let panelOtevren = false, hodnotyOtevreny = false;

  // Rozbalovací panel: stroje + tlačítko ＋, pod vybraným strojem jeho hodnoty (dají se rovnou upravit)
  function vykresliStroje(sPoli = true) {
    $('zk-stroj-btn').textContent = '🏭 ' + stroj().nazev + (panelOtevren ? ' ▴' : ' ▾'); // tlačítko ukazuje vybraný stroj
    $('zk-stroj-btn').classList.toggle('open', panelOtevren);
    $('zk-stroj-btn').setAttribute('aria-expanded', panelOtevren);
    $('zk-stroje-panel').hidden = !panelOtevren;
    $('zk-stroje-seznam').innerHTML = stroje.map((x) =>
      `<button type="button" class="zk-stroj${x.id === strojAkt && hodnotyOtevreny ? ' active' : ''}" data-stroj="${esc(x.id)}">${esc(x.nazev)} ${x.id === strojAkt && hodnotyOtevreny ? '▾' : '▸'}</button>`).join('') +
      '<button type="button" class="zk-stroj zk-plus" id="zk-plus" aria-label="Přidat stroj" title="Přidat stroj">＋</button>';
    $('zk-hodnoty').hidden = !hodnotyOtevreny;
    if (!sPoli || !hodnotyOtevreny) { aktualizujRa(); return; }
    const st = stroj();
    let html = `<label>Název stroje<input type="text" data-nazev value="${esc(st.nazev)}"></label>`, sk = '';
    PAR.forEach((d) => {
      if (d.sk !== sk) { sk = d.sk; html += `<h3 class="sub">${esc(sk)}</h3>`; }
      html += `<label>${esc(d.n)} <small class="zk-kde">${esc(d.kde)}</small><input type="text" data-par="${d.k}" value="${esc(st.h[d.k] || '')}"></label>`;
      if (d.k === 'f1' || d.k === 'f2') html += `<p class="hint zk-ra" id="zk-ra-${d.k}"></p>`;
      if (d.k === 'ra') html += '<button type="button" class="secondary zk-na-drs" id="zk-na-drs">🔬 Výpočet drsnosti (převezme rádius a posuv)</button>';
    });
    html += `<button type="button" class="secondary" id="zk-smazat-stroj"${stroje.length < 2 ? ' disabled' : ''}>🗑 Smazat stroj ${esc(st.nazev)}</button>`;
    $('zk-hodnoty').innerHTML = html;
    aktualizujRa();
  }
  function aktualizujRa() {
    const h = stroj().h;
    ['f1', 'f2'].forEach((k) => { const el = $('zk-ra-' + k); if (el) el.textContent = raText(h[k], h.r); });
  }

  $('zk-stroj-btn').addEventListener('click', () => { panelOtevren = !panelOtevren; vykresliStroje(); });
  $('zk-stroje-seznam').addEventListener('click', (e) => {
    if (e.target.closest('#zk-plus')) {
      $('zk-novy-radek').hidden = !$('zk-novy-radek').hidden;
      if (!$('zk-novy-radek').hidden) $('zk-novy').focus();
      return;
    }
    const b = e.target.closest('[data-stroj]'); if (!b) return;
    if (b.dataset.stroj === strojAkt) { hodnotyOtevreny = !hodnotyOtevreny; vykresliStroje(); return; }
    strojAkt = b.dataset.stroj; hodnotyOtevreny = true; zmena();
  });
  // úprava hodnoty – bez překreslení polí, aby se neztratil kurzor
  $('zk-hodnoty').addEventListener('change', (e) => {
    const st = stroj();
    if (e.target.dataset.par) st.h[e.target.dataset.par] = e.target.value.trim();
    else if (e.target.dataset.nazev !== undefined) { st.nazev = e.target.value.trim() || st.nazev; e.target.value = st.nazev; }
    else return;
    zmena(false);
  });
  $('zk-hodnoty').addEventListener('input', (e) => {
    if (e.target.dataset.par === 'r' || e.target.dataset.par === 'f1' || e.target.dataset.par === 'f2') {
      const h = { ...stroj().h, [e.target.dataset.par]: e.target.value };
      ['f1', 'f2'].forEach((k) => { const el = $('zk-ra-' + k); if (el) el.textContent = raText(h[k], h.r); });
    }
  });
  // Přejít na výpočet drsnosti a předvyplnit rádius, posuv _F1 a cílovou Ra vybraného stroje
  function naDrsnost() {
    const h = stroj().h, tecka = (v) => String(v ?? '').trim().replace(',', '.');
    const vypln = (id, v) => { const el = $(id); if (el && tecka(v)) { el.value = tecka(v); el.dispatchEvent(new Event('input')); } };
    vypln('dr-re', h.r); vypln('dr-f', h.f1); vypln('dr-re2', h.r); vypln('dr-ra', h.ra);
    location.hash = 'drsnost'; // app.js otevře výpočet a kotvu z adresy zase smaže
  }
  $('zk-hodnoty').addEventListener('click', (e) => {
    if (e.target.id === 'zk-na-drs') { naDrsnost(); return; }
    if (e.target.id !== 'zk-smazat-stroj' || stroje.length < 2) return;
    const st = stroj();
    if (!confirm(`Smazat stroj ${st.nazev} i s jeho hodnotami? (Jde vrátit tlačítkem ↶ Zpět.)`)) return;
    stroje = stroje.filter((x) => x.id !== st.id); strojAkt = stroje[0].id; hodnotyOtevreny = false;
    zmena();
  });
  function pridejStroj() {
    const n = $('zk-novy').value.trim(); if (!n) return;
    const id = 's' + Date.now();
    stroje.push({ id, nazev: n, h: {} });
    strojAkt = id; hodnotyOtevreny = true;
    $('zk-novy').value = ''; $('zk-novy-radek').hidden = true;
    zmena();
  }
  $('zk-novy-pridat').addEventListener('click', pridejStroj);
  $('zk-novy').addEventListener('keydown', (e) => { if (e.key === 'Enter') pridejStroj(); });

  /* ---------- Krok zpět / dopředu ---------- */
  // Pamatuje se seznam (odškrtnutí, smazané a přidané body) a stroje s hodnotami. Poznámka má vlastní pojistku.
  const MAX_KROKU = 40;
  const stav = () => JSON.stringify({
    s: skupiny.map((g) => ({ n: g.n, p: g.p.map((p) => ({ t: p.t, ok: p.ok })) })),
    smazano, stroje, strojAkt,
  });
  let zpet = get('zpet', []), vpred = get('vpred', []), posledni = stav();
  function ulozVse(sPoli = true) {
    set('seznam2', skupiny); set('smazano', smazano); set('stroje', stroje); set('strojAkt', strojAkt);
    set('zpet', zpet); set('vpred', vpred);
    $('zk-zpet').disabled = !zpet.length; $('zk-vpred').disabled = !vpred.length;
    vykresli(); vykresliStroje(sPoli);
  }
  function zmena(sPoli = true) {
    const ted = stav();
    if (ted !== posledni) { zpet.push(posledni); zpet = zpet.slice(-MAX_KROKU); vpred = []; posledni = ted; }
    ulozVse(sPoli);
  }
  function nastav(json) {
    const z = JSON.parse(json);
    smazano = prejmenujSmazane(z.smazano); skupiny = slij(z.s); stroje = doplnStroje(z.stroje); strojAkt = z.strojAkt;
    posledni = json; ulozVse();
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
  // {klic} v textu postupu → hodnota vybraného stroje (zvýrazněná), {stroj} → název stroje
  function hodnotyVTextu(t) {
    const st = stroj();
    return t.replace(/\{(\w+)\}/g, (m, k) => {
      const v = k === 'stroj' ? st.nazev : st.h[k];
      return `<b class="zk-tok">${v ? esc(v) : '–'}</b>`;
    });
  }
  // Výpočet rozsahu upnutí čelistí: skutečná poloha ± rozsah ze stroje (např. ±10)
  const rozsahPar = (k) => Math.abs(cislo(String(stroj().h[k] || '10').replace('±', ''))) || 10;
  // na stroji je střed zřejmě zaokrouhlený na pětky (173 → 165/185, 99 → 90/110)
  const zaokr = (p, r) => { const c = Math.round(p / 5) * 5; return c === p ? '' : `<br><small>se středem zaokrouhleným na 5 (${f3(c)}): ${f3(c - r)} / ${f3(c + r)}</small>`; };
  function upnutiText(x) {
    const p = cislo(x), r = rozsahPar('upn');
    if (!Number.isFinite(p)) return 'Upnuto: zadej skutečnou polohu z obrazovky Upínač.';
    return `Upnuto: min <b>${f3(p - r)}</b> · max <b>${f3(p + r)}</b> → H2 a H3 ve VAR_DEF (±${f3(r)})${zaokr(p, r)}`;
  }
  function otevreniText(x) {
    const p = cislo(x), r = rozsahPar('otv');
    if (!Number.isFinite(p)) return 'Rozepnuto: zadej skutečnou polohu při rozepnutí.';
    return `Rozepnuto: min <b>${f3(p - r)}</b> · max <b>${f3(p + r)}</b> → H8 a H9 (±${f3(r)})${zaokr(p, r)}`;
  }
  /* Záznamy upnutí (Ø obrobku → skutečná poloha) u stroje, ze kterých se hledá vztah polohy a průměru */
  const rozsahyCel = () => [...String(stroj().h.cel || '').matchAll(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/g)].map((m) => [cislo(m[1]), cislo(m[2])]);
  const rozsahPro = (d) => rozsahyCel().find(([a, b]) => d >= a && d <= b) || null;
  const nazevRozsahu = (r) => (r ? `Ø ${f3(r[0])}–${f3(r[1])}` : 'mimo rozsahy čelistí');
  // přímka metodou nejmenších čtverců: poloha = a + b·Ø
  function primka(body) {
    const n = body.length; if (n < 2) return null;
    const mx = body.reduce((s, x) => s + x.d, 0) / n, my = body.reduce((s, x) => s + x.p, 0) / n;
    const sxx = body.reduce((s, x) => s + (x.d - mx) ** 2, 0); if (sxx === 0) return null;
    const b = body.reduce((s, x) => s + (x.d - mx) * (x.p - my), 0) / sxx, a = my - b * mx;
    const odch = Math.max(...body.map((x) => Math.abs(x.p - (a + b * x.d))));
    return { a, b, odch };
  }
  const zaznamy = () => stroj().upnZ || [];
  const telesoRozsahu = (d) => { const r = rozsahPro(d); return zaznamy().filter((z) => JSON.stringify(rozsahPro(z.d)) === JSON.stringify(r)); };
  function odhadText(dv) {
    const d = cislo(dv); if (!Number.isFinite(d)) return 'Zadej průměr – odhadne se skutečná poloha podle záznamů.';
    const body = telesoRozsahu(d), r = rozsahPro(d), pr = primka(body);
    if (!pr) return `${nazevRozsahu(r)}: potřeba aspoň 2 záznamy s různým Ø v tomto rozsahu (teď ${body.length}).`;
    const p = pr.a + pr.b * d, roz = Math.abs(cislo(String(stroj().h.upn || '10').replace('±', ''))) || 10;
    return `${nazevRozsahu(r)}: poloha ≈ <b>${f3(p)}</b> → H2/H3 ≈ ${f3(p - roz)} / ${f3(p + roz)}<br><small>${f3(pr.b)} na 1 mm Ø · z ${body.length} záznamů · největší odchylka ${f3(pr.odch)}</small>`;
  }
  function upnutiBlok() {
    const x = get('poloha', ''), dv = get('prumer', ''), xo = get('polohaOtv', ''), z = zaznamy();
    const radky = z.map((r, i) => `<li><span>Ø <b>${f3(r.d)}</b> → upnuto <b>${f3(r.p)}</b>${Number.isFinite(r.o) ? ` · rozepnuto <b>${f3(r.o)}</b>` : ''} <small>${esc(nazevRozsahu(rozsahPro(r.d)))} · ${new Date(r.t).toLocaleDateString('cs-CZ')}</small></span><button type="button" class="del" data-upn-del="${i}" aria-label="Smazat záznam">✕</button></li>`).join('');
    return `<div class="zk-upn">` +
      `<div class="zk-upn-g"><label>Ø upnutí obrobku<input type="text" inputmode="decimal" id="zk-prumer" value="${esc(dv)}" placeholder="např. 926"></label>` +
      `<label>Skutečná poloha (Upínač)<input type="text" inputmode="decimal" id="zk-poloha" value="${esc(x)}" placeholder="např. 173"></label></div>` +
      `<p class="zk-upn-v" id="zk-upn-v">${upnutiText(x)}</p>` +
      `<label>Skutečná poloha při rozepnutí<input type="text" inputmode="decimal" id="zk-poloha-otv" value="${esc(xo)}" placeholder="např. 99"></label>` +
      `<p class="zk-upn-v" id="zk-otv-v">${otevreniText(xo)}</p>` +
      `<button type="button" class="secondary" id="zk-upn-ulozit">💾 Zaznamenat Ø a polohu</button>` +
      `<details class="zk-upn-z"${z.length ? '' : ''}><summary>📈 Záznamy upnutí – ${esc(stroj().nazev)} (${z.length})</summary>` +
      `<p class="hint">Ze záznamů se v každém rozsahu čelistí hledá přímka poloha ↔ průměr. Rozsahy čelistí se nastaví u stroje.</p>` +
      `<label>Odhad polohy pro Ø<input type="text" inputmode="decimal" id="zk-odhad-d" placeholder="Ø nového obrobku"></label><p class="zk-upn-v" id="zk-odhad-v">${odhadText('')}</p>` +
      (radky ? `<ul class="zk-upn-sez">${radky}</ul>` : '<p class="hint">Zatím žádné záznamy.</p>') +
      `</details></div>`;
  }
  // řádek s hodnotami vybraného stroje pod bodem (klepnutím se otevřou hodnoty stroje)
  function hodnotyBodu(t) {
    const kl = HODNOTY_U_BODU[t]; if (!kl) return '';
    const st = stroj();
    const pol = kl.map((k) => {
      const d = PAR.find((x) => x.k === k), v = st.h[k];
      return `<span class="zk-hb">${esc(d.kr)} <b>${v ? esc(v) : '–'}</b></span>`;
    }).join('');
    return `<button type="button" class="zk-hodn" data-ukaz-stroj title="Upravit hodnoty stroje"><span class="zk-hs">🏭 ${esc(st.nazev)}</span>${pol}</button>` +
      (kl.includes('upn') ? upnutiBlok() : '');
  }
  function vykresli() {
    const hotovo = skupiny.reduce((a, g) => a + g.p.filter((x) => x.ok).length, 0);
    const celkem = skupiny.reduce((a, g) => a + g.p.length, 0);
    $('zk-postup').textContent = `Hotovo ${hotovo} z ${celkem}`;
    $('zk-seznam').innerHTML = skupiny.map((g, gi) =>
      `<h3 class="sub">${esc(g.n)}</h3><ul class="checklist">` +
      g.p.map((p, i) => `<li class="${p.ok ? 'done' : ''}${p.d ? ' has-d' : ''}"><label class="ck-l"><input type="checkbox" data-g="${gi}" data-i="${i}" ${p.ok ? 'checked' : ''}><span>${esc(p.t)}</span></label><button class="del" data-g="${gi}" data-del="${i}" aria-label="Smazat">✕</button>${hodnotyBodu(p.t)}${p.d ? `<details class="zk-d"><summary>Postup</summary><ol>${p.d.map((k) => `<li>${hodnotyVTextu(esc(k))}</li>`).join('')}</ol>${(p.f || []).map((f) => `<a href="img/${esc(f)}" target="_blank" rel="noopener"><img class="zk-foto" src="img/${esc(f)}" loading="lazy" alt="${esc(p.t)}"></a>`).join('')}</details>` : ''}</li>`).join('') +
      '</ul>'
    ).join('');
  }

  $('zk-seznam').addEventListener('input', (e) => {
    if (e.target.id === 'zk-poloha') { set('poloha', e.target.value); $('zk-upn-v').innerHTML = upnutiText(e.target.value); }
    else if (e.target.id === 'zk-prumer') set('prumer', e.target.value);
    else if (e.target.id === 'zk-poloha-otv') { set('polohaOtv', e.target.value); $('zk-otv-v').innerHTML = otevreniText(e.target.value); }
    else if (e.target.id === 'zk-odhad-d') $('zk-odhad-v').innerHTML = odhadText(e.target.value);
  });
  $('zk-seznam').addEventListener('change', (e) => {
    const { g, i } = e.target.dataset; if (g === undefined || i === undefined) return;
    skupiny[g].p[i].ok = e.target.checked; zmena();
  });
  $('zk-seznam').addEventListener('click', (e) => {
    if (e.target.id === 'zk-upn-ulozit') {
      const d = cislo($('zk-prumer').value), pp = cislo($('zk-poloha').value);
      if (!Number.isFinite(d) || !Number.isFinite(pp)) { alert('Vyplň průměr upnutí i skutečnou polohu.'); return; }
      const o = cislo($('zk-poloha-otv').value);
      const st = stroj(); st.upnZ = [...(st.upnZ || []), { d, p: pp, ...(Number.isFinite(o) ? { o } : {}), t: Date.now() }];
      zmena(); document.querySelector('.zk-upn-z')?.setAttribute('open', ''); return;
    }
    const ud = e.target.closest('[data-upn-del]');
    if (ud) {
      const st = stroj(); if (!confirm('Smazat tento záznam upnutí? (Jde vrátit tlačítkem ↶ Zpět.)')) return;
      st.upnZ = (st.upnZ || []).filter((_, i) => i !== +ud.dataset.upnDel);
      zmena(); document.querySelector('.zk-upn-z')?.setAttribute('open', ''); return;
    }
    if (e.target.closest('[data-ukaz-stroj]')) {
      panelOtevren = true; hodnotyOtevreny = true; vykresliStroje();
      $('zk-stroje-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const d = e.target.closest('[data-del]');
    if (d) {
      const g = skupiny[d.dataset.g], p = g.p[d.dataset.del];
      if (VYCHOZI.some(([n, ps]) => n === g.n && ps.some((x) => x.t === p.t))) smazano.push(g.n + '|' + p.t);
      g.p.splice(d.dataset.del, 1); zmena(); return;
    }
  });

  // Obnovit vše: odškrtnout, vrátit smazané body, vymazat poznámku. Vlastní body a stroje zůstanou.
  $('zk-nova').addEventListener('click', () => {
    if (!confirm('Nová zakázka – obnovit vše?\nOdškrtne se seznam, vrátí se smazané body, vymaže se poznámka, Ø a polohy čelistí (záznamy upnutí zůstanou).\n(Seznam jde vrátit tlačítkem ↶ Zpět, poznámku tlačítkem „Vrátit smazaný text“.)')) return;
    if ($('zk-pozn').value.trim()) { try { localStorage.setItem('bona.smazanyText.zakazka', $('zk-pozn').value); } catch { /* nedostupné */ } }
    smazano = [];
    skupiny = slij(skupiny);
    skupiny.forEach((g) => g.p.forEach((p) => (p.ok = false)));
    $('zk-pozn').value = ''; set('pozn', ''); set('poloha', ''); set('prumer', ''); set('polohaOtv', '');
    stavPozn(); $('zk-pozn-box').open = false; pojistka?.obnov();
    zmena();
  });
  ulozVse();
})();
