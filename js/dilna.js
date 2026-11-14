'use strict';
// Roztažnost, Korekce rε, Roh a oblouk, VBD a držáky.
// Výpočty ze SKICA 2D CAD/CAM jsou ve window.Vypocty (thermal, nose, corner, arc, vbd).

(function () {
  const V = window.Vypocty;
  const $ = (id) => document.getElementById(id);
  const ev = (s) => V.safeEvalMath(String(s ?? ''));
  const val = (id) => { const e = $(id); return e.value.trim() === '' ? null : ev(e.value); };
  const f = (x, d = 3) => { const s = String(parseFloat(Number(x).toFixed(d))); return s === '-0' ? '0' : s; };
  const sg = (x, d = 3) => (x > 0 ? '+' : '') + f(x, d);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = (k, d) => { try { const v = localStorage.getItem('bona.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem('bona.' + k, JSON.stringify(v)); } catch { /* nedostupné */ } };
  const on = (ids, fn) => ids.forEach((id) => { const e = $(id); e.addEventListener(e.tagName === 'SELECT' ? 'change' : 'input', fn); });
  function segTabs(btnAttr, tabAttr, onChange) {
    const btns = document.querySelectorAll(`[data-${btnAttr}]`);
    const set = (t) => {
      btns.forEach((b) => b.classList.toggle('active', b.dataset[btnAttr] === t));
      document.querySelectorAll(`[data-${tabAttr}]`).forEach((d) => (d.hidden = d.dataset[tabAttr] !== t));
      onChange && onChange(t);
    };
    btns.forEach((b) => b.addEventListener('click', () => set(b.dataset[btnAttr])));
    return set;
  }
  const ptsTable = (rows) => '<table class="tbl"><thead><tr><th>Bod</th><th>Z</th><th>Ø X</th></tr></thead><tbody>' +
    rows.map(([n, p, prog]) => `<tr${prog ? ' class="prog"' : ''}><td>${n}</td><td>${f(p.z)}</td><td>${f(p.d)}</td></tr>`).join('') + '</tbody></table>';

  /* ══════════════ ROZTAŽNOST ══════════════ */
  (function roztaznost() {
    const T = V.thermal;
    document.querySelectorAll('.tp-mat').forEach((s) => {
      s.innerHTML = T.THERMAL_MATERIALS.map(([k, n, a]) => `<option value="${a}">${n} (α ${String(a).replace('.', ',')})</option>`).join('');
    });
    segTabs('tp', 'tptab');

    function mer() {
      const a = +$('tp-mat').value, L = val('tp-l'), t = val('tp-t');
      if (!(L > 0) || !Number.isFinite(t)) { $('tp-out').textContent = 'Zadej rozměr a teplotu dílu.'; return; }
      const at20 = T.sizeAtRef(L, a, t), hot = T.sizeAtTemp(L, a, t);
      $('tp-out').innerHTML =
        `Naměřeno ${f(L, 4)} mm při ${f(t, 1)} °C → <b>při 20 °C bude ${f(at20, 4)} mm</b> (${sg(at20 - L, 4)} mm)<br>` +
        `<span class="hint">Opačně: má-li mít díl ${f(L, 4)} mm při 20 °C, při ${f(t, 1)} °C musíš naměřit <b>${f(hot, 4)} mm</b>.</span><br>` +
        `<span class="hint">Změna na každý 1 °C: ${f(L * a * 1e-6 * 1000, 2)} µm</span>`;
    }
    on(['tp-mat', 'tp-l', 'tp-t'], mer); mer();

    function lis() {
      const r = T.shrinkFit({ d: val('tl-d'), interference: val('tl-i'), clearance: val('tl-c') || 0, alpha: +$('tl-mat').value, T0: val('tl-t0') ?? 20 });
      $('tl-out').innerHTML = r
        ? `Potřebná změna průměru ${f(r.dD, 3)} mm (ΔT = ${f(r.dT, 0)} °C)<br>Ohřev díry na <b>${f(r.heated, 0)} °C</b> · nebo chlazení hřídele na <b>${f(r.cooled, 0)} °C</b>` +
          (r.cooled < -196 ? '<div class="warn">Chlazení pod −196 °C (tekutý dusík) nejde – zvol ohřev.</div>' : '')
        : 'Zadej průměr spoje a přesah.';
    }
    on(['tl-mat', 'tl-d', 'tl-i', 'tl-c', 'tl-t0'], lis); lis();

    function vule() {
      const d = val('tv-d'), t = val('tv-t');
      if (!(d > 0) || !Number.isFinite(t)) { $('tv-out').textContent = 'Zadej průměr a teplotu.'; return; }
      const g = T.gapChange({ d, alphaHole: +$('tv-mh').value, alphaShaft: +$('tv-ms').value, T: t });
      $('tv-out').innerHTML = `Vůle se změní o <b>${sg(g * 1000, 1)} µm</b> (${sg(g, 4)} mm) – ${g > 0 ? 'zvětší se' : g < 0 ? 'zmenší se' : 'nezmění se'}`;
    }
    on(['tv-mh', 'tv-ms', 'tv-d', 'tv-t'], vule); vule();
  })();

  /* ══════════════ KOREKCE Rε ══════════════ */
  (function korekce() {
    const N = V.nose;
    let mode = 'line';
    segTabs('rz', '__none', (t) => { mode = t; document.querySelectorAll('[data-rzs]').forEach((e) => (e.hidden = e.dataset.rzs !== mode)); calc(); });
    const chipsEl = $('rz-chips');
    const kresliChips = () => {
      chipsEl.innerHTML = [0.4, 0.8, 1.2, 1.6, 2.4, 3.2, 4, 6].map((v) => `<button type="button" class="chip${$('rz-r').value.trim() === String(v) ? ' active' : ''}" data-v="${v}">rε ${v}</button>`).join('');
    };
    chipsEl.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { $('rz-r').value = b.dataset.v; calc(); } });

    function calc() {
      kresliChips();
      const internal = $('rz-side').value === 'int';
      const r = val('rz-r'), D = val('rz-D'), z0 = val('rz-z0') ?? 0;
      const out = $('rz-out'), pts = $('rz-pts');
      pts.innerHTML = '';
      if (mode === 'line') {
        const rev = $('rz-orient').value === 'rev';
        const grows = !rev !== internal;
        $('rz-info').textContent = 'Ø ' + (grows ? 'roste' : 'klesá') + ' ke sklíčidlu (−Z): ' +
          (!rev ? (internal ? 'sražení na vstupu díry, kužel do díry' : 'sražení na konci, kužel ke sklíčidlu') : 'zpětný kužel – nůž ho bere zadní stranou rádiusu');
      } else {
        const cc = $('rz-arc').value === 'concave';
        $('rz-info').textContent = cc ? `Rádius v osazení u ${internal ? 'díry' : 'válce'} Ø D (čelo osazení k +Z)` : `Zaoblení hrany mezi čelem a ${internal ? 'dírou' : 'válcem'} Ø D`;
      }
      if (!(r >= 0)) { out.textContent = 'Zadej rádius špičky rε.'; return; }

      if (mode === 'line') {
        const a = val('rz-a'), rev = $('rz-orient').value === 'rev';
        const c = Number.isFinite(a) ? N.lineCorrection(r, a, { internal, reverse: rev }) : null;
        if (!c) { out.textContent = 'Úhel α musí být mezi 0° a 90° (od osy Z).'; return; }
        const err = Math.abs(c.delta);
        out.innerHTML = `<b style="font-size:1.3rem">ΔZ ${sg(c.dz)} · ΔØ ${sg(2 * c.dx)}</b><br>` +
          `Posun bodů na válci (Z): <b>${sg(c.dz)} mm</b><br>Posun bodů na čele (X na průměr): <b>${sg(2 * c.dx)} mm</b><br>` +
          `Chyba bez korekce (kolmo k obrysu): ${f(err)} mm${err > 1e-9 ? ' – ' + (c.delta < 0 ? 'zůstane materiál' : 'podřízne obrys') : ''}`;
        if (rev) { if (D !== null) pts.innerHTML = '<p class="hint">Body se počítají jen pro sražení / kužel, ne pro zpětný kužel.</p>'; return; }
        const cl = val('rz-c');
        if (D === null && cl === null) return;
        const cp = Number.isFinite(D) && Number.isFinite(cl) ? N.chamferPoints(r, a, D, cl, z0, internal) : null;
        if (!cp) { pts.innerHTML = '<p class="hint">Zadej kladné Ø D a délku sražení c.</p>'; return; }
        pts.innerHTML = ptsTable([
          ['Obrys – na čele', cp.contour.a], ['<b>Program – na čele</b>', cp.prog.a, true],
          [`Obrys – na ${internal ? 'díře' : 'válci'}`, cp.contour.b], [`<b>Program – na ${internal ? 'díře' : 'válci'}</b>`, cp.prog.b, true],
        ]) + `<pre class="code">G1 X${f(cp.prog.a.d)} Z${f(cp.prog.a.z)}\nG1 X${f(cp.prog.b.d)} Z${f(cp.prog.b.z)}</pre>`;
      } else {
        const R = val('rz-R'), concave = $('rz-arc').value === 'concave', sx = internal ? -1 : 1;
        if (!(R > 0)) { out.textContent = 'Zadej rádius obrysu R.'; return; }
        if (concave && R < r) { out.innerHTML = '<div class="warn">Rádius nože rε je větší než vydutý rádius R – nůž ho nevyrobí (podřízne).</div>'; return; }
        const Rp = concave ? R - r : R + r;
        out.innerHTML = `Programovaný rádius dráhy: <b style="font-size:1.3rem">R' = ${f(Rp)} mm</b> (${concave ? 'R − rε' : 'R + rε'})<br>` +
          `Bod na čele: posun X na průměr ${sg(-sx * 2 * r)} mm · bod na ${internal ? 'díře' : 'válci'}: posun Z ${sg(-r)} mm` +
          (Rp === 0 ? '<br><span class="hint">R\' = 0 – špička projede roh bez oblouku.</span>' : '');
        if (D === null) return;
        const ac = Number.isFinite(D) ? N.arcCorrection(r, R, D, z0, { internal, concave }) : null;
        if (!ac || ac.contour.face.d < 0 || ac.prog.face.d < 0) { pts.innerHTML = '<p class="hint">Zadej kladné Ø D (rádius se musí vejít do průměru).</p>'; return; }
        const a1 = concave ? 'cyl' : 'face', a2 = concave ? 'face' : 'cyl', nm = { face: 'na čele', cyl: internal ? 'na díře' : 'na válci' };
        pts.innerHTML = ptsTable([
          ['Obrys – ' + nm[a1], ac.contour[a1]], ['<b>Program – ' + nm[a1] + '</b>', ac.prog[a1], true],
          ['Obrys – ' + nm[a2], ac.contour[a2]], ['<b>Program – ' + nm[a2] + '</b>', ac.prog[a2], true],
          ['Střed oblouku obrysu', ac.contour.center], ['<b>Střed oblouku dráhy</b>', ac.prog.center, true],
        ]);
      }
    }
    on(['rz-side', 'rz-orient', 'rz-arc', 'rz-r', 'rz-a', 'rz-R', 'rz-D', 'rz-c', 'rz-z0'], calc);
    calc();
  })();

  /* ══════════════ ROH A OBLOUK ══════════════ */
  (function geometrie() {
    const C = V.corner, A = V.arc;
    let tab = 'roh';
    const mach = $('geo-mach');
    mach.value = load('stroj', 'karusel');
    // Smysl oblouku ze SKICA (corner.js → arcCode): na karuselu jsou osy prohozené, takže se smysl obrací
    const arcCode = (ccwZX) => ((mach.value === 'karusel' ? !ccwZX : ccwZX) ? 'G3' : 'G2');
    const P = (z, X) => (z === null || X === null ? null : Number.isFinite(z) && Number.isFinite(X) ? { z, x: X / 2 } : NaN);
    const D = (p) => ({ z: p.z, d: 2 * p.x });
    const prog = (p) => `X${f(2 * p.x)} Z${f(p.z)}`;
    segTabs('geo', 'geotab', (t) => { tab = t; calc(); });
    const out = $('geo-out'), pts = $('geo-pts');

    function roh() {
      const isR = $('cr-kind').value === 'R';
      $('cr-vl').textContent = isR ? 'Rádius R [mm]' : 'Sražení C (odvěsna) [mm]';
      const P1 = P(val('cr-z1'), val('cr-x1')), Cc = P(val('cr-zc'), val('cr-xc')), P2 = P(val('cr-z2'), val('cr-x2')), v = val('cr-v');
      if ([P1, Cc, P2].some((p) => Number.isNaN(p))) return void (out.textContent = 'Neplatná souřadnice.');
      if (!P1 || !Cc || !P2) return void (out.textContent = 'Zadej předchozí bod P1, roh a další bod P2 (Z a Ø X).');
      if (!C.cornerDirections(P1, Cc, P2)) return void (out.textContent = 'Úseky leží v přímce (nebo se vrací zpět) – není co zaoblit.');
      if (!(v > 0)) return void (out.textContent = isR ? 'Zadej rádius R.' : 'Zadej odvěsnu sražení C.');
      if (isR) {
        const r = C.cornerFillet(P1, Cc, P2, v), code = arcCode(r.ccw);
        out.innerHTML = `Vzdálenost tečných bodů od rohu <b>t = ${f(r.t)} mm</b><br>Vnitřní úhel rohu ${f(r.inner, 3)}° · oblouk <b>${code}</b>` +
          (!r.fits1 || !r.fits2 ? `<div class="warn">Rádius se nevejde do ${!r.fits1 ? '1.' : '2.'} úseku – tečný bod leží za jeho koncem.</div>` : '');
        pts.innerHTML = ptsTable([['Tečný bod T1 (konec 1. úseku)', D(r.T1), true], ['Tečný bod T2 (začátek 2. úseku)', D(r.T2), true], ['Střed oblouku', D(r.O)]]) +
          `<pre class="code">G1 ${prog(r.T1)}\n${code} ${prog(r.T2)} CR=${f(v)}</pre>`;
      } else {
        const r = C.cornerChamfer(P1, Cc, P2, v);
        out.innerHTML = `Délka sražení <b>${f(r.width)} mm</b> (odvěsny ${f(v)} mm) · vnitřní úhel rohu ${f(r.inner, 3)}°` +
          (!r.fits1 || !r.fits2 ? `<div class="warn">Sražení se nevejde do ${!r.fits1 ? '1.' : '2.'} úseku.</div>` : '');
        pts.innerHTML = ptsTable([['Začátek sražení A', D(r.A), true], ['Konec sražení B', D(r.B), true]]) + `<pre class="code">G1 ${prog(r.A)}\nG1 ${prog(r.B)}</pre>`;
      }
    }
    const kod = (S, E, O, R, code, large) =>
      `<pre class="code">G1 ${prog(S)}\n${code} ${prog(E)} CR=${large ? '-' : ''}${f(R)}\n; nebo se středem:\n${code} ${prog(E)} I${f(O.x - S.x)} K${f(O.z - S.z)}</pre>`;
    function chord() {
      const c = val('ar-c'), h = val('ar-h'), R = val('ar-R');
      const n = [c, h, R].filter((x) => x !== null).length;
      if (n < 2) return void (out.textContent = 'Zadej dvě ze tří hodnot.');
      const use = c !== null && h !== null ? { c, h } : { c, h, R };
      const r = A.arcFromTwo(use);
      if (!r) return void (out.textContent = 'Takový oblouk neexistuje (tětiva je delší než průměr, nebo výška je větší než 2R).');
      out.innerHTML = `Tětiva <b>${f(r.c)}</b> · výška <b>${f(r.h)}</b> · rádius <b>R ${f(r.R)}</b> mm<br>Středový úhel ${f(r.angle, 3)}° · délka oblouku ${f(r.length)} mm` +
        (n === 3 && Math.abs(r.R - R) > 1e-3 * Math.max(R, 1) ? `<div class="warn">Zadané R nesedí s c a h – R vychází ${f(r.R)}.</div>` : '') +
        (n === 2 && R !== null && c !== null ? `<br><span class="hint">Existuje i oblouk přes půlkruh: h = ${f(A.arcLargeVariant(r).h)} mm.</span>` : '');
    }
    function tri() {
      const p1 = P(val('ap-z1'), val('ap-x1')), p2 = P(val('ap-z2'), val('ap-x2')), p3 = P(val('ap-z3'), val('ap-x3'));
      if ([p1, p2, p3].some((p) => Number.isNaN(p))) return void (out.textContent = 'Neplatná souřadnice.');
      if (!p1 || !p2 || !p3) return void (out.textContent = 'Zadej tři body oblouku (Z a Ø X).');
      const r = A.arcFrom3Points(p1, p2, p3);
      if (!r) return void (out.textContent = 'Body leží na jedné přímce – oblouk nejde určit.');
      const code = arcCode(r.ccw);
      out.innerHTML = `<b>R ${f(r.R)} mm</b> · střed Z${f(r.O.z)} Ø X${f(2 * r.O.x)} · <b>${code}</b><br>Úhel ${f(r.sweep, 3)}° · délka ${f(r.length)} mm`;
      pts.innerHTML = kod(p1, p3, r.O, r.R, code, r.sweep > 180 + 1e-9);
    }
    function ends() {
      const S = P(val('ae-zs'), val('ae-xs')), E = P(val('ae-ze'), val('ae-xe')), R = val('ae-R');
      if ([S, E].some((p) => Number.isNaN(p))) return void (out.textContent = 'Neplatná souřadnice.');
      if (!S || !E || !(R > 0)) return void (out.textContent = 'Zadej začátek, konec a rádius.');
      const code = $('ae-dir').value, ccw = arcCode(true) === code, large = $('ae-size').value === 'large';
      const r = A.arcFromEndsRadius(S, E, R, ccw, large);
      if (!r) { const half = Math.hypot(E.z - S.z, E.x - S.x) / 2; return void (out.textContent = half < 1e-9 ? 'Začátek a konec splývají.' : `Rádius je příliš malý – musí být alespoň ${f(half)} mm.`); }
      out.innerHTML = `Střed <b>Z${f(r.O.z)} Ø X${f(2 * r.O.x)}</b> · I ${f(r.I)} (poloměr) · K ${f(r.K)}<br>Tětiva ${f(r.chord)} mm · úhel ${f(r.sweep, 3)}° · délka ${f(r.length)} mm`;
      pts.innerHTML = kod(S, E, r.O, R, code, large);
    }
    function calc() {
      save('stroj', mach.value);
      pts.innerHTML = '';
      ({ roh, chord, pts: tri, ends })[tab]();
    }
    document.querySelectorAll('#geo input, #geo select').forEach((e) => e.addEventListener(e.tagName === 'SELECT' ? 'change' : 'input', calc));
    calc();
  })();

  /* ══════════════ VBD A DRŽÁKY ══════════════ */
  (function vbd() {
    const B = V.vbd;
    const radek = (pos, title, value, popis, extra = '') =>
      `<tr><td class="pos">${pos}</td><td><code>${esc(value)}</code></td><td><b>${title}</b><br>${popis ? esc(popis) : '<span class="hint">neznámý kód</span>'}${extra ? '<br><span class="hint">' + esc(extra) + '</span>' : ''}</td></tr>`;

    function insert() {
      const raw = $('vb-code').value;
      if (!raw.trim()) { $('vb-out').innerHTML = ''; return; }
      const p = B.parseVbdCode(raw), shape = p[1];
      const shapeObj = B.SHAPES.find((s) => s.v === shape);
      let rows = '';
      for (let i = 1; i <= 9; i++) {
        if (p[i] === '-') continue;
        const opt = (B.VBD_ISO[i].options || []).find((o) => o.v === p[i]);
        rows += radek(i, B.VBD_ISO[i].title, p[i], B.describePosition(i, p[i], shape), opt && opt.dt);
      }
      if (p.suffix) rows += radek('–', 'Označení výrobce', p.suffix, 'utvařeč / geometrie (není součást ISO)');
      const holders = B.holdersFor(shape, p[2], p[4]);
      $('vb-out').innerHTML = (shapeObj ? `<div class="vbd-head"><svg viewBox="0 0 70 70" width="56" height="56">${shapeObj.svg}</svg><div><b>${esc(shapeObj.d)}</b><br><span class="hint">${esc(shapeObj.dt)}</span></div></div>` : '') +
        `<table class="tbl vbd-tbl"><tbody>${rows}</tbody></table>` +
        (holders ? `<div class="result">Vhodné držáky: <b>${esc(holders)}</b>…</div>` : '');
    }
    $('vb-code').addEventListener('input', insert);
    const ex = ['CNMG 190612', 'SNMG 250724', 'RCMX 2507M0', 'DNMG 150608', 'WNMG 080412', 'CCMT 120408'];
    $('vb-ex').innerHTML = ex.map((x) => `<button type="button" class="chip" data-v="${x}">${x}</button>`).join('');
    $('vb-ex').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { $('vb-code').value = b.dataset.v; insert(); } });

    function holder() {
      const raw = $('vh-code').value;
      if (!raw.trim()) { $('vh-out').innerHTML = ''; return; }
      const p = B.parseHolderCode(raw);
      if (p[1] === '-') { $('vh-out').innerHTML = '<p class="hint">Zadej aspoň 5 znaků kódu (např. PCLNR).</p>'; return; }
      let rows = '';
      for (let i = 1; i <= 7; i++) {
        if (p[i] === '-') continue;
        const o = B.holderIso[i].options.find((x) => x.v === p[i]);
        rows += radek(i, B.holderIso[i].title, p[i], o ? o.d : (i >= 6 ? p[i] + ' mm' : null), o && o.dt);
      }
      // délka (8) a velikost destičky (9) za výškou a šířkou, např. PCLNR 3232 P 19
      const rest = raw.replace(/[\s-]/g, '').toUpperCase().slice(9);
      if (rest) rows += radek('8–9', 'Délka nástroje / velikost destičky', rest, 'Písmeno = funkční délka (např. P = 170 mm, M = 150 mm), číslo = délka břitu destičky');
      const recInsert = p[2] !== '-' && p[4] !== '-' ? (p[1] === 'S' ? ['MT', 'MW'] : p[1] === 'C' ? ['MN', 'GN'] : ['MG', 'MM']).map((t) => p[2] + p[4] + t).join(', ') : '';
      $('vh-out').innerHTML = `<table class="tbl vbd-tbl"><tbody>${rows}</tbody></table>` + (recInsert ? `<div class="result">Vhodné destičky: <b>${recInsert}</b>…</div>` : '');
    }
    $('vh-code').addEventListener('input', holder);
  })();
})();
