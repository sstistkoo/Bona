'use strict';
// Kužel – díra i čep, náčrt řezu, Ø z výkresu v hloubce, tolerance, měřicí místa.
// Logika převzatá ze SKICA 2D CAD/CAM (taperBore.js), výpočty a kreslení náčrtu
// jsou ve window.Vypocty.taper (taperBoreMath.js + taperBoreSketch.js).
// Strany: A = spodek, B = vrch (karusel).

(function () {
  const T = window.Vypocty.taper;
  const ev = window.Vypocty.safeEvalMath;
  const $ = (id) => document.getElementById('kz-' + id);
  const svg = document.getElementById('kz-svg');
  const N = { A: 'Spodek', B: 'Vrch', a: 'od spodu', b: 'od vrchu', bigA: 'dole', bigB: 'nahoře' };
  const CF = { ratio: 'K', half: 'a' };          // tvar kuželovitosti → pole
  const SOLVE = ['D', 'd', 'L', 'C'];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtN = (x, dec) => String(parseFloat(x.toFixed(dec)));
  const trim0 = (x) => T.f3(x).replace(/\.?0+$/, '') || '0';
  const okNum = (x) => x !== null && x !== undefined && Number.isFinite(x);
  const num = (el) => { const s = el.value.trim(); if (!s) return null; const v = ev(s); return isFinite(v) ? v : NaN; };
  const ncText = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/−/g, '-').replace(/Ø/g, '').toUpperCase();

  let kind = 'hole', bigSide = 'B';
  let cform = 'ratio';                            // ve kterém poli je ručně zadaná kuželovitost
  let order = [];                                  // ručně zadané veličiny z SOLVE (nejnovější na konci)
  let geo = null, lastText = '', lastNc = '';
  const fieldOf = (k) => $(k === 'C' ? CF[cform] : k);
  const cFields = () => Object.values(CF).map((id) => $(id));
  const isEdited = (k) => order.includes(k);
  function clearKey(k) { (k === 'C' ? cFields() : [$(k)]).forEach((el) => { el.value = ''; el.classList.remove('computed'); }); }

  /* ── Přepínače díra / čep a větší strana ── */
  const kindBtns = document.querySelectorAll('[data-kz]'), bigBtns = document.querySelectorAll('[data-kzbig]');
  const showSwitches = () => {
    kindBtns.forEach((b) => b.classList.toggle('active', b.dataset.kz === kind));
    bigBtns.forEach((b) => b.classList.toggle('active', b.dataset.kzbig === bigSide));
  };
  kindBtns.forEach((b) => b.addEventListener('click', () => { kind = b.dataset.kz; update(); }));
  bigBtns.forEach((b) => b.addEventListener('click', () => { bigSide = b.dataset.kzbig; update(); }));

  /* ── Měřicí místa ── */
  const ptsEl = $('points');
  const sideOpts = (val) => [['A', N.a], ['B', N.b], ['AB', 'z obou stran']]
    .map((o) => `<option value="${o[0]}"${o[0] === val ? ' selected' : ''}>${o[1]}</option>`).join('');
  function addPoint(depth = '', side = 'AB') {
    const row = document.createElement('div');
    row.className = 'kz-pt';
    row.innerHTML = '<input type="text" inputmode="decimal" class="kz-pt-d" placeholder="hloubka mm" autocomplete="off">' +
      `<select class="kz-pt-s">${sideOpts(side)}</select>` +
      '<button type="button" class="kz-pt-del" title="Odebrat" aria-label="Odebrat">✕</button>';
    row.querySelector('.kz-pt-d').value = depth;
    row.querySelector('.kz-pt-del').addEventListener('click', () => { row.remove(); if (!ptRows().length) addPoint(); update(); });
    row.querySelectorAll('input,select').forEach((e) => e.addEventListener(e.tagName === 'SELECT' ? 'change' : 'input', update));
    ptsEl.appendChild(row);
    return row;
  }
  const ptRows = () => [...ptsEl.querySelectorAll('.kz-pt')];
  const readPoints = () => ptRows().map((r) => {
    const d = ev(r.querySelector('.kz-pt-d').value);
    return { depth: isFinite(d) ? d : NaN, side: r.querySelector('.kz-pt-s').value };
  });

  /** Nechá jen tolik ručně zadaných veličin, kolik je potřeba (nejnovější vyhrávají). */
  function trimOrder() {
    if (num($('refD')) > 0) {
      const others = order.filter((k) => k !== 'L');
      while (others.length > 1) { const k = others.shift(); order = order.filter((x) => x !== k); }
    } else {
      while (order.length > 3) order.shift();
    }
  }
  function writeComputed(k, val) {
    if (!okNum(val)) return;
    if (k === 'C') {
      const fm = T.taperForms(val);
      const txt = { ratio: val > 0 ? fmtN(fm.ratio, 3) : '', half: fmtN(fm.half, 5) };
      Object.keys(CF).forEach((f) => {
        if (isEdited('C') && f === cform) return;
        const el = $(CF[f]); el.value = txt[f]; el.classList.add('computed');
      });
      return;
    }
    const el = fieldOf(k);
    el.value = fmtN(val, 4);
    el.classList.add('computed');
  }
  function cValue() {
    if (cform === 'ratio') return T.ratioToC($('K').value);
    const a = num(fieldOf('C'));
    return a > 0 && a < 90 ? T.taperC(cform, a) : NaN;
  }
  function taperLabel(C, st) {
    if (st === 'empty') return '1:x = ?';
    const raw = $('K').value.trim();
    if (isEdited('C') && cform === 'ratio' && raw.includes(':') && !/^1\s*:/.test(raw)) return raw.replace(/\s+/g, '') + ' = 1:' + fmtN(1 / C, 3);
    return C > 0 ? '1:x = 1:' + fmtN(1 / C, 2) : 'válec';
  }

  /* ── Hlavní přepočet ── */
  function update() {
    showSwitches();
    const refDia = num($('refD'));
    const ref = refDia > 0 ? { dia: refDia, depth: num($('ref')) || 0, side: $('refSide').value } : null;
    const k = {
      D: isEdited('D') ? num($('D')) : null, d: isEdited('d') ? num($('d')) : null,
      L: isEdited('L') ? num($('L')) : null, C: isEdited('C') ? cValue() : null,
    };
    SOLVE.forEach((key) => { if (!isEdited(key)) clearKey(key); });
    if (isEdited('C')) cFields().forEach((el) => { if (el !== fieldOf('C')) { el.value = ''; el.classList.remove('computed'); } });
    const sol = T.solveTaper(k, ref, bigSide);
    sol.computed.forEach((key) => writeComputed(key, sol[key]));
    if (!sol.computed.has('C') && okNum(sol.C)) writeComputed('C', sol.C);
    const done = !sol.error && okNum(sol.D) && okNum(sol.d) && okNum(sol.L) && okNum(sol.C);

    // Tolerance: ISO zápis (H7…) vyplní úchylky podle zadaného Ø, jinak D
    const isoCode = $('iso').value.trim();
    $('iso-info').textContent = '';
    if (isoCode) {
      const dim = ref ? ref.dia : sol.D;
      const t = okNum(dim) && dim > 0 ? T.isoTolerance(isoCode, dim) : null;
      if (t && !t.error) {
        $('es').value = trim0(t.es); $('ei').value = trim0(t.ei);
        $('es').classList.add('computed'); $('ei').classList.add('computed');
        $('iso-info').textContent = `${isoCode} pro Ø${trim0(dim)}: ${T.fmtDev(t.es, t.ei)} mm`;
      } else {
        $('iso-info').textContent = t && t.error ? t.error : 'ISO tolerance se dopočítá, až bude známý průměr.';
      }
    }
    const tA = num($('es')) || 0, tB = num($('ei')) || 0;
    const es = Math.max(tA, tB), ei = Math.min(tA, tB);
    save();

    // Chyby zápisu
    const anyInput = SOLVE.some(isEdited) || !!ref;
    const bad = SOLVE.filter((key) => isEdited(key) && !Number.isFinite(key === 'C' ? cValue() : num(fieldOf(key))));
    const badName = { C: 'kuželovitost', es: 'horní úchylka', ei: 'dolní úchylka', ref: 'hloubka zadaného Ø', pt: 'hloubka měřicího místa' };
    ['es', 'ei', 'ref'].forEach((id) => { if ($(id).value.trim() && !Number.isFinite(num($(id)))) bad.push(id); });
    if (ptRows().some((r) => { const t = r.querySelector('.kz-pt-d').value.trim(); return t && !(ev(t) >= 0); })) bad.push('pt');
    const err = bad.length ? 'Neplatný zápis: ' + bad.map((b) => badName[b] || b).join(', ') + '.' : sol.error && anyInput ? sol.error : sol.warn || '';
    $('err').textContent = err; $('err').hidden = !err;

    const pts = readPoints();
    const r = done ? T.computeTaperBore({ D: sol.D, es, ei, L: sol.L, refDepth: 0, refSide: bigSide, C: sol.C, bigSide, points: pts }) : null;
    const ok = r && !r.error;
    const dev = T.fmtDev(es, ei);

    // Kuželovitost ve všech tvarech + suport
    if (okNum(sol.C)) {
      const fm = T.taperForms(sol.C);
      $('forms').innerHTML = `<b>${fm.C > 0 ? '1:' + fm.ratio.toFixed(fm.ratio < 100 ? 3 : 1) : 'válec'}</b> │ α ${fm.half.toFixed(5)}° │ vrcholový 2α ${fm.full.toFixed(4)}° │ změna Ø ${fm.C.toFixed(6)} mm/mm`;
    } else $('forms').textContent = '';
    $('slide').hidden = !(done && sol.C > 0);
    $('slide').innerHTML = done && sol.C > 0
      ? `📏 Na <b>1 mm</b> délky se Ø změní o <b>${fmtN(sol.C, 6)} mm</b> (na stranu ${fmtN(sol.C / 2, 6)} mm)<br>` +
        `🔧 <b>Náklon suportu:</b> ${T.taperForms(sol.C).half.toFixed(4)}°<br>` +
        `Příčný přísuv na stranu: <b>${T.f3((sol.D - sol.d) / 2)} mm</b> · D ${T.f3(sol.D)} / d ${T.f3(sol.d)} / L ${trim0(sol.L)}`
      : '';

    // Tabulka shora dolů: hrana vrchu, místa a zadaný Ø, hrana spodku
    let ordered = [];
    if (ok) {
      const L = sol.L, fromTop = (z) => L - z;
      const where = (depth, side, z) => side === 'B' ? depth + ' ' + N.b : depth + ' ' + N.a + ` <small>(${trim0(fromTop(z))} ${N.b})</small>`;
      ordered = r.rows.map((row) => ({ row, top: fromTop(row.z), place: where(row.depth, row.side, row.z) + (row.outside ? ' <small>– mimo kužel!</small>' : ''), nom: row.nom, cls: row.outside ? 'kz-out' : '' }));
      if (ref) {
        const zr = ref.side === 'B' ? L - ref.depth : ref.depth;
        ordered.push({ no: 'Ø', top: fromTop(zr), place: 'zadaný Ø: ' + where(ref.depth, ref.side, zr), nom: ref.dia, cls: 'kz-refrow' });
      }
      ordered.push({ no: '', top: 0, place: N.B + ' (hrana)', nom: r.endB, cls: 'kz-end' });
      ordered.push({ no: '', top: L, place: N.A + ` (hrana) <small>(${trim0(L)} ${N.b})</small>`, nom: r.endA, cls: 'kz-end' });
      const rank = (o) => (o.cls === 'kz-end' ? (o.top === 0 ? -1 : 1) : 0);
      ordered.sort((x, y) => (x.top - y.top) || (rank(x) - rank(y)));
      let no = 0;
      ordered.forEach((o) => { if (o.row) { o.no = ++no; o.row.no = no; } });
      let h = '<table class="tbl kz-tbl"><thead><tr><th>#</th><th>Místo <small>(shora dolů)</small></th><th>Ø jmen.</th><th>min</th><th>max</th></tr></thead><tbody>';
      ordered.forEach((o) => {
        h += `<tr class="${o.cls}"><td>${o.no}</td><td>${o.place}</td><td><b>${T.f3(o.nom)}</b></td><td>${T.f3(o.nom + ei)}</td><td>${T.f3(o.nom + es)}</td></tr>`;
      });
      h += '</tbody></table>';
      if (r.diffs.length) {
        h += '<p class="hint">' + r.diffs.map((dd) => `Rozdíl vrch − spodek v hl. ${dd.depth}: <b>${T.f3(Math.abs(dd.diff))}</b> <small>(rozteč ${trim0(dd.span)} mm)</small>`).join('<br>') + '</p>';
      }
      $('res').innerHTML = h;
    } else $('res').innerHTML = done ? '' : '<p class="hint">Tabulka průměrů se ukáže, až bude kužel určený.</p>';

    // Texty ke kopírování
    lastText = lastNc = '';
    if (ok) {
      const ratioTxt = sol.C > 0 ? '1:' + trim0(1 / sol.C) : 'válec';
      const lines = [`Kužel ${ratioTxt}, D ${T.f3(sol.D)}, d ${T.f3(sol.d)}, L ${trim0(sol.L)}` + (es || ei ? ', tolerance ' + dev : '')];
      if (ref) lines.push(`Zadáno Ø${trim0(ref.dia)} ${dev} v hl. ${ref.depth} ${ref.side === 'A' ? N.a : N.b}`);
      const nc = [(kind === 'shaft' ? 'Kuželový čep ' : 'Kuželová díra ') + ratioTxt];
      ordered.filter((o) => o.row).map((o) => o.row).forEach((row) => {
        lines.push(`Ø v hl. ${row.depth} ${row.side === 'A' ? N.a : N.b} = ${T.f3(row.nom)} ${dev}`);
        nc.push(`Rozměr v hloubce ${row.depth} ${row.side === 'A' ? N.a : N.b} je ${T.f3(row.nom)} ${dev}`);
      });
      if (!r.rows.length) nc.push(`D ${T.f3(sol.D)} d ${T.f3(sol.d)} L ${trim0(sol.L)}`);
      r.diffs.forEach((dd) => {
        lines.push(`Rozdíl v hl. ${dd.depth} = ${T.f3(Math.abs(dd.diff))}`);
        nc.push(`Rozdíl vrch - spodek v hloubce ${dd.depth} = ${T.f3(Math.abs(dd.diff))}`);
      });
      lastText = lines.join('\n');
      lastNc = ncText(nc.map((l) => '; ' + l).join('\n'));
    }

    // Náčrt (i neúplný – neznámé jako „?")
    const Ld = okNum(sol.L) && sol.L > 0 ? sol.L : 200;
    const stOf = (key) => isEdited(key) && okNum(k[key]) ? 'val' : okNum(sol[key]) ? 'calc' : 'empty';
    const rows = [];
    if (ok) r.rows.forEach((row, i) => { if (!row.outside) rows.push({ ...row, no: row.no || i + 1 }); });
    else {
      let no = 0;
      pts.forEach((pt, i) => {
        if (!(pt.depth >= 0)) return;
        (pt.side === 'AB' ? ['A', 'B'] : [pt.side]).forEach((side) => {
          no++;
          const z = side === 'B' ? Ld - pt.depth : pt.depth;
          if (z >= 0 && z <= Ld) rows.push({ side, depth: pt.depth, z, nom: null, pt: i, no });
        });
      });
    }
    let refM = null;
    if (ref) {
      const zRaw = ref.side === 'B' ? Ld - ref.depth : ref.depth;
      refM = { ...ref, depthKnown: $('ref').value.trim() !== '', z: Math.max(0, Math.min(Ld, zRaw)) };
    }
    geo = T.drawBoreSketch(svg, {
      L: Ld, C: okNum(sol.C) ? sol.C : null, bigSide, names: N, shaft: kind === 'shaft',
      v: { D: okNum(sol.D) ? sol.D : null, d: okNum(sol.d) ? sol.d : null, L: okNum(sol.L) ? sol.L : null },
      st: { D: stOf('D'), d: stOf('d'), L: stOf('L'), C: stOf('C') },
      taperTxt: taperLabel(sol.C, stOf('C')),
      aTxt: 'α = ' + (okNum(sol.C) ? fmtN(T.taperForms(sol.C).half, 4) + '°' : '?'),
      stForm: (f) => stOf('C') === 'val' ? (f === cform ? 'val' : 'calc') : stOf('C'),
      ref: refM, rows,
    });
    // legenda náčrtu je psaná pro tmavý režim – ve světlém mají barvy jiné názvy
    if (!matchMedia('(prefers-color-scheme: dark)').matches) {
      const lg = svg.querySelector('.sk-legend');
      if (lg) lg.innerHTML = lg.innerHTML.replace('bílá', 'tmavá').replace('žlutá', 'oranžová');
    }
  }

  /* ── Klepnutí do náčrtu → otevřít pole (na mobilu místo vyskakovacího okna) ── */
  function jdiNa(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { el.focus({ preventScroll: true }); if (el.select) el.select(); }, 300);
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  /* ── Okénko u náčrtu: klepnutí na kótu / do kužele otevře malé okno, hodnota se zapíše do pole dole ── */
  let okno = null;                                 // { el, zrus }
  function zavriOkno() { if (okno) { okno.zrus(); okno.el.remove(); okno = null; } }
  function otevriOkno(e, o) {
    zavriOkno();
    const el = document.createElement('div');
    el.className = 'svg-pop';
    el.setAttribute('role', 'dialog');
    el.innerHTML = '<div class="svg-pop-label">' + o.label + (o.unit ? ' <small>' + o.unit + '</small>' : '') + '</div>' +
      (o.hint ? '<div class="svg-pop-hint">' + o.hint + '</div>' : '') +
      (o.choices ? '<div class="svg-pop-choices">' + o.choices.map((c) =>
        '<button type="button" data-v="' + c.value + '"' + (c.value === o.choice ? ' class="on"' : '') + '>' + c.text + '</button>').join('') + '</div>' : '') +
      '<div class="svg-pop-row"><input type="text" ' + (o.text ? 'inputmode="text" ' : 'inputmode="decimal" ') + 'autocomplete="off" aria-label="' + o.label.replace(/"/g, '') + '">' +
      '<button type="button" class="svg-pop-ok">OK</button>' +
      (o.onDelete ? '<button type="button" class="svg-pop-del" title="Odebrat" aria-label="Odebrat">🗑</button>' : '') +
      '<button type="button" class="svg-pop-x" title="Zavřít" aria-label="Zavřít">✕</button></div>';
    document.body.appendChild(el);
    const inp = el.querySelector('input');
    inp.value = o.value ?? '';
    let choice = o.choice;
    el.querySelectorAll('.svg-pop-choices button').forEach((bt) => bt.addEventListener('click', () => {
      choice = bt.dataset.v;
      el.querySelectorAll('.svg-pop-choices button').forEach((x) => x.classList.toggle('on', x === bt));
      inp.focus();
    }));
    // u místa klepnutí, ale vždy celé ve viditelné části obrazovky (i nad klávesnicí telefonu)
    const vv = window.visualViewport;
    const umistit = () => {
      const r = el.getBoundingClientRect();
      const t0 = vv ? vv.offsetTop : 0, l0 = vv ? vv.offsetLeft : 0;
      const vw = vv ? vv.width : innerWidth, vh = vv ? vv.height : innerHeight;
      const x = e.clientX - r.width / 2;
      let y = e.clientY + 16;
      if (y + r.height > t0 + vh - 8) y = e.clientY - r.height - 16;
      el.style.left = Math.max(l0 + 8, Math.min(x, l0 + vw - r.width - 8)) + 'px';
      el.style.top = Math.max(t0 + 8, Math.min(y, t0 + vh - r.height - 8)) + 'px';
    };
    umistit();
    vv?.addEventListener('resize', umistit); vv?.addEventListener('scroll', umistit);
    const pryc = (ev2) => { if (!el.contains(ev2.target) && !ev2.target.closest?.('[data-edit]')) zavriOkno(); };
    const t = setTimeout(() => document.addEventListener('pointerdown', pryc, true), 0);
    okno = { el, zrus: () => { clearTimeout(t); document.removeEventListener('pointerdown', pryc, true); vv?.removeEventListener('resize', umistit); vv?.removeEventListener('scroll', umistit); } };

    const potvrdit = () => {
      const raw = inp.value.trim();
      if (raw !== '' && !o.text && !Number.isFinite(ev(raw))) { inp.classList.add('svg-pop-bad'); inp.focus(); return; }
      zavriOkno();
      o.onCommit(raw, choice);
    };
    el.querySelector('.svg-pop-ok').addEventListener('click', potvrdit);
    el.querySelector('.svg-pop-x').addEventListener('click', zavriOkno);
    el.querySelector('.svg-pop-del')?.addEventListener('click', () => { zavriOkno(); o.onDelete(); });
    inp.addEventListener('input', () => inp.classList.remove('svg-pop-bad'));
    el.addEventListener('keydown', (k) => {
      if (k.key === 'Enter') { k.preventDefault(); potvrdit(); }
      if (k.key === 'Escape') { k.preventDefault(); zavriOkno(); }
    });
    inp.focus({ preventScroll: true }); inp.select();
  }
  const zapis = (inp, raw) => { inp.value = raw; inp.dispatchEvent(new Event('input', { bubbles: true })); };
  const sideChoices = () => [{ value: 'A', text: N.a }, { value: 'B', text: N.b }, { value: 'AB', text: 'z obou' }];
  const POPISKY = { D: 'D – velký průměr', d: 'd – malý průměr', L: 'Délka kužele L' };

  svg.addEventListener('click', (e) => {
    const g = e.target.closest('[data-edit]');
    if (g) {
      const key = g.dataset.edit;
      if (key === 'swap') { zavriOkno(); bigSide = bigSide === 'A' ? 'B' : 'A'; update(); return; }
      if (key === 'C' || key === 'Ca') {
        const el = $(key === 'Ca' ? 'a' : 'K');
        otevriOkno(e, {
          label: key === 'Ca' ? 'Úhel α – sklon k ose' : 'Kuželovitost', unit: key === 'Ca' ? '°' : '1:x nebo a:b', value: el.value, text: key !== 'Ca',
          hint: key === 'Ca' ? 'Kuželovitost 1:x se dopočítá' : 'např. 300 (= 1:300) nebo poměr 7:24 – úhel α se dopočítá',
          onCommit: (raw) => zapis(el, raw),
        });
      } else if (SOLVE.includes(key)) {
        const el = fieldOf(key);
        otevriOkno(e, {
          label: POPISKY[key], unit: 'mm', value: el.value,
          hint: isEdited(key) ? 'Prázdné = smazat zadání' : el.value ? 'Dopočítáno – zadáním hodnotu zafixuješ' : (key === 'L' ? 'Lze i výraz, např. 34+135+25' : ''),
          onCommit: (raw) => zapis(el, raw),
        });
      } else if (key === 'refD' || key === 'refAdd') {
        otevriOkno(e, {
          label: 'Ø z výkresu v hloubce', unit: 'mm', value: $('refD').value, hint: 'Prázdné = bez zadaného Ø. Hloubku pak nastavíš klepnutím na „hloubka Ø“.',
          onCommit: (raw) => zapis($('refD'), raw),
        });
      } else if (key === 'ref') {
        otevriOkno(e, {
          label: 'Hloubka zadaného průměru', unit: 'mm', value: $('ref').value, hint: '0 = průměr na hraně',
          choices: [{ value: 'A', text: N.a }, { value: 'B', text: N.b }], choice: $('refSide').value,
          onCommit: (raw, ch) => { $('refSide').value = ch; zapis($('ref'), raw); },
        });
      } else if (key.startsWith('pt:')) {
        const row = ptRows()[+key.slice(3)];
        if (!row) return;
        const inp = row.querySelector('.kz-pt-d'), sel = row.querySelector('.kz-pt-s');
        otevriOkno(e, {
          label: 'Měřicí místo – hloubka', unit: 'mm', value: inp.value, choices: sideChoices(), choice: sel.value,
          onCommit: (raw, ch) => { sel.value = ch; zapis(inp, raw); },
          onDelete: () => { row.remove(); if (!ptRows().length) addPoint(); update(); },
        });
      }
      return;
    }
    // klepnutí do kužele → nové měřicí místo od bližší strany
    if (!geo) return;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    const z = geo.zFromY(q.y);
    if (z === null || z === undefined || Math.abs(q.x - 170) > 126) return;
    const side = z < geo.L / 2 ? 'A' : 'B';
    const depth = Math.round((side === 'A' ? z : geo.L - z) * 10) / 10;
    otevriOkno(e, {
      label: 'Nové měřicí místo – hloubka', unit: 'mm', value: String(depth), choices: sideChoices(), choice: side,
      onCommit: (raw, ch) => {
        if (!raw) return;
        const row = ptRows().find((rr) => rr.querySelector('.kz-pt-d').value.trim() === '') || addPoint();
        row.querySelector('.kz-pt-s').value = ch;
        zapis(row.querySelector('.kz-pt-d'), raw);
      },
    });
  });

  /* ── Vstupy ── */
  const onSolveInput = (key, el, form) => {
    order = order.filter((x) => x !== key);
    if (form) { cform = form; cFields().forEach((o) => { if (o !== el) { o.value = ''; o.classList.remove('computed'); } }); }
    if (el.value.trim() !== '') { order.push(key); el.classList.remove('computed'); }
    trimOrder();
    update();
  };
  ['D', 'd', 'L'].forEach((key) => $(key).addEventListener('input', () => onSolveInput(key, $(key))));
  Object.entries(CF).forEach(([form, id]) => $(id).addEventListener('input', () => onSolveInput('C', $(id), form)));
  ['refD', 'ref'].forEach((id) => $(id).addEventListener('input', () => { if (id === 'refD') trimOrder(); update(); }));
  $('refSide').addEventListener('change', update);
  ['es', 'ei'].forEach((id) => $(id).addEventListener('input', () => {
    $('iso').value = ''; $('es').classList.remove('computed'); $('ei').classList.remove('computed'); update();
  }));
  $('iso').addEventListener('input', () => { if (!$('iso').value.trim()) { $('es').value = ''; $('ei').value = ''; $('es').classList.remove('computed'); $('ei').classList.remove('computed'); } update(); });
  $('add').addEventListener('click', () => { const row = addPoint('', 'A'); jdiNa(row.querySelector('.kz-pt-d')); });
  $('stepbtn').addEventListener('click', () => {
    const L = num($('L')), step = num($('step'));
    if (!(L > 0)) { $('err').textContent = 'Pro rozepsání po krocích nejdřív zadej (nebo dopočítej) délku kužele.'; $('err').hidden = false; return; }
    const s = step > 0 ? step : Math.round(L / 4);
    ptsEl.innerHTML = '';
    for (let d = 0; d <= L + 1e-9 && ptsEl.children.length < 60; d += s) addPoint(String(Math.round(d * 1000) / 1000), 'A');
    update();
  });
  $('clear').addEventListener('click', () => {
    order = [];
    ['D', 'd', 'L', 'K', 'a', 'refD', 'ref', 'es', 'ei', 'iso', 'step'].forEach((id) => { $(id).value = ''; $(id).classList.remove('computed'); });
    ptsEl.innerHTML = ''; addPoint(); update();
  });
  const kopiruj = (btn, t) => {
    if (!t || !navigator.clipboard) return;
    const puvodni = btn.textContent;
    navigator.clipboard.writeText(t).then(() => { btn.textContent = '✓ Zkopírováno'; setTimeout(() => (btn.textContent = puvodni), 1200); });
  };
  $('copy').addEventListener('click', () => kopiruj($('copy'), lastText));
  $('copync').addEventListener('click', () => kopiruj($('copync'), lastNc));

  /* ── Tabulky Morse / ISO ── */
  const morse = [['MT0', 9.045, 6.401, 49.8], ['MT1', 12.065, 9.371, 53.5], ['MT2', 17.780, 14.533, 64.0], ['MT3', 23.825, 19.761, 80.5], ['MT4', 31.267, 25.908, 102.5], ['MT5', 44.399, 37.468, 129.5]];
  const metric = [['1:5', '5', 0], ['1:10', '10', 0], ['1:20 (metrický)', '20', 0], ['1:50', '50', 0], ['7:24 ISO 30', '7:24', 31.75], ['7:24 ISO 40', '7:24', 44.45], ['7:24 ISO 50', '7:24', 69.85]];
  $('tables').innerHTML =
    '<p class="lbl">Morse</p><div class="table-wrap"><table class="tbl click"><thead><tr><th></th><th>D</th><th>d</th><th>L</th><th>α</th></tr></thead><tbody>' +
    morse.map(([n, D, d, L]) => `<tr data-m="${D},${d},${L}"><td>${n}</td><td>${D}</td><td>${d}</td><td>${L}</td><td>${(Math.atan((D - d) / (2 * L)) * 180 / Math.PI).toFixed(4)}°</td></tr>`).join('') +
    '</tbody></table></div><p class="lbl">Poměrové kužely</p><div class="table-wrap"><table class="tbl click"><thead><tr><th>Kužel</th><th>α</th></tr></thead><tbody>' +
    metric.map(([n, q, D]) => `<tr data-r="${q}" data-big="${D}"><td>${esc(n)}</td><td>${(Math.atan(T.ratioToC(q) / 2) * 180 / Math.PI).toFixed(4)}°</td></tr>`).join('') + '</tbody></table></div>';
  $('tables').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-m],tr[data-r]'); if (!tr) return;
    $('refD').value = '';
    SOLVE.forEach(clearKey);
    if (tr.dataset.m) {
      const [D, d, L] = tr.dataset.m.split(',');
      $('D').value = D; $('d').value = d; $('L').value = L; order = ['D', 'd', 'L'];
    } else {
      cform = 'ratio'; $('K').value = tr.dataset.r; order = ['C'];
      if (+tr.dataset.big > 0) { $('D').value = tr.dataset.big; order.push('D'); }
    }
    update();
    svg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ── Uložení vstupů (dopočítané hodnoty se neukládají) ── */
  const KEY = 'bona.kuzel2';
  const IDS = ['refD', 'ref', 'refSide', 'es', 'ei', 'iso'];
  function save() {
    try {
      const o = { order, cform, kind, bigSide };
      IDS.forEach((id) => { o[id] = $(id).classList.contains('computed') ? '' : $(id).value; });
      SOLVE.forEach((key) => { o['v_' + key] = isEdited(key) ? fieldOf(key).value : ''; });
      o.pts = ptRows().map((r) => [r.querySelector('.kz-pt-d').value, r.querySelector('.kz-pt-s').value]);
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch { /* úložiště nedostupné */ }
  }
  (function restore() {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignorovat */ }
    if (!st) return;
    IDS.forEach((id) => { if (st[id] !== undefined && st[id] !== null) $(id).value = st[id]; });
    if (st.kind) kind = st.kind;
    if (st.bigSide) bigSide = st.bigSide;
    if (CF[st.cform]) cform = st.cform;
    order = Array.isArray(st.order) ? st.order.filter((key) => SOLVE.includes(key) && st['v_' + key]) : [];
    order.forEach((key) => { fieldOf(key).value = st['v_' + key]; });
    (st.pts || []).forEach((p) => addPoint(p[0], p[1]));
  })();
  if (!ptsEl.children.length) addPoint();
  update();
})();
