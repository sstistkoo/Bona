'use strict';
// Rozteč děr a osazení – kolo s dírami dokola (např. kolo vagonu).
// 1) Roztečná kružnice: posuvkou přes dvě díry. Měřeno přes vnější hrany děr
//    (tlapky od sebe) je údaj + šířka tlapek = vzdálenost vnějších hran
//    = rozteč + Ø díry → rozteč = M + K − d. Přes vnitřní hrany (tlapky k sobě)
//    je údaj přímo vzdálenost vnitřních hran → rozteč = M + d. Sousední díry
//    dají tětivu: rozteč = tětiva / sin(180° / počet děr). Při lichém počtu děr
//    neleží žádné dvě díry přesně naproti: nejvzdálenější dvojice dá tětivu
//    rozteč · cos(90° / n).
// 2) Osazení: metrem od okraje díry (kulatina v díře je jen doraz pro metr)
//    ven a dovnitř k hraně osazení:
//    Ø vnější = rozteč + d + 2·a_ven,  Ø vnitřní = rozteč − d − 2·a_dovnitř.

(function () {
  /* ── Výpočet (bez DOM – testuje test/vypocty.test.mjs) ── */
  function roztecDer({ d, m, k = 0, mode = 'out', holes = 'opp', n = 0 }) {
    if (!(d > 0) || !(m > 0)) return { err: 'Zadej Ø díry a údaj z posuvky.' };
    const tetiva = mode === 'in' ? m + d : m + k - d;    // vzdálenost středů děr
    if (!(tetiva > 0)) return { err: 'Vzdálenost středů vychází ≤ 0 – zkontroluj údaj, šířku tlapek a Ø díry.' };
    const nOk = n >= 2 && Math.round(n) === n;
    if (holes === 'opp') {
      if (n != null && n !== 0 && !nOk) return { err: 'Počet děr musí být celé číslo ≥ 2.' };
      if (nOk && n % 2 === 1) return { pcd: tetiva / Math.cos(Math.PI / (2 * n)), tetiva, liche: true };
      return { pcd: tetiva, tetiva };
    }
    if (!nOk) return { err: 'U sousedních děr zadej počet děr dokola (celé číslo ≥ 2).' };
    return { pcd: tetiva / Math.sin(Math.PI / n), tetiva };
  }
  function osazeni({ pcd, b, aOut, aIn }) {
    const r = {};
    if (Number.isFinite(aOut)) { r.out = pcd + b + 2 * aOut; r.odStreduOut = b / 2 + aOut; }
    if (Number.isFinite(aIn)) { r.in = pcd - b - 2 * aIn; r.odStreduIn = b / 2 + aIn; }
    if (r.out !== undefined && r.in !== undefined) r.sirka = (r.out - r.in) / 2;
    if (r.in !== undefined && !(r.in > 0)) r.err = 'Vnitřní Ø vychází ≤ 0 – zkontroluj měření dovnitř.';
    return r;
  }
  window.RoztecMath = { roztecDer, osazeni };

  if (typeof document === 'undefined' || !document.getElementById || !document.getElementById('roztec')) return;

  /* ── UI ── */
  const $ = (id) => document.getElementById(id);
  const ev = (s) => window.Vypocty.safeEvalMath(String(s ?? ''));
  const val = (id) => { const e = $(id); return e.value.trim() === '' ? null : ev(e.value); };
  const f = (x, d = 2) => { const s = String(parseFloat(Number(x).toFixed(d))); return s === '-0' ? '0' : s; };
  const sg = (x) => (x > 0 ? '+' : '') + f(x);
  const IDS = ['rz-d', 'rz-m', 'rz-k', 'rz-mode', 'rz-holes', 'rz-n', 'rz-ao', 'rz-ai', 'rz-vp', 'rz-vo', 'rz-vi'];
  const KEY = 'bona.roztec';
  let text = '';

  function save() { try { const o = {}; IDS.forEach((id) => { o[id] = $(id).value; }); localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* nic */ } }
  function restore() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) IDS.forEach((id) => { if (o[id] != null) $(id).value = o[id]; }); } catch { /* nic */ }
  }

  function sketch(pcd, oz) {
    // Schéma (ne v měřítku): kolo shora, díry na rozteči, posuvka, kulatina + metr
    const C = { x: 170, y: 120 }, RO = 112, RP = 82, RI = 44, rh = 10;
    const t = (x, y, s, cls = 'sk-calc', a = 'middle') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${a}">${s}</text>`;
    const ln = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const L = C.x - RP, P = C.x + RP;
    let s = '';
    s += `<circle class="rz-face" cx="${C.x}" cy="${C.y}" r="${RO}"/>`;
    s += `<circle class="rz-inner" cx="${C.x}" cy="${C.y}" r="${RI}"/>`;
    s += `<circle class="rz-pcd" cx="${C.x}" cy="${C.y}" r="${RP}"/>`;
    s += `<circle class="rz-hole" cx="${L}" cy="${C.y}" r="${rh}"/><circle class="rz-hole" cx="${P}" cy="${C.y}" r="${rh}"/>`;
    s += `<circle class="rz-bar" cx="${P}" cy="${C.y}" r="${rh - 2}"/>`;
    // posuvka přes vnější hrany děr
    const py = C.y - 30;
    s += ln(L - rh, C.y, L - rh, py - 4, 'rz-cal') + ln(P + rh, C.y, P + rh, py - 4, 'rz-cal') + ln(L - rh, py, P + rh, py, 'rz-cal');
    s += t(C.x, py - 6, 'posuvka přes díry', 'sk-legend');
    // rozteč
    s += t(C.x, C.y + 4, 'Ø ' + (pcd ? f(pcd) : '?') + ' rozteč', pcd ? 'sk-calc' : 'sk-empty');
    // metr od kulatiny ven a dovnitř (pod osou)
    const my = C.y + 18;
    s += ln(P + rh - 2, my, C.x + RO, my, 'rz-tape') + ln(C.x + RI, my, P - rh + 2, my, 'rz-tape');
    s += t(C.x + RO + 4, my + 4, 'ven', 'sk-legend', 'start') + t(C.x + RI - 4, my + 4, 'dovnitř', 'sk-legend', 'end');
    s += t(C.x, C.y - RO + 18, 'Ø ' + (oz && oz.out ? f(oz.out) : '?') + ' vnější', oz && oz.out ? 'sk-calc' : 'sk-empty');
    s += t(C.x, C.y + 26, 'Ø ' + (oz && oz.in ? f(oz.in) : '?') + ' vnitřní', oz && oz.in ? 'sk-calc' : 'sk-empty');
    $('rz-svg').innerHTML = s;
  }

  function update() {
    $('rz-n-pozn').textContent = $('rz-holes').value === 'adj' ? '' : '(u lichého nutné)';
    const d = val('rz-d'), m = val('rz-m'), k = val('rz-k');
    const mode = $('rz-mode').value, holes = $('rz-holes').value, n = val('rz-n');
    $('rz-k').closest('label').style.opacity = mode === 'in' ? '0.5' : '';
    const out1 = $('rz-out1'), out2 = $('rz-out2');
    const lines = [];
    const spatne = [['rz-d', 'Ø díry'], ['rz-m', 'posuvka'], ['rz-k', 'šířka tlapek'], ['rz-n', 'počet děr'], ['rz-ao', 'ven'], ['rz-ai', 'dovnitř'], ['rz-vp', 'výkres rozteč'], ['rz-vo', 'výkres vnější'], ['rz-vi', 'výkres vnitřní']]
      .filter(([id]) => Number.isNaN(val(id))).map(([, n2]) => n2);
    let r = roztecDer({ d, m, k, mode, holes, n });
    if (mode === 'out' && k === null && !r.err) r = { err: 'Zadej šířku tlapek (běžně 20 = 2 × 10).' };
    let pcd = null, oz = null;
    if (r.err) {
      out1.innerHTML = d || m ? r.err : 'Zadej Ø díry a co ukazuje posuvka.';
      if (spatne.length) out1.innerHTML += `<br><b>Neplatné číslo:</b> ${spatne.join(', ')}`;
    } else {
      pcd = r.pcd;
      const vzorec = mode === 'in' ? `${f(m)} + ${f(d)} (Ø díry)` : `${f(m)} + ${f(k)} (tlapky) − ${f(d)} (Ø díry)`;
      out1.innerHTML = `Rozteč <b>Ø ${f(pcd)}</b> mm` +
        `<br><span class="hint">${holes === 'adj' ? `vzdálenost středů ${vzorec} = ${f(r.tetiva)}; rozteč = ${f(r.tetiva)} / sin(180° / ${n})`
          : r.liche ? `lichý počet děr – vzdálenost středů ${vzorec} = ${f(r.tetiva)}; rozteč = ${f(r.tetiva)} / cos(90° / ${n})` : vzorec}</span>`;
      if (spatne.length) out1.innerHTML += `<br><b>Neplatné číslo:</b> ${spatne.join(', ')} – nepočítá se s ním.`;
      lines.push(`Rozteč děr: Ø${f(pcd)} (díra Ø${f(d)}, posuvka ${f(m)}${mode === 'in' ? ', vnitřní hrany' : ', tlapky ' + f(k)})`);
      const vp = val('rz-vp');
      if (Number.isFinite(vp)) out1.innerHTML += `<br>proti výkresu Ø ${f(vp)}: <b>${sg(pcd - vp)}</b> mm`;
    }
    // Osazení
    const b = d;
    const aOut = val('rz-ao'), aIn = val('rz-ai');
    if (!pcd) out2.innerHTML = 'Nejdřív roztečná kružnice (krok 1).';
    else if (!Number.isFinite(aOut) && !Number.isFinite(aIn)) out2.innerHTML = 'Zadej, kolik je od okraje díry k osazení ven / dovnitř.';
    else {
      oz = osazeni({ pcd, b, aOut, aIn });
      let h = '';
      const vo = val('rz-vo'), vi = val('rz-vi');
      if (oz.out !== undefined) {
        h += `Osazení vnější (začátek) <b>Ø ${f(oz.out)}</b> mm <span class="hint">= ${f(pcd)} + ${f(b)} (Ø díry) + 2 × ${f(aOut)}</span>`;
        if (Number.isFinite(vo)) h += ` · proti výkresu <b>${sg(oz.out - vo)}</b>`;
        lines.push(`Osazení vnější: Ø${f(oz.out)}`);
      }
      if (oz.in !== undefined) {
        h += (h ? '<br>' : '') + `Osazení vnitřní (konec) <b>Ø ${f(oz.in)}</b> mm <span class="hint">= ${f(pcd)} − ${f(b)} (Ø díry) − 2 × ${f(aIn)}</span>`;
        if (Number.isFinite(vi)) h += ` · proti výkresu <b>${sg(oz.in - vi)}</b>`;
        lines.push(`Osazení vnitřní: Ø${f(oz.in)}`);
      }
      if (oz.sirka !== undefined) { h += `<br>šířka osazení (radiálně) ${f(oz.sirka)} mm`; lines.push(`Šířka osazení: ${f(oz.sirka)}`); }
      if ((Number.isFinite(aOut) && aOut < 0) || (Number.isFinite(aIn) && aIn < 0)) h += '<br><b>Pozor:</b> záporná vzdálenost – zkontroluj zadání.';
      if (oz.err) h += '<br>' + oz.err;
      out2.innerHTML = h;
    }
    text = lines.join('\n');
    sketch(pcd, oz);
    save();
  }

  IDS.forEach((id) => { const e = $(id); e.addEventListener(e.tagName === 'SELECT' ? 'change' : 'input', update); });
  $('rz-copy').addEventListener('click', (e) => {
    if (!text || !navigator.clipboard) return;
    const b = e.currentTarget;
    navigator.clipboard.writeText(text).then(() => { const o = b.textContent; b.textContent = '✓ Zkopírováno'; setTimeout(() => (b.textContent = o), 1200); });
  });
  $('rz-clear').addEventListener('click', () => {
    IDS.forEach((id) => { const e = $(id); if (e.tagName !== 'SELECT') e.value = id === 'rz-k' ? '20' : ''; });
    update();
  });
  restore();
  update();
})();
