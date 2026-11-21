'use strict';
// Převodník a utahovací momenty (Nm). Tabulky a vzorce převzaté ze SKICA 2D CAD/CAM
// (convert.js, torque.js, torqueMath.js – výpočty jsou ve window.Vypocty.torque).

(function () {
  const V = window.Vypocty, T = V.torque;
  const $ = (id) => document.getElementById(id);
  const ev = (s) => V.safeEvalMath(String(s ?? ''));
  const val = (el) => (el.value.trim() === '' ? null : ev(el.value));
  const r = (x, d = 6) => String(parseFloat(Number(x).toFixed(d)));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nm = (x) => (Number.isFinite(x) ? r(x, x < 10 ? 2 : 1).replace('.', ',') : '–');
  const range = (lo, hi) => (lo === hi ? nm(lo) : nm(lo) + '–' + nm(hi));

  /* ══════════════ PŘEVODNÍK ══════════════ */
  (function prevodnik() {
    // HRC → HB (ASTM E140, kulička 10/3000) a HRC → HV (ocel)
    const hrcHb = [[20,226],[21,231],[22,237],[23,243],[24,247],[25,253],[26,258],[27,264],[28,271],[29,279],[30,286],[31,294],[32,301],[33,311],[34,319],[35,328],[36,336],[37,344],[38,353],[39,362],[40,371],[41,381],[42,390],[43,400],[44,409],[45,421],[46,432],[47,442],[48,453],[49,465],[50,477],[51,488],[52,500],[53,513],[54,525],[55,539],[56,553],[57,567],[58,582],[59,597],[60,613],[61,627],[62,640],[63,653],[64,667],[65,682],[66,697],[67,712],[68,728]];
    const hrcHv = [[20,238],[21,243],[22,248],[23,254],[24,260],[25,266],[26,272],[27,279],[28,286],[29,294],[30,302],[31,310],[32,318],[33,327],[34,336],[35,345],[36,354],[37,363],[38,372],[39,382],[40,392],[41,402],[42,412],[43,423],[44,434],[45,446],[46,458],[47,471],[48,484],[49,498],[50,513],[51,528],[52,544],[53,560],[54,577],[55,595],[56,613],[57,633],[58,653],[59,674],[60,697],[61,720],[62,746],[63,772],[64,800],[65,832],[66,865],[67,900],[68,940]];
    const interp = (tbl, x, from, to) => {
      for (let i = 0; i < tbl.length - 1; i++) {
        const a = tbl[i][from], b = tbl[i + 1][from];
        if (x >= a && x <= b) return tbl[i][to] + (x - a) / (b - a) * (tbl[i + 1][to] - tbl[i][to]);
      }
      return null;
    };

    const sekce = [
      ['Délka', [['mm', 'mm'], ['inch', 'palce (inch)']]],
      ['Úhly', [['deg', '°'], ['rad', 'rad'], ['dms', '° ′ ″']]],
      ['Drsnost', [['ra', 'Ra µm'], ['rz', 'Rz µm']], true],
      ['Závit TPI ↔ stoupání', [['tpi', 'TPI (závitů/palec)'], ['pitch', 'stoupání mm']]],
      ['Tvrdost', [['hrc', 'HRC'], ['hb', 'HB'], ['hv', 'HV']]],
      ['Moment / síla', [['nm', 'Nm'], ['kgm', 'kgm'], ['kn', 'síla kN'], ['kg', 'síla kg']]],
      ['Rychlost', [['mmin', 'm/min'], ['mms', 'mm/s'], ['ftmin', 'ft/min (SFM)']]],
    ];
    $('conv').innerHTML = sekce.map(([t, pole, ratio]) =>
      `<div class="conv-sec"><p class="lbl">${t}</p><div class="grid">` +
      pole.map(([id, l]) => `<label>${l}<input type="text" data-c="${id}" inputmode="${id === 'dms' ? 'text' : 'decimal'}"${id === 'dms' ? ' placeholder="např. 1 25 56"' : ''}></label>`).join('') + '</div>' +
      (ratio ? '<div class="chips" id="conv-ratio"><button type="button" class="chip" data-v="4">×4 broušení</button><button type="button" class="chip" data-v="5">×5 frézování</button><button type="button" class="chip active" data-v="6">×6 soustružení</button></div>' : '') +
      '</div>').join('');
    const c = (id) => document.querySelector(`[data-c="${id}"]`);
    let ratio = 6;

    const dmsText = (deg) => {
      const s = Math.round(Math.abs(deg) * 3600 * 100) / 100;
      const d = Math.floor(s / 3600), m = Math.floor((s - d * 3600) / 60), sec = r(s - d * 3600 - m * 60, 2);
      return (deg < 0 ? '-' : '') + `${d} ${m} ${sec}`;
    };
    const dmsParse = (t) => {
      const p = String(t).trim().replace(/[°′″'"]/g, ' ').replace(/,/g, '.').split(/\s+/).filter(Boolean).map(Number);
      if (!p.length || p.some((x) => !Number.isFinite(x))) return NaN;
      const sg = /^\s*-/.test(String(t)) ? -1 : 1; // i „-0 30“ = −0,5°
      return sg * (Math.abs(p[0]) + (p[1] || 0) / 60 + (p[2] || 0) / 3600);
    };

    // Každá skupina: z kterékoli hodnoty spočítá základ a z něj ostatní
    const skupiny = [
      { ids: ['mm', 'inch'], toBase: { mm: (v) => v, inch: (v) => v * 25.4 }, from: { mm: (b) => b, inch: (b) => b / 25.4 } },
      { ids: ['deg', 'rad', 'dms'], toBase: { deg: (v) => v, rad: (v) => v * 180 / Math.PI }, from: { deg: (b) => b, rad: (b) => b * Math.PI / 180, dms: dmsText }, parse: { dms: dmsParse }, toBaseDms: true },
      { ids: ['ra', 'rz'], toBase: { ra: (v) => v, rz: (v) => v / ratio }, from: { ra: (b) => b, rz: (b) => b * ratio } },
      { ids: ['tpi', 'pitch'], toBase: { tpi: (v) => 25.4 / v, pitch: (v) => v }, from: { tpi: (b) => 25.4 / b, pitch: (b) => b } },
      { ids: ['nm', 'kgm'], toBase: { nm: (v) => v, kgm: (v) => v * 9.80665 }, from: { nm: (b) => b, kgm: (b) => b / 9.80665 } },
      { ids: ['kn', 'kg'], toBase: { kn: (v) => v * 1000, kg: (v) => v * 9.80665 }, from: { kn: (b) => b / 1000, kg: (b) => b / 9.80665 } },
      { ids: ['mmin', 'mms', 'ftmin'], toBase: { mmin: (v) => v, mms: (v) => v * 60 / 1000, ftmin: (v) => v * 0.3048 }, from: { mmin: (b) => b, mms: (b) => b * 1000 / 60, ftmin: (b) => b / 0.3048 } },
    ];
    skupiny.forEach((g) => g.ids.forEach((id) => c(id).addEventListener('input', () => prepocti(g, id))));
    function prepocti(g, id) {
      const raw = c(id).value;
      if (raw.trim() === '') { g.ids.filter((x) => x !== id).forEach((x) => (c(x).value = '')); return; }
      const v = g.parse && g.parse[id] ? g.parse[id](raw) : ev(raw);
      if (!Number.isFinite(v)) return;
      const base = id === 'dms' ? v : g.toBase[id](v);
      g.ids.filter((x) => x !== id).forEach((x) => { const o = g.from[x](base); c(x).value = typeof o === 'string' ? o : (Number.isFinite(o) ? r(o) : ''); });
    }
    $('conv-ratio').addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      $('conv-ratio').querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === b));
      ratio = +b.dataset.v; if (c('ra').value.trim()) prepocti(skupiny[2], 'ra'); else if (c('rz').value.trim()) prepocti(skupiny[2], 'rz');
    });

    // Tvrdost: HRC 20–68 ↔ HB ↔ HV
    const hrcToHb = (h) => interp(hrcHb, h, 0, 1), hbToHrc = (h) => interp(hrcHb, h, 1, 0);
    const [hrc, hb, hv] = ['hrc', 'hb', 'hv'].map(c);
    hrc.addEventListener('input', () => {
      const x = val(hrc); if (!(x >= 20 && x <= 68)) { hb.value = hv.value = ''; return; }
      hb.value = Math.round(hrcToHb(x)); hv.value = Math.round(interp(hrcHv, x, 0, 1));
    });
    hb.addEventListener('input', () => {
      const x = val(hb); hrc.value = hv.value = ''; if (!(x > 0)) return;
      if (x < 226) { hv.value = Math.round(x * 1.05); return; }
      if (x > 728) return;
      const h = hbToHrc(x); hrc.value = r(h, 1); hv.value = Math.round(interp(hrcHv, h, 0, 1));
    });
    hv.addEventListener('input', () => {
      const x = val(hv); hrc.value = hb.value = ''; if (!(x > 0)) return;
      if (x < 238) { hb.value = Math.round(x / 1.05); return; }
      if (x > 940) return;
      const h = interp(hrcHv, x, 1, 0); hrc.value = r(h, 1); hb.value = Math.round(hrcToHb(h));
    });
  })();

  /* ══════════════ NM ══════════════ */
  (function momenty() {
    // Záložky
    const btns = document.querySelectorAll('[data-nm]');
    const ukaz = (t) => {
      btns.forEach((b) => b.classList.toggle('active', b.dataset.nm === t));
      document.querySelectorAll('[data-nmtab]').forEach((d) => (d.hidden = d.dataset.nmtab !== t));
    };
    btns.forEach((b) => b.addEventListener('click', () => ukaz(b.dataset.nm)));

    // ── Moje nože ──
    const KEY = 'bona.nmTools';
    const load = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tools)); } catch { /* nedostupné */ } };
    let tools = load(), edit = -1;
    const F = { name: $('nt-name'), insert: $('nt-insert'), screw: $('nt-screw'), key: $('nt-key'), nm: $('nt-nm'), note: $('nt-note') };

    function kresli() {
      const q = $('nt-filter').value.trim().toLowerCase();
      const rows = tools.map((t, i) => [t, i]).filter(([t]) => !q || [t.name, t.insert, t.screw, t.key, t.note].join(' ').toLowerCase().includes(q));
      $('nt-list').innerHTML = rows.length ? rows.map(([t, i]) =>
        `<tr data-i="${i}"${i === edit ? ' class="sel"' : ''} title="${esc(t.note)}"><td>${esc(t.name)}</td><td>${esc(t.insert)}</td><td>${esc([t.screw, t.key].filter(Boolean).join(' · '))}</td><td><b>${nm(t.nm)}</b></td><td><button type="button" class="del" data-del="${i}" title="Smazat">✕</button></td></tr>`).join('')
        : '<tr><td colspan="5" class="hint">Zatím žádné nože – vyplň pole nahoře a dej Uložit.</td></tr>';
    }
    function napoveda() {
      const k = T.keyKindOf(F.key.value), ic = T.insertIC(F.insert.value);
      const msg = [];
      if (k && k.kind === 'torx') {
        const rows = T.insertScrewsForTorx(k.size);
        if (rows.length) msg.push(`Torx T${k.size}: ` + rows.map(([th, , lo, hi]) => `${th} → ${range(lo, hi)} Nm`).join(', '));
      } else if (k && k.kind === 'imbus') {
        const q = T.quickTorqueForHex(k.size);
        if (q) msg.push(`Imbus ${nm(k.size)} mm: orientačně ${nm(q)} Nm (dolní hranice katalogů)`);
      }
      if (ic) msg.push(`VBD: vepsaná kružnice IC ${r(ic.ic, 3)} mm${ic.neg ? ', negativní' : ''}`);
      $('nt-info').hidden = !msg.length;
      $('nt-info').innerHTML = msg.map(esc).join('<br>') + (msg.length ? '<br><span class="hint">Platí hodnota na držáku / v katalogu.</span>' : '');
    }
    const vycisti = () => { Object.values(F).forEach((e) => (e.value = '')); edit = -1; napoveda(); kresli(); };
    $('nt-save').addEventListener('click', () => {
      const t = Object.fromEntries(Object.entries(F).map(([k, e]) => [k, e.value.trim()]));
      if (!t.name) { F.name.focus(); return; }
      t.nm = val(F.nm);
      if (edit >= 0) tools[edit] = t; else tools.push(t);
      save(); vycisti();
    });
    $('nt-new').addEventListener('click', vycisti);
    $('nt-filter').addEventListener('input', kresli);
    [F.key, F.insert].forEach((e) => e.addEventListener('input', napoveda));
    $('nt-list').addEventListener('click', (e) => {
      const d = e.target.closest('[data-del]');
      if (d) { if (confirm('Smazat tento nůž?')) { tools.splice(+d.dataset.del, 1); save(); vycisti(); } return; }
      const tr = e.target.closest('tr[data-i]'); if (!tr) return;
      edit = +tr.dataset.i; const t = tools[edit];
      Object.entries(F).forEach(([k, el]) => (el.value = t[k] == null ? '' : (k === 'nm' ? r(t[k], 3) : t[k])));
      napoveda(); kresli(); F.name.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    kresli();

    // ── Tabulky šroubů VBD → klepnutí převezme do Moje nože ──
    $('nr-insert').innerHTML = '<thead><tr><th>Závit</th><th>Klíč</th><th>Nm</th><th>Použití</th></tr></thead><tbody>' +
      T.INSERT_SCREWS.map(([th, key, lo, hi, use]) => `<tr data-p="${esc(JSON.stringify({ screw: th, key, nm: hi }))}"><td>${th}</td><td>${key}</td><td><b>${range(lo, hi)}</b></td><td>${use}</td></tr>`).join('') + '</tbody>';
    $('nr-pin').innerHTML = '<thead><tr><th>Imbus</th><th>Čep</th><th>Nm</th><th>VBD</th></tr></thead><tbody>' +
      T.KENLOC_PINS.map(([hex, pin, th, v, , use]) => `<tr data-p="${esc(JSON.stringify({ screw: pin + ' (' + th + ')', key: 'imbus ' + String(hex).replace('.', ','), nm: v }))}"><td>${nm(hex)} mm</td><td>${pin} (${th})</td><td><b>${nm(v)}</b></td><td>${use}</td></tr>`).join('') + '</tbody>';
    $('nr-clamp').innerHTML = '<thead><tr><th>Imbus</th><th>Šroub upínky</th><th>Nm</th></tr></thead><tbody>' +
      T.CLAMP_SCREWS.map(([hex, sc, th, lo, hi]) => `<tr data-p="${esc(JSON.stringify({ screw: sc + ' (' + th + ')', key: 'imbus ' + String(hex).replace('.', ','), nm: lo }))}"><td>${nm(hex)} mm</td><td>${sc} (${th})</td><td><b>${range(lo, hi)}</b></td></tr>`).join('') + '</tbody>';
    document.querySelectorAll('#nr-insert, #nr-pin, #nr-clamp').forEach((tbl) => tbl.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-p]'); if (!tr) return;
      const p = JSON.parse(tr.dataset.p);
      F.screw.value = p.screw; F.key.value = p.key; F.nm.value = String(p.nm).replace('.', ',');
      ukaz('tools'); napoveda(); F.name.focus();
    }));

    // ── Šroub M (VDI 2230) ──
    $('nb-d').innerHTML = T.METRIC_BOLTS.map(([d, P]) => `<option value="${d}"${d === 16 ? ' selected' : ''}>M${d} × ${String(P).replace('.', ',')}</option>`).join('');
    $('nb-cls').innerHTML = T.STRENGTH_CLASSES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    $('nb-mu').innerHTML = T.FRICTION.map(([k, n]) => `<option value="${k}"${k === '0.12' ? ' selected' : ''}>${n}</option>`).join('');
    function sroub() {
      const d = +$('nb-d').value, row = T.METRIC_BOLTS.find((b) => b[0] === d);
      const Rp = T.yieldOf($('nb-cls').value, d), mu = +$('nb-mu').value;
      const res = T.boltTorque({ d, P: row[1], dw: row[2], dh: row[3], Rp, mu });
      if (!res) { $('nb-out').textContent = 'Nelze spočítat.'; return; }
      $('nb-out').innerHTML = `Utahovací moment M<sub>A</sub> = <b style="font-size:1.6rem">${nm(res.MA)} Nm</b><br>` +
        `Předpětí F<sub>M</sub> = ${r(res.FM / 1000, 1).replace('.', ',')} kN · mez kluzu Rp0,2 = ${Rp} MPa · klíč ${row[2]} mm` +
        `<br><span class="hint">Převod: ${r(res.MA / 9.80665, 1).replace('.', ',')} kgm · ${r(res.MA / 1.3558179, 0)} lbf·ft</span>`;
    }
    ['nb-d', 'nb-cls', 'nb-mu'].forEach((id) => $(id).addEventListener('change', sroub));
    sroub();

    // ── Klíč s prodloužením + převod jednotek ──
    function klic() {
      const m = val($('nk-m')), L = val($('nk-l')), a = val($('nk-a'));
      if (!(m > 0 && L > 0)) { $('nk-out').textContent = 'Zadej moment a délku klíče.'; return; }
      const s = T.wrenchSetting(m, L, a || 0);
      $('nk-out').innerHTML = s ? `Nastav na klíči: <b style="font-size:1.4rem">${nm(s)} Nm</b><br><span class="hint">Nástavec otočený o 90° moment nemění (a = 0).</span>` : 'Neplatné zadání.';
    }
    ['nk-m', 'nk-l', 'nk-a'].forEach((id) => $(id).addEventListener('input', klic));
    klic();
    $('nc-u').innerHTML = T.TORQUE_UNITS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    function jednotky() {
      const v = val($('nc-v')), u = $('nc-u').value;
      if (!Number.isFinite(v)) { $('nc-out').textContent = 'Zadej hodnotu.'; return; }
      $('nc-out').innerHTML = T.TORQUE_UNITS.filter(([k]) => k !== u).map(([k, n]) => `${n}: <b>${r(T.convertTorque(v, u, k), 4).replace('.', ',')}</b>`).join(' · ');
    }
    $('nc-v').addEventListener('input', jednotky); $('nc-u').addEventListener('change', jednotky);
    jednotky();
  })();
})();
