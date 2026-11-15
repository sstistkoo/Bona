'use strict';
// Tolerance, Kužel, Drsnost, Trigonometrie a Kalkulačka.
// Výpočty jsou v js/vypocty.js (převzaté ze SKICA 2D CAD/CAM), tady je jen rozhraní.

(function () {
  const V = window.Vypocty;
  const $ = (id) => document.getElementById(id);
  const ev = (s) => V.safeEvalMath(String(s ?? ''));
  const val = (inp) => (inp.value.trim() === '' ? null : ev(inp.value)); // null = prázdné, NaN = chyba
  const r = (x, d = 3) => String(parseFloat(Number(x).toFixed(d)));
  const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = (k, d) => { try { const v = localStorage.getItem('bona.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem('bona.' + k, JSON.stringify(v)); } catch { /* nedostupné */ } };

  const kopie = {}; // text pro tlačítka Kopírovat
  document.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', () => {
    const t = kopie[b.dataset.copy];
    if (!t) return;
    navigator.clipboard?.writeText(t).then(() => { b.textContent = '✓ Zkopírováno'; setTimeout(() => (b.textContent = '📋 Kopírovat'), 1200); });
  }));

  function chips(el, values, active, onPick) {
    el.innerHTML = values.map((v) => `<button type="button" class="chip${String(v) === String(active) ? ' active' : ''}" data-v="${v}">${v}</button>`).join('');
    el.onclick = (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      el.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === b));
      onPick(b.dataset.v);
    };
  }
  const chipVal = (el) => el.querySelector('.chip.active')?.dataset.v ?? null;
  function seg(selector, attr, onPick) {
    const btns = document.querySelectorAll(selector);
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.toggle('active', x === b));
      onPick(b.dataset[attr]);
    }));
    return (v) => btns.forEach((x) => x.classList.toggle('active', x.dataset[attr] === v));
  }

  /* ══════════════ TOLERANCE ══════════════ */
  (function tolerance() {
    const st = Object.assign({ custom: false, hole: true, um: false, dim: '', up: '', lo: '', cls: { hole: 'H', shaft: 'h' }, it: '7' }, load('tol', {}));
    const dimEl = $('tol-dim'), upEl = $('tol-up'), loEl = $('tol-lo'), out = $('tol-out');
    const clsEl = $('tol-class'), itEl = $('tol-it');
    dimEl.value = st.dim; upEl.value = st.up; loEl.value = st.lo;

    const kreslitTridy = () => chips(clsEl, st.hole ? V.HOLE_LETTERS : V.SHAFT_LETTERS, st.hole ? st.cls.hole : st.cls.shaft,
      (v) => { st.cls[st.hole ? 'hole' : 'shaft'] = v; calc(); });
    chips(itEl, Array.from({ length: 18 }, (_, i) => i + 1), st.it, (v) => { st.it = v; calc(); });

    const setSrc = seg('[data-tsrc]', 'tsrc', (v) => { st.custom = v === 'custom'; ukaz(); calc(); });
    // Díra | Ø rozměr | Hřídel – dvě samostatná tlačítka kolem pole (jako ve SKICE)
    const setMode = seg('[data-tmode]', 'tmode', (v) => { st.hole = v === 'hole'; kreslitTridy(); calc(); });
    function ukaz() { $('tol-iso').hidden = st.custom; $('tol-custom').hidden = !st.custom; }
    setSrc(st.custom ? 'custom' : 'iso'); setMode(st.hole ? 'hole' : 'shaft'); ukaz(); kreslitTridy();

    // Jednotka vlastních úchylek: jedno tlačítko mm ⇄ µm (výpočet jede dál v mm)
    const unitEl = $('tol-unit');
    function jednotkaUI() {
      unitEl.textContent = st.um ? 'µm' : 'mm';
      upEl.placeholder = st.um ? 'např. -255' : 'např. -0,255';
      loEl.placeholder = st.um ? 'např. -304' : 'např. -0,304';
    }
    unitEl.addEventListener('mousedown', (e) => e.preventDefault());
    unitEl.addEventListener('click', () => {
      const k = st.um ? 0.001 : 1000; // převést už zadané hodnoty, ať zůstanou stejné
      [upEl, loEl].forEach((inp) => { const x = val(inp); if (Number.isFinite(x)) inp.value = r(x * k, 6); });
      st.um = !st.um; jednotkaUI(); calc();
    });
    jednotkaUI();
    // ± před polem (číselná klávesnice iOS nemá mínus)
    document.querySelectorAll('#tol .tol-sign').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => {
        const inp = b.parentNode.querySelector('input'), v = inp.value.trim();
        inp.value = v.startsWith('-') ? v.slice(1) : '-' + v.replace(/^\+/, '');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    // formát čísel přesně jako ve SKICE (tolerance.js)
    const sign = (v) => { const x = Math.round(v * 100) / 100; return x > 0 ? '+' + x : '' + x; };
    const mm = (v) => String(parseFloat(v.toFixed(5)));

    function calc() {
      st.dim = dimEl.value; st.up = upEl.value; st.lo = loEl.value; save('tol', st);
      kopie.tol = '';
      const dim = val(dimEl);
      if (dim === null) { out.textContent = 'Zadejte rozměr…'; return; }
      if (!(dim > 0)) { out.textContent = 'Neplatný rozměr'; return; }
      if (!st.custom && dim > 3150) { out.textContent = 'Rozměr mimo rozsah ISO 286 (0–3150 mm)'; return; }
      let res, label;
      if (st.custom) {
        let up = val(upEl), lo = val(loEl);
        if (up === null || lo === null) { out.textContent = 'Zadejte horní i dolní úchylku…'; return; }
        if (!Number.isFinite(up) || !Number.isFinite(lo)) { out.textContent = 'Neplatná úchylka'; return; }
        if (st.um) { up /= 1000; lo /= 1000; }
        if (up < lo) [up, lo] = [lo, up]; // zadáno naopak → přizpůsobit
        res = { upper: up * 1000, lower: lo * 1000, tol: Math.round((up - lo) * 1e6) / 1000 };
        const f4 = (v) => (v > 0 ? '+' : '') + r(v, 4);
        label = `Ø${dim} ${f4(up)} / ${f4(lo)}`;
      } else {
        const letter = st.hole ? st.cls.hole : st.cls.shaft;
        res = V.deviations(letter, parseInt(st.it, 10), dim);
        if (res.error) { out.textContent = res.error; return; }
        label = `Ø${dim} ${letter}${st.it}`;
      }
      const max = dim + res.upper / 1000, min = dim + res.lower / 1000;
      const kind = st.hole ? 'Díra' : 'Hřídel';
      // Rozhodující rozměr: díra = Ø min (tolerance +), hřídel = Ø max (tolerance −)
      const keyLbl = st.hole ? 'Ø min' : 'Ø max', keyVal = st.hole ? min : max;
      const zn = st.hole ? '+' : '−'; // jako SKICA
      const tolTxt = `${zn}${res.tol} µm (${zn}${mm(res.tol / 1000)} mm)`;
      kopie.tol = `${kind} ${label} │ ${sign(res.upper)} / ${sign(res.lower)} µm │ max ${mm(max)} / min ${mm(min)} mm │ ${keyLbl} ${mm(keyVal)} mm ${tolTxt}`;
      // stejné HTML jako ve SKICE
      out.innerHTML =
        `<div class="tol-r-head"><span class="tol-r-kind ${st.hole ? 'hole' : 'shaft'}">${kind}</span> <strong>${label}</strong></div>` +
        '<div class="tol-r-cols">' +
          `<div class="tol-r-col"><div><span>Horní</span><b>${sign(res.upper)} µm</b></div><div><span>Dolní</span><b>${sign(res.lower)} µm</b></div></div>` +
          `<div class="tol-r-col"><div${st.hole ? '' : ' class="key"'}><span>Ø max</span><b>${mm(max)} mm</b></div>` +
          `<div${st.hole ? ' class="key"' : ''}><span>Ø min</span><b>${mm(min)} mm</b></div></div>` +
        '</div>' +
        // rozhodující rozměr pro obrábění: velký, bíle na černém, tolerance jen v mm
        `<div class="tol-r-tol"><span>${keyLbl}</span><div class="tol-r-big"><b>Ø${mm(keyVal)} mm</b> <b>(${zn}${mm(res.tol / 1000)} mm)</b></div></div>` +
        (res.note ? `<div class="tol-r-note">${res.note}</div>` : '');
    }
    [dimEl, upEl, loEl].forEach((e) => e.addEventListener('input', calc));
    calc();

    // ISO 2768-1 volné míry [maxDim, f, m, c, v]
    const free = [[3, 0.05, 0.1, 0.2, null], [6, 0.05, 0.1, 0.3, 0.5], [30, 0.1, 0.2, 0.5, 1.0], [120, 0.15, 0.3, 0.8, 1.5],
      [400, 0.2, 0.5, 1.2, 2.5], [1000, 0.3, 0.8, 2.0, 4.0], [2000, 0.5, 1.2, 3.0, 6.0], [4000, null, 2.0, 4.0, 8.0]];
    let prev = 0.5;
    $('tol-free').innerHTML = '<table class="tbl"><thead><tr><th>Rozměr (mm)</th><th>f</th><th class="tol-m tol-m-top">m</th><th>c</th><th>v</th></tr></thead><tbody>' +
      free.map((row) => { const t = `<tr><td>${prev} – ${row[0]}</td>` + row.slice(1).map((x, i) => `<td${i === 1 ? ` class="tol-m${row === free[free.length - 1] ? ' tol-m-bot' : ''}"` : ''}>${x === null ? '—' : '±' + x}</td>`).join('') + '</tr>'; prev = row[0]; return t; }).join('') +
      '</tbody></table>';

    // ISO 2768-2 [rozsah, H, K, L]
    const geo = [
      ['Přímost a rovinnost – délka (mm)', [['do 10', 0.02, 0.05, 0.1], ['10 – 30', 0.05, 0.1, 0.2], ['30 – 100', 0.1, 0.2, 0.4], ['100 – 300', 0.2, 0.4, 0.8], ['300 – 1000', 0.3, 0.6, 1.2], ['1000 – 3000', 0.4, 0.8, 1.6]]],
      ['Kolmost – kratší strana úhlu (mm)', [['do 100', 0.2, 0.4, 0.6], ['100 – 300', 0.3, 0.6, 1.0], ['300 – 1000', 0.4, 0.8, 1.5], ['1000 – 3000', 0.5, 1.0, 2.0]]],
      ['Souměrnost – délka (mm)', [['do 100', 0.5, 0.6, 0.6], ['100 – 300', 0.5, 0.6, 1.0], ['300 – 1000', 0.5, 0.8, 1.5], ['1000 – 3000', 0.5, 1.0, 2.0]]],
      ['Kruhové házení (radiální, axiální)', [['všechny rozměry', 0.1, 0.2, 0.5]]],
    ];
    $('tol-geo').innerHTML = geo.map(([t, rows]) => `<p class="lbl">${t}</p><table class="tbl"><thead><tr><th>Rozsah</th><th>H</th><th>K</th><th>L</th></tr></thead><tbody>` +
      rows.map((x) => `<tr>${x.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table>').join('') +
      '<p class="hint">Hodnoty = šířka tolerančního pásma (mm). Rovnoběžnost: větší z tolerance rozměru a rovinnosti/přímosti. ' +
      'Kruhovitost: tolerance průměru, nejvýše však kruhové házení. Souosost: bez vlastní hodnoty, nejvýše kruhové házení.</p>';
    // Geometrické tolerance – značky ISO 1101 (převzato ze SKICA)
    $('tol-gdt').outerHTML = V.gdtSectionHTML().replace('<details class="tol-free">', '<details class="tol-free" id="tol-gdt">');
  })();

  /* ══════════════ DRSNOST ══════════════ */
  (function drsnost() {
    const mats = [['Ocel 11 523 (S355)', 1.0], ['Ocel 12 050 (C45)', 1.0], ['Ocel 14 220 (16MnCr5)', 0.95], ['Ocel 15 142 (42CrMo4)', 0.9],
      ['Nerez 17 240 (X5CrNi)', 1.6], ['Nerez 17 346 (X2CrNiMo)', 1.7], ['Litina 42 2420 (GG25)', 1.1], ['Hliník (AlCu4Mg)', 0.9],
      ['Hliník (slitiny Si)', 1.4], ['Mosaz (CuZn39Pb3)', 0.85], ['Měď (Cu-ETP)', 1.3], ['Bronz (CuSn8)', 1.0]];
    const tools = [['SK (karbid)', 1.0], ['HSS', 1.3], ['Keramika', 0.85], ['CBN', 0.75], ['PCD (diamant)', 0.7]];
    const classes = [['N1', 0.025], ['N2', 0.05], ['N3', 0.1], ['N4', 0.2], ['N5', 0.4], ['N6', 0.8], ['N7', 1.6], ['N8', 3.2], ['N9', 6.3], ['N10', 12.5], ['N11', 25], ['N12', 50]];
    const kVc = (vc) => (vc <= 0 ? 1 : vc < 30 ? 1.6 : vc < 80 ? 1.2 : vc < 150 ? 1.0 : vc < 300 ? 0.95 : 0.9);
    const cls = (ra) => (classes.find(([, v]) => ra <= v) || ['>N12'])[0];

    $('dr-mat').innerHTML = mats.map(([n], i) => `<option value="${i}">${n}</option>`).join('');
    $('dr-tool').innerHTML = tools.map(([n], i) => `<option value="${i}">${n}</option>`).join('');
    $('dr-classes').innerHTML = classes.map(([c, v]) => `<div data-c="${c}"><b>${c}</b><span>${v}</span></div>`).join('');
    const reEl = $('dr-re'), raEl = $('dr-ra');
    chips($('dr-radii'), [0.4, 0.8, 1.2, 1.6, 2.4, 3.2], reEl.value, (v) => { reEl.value = v; calc(); });
    chips($('dr-ra-presets'), [0.8, 1.6, 3.2, 6.3, 12.5], null, (v) => { raEl.value = v; calc(); });

    function calc() {
      const f = val($('dr-f')), vc = val($('dr-vc')), re = val(reEl), raT = val(raEl);
      const k = mats[$('dr-mat').value][1] * tools[$('dr-tool').value][1] * (vc > 0 ? kVc(vc) : 1);
      $('dr-k').textContent = `Celkový korekční faktor Σk = ${k.toFixed(2)} (materiál × nástroj × Vc)`;
      $('dr-classes').querySelectorAll('div').forEach((d) => d.classList.remove('active'));
      if (f > 0 && re > 0) {
        const rz = (f * f) / (8 * re) * 1000, ra = rz / 4;
        const c = cls(ra * k);
        $('dr-out').innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr><th></th><th>Ra µm</th><th>Rz µm</th><th>Třída</th></tr></thead><tbody>` +
          `<tr><td>Teoretická</td><td>${ra.toFixed(3)}</td><td>${rz.toFixed(3)}</td><td>${cls(ra)}</td></tr>` +
          `<tr><td><b>Praktická</b></td><td><b>${(ra * k).toFixed(3)}</b></td><td><b>${(rz * k).toFixed(3)}</b></td><td><b>${c}</b></td></tr></tbody></table></div>` +
          `<p class="hint">Rz = f² / (8·rε) · 1000, Ra ≈ Rz / 4</p>`;
        $('dr-classes').querySelector(`[data-c="${c}"]`)?.classList.add('active');
      } else $('dr-out').textContent = 'Zadej posuv a rádius špičky.';
      $('dr-rev').innerHTML = raT > 0 && re > 0
        ? `Max. posuv pro Ra ${raT} µm: <b>f = ${Math.sqrt(raT * 32 * re / (1000 * k)).toFixed(3)} mm/ot</b>`
        : 'Zadej cílovou Ra.';
    }
    ['dr-f', 'dr-vc', 'dr-re', 'dr-ra'].forEach((id) => $(id).addEventListener('input', calc));
    ['dr-mat', 'dr-tool'].forEach((id) => $(id).addEventListener('change', calc));
    calc();
  })();

  /* ══════════════ TRIGONOMETRIE ══════════════ */
  (function trig() {
    let mode = 'right';
    const inp = {}; document.querySelectorAll('[data-tk]').forEach((e) => (inp[e.dataset.tk] = e));
    const keys = ['a', 'b', 'c', 'alpha', 'beta', 'gamma'];
    const out = $('trig-out');
    const LBL = { a: 'a', b: 'b', c: 'c', alpha: 'α', beta: 'β', gamma: 'γ' };

    function nastav() {
      const right = mode === 'right';
      inp.gamma.disabled = right;
      inp.gamma.value = right ? '90' : '';
      inp.gamma.classList.remove('computed');
      $('tri-right-mark').style.display = right ? '' : 'none';
      $('tri-gamma').textContent = right ? '90°' : 'γ';
      $('trig-help').textContent = right ? 'Pravoúhlý: zadej 2 hodnoty (aspoň jednu stranu). c = přepona.' : 'Obecný: zadej 3 hodnoty (aspoň jednu stranu). Úhel α leží proti straně a.';
      calc();
    }
    seg('[data-trig]', 'trig', (v) => { mode = v; nastav(); });

    function calc() {
      const k = {};
      for (const key of keys) {
        const e = inp[key];
        if (mode === 'right' && key === 'gamma') continue;
        if (e.classList.contains('computed')) { e.value = ''; e.classList.remove('computed'); }
        const x = val(e);
        if (Number.isNaN(x)) { out.textContent = 'Neplatný výraz v poli ' + LBL[key]; return; }
        k[key] = x;
      }
      const n = Object.values(k).filter((x) => x !== null).length;
      const need = mode === 'right' ? 2 : 3;
      if (n < need) { out.textContent = `Zadej ${need} hodnoty.`; return; }
      let sol, extra = '';
      if (mode === 'right') {
        const res = V.solveRightTriangle(k);
        if (!res.ok) { out.textContent = res.error; return; }
        sol = res;
        const area = res.a * res.b / 2;
        extra = `Plocha = ${r(area)} mm² · obvod = ${r(res.a + res.b + res.c)} mm · výška na c = ${r(res.a * res.b / res.c)} mm`;
      } else {
        const res = V.solveTriangle(k);
        if (!res.ok) { out.textContent = res.error; return; }
        sol = res.solutions[0];
        extra = `Plocha = ${r(sol.area)} mm² · obvod = ${r(sol.perimeter)} mm<br>Výšky: ha ${r(sol.ha)} · hb ${r(sol.hb)} · hc ${r(sol.hc)} mm · R opsané ${r(sol.circumR)} mm`;
        if (res.solutions.length > 1) {
          const s2 = res.solutions[1];
          extra += `<div class="warn">Existují 2 řešení. Druhé: a ${r(s2.a)}, b ${r(s2.b)}, c ${r(s2.c)}, α ${r(s2.alpha, 4)}°, β ${r(s2.beta, 4)}°, γ ${r(s2.gamma, 4)}°</div>`;
        }
      }
      for (const key of keys) {
        if (mode === 'right' && key === 'gamma') continue;
        if (k[key] === null) { inp[key].value = r(sol[key], 4); inp[key].classList.add('computed'); }
      }
      out.innerHTML = '✓ Vypočteno<br><span class="hint">' + extra + '</span>';
    }
    let t;
    keys.forEach((key) => inp[key].addEventListener('input', () => { inp[key].classList.remove('computed'); clearTimeout(t); t = setTimeout(calc, 350); }));
    $('trig-clear').addEventListener('click', () => { keys.forEach((key) => { if (!(mode === 'right' && key === 'gamma')) { inp[key].value = ''; inp[key].classList.remove('computed'); } }); out.textContent = ''; });
    nastav();
  })();

  /* ══════════════ KALKULAČKA ══════════════ */
  (function kalkulacka() {
    const inEl = $('calc-in'), resEl = $('calc-res'), histEl = $('calc-hist');
    let hist = load('calcHist', []);
    let ans = hist.length ? hist[hist.length - 1].v : 0;
    const prep = (s) => s.replace(/ans/gi, '(' + ans + ')').replace(/×/g, '*').replace(/÷/g, '/');
    const keys = [
      ['sin(', 'cos(', 'tan(', 'sqrt('], ['(', ')', '^', 'pi'],
      ['7', '8', '9', '÷'], ['4', '5', '6', '×'], ['1', '2', '3', '−'], ['0', '.', 'ANS', '+'],
      ['C', '⌫', '⌨', '='],
    ];
    $('calc-keys').innerHTML = keys.map((row) => `<div class="calc-row">${row.map((k) => `<button type="button" class="ck${/[0-9.]/.test(k) ? ' num' : ''}${k === '=' ? ' eq' : ''}" data-k="${k}">${k}</button>`).join('')}</div>`).join('');

    function kresliHist() {
      // historie pod klávesnicí, nejnovější nahoře – klávesy se neposouvají
      histEl.innerHTML = hist.slice(-20).reverse().map((h) => `<div class="h" data-v="${h.v}"><span>${escHtml(h.e)}</span> = <b>${h.v}</b></div>`).join('');
      histEl.scrollTop = 0;
    }
    function nahled() {
      const s = inEl.value.trim();
      if (!s) { resEl.innerHTML = '&nbsp;'; return; }
      const v = ev(prep(s.replace(/−/g, '-')));
      resEl.textContent = Number.isFinite(v) ? '= ' + parseFloat(v.toFixed(10)) : ' ';
    }
    function rovnase() {
      const s = inEl.value.trim(); if (!s) return;
      const v = ev(prep(s.replace(/−/g, '-')));
      if (!Number.isFinite(v)) { resEl.textContent = 'Chyba ve výrazu'; return; }
      const x = parseFloat(v.toFixed(10));
      hist.push({ e: s, v: x }); hist = hist.slice(-50); save('calcHist', hist);
      ans = x; inEl.value = String(x); resEl.innerHTML = '&nbsp;'; kresliHist();
      hotovo = true;
    }
    // Po „=“: číslo / funkce začne nový příklad, znaménko pokračuje s výsledkem (jako běžná kalkulačka)
    let hotovo = false;
    const POKRACUJE = new Set(['+', '−', '×', '÷', '^', ')']);
    function novyPoVysledku(k) { if (hotovo && !POKRACUJE.has(k)) inEl.value = ''; hotovo = false; }
    function vloz(t) {
      const a = inEl.selectionStart ?? inEl.value.length, b = inEl.selectionEnd ?? a;
      inEl.value = inEl.value.slice(0, a) + t + inEl.value.slice(b);
      inEl.setSelectionRange(a + t.length, a + t.length); nahled();
    }
    $('calc-keys').addEventListener('click', (e) => {
      const b = e.target.closest('.ck'); if (!b) return;
      const k = b.dataset.k;
      if (k === '=') rovnase();
      else if (k === 'C') { inEl.value = ''; hotovo = false; nahled(); }
      else if (k === '⌫') { inEl.value = inEl.value.slice(0, -1); hotovo = false; nahled(); }
      else if (k === '⌨') { // systémová klávesnice jen na požádání (jinak zakrývá tlačítka)
        const zap = inEl.inputMode !== 'text';
        inEl.inputMode = zap ? 'text' : 'none';
        b.classList.toggle('on', zap);
        inEl.blur(); if (zap) setTimeout(() => inEl.focus(), 50);
      }
      else { novyPoVysledku(k); vloz(k === '−' ? '-' : k === 'ANS' ? 'ans' : k); }
    });
    inEl.addEventListener('input', () => { hotovo = false; nahled(); });
    inEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); rovnase(); } });
    histEl.addEventListener('click', (e) => { const h = e.target.closest('.h'); if (h) { novyPoVysledku(''); vloz(h.dataset.v); } });
    kresliHist();
  })();
})();
