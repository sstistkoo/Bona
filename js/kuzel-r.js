'use strict';
// Kužel – záložka „Přechod R": rádius tečně napojený na čelo na vrchu i spodku
// kužele (např. Ø se zápichem s R). Převzato ze SKICA 2D CAD/CAM (taperFillet.js),
// výpočty a klikací profil jsou ve window.Vypocty.taperFillet. Kužel (Ø nahoře,
// Ø dole, L, α) se zadává tady i v záložce Kužel – pole jsou propojená
// přes window.BonaKuzel (js/kuzel.js). Strany: A = spodek, B = vrch.

(function () {
  const K = window.BonaKuzel, TF = window.Vypocty.taperFillet, T = window.Vypocty.taper, ev = window.Vypocty.safeEvalMath;
  const sec = document.getElementById('kuzel');
  if (!K || !TF || !sec) return;
  const SIDES = ['B', 'A'];
  const NAME = { B: 'Vrch', A: 'Spodek' };
  const f3 = T.f3, t3 = (x) => f3(x).replace(/\.?0+$/, '') || '0';
  const num = (el) => { const s = el.value.trim(); if (!s) return null; const v = ev(s); return isFinite(v) ? v : NaN; };
  const ncText = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/−/g, '-').replace(/Ø/g, '').toUpperCase();

  /* ── HTML: přepínač Kužel / Přechod R + karta přechodu ── */
  const inp = (id, ph) => `<input type="text" inputmode="decimal" data-kr="${id}" placeholder="${ph}" autocomplete="off">`;
  const sel = (id, opts) => `<select data-kr="${id}">${opts.map((o) => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
  const FACE = [['out', 'k většímu Ø'], ['in', 'k ose']], GIVEN = [['corner', 'průsečík'], ['start', 'začátek R']];
  const row = (label, id, ph) => `<tr><th>${label}</th><td>${inp(id + 'B', ph)}</td><td>${inp(id + 'A', ph)}</td></tr>`;
  const rowSel = (label, id, opts) => `<tr><th>${label}</th><td>${sel(id + 'B', opts)}</td><td>${sel(id + 'A', opts)}</td></tr>`;

  const tabs = document.createElement('div');
  tabs.className = 'seg kr-tabs';
  tabs.innerHTML = '<button type="button" class="seg-btn active" data-krmode="cone">△ Kužel</button><button type="button" class="seg-btn" data-krmode="r">◜ Přechod R</button>';
  sec.insertBefore(tabs, sec.firstChild);

  const card = document.createElement('div');
  card.className = 'card kr-card';
  card.hidden = true;
  card.innerHTML =
    '<h3 class="sub" style="margin-top:0">Přechod R <small class="hint">(rádius kužel ↔ čelo, vrch i spodek)</small></h3>' +
    '<p class="hint">Klepni v profilu na hodnotu a zadej ji, nebo vyplň pole. Kužel stačí 3 údaje – stejné jako v záložce Kužel.</p>' +
    `<svg class="kz-svg kr-svg" viewBox="0 0 ${TF.SK_W} ${TF.SK_H}" role="img" aria-label="Profil s přechody R"></svg>` +
    '<div class="warn" data-kr-err hidden></div>' +
    '<div class="grid">' +
      `<label>Ø nahoře <small>průsečík</small>${inp('cB', 'např. 330')}</label>` +
      `<label>Ø dole <small>průsečík</small>${inp('cA', '')}</label>` +
      `<label>Délka L [mm]${inp('cL', 'např. 50')}</label>` +
      `<label>Úhel α [°]${inp('ca', 'např. 10')}</label>` +
    '</div>' +
    '<div class="kz-big"><span>Větší Ø je</span><div class="seg kz-bigseg"><button type="button" class="seg-btn" data-krbig="A">dole</button><button type="button" class="seg-btn" data-krbig="B">nahoře</button></div></div>' +
    '<div class="table-wrap"><table class="tbl kr-grid"><thead><tr><th></th><th>▲ Vrch</th><th>▼ Spodek</th></tr></thead><tbody>' +
      row('R [mm]', 'R', 'např. 12') +
      rowSel('Čelo od hrany', 'face', FACE) +
      row('Úhel čela [°]', 'ang', '0 = kolmo') +
      row('Čelo do Ø', 'fend', 'nepovinné') +
      row('Délka čela', 'flen', 'nebo délka') +
      rowSel('Zadávám', 'given', GIVEN) +
      row('Ø začátku R', 'dia', '—') +
      '<tr><th></th><td><button type="button" class="secondary kr-flip" data-side="B">⇄ Otočit R</button></td><td><button type="button" class="secondary kr-flip" data-side="A">⇄ Otočit R</button></td></tr>' +
    '</tbody></table></div>' +
    '<p class="hint">Úhel čela: 0 = kolmo k ose, + stoupá k vrchu, − klesá ke spodku. Čelo: Ø konce nebo délka – druhé se dopočítá a ohlídá se, že se R vejde. „Začátek R" = Ø, kde R z čela odbočí – průsečík se dopočítá.</p>' +
    `<div class="grid"><label>Z čela vrchu <small>nepovinné</small>${inp('zTop', 'pro souřadnice Z')}</label></div>` +
    '<div class="table-wrap" data-kr-res></div>' +
    '<div class="row" style="margin-top:12px; flex-wrap:wrap">' +
      '<button type="button" class="secondary" data-kr-copy>📋 Kopírovat</button>' +
      '<button type="button" class="secondary" data-kr-copync title="VELKÁ PÍSMENA BEZ DIAKRITIKY – jako komentář v programu">📝 Do programu</button>' +
    '</div>';
  sec.appendChild(card);

  const $ = (id) => card.querySelector(`[data-kr="${id}"]`);
  const svg = card.querySelector('.kr-svg');
  const errEl = card.querySelector('[data-kr-err]'), resEl = card.querySelector('[data-kr-res]');
  const IDS = ['RB', 'faceB', 'angB', 'fendB', 'flenB', 'givenB', 'diaB', 'RA', 'faceA', 'angA', 'fendA', 'flenA', 'givenA', 'diaA', 'zTop'];
  const fmode = { A: '', B: '' };                 // u čela zadané: 'dia' (Ø konce), 'len' (délka), '' – druhé se dopočítá
  let last = null, info = null, text = '', nc = '';

  /* ── Přepínač záložek ── */
  const KEY_MODE = 'bona.kuzelR.mode';
  function setMode(m) {
    tabs.querySelectorAll('[data-krmode]').forEach((b) => b.classList.toggle('active', b.dataset.krmode === m));
    [...sec.children].forEach((c) => { if (c !== tabs) c.hidden = m === 'r' ? c !== card : c === card; });
    try { localStorage.setItem(KEY_MODE, m); } catch { /* bez úložiště */ }
  }
  tabs.querySelectorAll('[data-krmode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.krmode)));

  /* ── Pole kužele – propojená se záložkou Kužel ── */
  function coneEl(id) {
    const big = K.bigSide;
    if (id === 'cB') return K.field(big === 'B' ? 'D' : 'd');
    if (id === 'cA') return K.field(big === 'A' ? 'D' : 'd');
    if (id === 'cL') return K.field('L');
    return K.field('a');
  }
  const minis = ['cB', 'cA', 'cL', 'ca'];
  function mirrorCone() {
    minis.forEach((id) => {
      const el = $(id), src = coneEl(id);
      if (el === document.activeElement || !src) return;
      el.value = src.value;
      el.classList.toggle('computed', src.classList.contains('computed'));
    });
    card.querySelectorAll('[data-krbig]').forEach((b) => b.classList.toggle('active', b.dataset.krbig === K.bigSide));
  }
  const fire = (el) => el.dispatchEvent(new Event('input', { bubbles: true }));
  minis.forEach((id) => $(id).addEventListener('input', () => {
    const el = $(id);
    // Zadané oba Ø: kde je větší, se pozná samo (jinak D < d a záporný úhel)
    if (id === 'cB' || id === 'cA') {
      const o = $(id === 'cB' ? 'cA' : 'cB');
      const v = num(el), ov = o.classList.contains('computed') ? null : num(o);
      if (v > 0 && ov > 0 && Math.abs(v - ov) > 1e-9) {
        const top = id === 'cB' ? v : ov, bot = id === 'cB' ? ov : v;
        const want = top > bot ? 'B' : 'A';
        if (K.bigSide !== want) {
          K.setBig(want);
          const D = K.field('D'), d = K.field('d');
          D.value = String(Math.max(v, ov)); fire(D);
          d.value = String(Math.min(v, ov)); fire(d);
          return;
        }
      }
    }
    const src = coneEl(id);
    src.value = el.value; fire(src);
  }));
  card.querySelectorAll('[data-krbig]').forEach((b) => b.addEventListener('click', () => K.setBig(b.dataset.krbig)));

  /* ── Pole přechodu ── */
  function syncVisibility() {
    SIDES.forEach((side) => {
      const d = $('dia' + side), start = $('given' + side).value === 'start';
      d.disabled = !start; d.placeholder = start ? 'Ø na čele' : '—';
    });
  }
  const KEY = 'bona.kuzelR';
  function save() {
    try {
      const o = { fmodeA: fmode.A, fmodeB: fmode.B };
      IDS.forEach((id) => { o[id] = $(id).classList.contains('computed') ? '' : $(id).value; });
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch { /* bez úložiště */ }
  }
  function restore() {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignorovat */ }
    if (st) {
      IDS.forEach((id) => { if (st[id] != null) $(id).value = st[id]; });
      SIDES.forEach((side) => { fmode[side] = st['fmode' + side] || ''; });
    } else {
      $('face' + K.bigSide).value = 'out';
      $('face' + (K.bigSide === 'A' ? 'B' : 'A')).value = 'in';
    }
    syncVisibility();
  }
  const changed = () => { syncVisibility(); save(); recompute(); };
  SIDES.forEach((side) => [['fend', 'dia'], ['flen', 'len']].forEach(([k, mode]) => {
    $(k + side).addEventListener('input', () => {
      const el = $(k + side);
      el.classList.remove('computed');
      if (el.value.trim()) fmode[side] = mode; else if (fmode[side] === mode) fmode[side] = '';
    }, true);
  }));
  IDS.forEach((id) => $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', changed));
  function flip(side) { $('face' + side).value = $('face' + side).value === 'in' ? 'out' : 'in'; changed(); }
  card.querySelectorAll('.kr-flip').forEach((b) => b.addEventListener('click', () => flip(b.dataset.side)));

  function readEdges() {
    const e = {};
    SIDES.forEach((side) => {
      const R = num($('R' + side));
      e[side] = R > 0 ? {
        R, face: $('face' + side).value, beta: num($('ang' + side)) || 0, given: $('given' + side).value, dia: num($('dia' + side)),
        faceEndDia: fmode[side] === 'dia' ? num($('fend' + side)) : null, faceLen: fmode[side] === 'len' ? num($('flen' + side)) : null,
      } : null;
    });
    return e;
  }

  /* ── Přepočet (po každé změně kužele i přechodu) ── */
  function recompute() {
    if (!info) return;
    mirrorCone();
    const { sol, done, bigSide } = info;
    const edges = readEdges();
    const bad = [];
    SIDES.forEach((side) => {
      ['R', 'dia', 'fend', 'flen'].forEach((k) => { const el = $(k + side); if (el.value.trim() && !(num(el) >= 0)) bad.push(k === 'R' ? 'R ' + NAME[side].toLowerCase() : k === 'dia' ? 'Ø začátku R' : 'čelo'); });
      const a = $('ang' + side);
      if (a.value.trim() && !(Math.abs(num(a)) < 90)) bad.push('úhel čela ' + NAME[side].toLowerCase() + ' (−90 … 90°)');
    });
    const zTop = num($('zTop'));
    if ($('zTop').value.trim() && !isFinite(zTop)) bad.push('Z čela vrchu');
    const msgs = [];
    if (info.err) msgs.push('Kužel: ' + info.err);
    text = nc = ''; last = null; resEl.innerHTML = '';
    if (!edges.A && !edges.B) {
      // nic
    } else if (!done) {
      if (!info.err) msgs.push('Doplň kužel: stačí 3 údaje z Ø nahoře, Ø dole, L a α (nebo klepni v profilu).');
    } else {
      const r = TF.taperFillets({ D: sol.D, d: sol.d, L: sol.L, C: sol.C, bigSide, edges });
      last = r;
      if (r.error) msgs.push(r.error);
      const L = sol.L, hasZ = isFinite(zTop) && zTop !== null;
      const depth = (z) => L - z, zAbs = (z) => zTop - depth(z);
      const zTxt = (z) => (hasZ ? f3(zAbs(z)) : f3(depth(z)));
      const lines = ['Kužel α ' + t3(Math.atan(sol.C / 2) * 180 / Math.PI) + '°, Ø nahoře ' + f3(bigSide === 'B' ? sol.D : sol.d) +
        ', Ø dole ' + f3(bigSide === 'A' ? sol.D : sol.d) + ', L ' + t3(L)];
      const line = (n, p) => lines.push(n + ': Ø' + f3(p.dia) + (hasZ ? ' Z' + f3(zAbs(p.z)) : ' hl. ' + f3(depth(p.z)) + ' od vrchu'));
      let h = `<table class="tbl kz-tbl"><thead><tr><th>Bod <small>(shora dolů)</small></th><th>Ø</th><th>${hasZ ? 'Z' : 'hl. od vrchu'}</th></tr></thead><tbody>`;
      const trow = (n, p, cls = '') => { h += `<tr class="${cls}"><td>${n}</td><td><b>${f3(p.dia)}</b></td><td>${zTxt(p.z)}</td></tr>`; };
      SIDES.forEach((side) => {
        const e = r.edges[side];
        if (!e) return;
        const nm = NAME[side];
        if (e.error && !e.corner) { msgs.push(nm + ': ' + e.error); return; }
        if (e.error) msgs.push(nm + ' R' + t3(e.R) + ': ' + e.error);
        h += `<tr class="kz-end"><td colspan="3"><b>${nm} R${t3(e.R)}</b> <small>(čelo ${e.face === 'in' ? 'k ose' : 'k většímu Ø'}${e.beta ? ' pod ' + t3(e.beta) + '°' : ''}, tečná délka ${f3(e.t)})</small></td></tr>`;
        lines.push(nm + ' R' + t3(e.R));
        const seq = side === 'B' ? [['Začátek R na čele', e.onFace], ['Konec R na kuželu', e.onCone]]
          : [['Konec kužele / začátek R', e.onCone], ['Konec R na čele', e.onFace]];
        if (side === 'B' && e.faceEnd) { trow('Konec čela', e.faceEnd); line('Konec čela', e.faceEnd); }
        trow('Průsečík (ostrá hrana)', e.corner, 'kz-end');
        seq.forEach(([n, p]) => { trow(n, p); line(n, p); });
        if (side === 'A' && e.faceEnd) { trow('Konec čela', e.faceEnd); line('Konec čela', e.faceEnd); }
        trow('Střed R', e.center, 'kz-end'); line('Střed R', e.center);
        if (e.maxDia) { trow('★ Největší Ø na R (posuvka)', e.maxDia, 'kz-refrow'); line('Největší Ø na R', e.maxDia); }
        if (e.minDia) { trow('★ Nejmenší Ø na R', e.minDia, 'kz-refrow'); line('Nejmenší Ø na R', e.minDia); }
        if (Math.abs(e.mismatch) > 5e-4) {
          msgs.push(`${nm}: ze začátku R vychází průsečík Ø${f3(e.corner.dia)}, kužel má na hraně Ø${f3(e.corner.dia - e.mismatch)}.`);
          h += `<tr><td colspan="3"><button type="button" class="secondary kr-take" data-side="${side}">↦ Průsečík Ø${f3(e.corner.dia)} převzít do kužele</button></td></tr>`;
        }
      });
      h += '</tbody></table>';
      if (!hasZ) h += '<p class="hint">Zadej „Z čela vrchu" a hloubky se přepočtou na souřadnice Z.</p>';
      resEl.innerHTML = h;
      resEl.querySelectorAll('.kr-take').forEach((b) => b.addEventListener('click', () => {
        const e = r.edges[b.dataset.side];
        if (e) K.setConeDia(b.dataset.side, +e.corner.dia.toFixed(4));
      }));
      text = lines.join('\n');
      nc = ncText(lines.map((l) => '; ' + l).join('\n'));
    }
    const err = bad.length ? 'Neplatný zápis: ' + bad.join(', ') + '.' : msgs.join(' ');
    errEl.textContent = err; errEl.hidden = !err;
    fillFaceComputed();
    drawProfile(edges, zTop);
  }

  /** Dopočtený údaj čela (Ø konce ↔ délka) do druhého pole. */
  function fillFaceComputed() {
    SIDES.forEach((side) => {
      const res = last && last.edges[side] && last.edges[side].corner ? last.edges[side] : null;
      const put = (id, v) => {
        const el = $(id);
        if (el === document.activeElement) return;
        if (v === null) { if (el.classList.contains('computed')) { el.value = ''; el.classList.remove('computed'); } return; }
        el.value = t3(v); el.classList.add('computed');
      };
      const m = fmode[side];
      put('flen' + side, m === 'dia' && res && res.faceLen > 0 ? res.faceLen : null);
      put('fend' + side, m === 'len' && res && res.faceEnd ? res.faceEnd.dia : null);
    });
  }

  function drawProfile(edges, zTop) {
    const { sol, bigSide, st } = info;
    const ok = (x) => x !== null && x !== undefined && isFinite(x);
    const resOf = (side) => (last && edges[side] && last.edges[side]) || null;
    const inpOf = (side) => ({
      R: num($('R' + side)) || 0, face: $('face' + side).value, beta: num($('ang' + side)) || 0,
      given: $('given' + side).value, dia: num($('dia' + side)), angRaw: $('ang' + side).value,
      faceLen: (() => { const r = resOf(side); return r && r.faceLen > 0 ? r.faceLen : null; })(), faceMode: fmode[side],
    });
    const keyAt = (side) => (side === bigSide ? 'D' : 'd');
    TF.drawFilletProfile(svg, {
      C: ok(sol.C) ? sol.C : null, L: ok(sol.L) ? sol.L : null, bigSide,
      inp: { A: inpOf('A'), B: inpOf('B') }, res: { A: resOf('A'), B: resOf('B') },
      coneDia: { A: ok(sol[keyAt('A')]) ? sol[keyAt('A')] : null, B: ok(sol[keyAt('B')]) ? sol[keyAt('B')] : null },
      coneSt: { A: st[keyAt('A')], B: st[keyAt('B')] }, aSt: st.C, LSt: st.L, zTop: ok(zTop) ? zTop : null,
    });
    // větší klikací plocha pro prst (jako v náčrtu kužele)
    svg.querySelectorAll('.sk-edit > .sk-hit').forEach((h) => {
      const t = h.cloneNode(false);
      t.setAttribute('class', 'sk-tap'); t.setAttribute('x', +h.getAttribute('x') - 8); t.setAttribute('y', +h.getAttribute('y') - 5);
      t.setAttribute('width', +h.getAttribute('width') + 16); t.setAttribute('height', +h.getAttribute('height') + 10); t.removeAttribute('rx');
      h.parentNode.insertBefore(t, h);
    });
  }

  /* ── Klepnutí do profilu ── */
  const zapisKr = (id, raw) => { const el = $(id); el.value = raw; fire(el); };
  svg.addEventListener('click', (e) => {
    const g = e.target.closest('[data-edit]');
    if (!g) return;
    const [kind, side] = g.dataset.edit.split(':');
    const nm = side ? NAME[side].toLowerCase() : '';
    const O = K.otevriOkno;
    if (kind === 'face') { K.zavriOkno(); flip(side); return; }
    if (kind === 'R') {
      O(e, { label: 'Rádius – ' + nm, unit: 'mm', value: $('R' + side).value, hint: 'Prázdné = bez rádiusu (ostrá hrana)',
        choices: [{ value: 'out', text: 'čelo k většímu Ø' }, { value: 'in', text: 'čelo k ose' }], choice: $('face' + side).value,
        onCommit: (raw, ch) => { $('face' + side).value = ch; zapisKr('R' + side, raw); } });
    } else if (kind === 'ang') {
      O(e, { label: 'Úhel čela – ' + nm, unit: '°', value: $('ang' + side).value, hint: '0 = kolmo k ose, + stoupá k vrchu, − klesá ke spodku',
        onCommit: (raw) => zapisKr('ang' + side, raw) });
    } else if (kind === 'corner') {
      const v = info && info.sol[side === info.bigSide ? 'D' : 'd'];
      O(e, { label: 'Průsečík – ostrá hrana (' + nm + ')', unit: 'Ø mm', value: isFinite(v) && v !== null ? t3(v) : '',
        hint: 'Ø kužele na hraně; R se počítá od průsečíku',
        onCommit: (raw) => { const n = ev(raw); if (!(n > 0)) return; $('given' + side).value = 'corner'; syncVisibility(); save(); K.setConeDia(side, n); } });
    } else if (kind === 'start') {
      O(e, { label: 'Začátek R na čele (' + nm + ')', unit: 'Ø mm', value: $('dia' + side).value, hint: 'Ø, kde rádius z čela odbočí – průsečík se dopočítá',
        onCommit: (raw) => { $('given' + side).value = raw ? 'start' : 'corner'; syncVisibility(); zapisKr('dia' + side, raw); } });
    } else if (kind === 'fend') {
      const m = fmode[side];
      O(e, { label: 'Konec čela (' + nm + ')', unit: 'mm', value: m === 'len' ? $('flen' + side).value : m === 'dia' ? $('fend' + side).value : '',
        hint: 'Ø konce čela, nebo délka čela od průsečíku – druhé se dopočítá',
        choices: [{ value: 'dia', text: 'Ø konce čela' }, { value: 'len', text: 'délka čela' }], choice: m || 'dia',
        onCommit: (raw, ch) => {
          if (!raw) { $('fend' + side).value = ''; $('flen' + side).value = ''; fmode[side] = ''; changed(); return; }
          const other = ch === 'dia' ? 'flen' : 'fend';
          $(other + side).value = ''; $(other + side).classList.remove('computed');
          zapisKr((ch === 'dia' ? 'fend' : 'flen') + side, raw);
        } });
    } else if (kind === 'alpha') {
      O(e, { label: 'Úhel α kužele', unit: '° sklon k ose', value: K.field('a').value, hint: 'Sklon površky k ose',
        onCommit: (raw) => K.zapis(K.field('a'), raw) });
    } else if (kind === 'L') {
      O(e, { label: 'Délka kužele L', unit: 'mm', value: K.field('L').value, hint: 'Podél osy, mezi průsečíky',
        onCommit: (raw) => K.zapis(K.field('L'), raw) });
    } else if (kind === 'zTop') {
      O(e, { label: 'Z čela vrchu', unit: 'mm', value: $('zTop').value, hint: 'Prázdné = hloubky od vrchu',
        onCommit: (raw) => zapisKr('zTop', raw) });
    }
  });

  card.querySelector('[data-kr-copy]').addEventListener('click', (e) => K.kopiruj(e.currentTarget, text));
  card.querySelector('[data-kr-copync]').addEventListener('click', (e) => K.kopiruj(e.currentTarget, nc));
  document.getElementById('kz-clear')?.addEventListener('click', () => {
    SIDES.forEach((side) => {
      ['R', 'dia', 'ang', 'fend', 'flen'].forEach((k) => { $(k + side).value = ''; $(k + side).classList.remove('computed'); });
      $('given' + side).value = 'corner'; fmode[side] = '';
    });
    $('zTop').value = '';
    syncVisibility(); save(); recompute();
  });

  restore();
  setMode((() => { try { return localStorage.getItem(KEY_MODE) === 'r' ? 'r' : 'cone'; } catch { return 'cone'; } })());
  K.onUpdate((i) => { info = i; recompute(); });
})();
