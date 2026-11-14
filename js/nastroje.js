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
    const st = Object.assign({ custom: false, hole: true, dim: '', up: '', lo: '', cls: { hole: 'H', shaft: 'h' }, it: '7' }, load('tol', {}));
    const dimEl = $('tol-dim'), upEl = $('tol-up'), loEl = $('tol-lo'), out = $('tol-out');
    const clsEl = $('tol-class'), itEl = $('tol-it');
    dimEl.value = st.dim; upEl.value = st.up; loEl.value = st.lo;

    const kreslitTridy = () => chips(clsEl, st.hole ? V.HOLE_LETTERS : V.SHAFT_LETTERS, st.hole ? st.cls.hole : st.cls.shaft,
      (v) => { st.cls[st.hole ? 'hole' : 'shaft'] = v; calc(); });
    chips(itEl, Array.from({ length: 18 }, (_, i) => i + 1), st.it, (v) => { st.it = v; calc(); });

    const setSrc = seg('[data-tsrc]', 'tsrc', (v) => { st.custom = v === 'custom'; ukaz(); calc(); });
    const setMode = seg('[data-tmode]', 'tmode', (v) => { st.hole = v === 'hole'; kreslitTridy(); calc(); });
    function ukaz() { $('tol-iso').hidden = st.custom; $('tol-custom').hidden = !st.custom; }
    setSrc(st.custom ? 'custom' : 'iso'); setMode(st.hole ? 'hole' : 'shaft'); ukaz(); kreslitTridy();

    const sign = (v) => { const x = Math.round(v * 100) / 100; return x > 0 ? '+' + x : '' + x; };
    const mm = (v) => String(parseFloat(v.toFixed(5)));

    function calc() {
      st.dim = dimEl.value; st.up = upEl.value; st.lo = loEl.value; save('tol', st);
      kopie.tol = '';
      const dim = val(dimEl);
      if (dim === null) { out.textContent = 'Zadejte rozměr…'; return; }
      if (!(dim > 0)) { out.textContent = 'Neplatný rozměr'; return; }
      let res, label;
      if (st.custom) {
        let up = val(upEl), lo = val(loEl);
        if (up === null || lo === null) { out.textContent = 'Zadejte horní i dolní úchylku…'; return; }
        if (!Number.isFinite(up) || !Number.isFinite(lo)) { out.textContent = 'Neplatná úchylka'; return; }
        if (up < lo) [up, lo] = [lo, up];
        const f = (v) => (v > 0 ? '+' : '') + r(v, 4);
        res = { upper: up * 1000, lower: lo * 1000, tol: Math.round((up - lo) * 1e6) / 1000 };
        label = `Ø${dim} ${f(up)} / ${f(lo)}`;
      } else {
        const letter = st.hole ? st.cls.hole : st.cls.shaft;
        res = V.deviations(letter, parseInt(st.it, 10), dim);
        if (res.error) { out.textContent = res.error; return; }
        label = `Ø${dim} ${letter}${st.it}`;
      }
      const max = dim + res.upper / 1000, min = dim + res.lower / 1000;
      const kind = st.hole ? 'Díra' : 'Hřídel';
      const keyLbl = st.hole ? 'Ø min' : 'Ø max', keyVal = st.hole ? min : max, sg = st.hole ? '+' : '−';
      const tolTxt = `${sg}${res.tol} µm (${sg}${mm(res.tol / 1000)} mm)`;
      kopie.tol = `${kind} ${label} | ${sign(res.upper)} / ${sign(res.lower)} µm | max ${mm(max)} / min ${mm(min)} mm`;
      out.innerHTML =
        `<div class="tol-head"><span class="badge ${st.hole ? 'hole' : 'shaft'}">${kind}</span> <b>${label}</b></div>` +
        `<div class="tol-cols"><div><span>Horní</span><b>${sign(res.upper)} µm</b></div><div${st.hole ? '' : ' class="key"'}><span>Ø max</span><b>${mm(max)} mm</b></div>` +
        `<div><span>Dolní</span><b>${sign(res.lower)} µm</b></div><div${st.hole ? ' class="key"' : ''}><span>Ø min</span><b>${mm(min)} mm</b></div></div>` +
        `<div class="tol-key">${keyLbl} <b>${mm(keyVal)} mm</b> ${tolTxt}</div>` +
        `<div class="tol-key">Střed tolerance: <b>${mm((max + min) / 2)} mm</b></div>` +
        (res.note ? `<p class="hint">${res.note}</p>` : '');
    }
    [dimEl, upEl, loEl].forEach((e) => e.addEventListener('input', calc));
    calc();

    // ISO 2768-1 volné míry [maxDim, f, m, c, v]
    const free = [[3, 0.05, 0.1, 0.2, null], [6, 0.05, 0.1, 0.3, 0.5], [30, 0.1, 0.2, 0.5, 1.0], [120, 0.15, 0.3, 0.8, 1.5],
      [400, 0.2, 0.5, 1.2, 2.5], [1000, 0.3, 0.8, 2.0, 4.0], [2000, 0.5, 1.2, 3.0, 6.0], [4000, null, 2.0, 4.0, 8.0]];
    let prev = 0.5;
    $('tol-free').innerHTML = '<table class="tbl"><thead><tr><th>Rozměr (mm)</th><th>f</th><th class="hl">m</th><th>c</th><th>v</th></tr></thead><tbody>' +
      free.map((row) => { const t = `<tr><td>${prev} – ${row[0]}</td>` + row.slice(1).map((x, i) => `<td${i === 1 ? ' class="hl"' : ''}>${x === null ? '—' : '±' + x}</td>`).join('') + '</tr>'; prev = row[0]; return t; }).join('') +
      '</tbody></table><p class="hint">m = střední třída (nejčastější na výkresech).</p>';

    // ISO 2768-2 [rozsah, H, K, L]
    const geo = [
      ['Přímost a rovinnost – délka (mm)', [['do 10', 0.02, 0.05, 0.1], ['10 – 30', 0.05, 0.1, 0.2], ['30 – 100', 0.1, 0.2, 0.4], ['100 – 300', 0.2, 0.4, 0.8], ['300 – 1000', 0.3, 0.6, 1.2], ['1000 – 3000', 0.4, 0.8, 1.6]]],
      ['Kolmost – kratší strana úhlu (mm)', [['do 100', 0.2, 0.4, 0.6], ['100 – 300', 0.3, 0.6, 1.0], ['300 – 1000', 0.4, 0.8, 1.5], ['1000 – 3000', 0.5, 1.0, 2.0]]],
      ['Souměrnost – délka (mm)', [['do 100', 0.5, 0.6, 0.6], ['100 – 300', 0.5, 0.6, 1.0], ['300 – 1000', 0.5, 0.8, 1.5], ['1000 – 3000', 0.5, 1.0, 2.0]]],
      ['Kruhové házení (radiální, axiální)', [['všechny rozměry', 0.1, 0.2, 0.5]]],
    ];
    $('tol-geo').innerHTML = geo.map(([t, rows]) => `<p class="lbl">${t}</p><table class="tbl"><thead><tr><th>Rozsah</th><th>H</th><th>K</th><th>L</th></tr></thead><tbody>` +
      rows.map((x) => `<tr>${x.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table>').join('') +
      '<p class="hint">Hodnoty = šířka tolerančního pásma (mm).</p>';
  })();

  /* ══════════════ KUŽEL ══════════════ */
  (function kuzel() {
    const ids = ['D', 'd', 'L', 'ratio', 'half', 'full'];
    const el = Object.fromEntries(ids.map((k) => [k, $('kz-' + k)]));
    const out = $('kz-out');
    let lastTaper = 'ratio'; // které pole kuželovitosti zadal uživatel naposledy

    function setComputed(k, v) { el[k].value = v; el[k].classList.add('computed'); }
    function calc() {
      kopie.kz = '';
      ids.forEach((k) => { if (el[k].classList.contains('computed')) { el[k].value = ''; el[k].classList.remove('computed'); } });
      const D = val(el.D), d = val(el.d), L = val(el.L);
      let C = null;
      const tv = el[lastTaper].value.trim();
      if (tv) C = lastTaper === 'ratio' ? V.ratioToC(tv) : V.taperC(lastTaper, ev(tv));
      for (const [k, x] of [['D', D], ['d', d], ['L', L]]) if (Number.isNaN(x)) { out.textContent = 'Neplatná hodnota v poli ' + k; return; }
      if (Number.isNaN(C)) { out.textContent = 'Neplatná kuželovitost'; return; }
      // ostatní dvě pole kuželovitosti jsou jen výstup
      ['ratio', 'half', 'full'].filter((k) => k !== lastTaper).forEach((k) => { el[k].value = ''; });
      const s = V.solveTaper({ D, d, L, C }, null, 'A');
      if (s.error) { out.textContent = s.error; return; }
      const known = (x) => x !== null && Number.isFinite(x);
      if (!(known(s.D) && known(s.d) && known(s.L) && known(s.C))) { out.textContent = 'Zadej 3 ze 4 hodnot (D, d, L, kuželovitost).'; return; }
      ['D', 'd', 'L'].forEach((k) => { if (s.computed.has(k)) setComputed(k, r(s[k], 4)); });
      const F = V.taperForms(s.C);
      const formy = { ratio: F.C > 0 ? '1:' + r(F.ratio, 4) : '—', half: r(F.half, 4), full: r(F.full, 4) };
      ['ratio', 'half', 'full'].filter((k) => k !== lastTaper).forEach((k) => setComputed(k, k === 'ratio' ? (F.C > 0 ? r(F.ratio, 4) : '') : formy[k]));
      const dm = Math.floor(F.half), mi = Math.floor((F.half - dm) * 60), se = Math.round(((F.half - dm) * 60 - mi) * 60);
      kopie.kz = `Kužel D ${r(s.D)} / d ${r(s.d)} / L ${r(s.L)} | ${formy.ratio} | α/2 ${formy.half}° | α ${formy.full}°`;
      out.innerHTML =
        `D = <b>${r(s.D)}</b> mm · d = <b>${r(s.d)}</b> mm · L = <b>${r(s.L)}</b> mm<br>` +
        `Kuželovitost <b>${formy.ratio}</b> · α/2 = <b>${formy.half}°</b> (${dm}° ${mi}′ ${se}″) · α = <b>${formy.full}°</b><br>` +
        `<span class="hint">Rozdíl na poloměr (D−d)/2 = ${r((s.D - s.d) / 2)} mm · změna Ø na 1 mm délky = ${r(s.C, 5)} mm</span>` +
        (s.warn ? `<div class="warn">${s.warn}</div>` : '');
    }
    ids.forEach((k) => el[k].addEventListener('input', () => {
      el[k].classList.remove('computed');
      if (['ratio', 'half', 'full'].includes(k)) lastTaper = k;
      calc();
    }));
    $('kz-clear').addEventListener('click', () => { ids.forEach((k) => { el[k].value = ''; el[k].classList.remove('computed'); }); out.textContent = ''; });

    const morse = [['MT0', 9.045, 6.401, 49.8], ['MT1', 12.065, 9.371, 53.5], ['MT2', 17.780, 14.533, 64.0], ['MT3', 23.825, 19.761, 80.5], ['MT4', 31.267, 25.908, 102.5], ['MT5', 44.399, 37.468, 129.5]];
    const metric = [['1:5', '5'], ['1:10', '10'], ['1:20 (metrický)', '20'], ['1:50', '50'], ['7:24 (ISO/SK)', '7:24']];
    $('kz-tables').innerHTML =
      '<p class="lbl">Morse</p><table class="tbl click"><thead><tr><th></th><th>D</th><th>d</th><th>L</th><th>α/2</th></tr></thead><tbody>' +
      morse.map(([n, D, d, L]) => `<tr data-m="${D},${d},${L}"><td>${n}</td><td>${D}</td><td>${d}</td><td>${L}</td><td>${(Math.atan((D - d) / (2 * L)) * 180 / Math.PI).toFixed(4)}°</td></tr>`).join('') +
      '</tbody></table><p class="lbl">Poměrové kužely</p><table class="tbl click"><thead><tr><th>Kužel</th><th>α/2</th></tr></thead><tbody>' +
      metric.map(([n, q]) => `<tr data-r="${q}"><td>${n}</td><td>${(Math.atan(V.ratioToC(q) / 2) * 180 / Math.PI).toFixed(4)}°</td></tr>`).join('') + '</tbody></table>';
    $('kz-tables').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-m],tr[data-r]'); if (!tr) return;
      ids.forEach((k) => { el[k].value = ''; el[k].classList.remove('computed'); });
      if (tr.dataset.m) { const [D, d, L] = tr.dataset.m.split(','); el.D.value = D; el.d.value = d; el.L.value = L; }
      else { el.ratio.value = tr.dataset.r; lastTaper = 'ratio'; }
      calc(); el.D.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
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
        $('dr-out').innerHTML = `<table class="tbl"><thead><tr><th></th><th>Ra µm</th><th>Rz µm</th><th>Třída</th></tr></thead><tbody>` +
          `<tr><td>Teoretická</td><td>${ra.toFixed(3)}</td><td>${rz.toFixed(3)}</td><td>${cls(ra)}</td></tr>` +
          `<tr><td><b>Praktická</b></td><td><b>${(ra * k).toFixed(3)}</b></td><td><b>${(rz * k).toFixed(3)}</b></td><td><b>${c}</b></td></tr></tbody></table>` +
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
      ['C', '⌫', '='],
    ];
    $('calc-keys').innerHTML = keys.map((row) => `<div class="calc-row">${row.map((k) => `<button type="button" class="ck${/[0-9.]/.test(k) ? ' num' : ''}${k === '=' ? ' eq' : ''}" data-k="${k}">${k}</button>`).join('')}</div>`).join('');

    function kresliHist() {
      histEl.innerHTML = hist.slice(-8).map((h) => `<div class="h" data-v="${h.v}"><span>${escHtml(h.e)}</span> = <b>${h.v}</b></div>`).join('');
      histEl.scrollTop = histEl.scrollHeight;
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
    }
    function vloz(t) {
      const a = inEl.selectionStart ?? inEl.value.length, b = inEl.selectionEnd ?? a;
      inEl.value = inEl.value.slice(0, a) + t + inEl.value.slice(b);
      inEl.setSelectionRange(a + t.length, a + t.length); nahled();
    }
    $('calc-keys').addEventListener('click', (e) => {
      const b = e.target.closest('.ck'); if (!b) return;
      const k = b.dataset.k;
      if (k === '=') rovnase();
      else if (k === 'C') { inEl.value = ''; nahled(); }
      else if (k === '⌫') { inEl.value = inEl.value.slice(0, -1); nahled(); }
      else vloz(k === '−' ? '-' : k === 'ANS' ? 'ans' : k);
    });
    inEl.addEventListener('input', nahled);
    inEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); rovnase(); } });
    histEl.addEventListener('click', (e) => { const h = e.target.closest('.h'); if (h) vloz(h.dataset.v); });
    kresliHist();
  })();
})();
