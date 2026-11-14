// VYGENEROVÁNO skriptem scripts/prevzit-ze-skici.mjs – needitovat ručně.
// Výpočetní jádra převzatá beze změny ze SKICA 2D CAD/CAM (sstistkoo/2D_CAD-CAM).
'use strict';
window.Vypocty = (function () {
  const out = {};
  // ── Matematický výraz (utils.js) ──
  (function () {
function _parseMathExpr(src) {
  let pos = 0;
  const deg = Math.PI / 180;

  const FUNCS = {
    sin:   v => Math.sin(v * deg),
    cos:   v => Math.cos(v * deg),
    tan:   v => Math.tan(v * deg),
    asin:  v => Math.asin(v) / deg,
    acos:  v => Math.acos(v) / deg,
    atan:  v => Math.atan(v) / deg,
    sinr:  v => Math.sin(v),
    cosr:  v => Math.cos(v),
    tanr:  v => Math.tan(v),
    sqrt:  v => Math.sqrt(v),
    abs:   v => Math.abs(v),
    log:   v => Math.log10(v),
    ln:    v => Math.log(v),
    round: v => Math.round(v),
    floor: v => Math.floor(v),
    ceil:  v => Math.ceil(v),
  };

  const CONSTS = {
    pi: Math.PI,
    e:  Math.E,
  };

  function skip() { while (pos < src.length && src[pos] === ' ') pos++; }

  function parseIdent() {
    const start = pos;
    while (pos < src.length && ((src[pos] >= 'a' && src[pos] <= 'z') || (src[pos] >= 'A' && src[pos] <= 'Z'))) pos++;
    return src.substring(start, pos).toLowerCase();
  }

  function parseNumber() {
    skip();
    const start = pos;
    if (src[pos] === '+' || src[pos] === '-') pos++;
    if (pos < src.length && src[pos] === '.' || (src[pos] >= '0' && src[pos] <= '9')) {
      while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++;
      if (pos < src.length && src[pos] === '.') { pos++; while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++; }
    }
    if (pos < src.length && (src[pos] === 'e' || src[pos] === 'E') && (pos + 1 < src.length && (src[pos + 1] >= '0' && src[pos + 1] <= '9' || src[pos + 1] === '+' || src[pos + 1] === '-'))) {
      pos++;
      if (pos < src.length && (src[pos] === '+' || src[pos] === '-')) pos++;
      while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++;
    }
    const n = parseFloat(src.substring(start, pos));
    if (isNaN(n)) throw new Error('num');
    return n;
  }

  function parseAtom() {
    skip();
    if (src[pos] === '(') { pos++; const v = parseExpr(); skip(); if (src[pos] !== ')') throw new Error(')'); pos++; return v; }
    // Identifikátor – funkce nebo konstanta
    if (pos < src.length && ((src[pos] >= 'a' && src[pos] <= 'z') || (src[pos] >= 'A' && src[pos] <= 'Z'))) {
      const name = parseIdent();
      skip();
      // Funkce – očekáváme závorku
      if (src[pos] === '(') {
        const fn = FUNCS[name];
        if (!fn) throw new Error('fn:' + name);
        pos++; // skip '('
        const arg = parseExpr();
        skip();
        if (src[pos] !== ')') throw new Error(')');
        pos++;
        return fn(arg);
      }
      // Konstanta
      if (name in CONSTS) return CONSTS[name];
      throw new Error('id:' + name);
    }
    return parseNumber();
  }

  function parseUnary() {
    skip();
    if (src[pos] === '-') { pos++; return -parseUnary(); }
    if (src[pos] === '+') { pos++; return parseUnary(); }
    return parseAtom();
  }

  function parsePower() {
    let b = parseUnary(); skip();
    if (pos < src.length - 1 && src[pos] === '*' && src[pos + 1] === '*') { pos += 2; return Math.pow(b, parsePower()); }
    return b;
  }

  function parseTerm() {
    let l = parsePower(); skip();
    while (pos < src.length && (src[pos] === '*' || src[pos] === '/') && !(src[pos] === '*' && src[pos + 1] === '*')) {
      const op = src[pos++]; const r = parsePower(); l = op === '*' ? l * r : l / r; skip();
    }
    return l;
  }

  function parseExpr() {
    let l = parseTerm(); skip();
    while (pos < src.length && (src[pos] === '+' || src[pos] === '-')) {
      const op = src[pos++]; const r = parseTerm(); l = op === '+' ? l + r : l - r; skip();
    }
    return l;
  }

  const result = parseExpr();
  skip();
  if (pos !== src.length) throw new Error('end');
  return result;
}
function safeEvalMath(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  str = str.trim().replace(/,/g, '.');
  if (str === '') return NaN;
  // Povolit: čísla, operátory +−*/(), tečky, mezery, písmena (funkce/konstanty)
  if (!/^[\d+\-*/().^\sa-zA-Z]+$/.test(str)) return NaN;
  // Kontrola závorek
  let depth = 0;
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return NaN;
  }
  if (depth !== 0) return NaN;
  try {
    const expr = str.replace(/\^/g, '**');
    const result = _parseMathExpr(expr);
    return typeof result === 'number' && isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}
  out.safeEvalMath = safeEvalMath;
  })();
  // ── Pravoúhlý trojúhelník (trigSolver.js) ──
  (function () {
// ── Řešič pravoúhlého trojúhelníku (γ = 90°) ──
// a = protilehlá k α, b = přilehlá k α, c = přepona, α + β = 90°.
// Čistá funkce bez DOM – testovatelná (tests/trig-solver.test.js).

const DEG = Math.PI / 180;
const REL_TOL = 1e-3;   // relativní shoda stran (0,1 %)
const ANG_TOL = 0.01;   // shoda úhlů ve stupních

/**
 * @param {{a?:number|null,b?:number|null,c?:number|null,alpha?:number|null,beta?:number|null}} known
 *   známé hodnoty (null/undefined = neznámá)
 * @returns {{ok:true,a:number,b:number,c:number,alpha:number,beta:number}|{ok:false,error:string}}
 */
function solveRightTriangle(known) {
  const k = {};
  for (const key of ["a", "b", "c", "alpha", "beta"]) {
    const v = known[key];
    k[key] = (v === null || v === undefined || v === "") ? null : Number(v);
    if (k[key] !== null && !(isFinite(k[key]) && k[key] > 0)) {
      return { ok: false, error: `Neplatná hodnota ${label(key)} (musí být kladné číslo)` };
    }
  }
  for (const key of ["alpha", "beta"]) {
    if (k[key] !== null && k[key] >= 90) return { ok: false, error: `Úhel ${label(key)} musí být menší než 90°` };
  }
  const sides = ["a", "b", "c"].filter(s => k[s] !== null);
  const angle = k.alpha !== null ? k.alpha : (k.beta !== null ? 90 - k.beta : null);
  const count = sides.length + (k.alpha !== null ? 1 : 0) + (k.beta !== null ? 1 : 0);
  if (count < 2) return { ok: false, error: "Zadejte 2 hodnoty" };
  if (sides.length === 0) return { ok: false, error: "Ze dvou úhlů nejde určit velikost – zadejte aspoň jednu stranu" };

  let a, b, c;
  if (k.c !== null && k.a !== null && k.c <= k.a) return { ok: false, error: "Přepona c musí být delší než a" };
  if (k.c !== null && k.b !== null && k.c <= k.b) return { ok: false, error: "Přepona c musí být delší než b" };

  if (sides.length >= 2) {
    // Dvě strany mají přednost (přesnější než přes úhel)
    if (k.a !== null && k.b !== null) { a = k.a; b = k.b; c = Math.hypot(a, b); }
    else if (k.a !== null) { a = k.a; c = k.c; b = Math.sqrt(c * c - a * a); }
    else { b = k.b; c = k.c; a = Math.sqrt(c * c - b * b); }
  } else {
    const al = angle * DEG;
    if (k.a !== null) { a = k.a; c = a / Math.sin(al); b = a / Math.tan(al); }
    else if (k.b !== null) { b = k.b; c = b / Math.cos(al); a = b * Math.tan(al); }
    else { c = k.c; a = c * Math.sin(al); b = c * Math.cos(al); }
  }
  const alpha = Math.atan2(a, b) / DEG;
  const res = { ok: true, a, b, c, alpha, beta: 90 - alpha };

  // Přeurčené zadání (3+ hodnoty) → všechny zadané musí sedět s výsledkem
  for (const key of ["a", "b", "c"]) {
    if (k[key] !== null && Math.abs(k[key] - res[key]) > REL_TOL * res[key]) {
      return { ok: false, error: "Zadané hodnoty si odporují – nechte jen 2" };
    }
  }
  for (const key of ["alpha", "beta"]) {
    if (k[key] !== null && Math.abs(k[key] - res[key]) > ANG_TOL) {
      return { ok: false, error: "Zadané hodnoty si odporují – nechte jen 2" };
    }
  }
  return res;
}

function label(key) {
  return { a: "a", b: "b", c: "c", alpha: "α", beta: "β" }[key];
}

  out.solveRightTriangle = solveRightTriangle;
  })();
  // ── Obecný trojúhelník (triangleSolver.js) ──
  (function () {
// ── Řešič obecného trojúhelníku ──
// Strany a, b, c; úhly α, β, γ ve stupních; α leží proti a, β proti b, γ proti c.
// Čistá funkce bez DOM – testovatelná (tests/triangle-solver.test.js).
// Zvládne SSS, SAS, ASA/AAS i SSA (nejednoznačný případ → až dvě řešení).

const DEG = Math.PI / 180;
const REL_TOL = 1e-3;      // relativní shoda přeurčených stran (0,1 %)
const ANG_TOL = 0.01;      // shoda úhlů ve stupních

const SIDE_KEYS = ['a', 'b', 'c'];
const ANG_KEYS = ['alpha', 'beta', 'gamma'];
const LABEL = { a: 'a', b: 'b', c: 'c', alpha: 'α', beta: 'β', gamma: 'γ' };

const sinD = (x) => Math.sin(x * DEG);
const cosD = (x) => Math.cos(x * DEG);
const acosD = (x) => Math.acos(Math.max(-1, Math.min(1, x))) / DEG;
const asinD = (x) => Math.asin(Math.max(-1, Math.min(1, x))) / DEG;

/** Z úplných stran a úhlů (sedmi hodnot) vrátí výsledek s plochou, obvodem a výškami. */
function finish(S, A) {
  const [a, b, c] = S;
  const s = (a + b + c) / 2;
  const area = 0.5 * a * b * sinD(A[2]);
  return {
    a, b, c, alpha: A[0], beta: A[1], gamma: A[2],
    perimeter: a + b + c, area,
    ha: 2 * area / a, hb: 2 * area / b, hc: 2 * area / c,
    circumR: a / (2 * sinD(A[0])), inR: area / s,
  };
}

/** Úhly ze tří stran (kosinová věta); null = neplatný trojúhelník. */
function anglesFromSides(S) {
  const [a, b, c] = S;
  if (!(a + b > c * (1 + 1e-12) && a + c > b * (1 + 1e-12) && b + c > a * (1 + 1e-12))) return null;
  const al = acosD((b * b + c * c - a * a) / (2 * b * c));
  const be = acosD((a * a + c * c - b * b) / (2 * a * c));
  return [al, be, 180 - al - be];
}

/**
 * @param {{a?:number|null,b?:number|null,c?:number|null,alpha?:number|null,beta?:number|null,gamma?:number|null}} known
 * @returns {{ok:true, solutions:object[]}|{ok:false, error:string}}
 *   solutions[i] = {a,b,c,alpha,beta,gamma,perimeter,area,ha,hb,hc,circumR,inR}
 */
function solveTriangle(known) {
  const k = {};
  for (const key of [...SIDE_KEYS, ...ANG_KEYS]) {
    const v = known[key];
    k[key] = (v === null || v === undefined || v === '') ? null : Number(v);
    if (k[key] !== null && !(isFinite(k[key]) && k[key] > 0)) {
      return { ok: false, error: `Neplatná hodnota ${LABEL[key]} (musí být kladné číslo)` };
    }
  }
  for (const key of ANG_KEYS) {
    if (k[key] !== null && k[key] >= 180) return { ok: false, error: `Úhel ${LABEL[key]} musí být menší než 180°` };
  }
  let S = SIDE_KEYS.map(x => k[x]);
  let A = ANG_KEYS.map(x => k[x]);
  const nS = S.filter(v => v !== null).length, nA = A.filter(v => v !== null).length;
  if (nS + nA < 3) return { ok: false, error: 'Zadejte 3 hodnoty (aspoň jedna musí být strana)' };
  if (nS === 0) return { ok: false, error: 'Ze tří úhlů nejde určit velikost – zadejte aspoň jednu stranu' };

  const sols = [];
  if (nA >= 2) {
    // ASA / AAS: třetí úhel z doplňku do 180°, strany ze sinové věty
    let ang = A.slice();
    if (nA === 2) { const i = ang.indexOf(null); ang[i] = 180 - ang.reduce((s, v) => s + (v ?? 0), 0); }
    const sum = ang[0] + ang[1] + ang[2];
    if (ang.some(v => !(v > ANG_TOL / 10))) return { ok: false, error: 'Součet zadaných úhlů musí být menší než 180°' };
    if (Math.abs(sum - 180) > ANG_TOL) return { ok: false, error: 'Součet úhlů musí být 180°' };
    const i = S.findIndex(v => v !== null);
    const kk = S[i] / sinD(ang[i]);
    sols.push({ S: ang.map(x => kk * sinD(x)), A: ang });
  } else if (nS === 3) {
    const ang = anglesFromSides(S);
    if (!ang) return { ok: false, error: 'Z těchto stran trojúhelník nevznikne (součet dvou musí být větší než třetí)' };
    sols.push({ S, A: ang });
  } else {
    // dvě strany a jeden úhel
    const ai = A.findIndex(v => v !== null);
    const others = [0, 1, 2].filter(x => x !== ai);
    if (S[ai] === null) {
      // SAS: úhel je mezi oběma známými stranami, třetí strana z kosinové věty
      const [j, l] = others;
      const si = Math.sqrt(S[j] * S[j] + S[l] * S[l] - 2 * S[j] * S[l] * cosD(A[ai]));
      const full = S.slice(); full[ai] = si;
      const ang = anglesFromSides(full);
      if (!ang) return { ok: false, error: 'Z těchto hodnot trojúhelník nevznikne' };
      sols.push({ S: full, A: ang });
    } else {
      // SSA: úhel leží proti známé straně, druhá známá strana je j → sinová věta
      const j = others.find(x => S[x] !== null), l = others.find(x => x !== j);
      const x = S[j] * sinD(A[ai]) / S[ai];
      if (x > 1 + 1e-9) return { ok: false, error: 'Trojúhelník neexistuje – strana protilehlá zadanému úhlu je příliš krátká' };
      const base = asinD(x);
      const cands = Math.abs(x - 1) < 1e-9 ? [90] : [base, 180 - base];
      for (const aj of cands) {
        const al = 180 - A[ai] - aj;
        if (!(al > 1e-9)) continue;
        const ang = [0, 0, 0]; ang[ai] = A[ai]; ang[j] = aj; ang[l] = al;
        const full = S.slice(); full[l] = S[ai] * sinD(al) / sinD(A[ai]);
        sols.push({ S: full, A: ang });
      }
      if (!sols.length) return { ok: false, error: 'Z těchto hodnot trojúhelník nevznikne' };
    }
  }

  // Kontrola přeurčených (zadaných navíc) hodnot proti vyřešenému trojúhelníku
  const good = sols.filter(({ S: s, A: a }) =>
    S.every((v, i) => v === null || Math.abs(v - s[i]) <= REL_TOL * Math.max(v, 1e-9)) &&
    A.every((v, i) => v === null || Math.abs(v - a[i]) <= ANG_TOL));
  if (!good.length) return { ok: false, error: 'Zadané hodnoty si protiřečí – nesedí do jednoho trojúhelníku' };
  return { ok: true, solutions: good.map(({ S: s, A: a }) => finish(s, a)) };
}

  out.solveTriangle = solveTriangle;
  })();
  // ── ISO 286 (iso286.js + iso286Large.js) ──
  (function () {
  const L = (function () {
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – ISO 286 pro rozměry nad 500 do 3150 mm              ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Hodnoty v µm převzaté z tabulek ISO 286-2:2010 (Table 1, 3–5, 8–12, 17–28),
// každá zkontrolovaná rozdílem horní − dolní = IT daného rozsahu.
// Pravidla nad 500 mm (podle tabulek normy):
//   - a, b, c, j (a A, B, C, J) nejsou definovány,
//   - k: ei = 0 pro všechny stupně; K: ES = 0,
//   - díry K–S: ES = −ei stejného písmene hřídele BEZ korekce Δ (i N9–N11),
//   - díry D–H: EI = −es, JS/js = ±IT/2.

/** Hlavní rozsahy nad 500 mm (horní meze, mm). */
const MAIN = [630, 800, 1000, 1250, 1600, 2000, 2500, 3150];
/** Jemné podrozsahy pro r a s. */
const FINE = [560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000, 2240, 2500, 2800, 3150];

/** Základní tolerance IT1–IT18 [µm] (ISO 286-1:2010, tab. 1; IT01 a IT0 nad 500 mm neexistují). */
const IT = [
  [9, 11, 16, 22, 32, 44, 70, 110, 175, 280, 440, 700, 1100, 1750, 2800, 4400, 7000, 11000],
  [10, 13, 18, 25, 36, 50, 80, 125, 200, 320, 500, 800, 1250, 2000, 3200, 5000, 8000, 12500],
  [11, 15, 21, 28, 40, 56, 90, 140, 230, 360, 560, 900, 1400, 2300, 3600, 5600, 9000, 14000],
  [13, 18, 24, 33, 47, 66, 105, 165, 260, 420, 660, 1050, 1650, 2600, 4200, 6600, 10500, 16500],
  [15, 21, 29, 39, 55, 78, 125, 195, 310, 500, 780, 1250, 1950, 3100, 5000, 7800, 12500, 19500],
  [18, 25, 35, 46, 65, 92, 150, 230, 370, 600, 920, 1500, 2300, 3700, 6000, 9200, 15000, 23000],
  [22, 30, 41, 55, 78, 110, 175, 280, 440, 700, 1100, 1750, 2800, 4400, 7000, 11000, 17500, 28000],
  [26, 36, 50, 68, 96, 135, 210, 330, 540, 860, 1350, 2100, 3300, 5400, 8600, 13500, 21000, 33000],
];

// Hřídele d–h: horní úchylka es [µm] po hlavních rozsazích
const ES = {
  d: [-260, -290, -320, -350, -390, -430, -480, -520],
  e: [-145, -160, -170, -195, -220, -240, -260, -290],
  f: [-76, -80, -86, -98, -110, -120, -130, -145],
  g: [-22, -24, -26, -28, -30, -32, -34, -38],
  h: [0, 0, 0, 0, 0, 0, 0, 0],
};
// Hřídele k–p: dolní úchylka ei [µm] po hlavních rozsazích
const EI_MAIN = {
  k: [0, 0, 0, 0, 0, 0, 0, 0],
  m: [26, 30, 34, 40, 48, 58, 68, 76],
  n: [44, 50, 56, 66, 78, 92, 110, 135],
  p: [78, 88, 100, 120, 140, 170, 195, 240],
};
// Hřídele r, s: dolní úchylka ei [µm] po jemných podrozsazích
const EI_FINE = {
  r: [150, 155, 175, 185, 210, 220, 250, 260, 300, 330, 370, 400, 440, 460, 550, 580],
  s: [280, 310, 340, 380, 430, 470, 520, 580, 640, 720, 820, 920, 1000, 1100, 1250, 1400],
};

function rangeIndex(bounds, dim) {
  for (let i = 0; i < bounds.length; i++) if (dim <= bounds[i] + 1e-9) return i;
  return -1;
}

/** Základní tolerance ITn [µm] pro rozměr nad 500 do 3150 mm; null mimo rozsah. */
function itValueLarge(dim, grade) {
  const ri = dim > 500 ? rangeIndex(MAIN, dim) : -1;
  if (ri < 0 || !(grade >= 1 && grade <= 18)) return null;
  return IT[ri][grade - 1];
}

/**
 * Mezní úchylky pole tolerance pro rozměr (500, 3150] mm.
 * @param {string} letter - písmeno (malé = hřídel, velké = díra)
 * @param {number} grade - stupeň IT 1–18
 * @param {number} dim - jmenovitý rozměr mm
 * @returns {{upper:number, lower:number, tol:number}|{error:string}} úchylky v µm
 */
function deviationsLarge(letter, grade, dim) {
  if (!(dim > 500 && dim <= 3150)) return { error: 'Rozměr mimo rozsah 500–3150 mm' };
  const ri = rangeIndex(MAIN, dim), fi = rangeIndex(FINE, dim);
  const tol = IT[ri][grade - 1];
  const hole = letter !== letter.toLowerCase();
  const l = letter.toLowerCase();

  if (l === 'js') return { upper: tol / 2, lower: -tol / 2, tol };
  if ('abcj'.includes(l)) {
    return { error: 'Pole ' + letter + ' není v ISO 286 pro rozměry nad 500 mm definováno' };
  }
  if (ES[l]) {
    const es = ES[l][ri];
    const EI = 0 - es;                                   // 0 − 0 = +0 (ne −0)
    return hole ? { upper: EI + tol, lower: EI, tol } : { upper: es, lower: es - tol, tol };
  }
  const ei = EI_MAIN[l] ? EI_MAIN[l][ri] : EI_FINE[l][fi];
  const ESh = 0 - ei;
  return hole ? { upper: ESh, lower: ESh - tol, tol } : { upper: ei + tol, lower: ei, tol };
}

  return { deviationsLarge, itValueLarge };
  })();
  const deviationsLarge = L.deviationsLarge, itValueLarge = L.itValueLarge;
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – ISO 286 (tolerance a uložení) – čistý výpočet       ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Hřídele: a–h → základní úchylka je HORNÍ (es ≤ 0), j–s → DOLNÍ (ei).
// Díry:    A–H → EI = −es stejného písmene hřídele,
//          K, M, N (do IT8) a P–S (do IT7) → ES = −ei + Δ, Δ = ITn − IT(n−1)
//          (pro rozměry nad 3 mm), jinak ES = −ei (K a N nad IT8: ES = 0).
//          J – vlastní tabulka (J6, J7, J8), JS/js = ±IT/2.
// Hodnoty v µm podle ISO 286-2. Rozsah 0–500 mm zde, nad 500 do 3150 mm v iso286Large.js.



/** Hlavní rozsahy jmenovitých rozměrů (horní meze, mm). */
const MAIN = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
/** Jemné podrozsahy (a, b, c, r, s se uvnitř hlavních rozsahů mění). */
const FINE = [3, 6, 10, 18, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];

/** Základní tolerance IT1–IT18 [µm] po hlavních rozsazích. */
const IT = [
  [0.8, 1.2, 2, 3, 4, 6, 10, 14, 25, 40, 60, 100, 140, 250, 400, 600, 1000, 1400],
  [1, 1.5, 2.5, 4, 5, 8, 12, 18, 30, 48, 75, 120, 180, 300, 480, 750, 1200, 1800],
  [1, 1.5, 2.5, 4, 6, 9, 15, 22, 36, 58, 90, 150, 220, 360, 580, 900, 1500, 2200],
  [1.2, 2, 3, 5, 8, 11, 18, 27, 43, 70, 110, 180, 270, 430, 700, 1100, 1800, 2700],
  [1.5, 2.5, 4, 6, 9, 13, 21, 33, 52, 84, 130, 210, 330, 520, 840, 1300, 2100, 3300],
  [1.5, 2.5, 4, 7, 11, 16, 25, 39, 62, 100, 160, 250, 390, 620, 1000, 1600, 2500, 3900],
  [2, 3, 5, 8, 13, 19, 30, 46, 74, 120, 190, 300, 460, 740, 1200, 1900, 3000, 4600],
  [2.5, 4, 6, 10, 15, 22, 35, 54, 87, 140, 220, 350, 540, 870, 1400, 2200, 3500, 5400],
  [3.5, 5, 8, 12, 18, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300],
  [4.5, 7, 10, 14, 20, 29, 46, 72, 115, 185, 290, 460, 720, 1150, 1850, 2900, 4600, 7200],
  [6, 8, 12, 16, 23, 32, 52, 81, 130, 210, 320, 520, 810, 1300, 2100, 3200, 5200, 8100],
  [7, 9, 13, 18, 25, 36, 57, 89, 140, 230, 360, 570, 890, 1400, 2300, 3600, 5700, 8900],
  [8, 10, 15, 20, 27, 40, 63, 97, 155, 250, 400, 630, 970, 1550, 2500, 4000, 6300, 9700],
];

// Hřídele a–h: horní úchylka es [µm]
const ES_FINE = {     // po jemných podrozsazích
  a: [-270, -270, -280, -290, -300, -310, -320, -340, -360, -380, -410, -460, -520, -580, -660, -740, -820, -920, -1050, -1200, -1350, -1500, -1650],
  b: [-140, -140, -150, -150, -160, -170, -180, -190, -200, -220, -240, -260, -280, -310, -340, -380, -420, -480, -540, -600, -680, -760, -840],
  c: [-60, -70, -80, -95, -110, -120, -130, -140, -150, -170, -180, -200, -210, -230, -240, -260, -280, -300, -330, -360, -400, -440, -480],
};
const ES_MAIN = {     // po hlavních rozsazích
  d: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230],
  e: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135],
  f: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
  g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
  h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
// Hřídele j–s: dolní úchylka ei [µm]
const EI_MAIN = {
  k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],          // IT4–IT7; ostatní stupně ei = 0
  m: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
  n: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
  p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68],
};
const EI_FINE = {
  r: [10, 15, 19, 23, 28, 34, 34, 41, 43, 51, 54, 63, 65, 68, 77, 80, 84, 94, 98, 108, 114, 126, 132],
  s: [14, 19, 23, 28, 35, 43, 43, 53, 59, 71, 79, 92, 100, 108, 122, 130, 140, 158, 170, 190, 208, 232, 252],
};
// j: dolní úchylka ei pro j5, j6, j7 (j5 a j6 mají v ISO 286 společný sloupec),
// j8 je definováno jen do 3 mm
const J_SHAFT = {
  5: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
  6: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
  7: [-4, -4, -5, -6, -8, -10, -12, -15, -18, -21, -26, -28, -32],
  8: [-6],
};
// J: horní úchylka ES pro J6, J7, J8
const J_HOLE = {
  6: [2, 5, 5, 6, 8, 10, 13, 16, 18, 22, 25, 29, 33],
  7: [4, 6, 8, 10, 12, 14, 18, 22, 26, 30, 36, 39, 43],
  8: [6, 10, 12, 15, 20, 24, 28, 34, 41, 47, 55, 60, 66],
};

const SHAFT_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'js', 'j', 'k', 'm', 'n', 'p', 'r', 's'];
const HOLE_LETTERS = SHAFT_LETTERS.map(l => l.toUpperCase());

function rangeIndex(bounds, dim) {
  for (let i = 0; i < bounds.length; i++) if (dim <= bounds[i] + 1e-9) return i;
  return -1;
}

/** Základní tolerance ITn [µm] pro rozměr; null mimo rozsah. */
function itValue(dim, grade) {
  if (dim > 500) return itValueLarge(dim, grade);
  const ri = dim > 0 ? rangeIndex(MAIN, dim) : -1;
  if (ri < 0 || !(grade >= 1 && grade <= 18)) return null;
  return IT[ri][grade - 1];
}

function shaftFundamental(letter, ri, fi, grade) {
  if (ES_FINE[letter]) return { es: ES_FINE[letter][fi] };
  if (ES_MAIN[letter]) return { es: ES_MAIN[letter][ri] };
  if (letter === 'k') return { ei: grade >= 4 && grade <= 7 ? EI_MAIN.k[ri] : 0 };
  if (EI_MAIN[letter]) return { ei: EI_MAIN[letter][ri] };
  if (EI_FINE[letter]) return { ei: EI_FINE[letter][fi] };
  return null;
}

/**
 * Mezní úchylky pole tolerance.
 * @param {string} letter - písmeno (malé = hřídel, velké = díra), např. 'H', 'g', 'js', 'JS'
 * @param {number} grade - stupeň IT 1–18
 * @param {number} dim - jmenovitý rozměr (0, 3150] mm
 * @returns {{upper:number, lower:number, tol:number}|{error:string}} úchylky v µm
 */
function deviations(letter, grade, dim) {
  if (!(dim > 0 && dim <= 3150)) return { error: 'Rozměr mimo rozsah 0–3150 mm' };
  if (!Number.isInteger(grade) || grade < 1 || grade > 18) return { error: 'Stupeň IT musí být 1–18' };
  const hole = letter !== letter.toLowerCase();
  const l = letter.toLowerCase();
  if (!SHAFT_LETTERS.includes(l)) return { error: 'Neznámé písmeno ' + letter };
  if (dim > 500) return deviationsLarge(letter, grade, dim);
  const ri = rangeIndex(MAIN, dim), fi = rangeIndex(FINE, dim);
  const tol = IT[ri][grade - 1];
  if ((l === 'a' || l === 'b') && dim <= 1) return { error: 'Pole a, b, A, B se podle ISO 286 pro rozměry do 1 mm nepoužívají' };

  if (l === 'js') {
    const r = { upper: tol / 2, lower: -tol / 2, tol };
    // ISO 286-2:1988 (a katalogy z ní – např. Mitsubishi) u js7–js11 s lichou IT
    // zaokrouhlovala dolů na sudé (±10 místo ±10,5); aktuální tabulky uvádějí ±IT/2.
    if (grade >= 7 && grade <= 11 && tol % 2 === 1) {
      r.note = 'Starší tabulky (ISO 286-2:1988 a katalogy z ní) uvádějí zaokrouhleně ±' + (tol - 1) / 2 + ' µm.';
    }
    return r;
  }

  if (l === 'j') {
    const tbl = hole ? J_HOLE[grade] : J_SHAFT[grade];
    if (!tbl || tbl[ri] === undefined) return { error: (hole ? 'J' : 'j') + grade + ' není v ISO 286 pro tento rozměr definováno (' + (hole ? 'J6–J8' : 'j5–j7, j8 jen do 3 mm') + ')' };
    return hole ? { upper: tbl[ri], lower: tbl[ri] - tol, tol } : { upper: tbl[ri] + tol, lower: tbl[ri], tol };
  }

  if (!hole) {
    const f = shaftFundamental(l, ri, fi, grade);
    return f.es !== undefined ? { upper: f.es, lower: f.es - tol, tol } : { upper: f.ei + tol, lower: f.ei, tol };
  }

  // Díry
  if ('abcdefgh'.includes(l)) {
    const EI = 0 - shaftFundamental(l, ri, fi, grade).es;     // 0 − 0 = +0 (ne −0)
    return { upper: EI + tol, lower: EI, tol };
  }
  const over3 = dim > 3;
  const delta = over3 && grade >= 2 ? IT[ri][grade - 1] - IT[ri][grade - 2] : 0;
  let ES;
  if (l === 'k') {
    const ei = EI_MAIN.k[ri];                          // hodnota pro IT4–IT7
    ES = !over3 ? 0 : grade <= 8 ? -ei + delta : 0;
  } else if (l === 'm') {
    const ei = EI_MAIN.m[ri];
    ES = !over3 ? -2 : grade <= 8 ? -ei + delta : -ei;
    if (grade === 6 && dim > 250 && dim <= 315) ES = -9;   // výjimka ISO 286: M6 250–315 mm = −9 (ne −11)
  } else if (l === 'n') {
    const ei = EI_MAIN.n[ri];
    ES = !over3 ? -4 : grade <= 8 ? -ei + delta : 0;
  } else {                                             // p, r, s
    const ei = shaftFundamental(l, ri, fi, grade).ei;
    ES = grade <= 7 ? -ei + delta : -ei;
  }
  return { upper: ES, lower: ES - tol, tol };
}

/**
 * Uložení díra/hřídel.
 * @returns {{hole, shaft, maxClearance:number, minClearance:number, type:'vůle'|'přechodné'|'přesah'}|{error:string}}
 *   vůle v µm (záporná = přesah)
 */
function fit(holeLetter, holeGrade, shaftLetter, shaftGrade, dim) {
  const hole = deviations(holeLetter, holeGrade, dim);
  if (hole.error) return hole;
  const shaft = deviations(shaftLetter, shaftGrade, dim);
  if (shaft.error) return shaft;
  const maxClearance = hole.upper - shaft.lower, minClearance = hole.lower - shaft.upper;
  const type = minClearance >= 0 ? 'vůle' : maxClearance <= 0 ? 'přesah' : 'přechodné';
  return { hole, shaft, maxClearance, minClearance, type };
}

  out.deviations = deviations; out.fit = fit; out.itValue = itValue; out.SHAFT_LETTERS = SHAFT_LETTERS; out.HOLE_LETTERS = HOLE_LETTERS;
  })();
  // ── Kužel (taperBoreMath.js + náčrt taperBoreSketch.js) ──
  (function () {
  const deviations = out.deviations;
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Kužel v díře / na čepu: kontrolní průměry (čistý)   ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Výkres udává JEDEN průměr (s tolerancí) v určité hloubce od jedné strany,
// kuželovitost (1:x nebo úhel) a celkovou délku. Spočítáme průměr v libovolné
// hloubce od kterékoli strany – např. kde měří sonda (Supito).
//
// Souřadnice z: 0 = strana A („spodek"/„začátek"), L = strana B („vrch"/„konec").



/**
 * Změna PRŮMĚRU na 1 mm délky (C).
 * @param {'ratio'|'half'|'full'|'c'} mode  1:x | polovrcholový α° | vrcholový 2α° | přímo C
 * @param {number} value
 * @returns {number} C (≥ 0), NaN při chybě
 */
function taperC(mode, value) {
  if (!(value > 0)) return mode === 'c' && value === 0 ? 0 : NaN;
  switch (mode) {
    case 'ratio': return 1 / value;
    case 'half': return 2 * Math.tan(value * Math.PI / 180);
    case 'full': return 2 * Math.tan(value / 2 * Math.PI / 180);
    case 'c': return value;
    default: return NaN;
  }
}

/** Všechna vyjádření kuželovitosti z C. */
function taperForms(C) {
  const half = Math.atan(C / 2) * 180 / Math.PI;
  return { C, ratio: C > 0 ? 1 / C : Infinity, half, full: 2 * half, perSide: C / 2 };
}

/**
 * Tolerance z ISO zápisu („H7", „h7", „js6", „JS7"). Vrací úchylky v mm.
 * @returns {{es:number, ei:number}|{error:string}|null} null = prázdný zápis
 */
function isoTolerance(code, dim) {
  const s = String(code || '').trim();
  if (!s) return null;
  const m = /^([a-zA-Z]{1,2})\s*(\d{1,2})$/.exec(s);
  if (!m) return { error: 'Zápis tolerance např. H7, h6, js6' };
  const r = deviations(m[1], parseInt(m[2], 10), dim);
  if (r.error) return r;
  return { es: r.upper / 1000, ei: r.lower / 1000 };
}

/**
 * Hlavní výpočet.
 * @param {object} p
 * @param {number} p.D      zadaný (jmenovitý) průměr
 * @param {number} p.es     horní úchylka [mm]
 * @param {number} p.ei     dolní úchylka [mm]
 * @param {number} p.L      celková délka kužele
 * @param {number} p.refDepth  hloubka zadaného průměru od strany refSide
 * @param {'A'|'B'} p.refSide
 * @param {number} p.C      změna průměru na 1 mm
 * @param {'A'|'B'} p.bigSide  strana, kde je kužel VĚTŠÍ
 * @param {{depth:number, side:'A'|'B'|'AB'}[]} p.points
 */
function computeTaperBore(p) {
  const { D, L, C } = p;
  const es = p.es || 0, ei = p.ei || 0;
  if (!(D > 0)) return { error: 'Zadej průměr' };
  if (!(L > 0)) return { error: 'Zadej celkovou délku kužele' };
  if (!(C >= 0) || !isFinite(C)) return { error: 'Zadej kuželovitost' };
  const refDepth = p.refDepth || 0;
  if (refDepth < 0 || refDepth > L) return { error: 'Hloubka zadaného průměru je mimo délku kužele' };
  if (es < ei) return { error: 'Horní úchylka je menší než dolní' };

  const zRef = p.refSide === 'B' ? L - refDepth : refDepth;
  // Průměr roste směrem k bigSide.
  const dir = p.bigSide === 'A' ? -1 : 1;
  const diaAt = z => D + dir * C * (z - zRef);
  const zOf = (side, depth) => side === 'B' ? L - depth : depth;

  const rows = [];
  (p.points || []).forEach((pt, ptIdx) => {
    if (!(pt.depth >= 0)) return;
    const sides = pt.side === 'AB' ? ['A', 'B'] : [pt.side === 'B' ? 'B' : 'A'];
    for (const side of sides) {
      const z = zOf(side, pt.depth);
      const nom = diaAt(z);
      rows.push({ side, depth: pt.depth, z, nom, min: nom + ei, max: nom + es, outside: z < 0 || z > L, pt: ptIdx });
    }
  });
  // Rozdíly B − A ve stejné hloubce
  const diffs = [];
  const seen = new Set();
  for (const r of rows) {
    if (r.side !== 'A' || seen.has(r.depth)) continue;
    const b = rows.find(x => x.side === 'B' && x.depth === r.depth);
    if (b) { seen.add(r.depth); diffs.push({ depth: r.depth, diff: b.nom - r.nom, span: L - 2 * r.depth }); }
  }

  return {
    zRef, es, ei, L, C,
    endA: diaAt(0), endB: diaAt(L),
    forms: taperForms(C),
    rows, diffs,
  };
}

/** Formát čísla: 3 desetinná místa (bez −0). */
function f3(x) {
  const s = (Math.round(x * 1000) / 1000).toFixed(3);
  return s === '-0.000' ? '0.000' : s;
}

/** Úchylky jako „+0.046/−0" (nula: horní „+0", dolní „−0"). */
function fmtDev(es, ei) {
  const one = (v, zero) => {
    if (Math.abs(v) < 1e-9) return zero;
    return (v > 0 ? '+' : '\u2212') + String(Math.round(Math.abs(v) * 1000) / 1000);
  };
  return one(es, '+0') + '/' + one(ei, '\u22120');
}

/**
 * Sjednocený výpočet kužele: ze zadaných veličin dopočítá zbylé.
 * Bez zadaného Ø v hloubce stačí 3 ze 4 {D, d, L, C}.
 * Se zadaným Ø v hloubce (ref) stačí L + jedno z {C, D, d}.
 * @param {object} k  D velký Ø, d malý Ø, L délka, C změna Ø/mm (null = neznámé)
 * @param {{dia:number, depth:number, side:'A'|'B'}|null} ref  zadaný Ø v hloubce
 * @param {'A'|'B'} bigSide  strana s větším Ø
 * @returns {{D:number|null, d:number|null, L:number|null, C:number|null, computed:Set<string>, warn?:string, error?:string}}
 */
function solveTaper(k, ref, bigSide) {
  let { D, d, L, C } = k;
  const known = x => x !== null && x !== undefined && Number.isFinite(x);
  const out = new Set();
  const set = (name, val) => { out.add(name); return val; };
  let warn;

  if (ref && known(ref.dia)) {
    if (!known(L)) return { D, d, L, C, computed: out, error: 'Se zadaným Ø v hloubce zadej i délku kužele L' };
    const depth = ref.depth || 0;
    if (depth < 0 || depth > L) return { D, d, L, C, computed: out, error: 'Hloubka zadaného Ø je mimo délku kužele' };
    const distBig = ref.side === bigSide ? depth : L - depth;   // od velkého konce
    const distSmall = L - distBig;
    if (known(C)) {
      const D2 = ref.dia + C * distBig, d2 = ref.dia - C * distSmall;
      if ((known(D) && Math.abs(D - D2) > 1e-3) || (known(d) && Math.abs(d - d2) > 1e-3)) warn = 'Zadaný Ø v hloubce má přednost – D a d jsou přepočítané';
      D = set('D', D2); d = set('d', d2);
    } else if (known(D) && distBig > 0) {
      C = set('C', (D - ref.dia) / distBig); d = set('d', D - C * L);
    } else if (known(d) && distSmall > 0) {
      C = set('C', (ref.dia - d) / distSmall); D = set('D', d + C * L);
    } else {
      return { D, d, L, C, computed: out, error: 'K zadanému Ø v hloubce doplň kuželovitost (nebo D či d)' };
    }
  } else {
    const n = [D, d, L, C].filter(known).length;
    if (n < 3) return { D, d, L, C, computed: out };
    if (!known(C)) C = set('C', (D - d) / L);
    else if (!known(L)) L = set('L', C > 0 ? (D - d) / C : NaN);
    else if (!known(d)) d = set('d', D - C * L);
    else if (!known(D)) D = set('D', d + C * L);
    else if (Math.abs((D - d) - C * L) > 1e-3) warn = 'Zadané D, d, L a kuželovitost si odporují';
  }
  if (known(D) && known(d) && D < d) return { D, d, L, C, computed: out, error: 'D (velký Ø) vychází menší než d – zkontroluj zadání nebo prohoď, kde je větší Ø' };
  if (known(L) && !(L > 0)) return { D, d, L, C, computed: out, error: 'Délka kužele musí být kladná' };
  return { D, d, L, C, computed: out, warn };
}

/**
 * Kuželovitost jako poměr: „300" = 1:300, „1:300", „7:24", „1 : 20" …
 * @returns {number} C = změna Ø na 1 mm délky; NaN při chybném zápisu
 */
function ratioToC(text) {
  const s = String(text ?? '').trim().replace(/,/g, '.');
  const m = /^([\d.]+)\s*:\s*([\d.]+)$/.exec(s);
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    return a > 0 && b > 0 ? a / b : NaN;
  }
  const x = parseFloat(s);
  return /^[\d.]+$/.test(s) && x > 0 ? 1 / x : NaN;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Kužel: klikací náčrt řezu (díra i čep)              ║
// ╚══════════════════════════════════════════════════════════════╝
// Podélný řez, kuželovitost zveličená. Kóty jsou klikací (data-edit):
// D, d, L, C (1:x), Ca (úhel α), swap, refD, ref, refAdd, pt:<index měřicího místa>.
// Neznámé hodnoty se kreslí jako „?" – i prázdný náčrt jde vyplnit klikáním.



const TOP = 84, BOT = 322, CX = 170, OUTER = 126, BASE = 58;

const TIPS = {
  D: 'D – velký průměr kužele (na hraně)', d: 'd – malý průměr kužele (na hraně)', L: 'Délka kužele',
  C: 'Kuželovitost 1:x – na x mm délky se Ø změní o 1 mm', Ca: 'Úhel α – sklon povrchu k ose (= náklon suportu)',
  swap: 'Prohodit, na které straně je větší průměr', refD: 'Průměr z výkresu, který platí v určité hloubce',
  ref: 'Hloubka zadaného průměru (od spodu / od vrchu)', refAdd: 'Výkres udává průměr v hloubce – zadat ho',
};

const ln = (x1, y1, x2, y2, cls) =>
  '<line class="' + cls + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
const txt = (x, y, s, cls, anchor = 'middle') =>
  '<text class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + anchor + '">' + s + '</text>';
const width = s => Math.max(28, s.length * 6.8 + 10);

/** Klikací popisek; anchor 'start' nebo 'middle'; rot = otočení kolem (x, y). */
function lbl(x, y, s, key, cls, { anchor = 'middle', rot = 0 } = {}) {
  const w = width(s), h = 19;
  const rx = anchor === 'start' ? x - 4 : anchor === 'end' ? x - w + 4 : x - w / 2;
  const tr = rot ? ' transform="rotate(' + rot + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"' : '';
  const tip = TIPS[key] || (key.startsWith('pt:') ? 'Měřicí místo – upravit hloubku / stranu nebo smazat' : '');
  return '<g class="sk-edit" data-edit="' + key + '"' + tr + '>' + (tip ? '<title>' + tip + '</title>' : '') +
    '<rect class="sk-hit" x="' + rx.toFixed(1) + '" y="' + (y - 13.5).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h + '" rx="5"/>' +
    txt(x, y, s, cls, anchor) + '</g>';
}

function arrowV(x, ya, yb) {
  const k = ya < yb ? 1 : -1;
  return ln(x, ya, x, yb, 'cs-dim') +
    '<path class="cs-arrow-y" d="M' + x + ' ' + ya + ' l-3 ' + 7 * k + ' h6z"/>' +
    '<path class="cs-arrow-y" d="M' + x + ' ' + yb + ' l-3 ' + -7 * k + ' h6z"/>';
}

const CLS = { val: 'sk-val', calc: 'sk-calc', empty: 'sk-empty' };

/**
 * @param {SVGElement} svg
 * @param {object} m  model z taperBore.js:
 *   L (kreslená délka), C, bigSide, names, shaft,
 *   v: {D, d, L} hodnoty, st: {D, d, L, C} stav 'val'|'calc'|'empty',
 *   taperTxt, tolTxt, tolEmpty, ref: null | {dia, depth, depthKnown, side, z}, rows
 * @returns {{zFromY:(y:number)=>number|null, L:number}}
 */
function drawBoreSketch(svg, m) {
  const L = m.L;
  const y = z => BOT - (z / L) * (BOT - TOP);
  const yA = y(0), yB = y(L);
  const dir = m.bigSide === 'A' ? -1 : 1;               // Ø roste směrem k větší straně
  const slope = m.C === 0 ? 0 : 1;
  const hw = z => BASE + slope * dir * ((z - L / 2) / L) * 34;
  const n = m.names;
  const shaft = m.shaft;

  let s = '<defs><pattern id="tbHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<line x1="0" y1="0" x2="0" y2="7" class="tb-hatch"/></pattern></defs>';
  s += '<rect class="tb-add-zone" x="' + (CX - OUTER) + '" y="' + yB + '" width="' + 2 * OUTER + '" height="' + (yA - yB) + '"/>';
  if (shaft) {
    s += '<path class="tb-mat" d="M' + (CX - hw(0)) + ' ' + yA + ' L' + (CX - hw(L)) + ' ' + yB + ' L' + (CX + hw(L)) + ' ' + yB + ' L' + (CX + hw(0)) + ' ' + yA + 'Z"/>';
  } else {
    s += '<path class="tb-mat" d="M' + (CX - OUTER) + ' ' + yA + ' L' + (CX - hw(0)) + ' ' + yA + ' L' + (CX - hw(L)) + ' ' + yB + ' L' + (CX - OUTER) + ' ' + yB + 'Z"/>';
    s += '<path class="tb-mat" d="M' + (CX + OUTER) + ' ' + yA + ' L' + (CX + hw(0)) + ' ' + yA + ' L' + (CX + hw(L)) + ' ' + yB + ' L' + (CX + OUTER) + ' ' + yB + 'Z"/>';
  }
  s += ln(CX, yB - 8, CX, yA + 8, 'cs-axis');

  // Horní řádky: kuželovitost, prohození, tolerance, „+ Ø v hloubce"
  s += lbl(92, 16, m.taperTxt, 'C', CLS[m.stForm('ratio')]);
  s += lbl(266, 16, '⇅ větší ' + (m.bigSide === 'A' ? n.bigA : n.bigB), 'swap', 'sk-btn');
  if (!m.ref) s += lbl(266, 42, '+ Ø v hloubce', 'refAdd', 'sk-btn');

  // Hrany: velký D a malý d
  const keyOf = side => side === m.bigSide ? 'D' : 'd';
  const edge = side => {
    const key = keyOf(side), v = m.v[key];
    return n[side] + ': ' + (key === 'D' ? 'D velký Ø ' : 'd malý Ø ') + (v !== null ? f3(v) : '?');
  };
  s += lbl(CX, yB - 12, edge('B'), keyOf('B'), CLS[m.st[keyOf('B')]]);
  s += lbl(CX, yA + 22, edge('A'), keyOf('A'), CLS[m.st[keyOf('A')]]);

  // Délka (vpravo)
  const xL = shaft ? CX + BASE + 62 : CX + OUTER + 12;
  const wMax = Math.max(hw(0), hw(L));
  s += ln(CX + wMax + 2, yA, xL + 4, yA, 'cs-ext') + ln(CX + wMax + 2, yB, xL + 4, yB, 'cs-ext');
  s += arrowV(xL, yB, yA);
  s += lbl(xL + 12, (yA + yB) / 2, 'délka L ' + (m.v.L !== null ? f3(m.v.L).replace(/\.?0+$/, '') : '?'), 'L', CLS[m.st.L], { rot: -90 });

  // Popisky v díře: zadaný Ø (je-li) + měřicí místa, bez překryvu
  const items = m.rows.map(r => ({
    yy: y(r.z), z: r.z, key: 'pt:' + r.pt, cls: 'tb-pt-t',
    t: r.no + ') ' + (r.nom !== null ? 'Ø' + f3(r.nom) : 'Ø ?') + ' hl.' + r.depth + (r.side === 'A' ? '↑' : '↓'),
  }));
  if (m.ref) {
    const zr = m.ref.z, yr = y(zr);
    const xR = shaft ? CX - BASE - 52 : CX - OUTER - 12;
    const yEdge = m.ref.side === 'A' ? yA : yB;
    s += ln(xR - 4, yr, CX - hw(zr), yr, 'cs-ext');
    if (Math.abs(yr - yEdge) > 6) s += arrowV(xR, yEdge, yr);
    const refMid = Math.abs(yr - yEdge) > 110 ? (yr + yEdge) / 2 : yEdge + (m.ref.side === 'A' ? -52 : 52);
    s += lbl(xR - 12, refMid, 'hloubka Ø ' + (m.ref.depthKnown ? m.ref.depth : '?'), 'ref', m.ref.depthKnown ? 'sk-val' : 'sk-empty', { rot: -90 });
    s += ln(CX - hw(zr), yr, CX + hw(zr), yr, 'tb-ref');
    items.push({ yy: yr, z: zr, ref: true });
  }
  items.sort((a, b) => a.yy - b.yy);
  const gap = 19, yMin = yB + 16, yMax = yA - 6;
  let prev = -1e9;
  items.forEach(it => { it.ly = Math.max(it.yy + 5, prev + gap, yMin); prev = it.ly; });
  if (prev > yMax) {
    const over = prev - yMax;
    items.forEach(it => { it.ly -= over; });
    items.forEach((it, k) => { it.ly = Math.max(it.ly, yMin + k * gap); });
  }
  const lx = shaft ? CX - 40 : CX - Math.min(hw(0), hw(L)) + 14;
  items.forEach(it => {
    const w = hw(it.z);
    if (it.ref) {
      s += ln(CX - w + 2, it.yy, lx - 4, it.ly - 4, 'tb-ref-lead');
      s += lbl(lx, it.ly, 'zadaný Ø' + f3(m.ref.dia).replace(/\.?0+$/, ''), 'refD', 'tb-ref-t', { anchor: 'start' });
    } else {
      s += ln(CX - w, it.yy, CX + w, it.yy, 'tb-pt-l');
      s += ln(CX - w + 2, it.yy, lx - 4, it.ly - 4, 'tb-pt-l');
      s += lbl(lx, it.ly, it.t, it.key, it.cls, { anchor: 'start' });
    }
  });

  // Úhel α: svislá pomocná čára a oblouk ke stěně (vpravo, mimo popisky)
  {
    // místo, kde nepřekáží popiskům měřicích míst a zadaného Ø
    const busy = items.flatMap(it => [it.ly, it.yy]);
    let zm = L * 0.5, best = -1;
    [0.5, 0.42, 0.58, 0.34, 0.66, 0.28].forEach(f => {
      const ly = y(L * f) - 60;
      const dmin = busy.length ? Math.min(...busy.map(b => Math.abs(b - ly))) : 999;
      if (dmin > best + 2) { best = dmin; zm = L * f; }
    });
    const Wx = CX + hw(zm), Wy = y(zm);
    const Ux = CX + hw(zm + L * 0.3), Uy = y(zm + L * 0.3);
    const R = 64, a1 = -Math.PI / 2, a2 = Math.atan2(Uy - Wy, Ux - Wx);
    s += ln(Wx, Wy, Wx, Wy - R - 14, 'cs-ext');
    if (slope) {
      s += '<path class="cs-arc tb-alpha-arc" d="M' + Wx.toFixed(1) + ' ' + (Wy - R).toFixed(1) + ' A' + R + ' ' + R + ' 0 0 ' + (a2 > a1 ? 1 : 0) + ' ' +
        (Wx + R * Math.cos(a2)).toFixed(1) + ' ' + (Wy + R * Math.sin(a2)).toFixed(1) + '"/>';
    }
    s += lbl(Wx - 10, Wy - R + 4, m.aTxt, 'Ca', CLS[m.stForm('half')], { anchor: 'end' });
  }

  const lg = (yy, t) => '<text class="sk-legend" x="170" y="' + yy + '" text-anchor="middle">' + t + '</text>';
  s += lg(366, 'bílá = zadáno · <tspan class="sk-lk-calc">žlutá = dopočítáno</tspan> · ? = chybí');
  s += lg(381, '<tspan class="sk-lk">1) 2)</tspan> měřicí místa: <tspan class="sk-lk">↓</tspan> ' + n.b + ', <tspan class="sk-lk">↑</tspan> ' + n.a);
  svg.innerHTML = s;
  return {
    L,
    zFromY: yy => (yy < yB - 2 || yy > yA + 2) ? null : Math.min(L, Math.max(0, (BOT - yy) / (BOT - TOP) * L)),
  };
}

  out.taperC = taperC; out.taperForms = taperForms; out.solveTaper = solveTaper; out.ratioToC = ratioToC;
  out.taper = { taperC, taperForms, solveTaper, ratioToC, computeTaperBore, isoTolerance, f3, fmtDev, drawBoreSketch };
  })();
  // ── Utahovací momenty (torqueMath.js) ──
  (function () {
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Utahovací momenty (výpočty a orientační data)       ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Čisté funkce bez DOM – testy v tests/torqueMath.test.js.
// 1) orientační momenty upínacích šroubů VBD (Torx) – rozsah z katalogů,
// 2) šroub metrický hrubý podle VDI 2230 (90 % meze kluzu), např. upínky
//    a čelisti na desce karuselu,
// 3) korekce nastavení momentového klíče s prodloužením, převody jednotek.

/**
 * Upínací šrouby VBD s Torx hlavou – rozsah momentu [Nm] podle katalogů.
 * Zdroje: Kennametal „Torque Recommendations" (řada MS…), Denitool
 * „Tightening torque". Výrobci se liší (např. M3,5: 1,7 vs 3,4 Nm), proto
 * jen orientačně – platí hodnota na držáku / obalu šroubu / v katalogu.
 * [závit, klíč, Nm min, Nm max, typické použití]
 */
const INSERT_SCREWS = [
  ['M2', 'T6', 0.47, 0.6, 'malé VBD, vyvrtávací tyče'],
  ['M2,2', 'T7', 1.0, 1.0, 'malé VBD'],
  ['M2,5', 'T7 / T8', 1.0, 1.3, 'malé VBD'],
  ['M3', 'T8 / T9', 1.7, 2.2, 'střední VBD'],
  ['M3,5', 'T15', 1.7, 3.4, 'střední VBD'],
  ['M4', 'T15', 2.6, 5.1, 'střední VBD'],
  ['M4,5', 'T15 / T20', 3.8, 3.8, 'větší VBD'],
  ['M5', 'T20', 5.1, 5.1, 'větší VBD'],
  ['M6', 'T25', 8.8, 9.0, 'velké VBD – karusel'],
  ['M8', 'T30', 21, 21, 'velké hrubovací VBD – karusel'],
];

/**
 * Kennametal Kenloc – upínací čep negativních VBD s otvorem (CNMG, DNMG, TNMG, WNMG, SNMG),
 * dotahuje se imbusem. Zdroj: Kennametal „Torque Recommendations" (řada KLM…).
 * Číslice v označení = vepsaná kružnice IC v osminách palce (KLM-46 → ½" = 12,7 mm).
 * [imbus mm, čep, závit, Nm, IC mm, příklady VBD]
 */
const KENLOC_PINS = [
  [2, 'KLM-33 / KLM-34', 'M5', 1.7, 9.525, 'CNMG 09, DNMG 11, TNMG 16, WNMG 06'],
  [2.5, 'KLM-44 / KLM-46', 'M6,3', 3.3, 12.7, 'CNMG 12, DNMG 15, TNMG 22, WNMG 08, SNMG 12'],
  [3, 'KLM-56 / KLM-58', 'M8', 5.5, 15.875, 'CNMG 16, SNMG 15'],
];

/**
 * Kennametal – šrouby upínek shora (claw / top clamp, řada STCM), dotahují se imbusem.
 * Zdroj: Kennametal „Torque Recommendations". [imbus mm, šrouby, závit, Nm min, Nm max]
 */
const CLAMP_SCREWS = [
  [2, 'STCM27 / STCM38', 'M4 / M5', 2.1, 2.1],
  [2.5, 'STCM5 / 9 / 25 / 40', 'M5 / M6', 4.0, 4.2],
  [3, 'STCM11 / 20 / 26 / 32 / 35', 'M6', 6.0, 7.0],
  [4, 'STCM4 / STCM8', 'M8', 17, 17],
];

/** ISO / ANSI označení VBD → vepsaná kružnice IC [mm] a zda je negativní (2. písmeno N). */
const IC_ISO = {
  C09: 9.525, C12: 12.7, C16: 15.875, C19: 19.05, C25: 25.4,
  D11: 9.525, D15: 12.7, D19: 15.875,
  S09: 9.525, S12: 12.7, S15: 15.875, S19: 19.05, S25: 25.4,
  T16: 9.525, T22: 12.7, T27: 15.875, T33: 19.05,
  W06: 9.525, W08: 12.7, V16: 9.525,
};
function insertIC(code) {
  const c = String(code || '').toUpperCase().replace(/[\s-]/g, '');
  let m = c.match(/^([CDSTWV])([A-Z])[A-Z]{2}(\d{2})[\dT]\d{3}/);          // ISO: CNMG120412
  if (m) return IC_ISO[m[1] + m[3]] ? { ic: IC_ISO[m[1] + m[3]], neg: m[2] === 'N' } : null;
  m = c.match(/^([CDSTWV])([A-Z])[A-Z]{2}(\d)\d\d/);                 // ANSI: CNMG433
  if (m) return { ic: +m[3] * 25.4 / 8, neg: m[2] === 'N' };
  return null;
}

/** Text klíče → průměr imbusu v mm (např. „imbus 2,5", „2.5", „SW3"), Torx → null. */
function hexKeyOf(text) {
  const m = String(text || '').trim().match(/^(?:imbus|inbus|hex|sw|šestihran)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?$/i);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

/**
 * Rychlý odhad momentu jen podle velikosti imbusu (nástrojové šrouby VBD, upínky, čepy).
 * Konzervativní hodnota u spodní hranice katalogů – platí hodnota na držáku / v katalogu.
 * [imbus mm, Nm]
 */
const HEX_QUICK = [[2, 2], [2.5, 3.5], [3, 6], [4, 17]];

/** Doporučený moment [Nm] pro imbus daného průměru, nebo null (neznámá velikost). */
function quickTorqueForHex(hex) {
  const r = HEX_QUICK.find(([h]) => h === hex);
  return r ? r[1] : null;
}

/** Text klíče → číslo Torxu (např. „T20", „Torx 8", „T-15", „TX10"), imbus → null. */
function torxOf(text) {
  const m = String(text || '').trim().match(/^(?:torx|tx|t)[\s-]*(\d{1,2})$/i);
  return m ? +m[1] : null;
}

/** Text klíče → číslo Torx Plus (např. „IP15", „TP15", „15IP", „Torx Plus 20"), jinak null. */
function torxPlusOf(text) {
  const t = String(text || '').trim();
  const m = t.match(/^(?:ip|tp|torx[\s-]*plus)[\s-]*(\d{1,2})$/i) || t.match(/^(\d{1,2})[\s-]*(?:ip|tp)$/i);
  return m ? +m[1] : null;
}

/** Druh hlavy šroubu z textu klíče: 'imbus' | 'torx' | 'torxplus' | null; size = rozměr (mm / číslo T). */
function keyKindOf(text) {
  const p = torxPlusOf(text); if (p !== null) return { kind: 'torxplus', size: p };
  const t = torxOf(text); if (t !== null) return { kind: 'torx', size: t };
  const h = hexKeyOf(text); if (h !== null) return { kind: 'imbus', size: h };
  return null;
}

/** Šrouby VBD odpovídající Torxu daného čísla (řádky INSERT_SCREWS, kde je klíč „T<n>"). */
function insertScrewsForTorx(n) {
  return INSERT_SCREWS.filter(r => r[1].split('/').some(k => +k.trim().replace(/^T/i, '') === n));
}

/** Pevnostní třídy: [klíč, název, Rp0,2 MPa do M16, Rp0,2 MPa nad M16]. */
const STRENGTH_CLASSES = [
  ['8.8', '8.8', 640, 660],
  ['10.9', '10.9', 940, 940],
  ['12.9', '12.9', 1100, 1100],
  ['A2-70', 'A2-70 (nerez)', 450, 450],
  ['A4-80', 'A4-80 (nerez)', 600, 600],
];

/** Součinitel tření μ (závit = hlava) podle stavu povrchu (VDI 2230, orientačně). */
const FRICTION = [
  ['0.10', '0,10 – mazáno (MoS₂, pasta)'],
  ['0.12', '0,12 – lehce naolejováno (výchozí)'],
  ['0.14', '0,14 – černěno / zinek, olej'],
  ['0.16', '0,16 – suché, bez mazání'],
];

/**
 * Metrický hrubý závit: [d mm, stoupání P, rozměr hlavy dw mm (hex/imbus), díra dh mm (střední ISO 273)].
 */
const METRIC_BOLTS = [
  [4, 0.7, 7, 4.5], [5, 0.8, 8, 5.5], [6, 1, 10, 6.6], [8, 1.25, 13, 9],
  [10, 1.5, 16, 11], [12, 1.75, 18, 13.5], [14, 2, 21, 15.5], [16, 2, 24, 17.5],
  [18, 2.5, 27, 20], [20, 2.5, 30, 22], [22, 2.5, 32, 24], [24, 3, 36, 26],
  [27, 3, 41, 30], [30, 3.5, 46, 33], [36, 4, 55, 39],
];

/**
 * Montážní moment a předpětí šroubu podle VDI 2230 (využití meze kluzu ν).
 * @param {{d:number, P:number, dw:number, dh:number, Rp:number, mu:number, muK?:number, nu?:number}} p
 * @returns {{FM:number, MA:number, As:number, d2:number}|null} FM v N, MA v Nm
 */
function boltTorque({ d, P, dw, dh, Rp, mu, muK = mu, nu = 0.9 }) {
  if (!(d > 0 && P > 0 && dw > dh && Rp > 0 && mu > 0 && muK > 0 && nu > 0 && nu <= 1)) return null;
  const d2 = d - 0.649519 * P;                                   // střední průměr závitu
  const d3 = d - 1.226869 * P;                                   // malý průměr šroubu
  const d0 = (d2 + d3) / 2;
  const As = Math.PI / 4 * d0 * d0;                              // výpočtový průřez
  const k = 1.5 * (d2 / d0) * (P / (Math.PI * d2) + 1.155 * mu); // krut v závitu
  const FM = nu * Rp * As / Math.sqrt(1 + 3 * k * k);
  const DKm = (dw + dh) / 2;                                     // střední Ø dosedací plochy hlavy
  const MA = FM * (0.16 * P + 0.58 * d2 * mu + DKm / 2 * muK) / 1000;
  return { FM, MA, As, d2 };
}

/** Rp0,2 pevnostní třídy pro daný průměr (8.8 má nad M16 vyšší mez). */
function yieldOf(cls, d) {
  const c = STRENGTH_CLASSES.find(r => r[0] === cls);
  if (!c) return null;
  return d > 16 ? c[3] : c[2];
}

/**
 * Nastavení momentového klíče s prodloužením (nástavec v ose klíče).
 * L = účinná délka klíče (střed rukojeti → osa čtyřhranu), a = přesah nástavce.
 * Nástavec otočený o 90° moment nemění (a = 0).
 */
function wrenchSetting(target, L, a) {
  if (!(target > 0 && L > 0) || !Number.isFinite(a) || L + a <= 0) return null;
  return target * L / (L + a);
}

/** Převody jednotek momentu na Nm. */
const TORQUE_UNITS = [
  ['Nm', 'Nm', 1],
  ['cNm', 'cNm', 0.01],
  ['kgfm', 'kgf·m', 9.80665],
  ['kgfcm', 'kgf·cm', 0.0980665],
  ['lbfft', 'lbf·ft', 1.3558179],
  ['lbfin', 'lbf·in', 0.11298483],
];

function convertTorque(value, from, to) {
  const f = TORQUE_UNITS.find(u => u[0] === from), t = TORQUE_UNITS.find(u => u[0] === to);
  if (!f || !t || !Number.isFinite(value)) return null;
  return value * f[2] / t[2];
}

  out.torque = { INSERT_SCREWS, KENLOC_PINS, CLAMP_SCREWS, insertIC, hexKeyOf, HEX_QUICK, quickTorqueForHex, torxOf, torxPlusOf, keyKindOf, insertScrewsForTorx, STRENGTH_CLASSES, FRICTION, METRIC_BOLTS, boltTorque, yieldOf, wrenchSetting, TORQUE_UNITS, convertTorque };
  })();
  // ── Tepelná roztažnost (thermalMath.js) ──
  (function () {
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Tepelná roztažnost (čistý výpočet)                  ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Lineární model: L(T) = L₀·(1 + α·(T − T₀)), α [10⁻⁶ /K], T₀ = 20 °C (ISO 1).
// Hodnoty α jsou ORIENTAČNÍ střed rozsahu pro 20–100 °C; přesná hodnota závisí
// na slitině a tepelném zpracování (u přesných dílů vzít z materiálového listu).

/** [klíč, název, α v 10⁻⁶/K] */
const THERMAL_MATERIALS = [
  ['steel',    'Ocel konstrukční / uhlíková', 11.5],
  ['tool',     'Ocel nástrojová (kalená)', 11],
  ['inox',     'Nerez austenitická (1.4301)', 16.5],
  ['inoxM',    'Nerez martenzitická (1.4021)', 10.5],
  ['castGrey', 'Litina šedá', 10.5],
  ['castDuct', 'Litina tvárná', 11],
  ['alu',      'Hliníkové slitiny', 23],
  ['copper',   'Měď', 16.5],
  ['brass',    'Mosaz', 19],
  ['bronze',   'Bronz', 17.5],
  ['titan',    'Titan Ti6Al4V', 8.6],
  ['carbide',  'Slinutý karbid (WC-Co)', 5.5],
  ['pom',      'POM', 110],
  ['pa6',      'PA6', 90],
];

const REF_TEMP = 20;

/** Rozměr po změně teploty z T0 na T. @param {number} alpha 10⁻⁶/K */
function sizeAtTemp(L0, alpha, T, T0 = REF_TEMP) {
  return L0 * (1 + alpha * 1e-6 * (T - T0));
}

/** Rozměr při T0 (20 °C) z hodnoty naměřené při teplotě T. */
function sizeAtRef(Lmeasured, alpha, T, T0 = REF_TEMP) {
  return Lmeasured / (1 + alpha * 1e-6 * (T - T0));
}

/**
 * Teplota pro nalisování za tepla (ohřev díry) nebo za studena (chlazení hřídele).
 * Potřebná změna průměru = přesah + montážní vůle.
 * @param {{d:number, interference:number, clearance?:number, alpha:number, T0?:number}} p
 *   d [mm], přesah a vůle [mm]
 * @returns {{dT:number, dD:number, heated:number, cooled:number}|null}
 *   heated – teplota ohřívané součásti, cooled – teplota chlazené součásti
 */
function shrinkFit({ d, interference, clearance = 0, alpha, T0 = 20 }) {
  if (!(d > 0) || !(alpha > 0) || !(interference >= 0) || !(clearance >= 0)) return null;
  const dD = interference + clearance;
  const dT = dD / (alpha * 1e-6 * d);
  return { dT, dD, heated: T0 + dT, cooled: T0 - dT };
}

/**
 * Změna vůle spoje hřídel/otvor při změně teploty z T0 na T.
 * Kladné = vůle roste (otvor roste víc než hřídel).
 * @returns {number} změna průměrové vůle [mm]
 */
function gapChange({ d, alphaHole, alphaShaft, T, T0 = REF_TEMP }) {
  return d * (alphaHole - alphaShaft) * 1e-6 * (T - T0);
}

  out.thermal = { THERMAL_MATERIALS, REF_TEMP, sizeAtTemp, sizeAtRef, shrinkFit, gapChange };
  })();
  // ── Korekce rádiusu špičky (noseRadiusMath.js) ──
  (function () {
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Korekce na rádius špičky nože (bez G41/G42)         ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Bez korekce rádiusu řídicí systém vede TEORETICKOU ŠPIČKU P – průsečík
// tečen k rádiusu rε rovnoběžných s osami. Na válci a čele to nevadí, na
// sražení, kuželu a rádiusu ale nůž obrys podřízne nebo nechá materiál.
//
// Souřadnice (z, x): z = osa vřetene, x = POLOMĚR (průměr = 2x). Nůž obrábí
// ke sklíčidlu (−Z): P = střed rádiusu + rε·q, q = (−1, −1) vnější nůž,
// q = (−1, +1) vnitřní (vyvrtávací) nůž. n = jednotková normála obrysu
// směrem od materiálu; správná dráha P je obrys posunutý o δ·n, kde
// δ = rε·(1 + q·n). δ < 0 → bez korekce zůstane materiál, δ > 0 → podřízne.

function toolQ(internal) { return { z: -1, x: internal ? 1 : -1 }; }

/**
 * Korekce přímého úseku (sražení, kužel) skloněného o α od osy Z.
 * reverse = false: sklon, který nůž bere špičkou – vnější: Ø roste ke
 *   sklíčidlu (sražení na konci hřídele); vnitřní: Ø klesá ke sklíčidlu
 *   (sražení na vstupu díry).
 * reverse = true: opačný sklon (zpětný kužel).
 * @param {number} r - rádius špičky rε [mm]
 * @param {number} alphaDeg - úhel od osy Z, (0, 90)
 * @returns {{dz:number, dx:number, delta:number, n:{z:number,x:number}}|null}
 *   dz – posun bodů ležících na válci v ose Z; dx – posun bodů ležících na
 *   čele v ose X (POLOMĚR, na průměr 2·dx); delta – kolmá odchylka dráhy P.
 */
function lineCorrection(r, alphaDeg, { internal = false, reverse = false } = {}) {
  if (!(r >= 0) || !(alphaDeg > 0 && alphaDeg < 90)) return null;
  const a = alphaDeg * Math.PI / 180;
  const n = { z: (reverse ? -1 : 1) * Math.sin(a), x: (internal ? -1 : 1) * Math.cos(a) };
  const q = toolQ(internal);
  const delta = r * (1 + q.z * n.z + q.x * n.x);
  return { dz: delta / n.z, dx: delta / n.x, delta, n };
}

/**
 * Programované body sražení hrany (vnější: konec hřídele Ø D, vnitřní: vstup díry Ø D).
 * @param {number} c - délka sražení v ose Z
 * @param {number} zFace - Z čela
 * @returns {{contour, prog, corr}|null} body {z, d} – d je PRŮMĚR; a = na čele, b = na válci
 */
function chamferPoints(r, alphaDeg, D, c, zFace = 0, internal = false) {
  const corr = lineCorrection(r, alphaDeg, { internal });
  if (!corr || !(D > 0) || !(c > 0)) return null;
  const sx = internal ? -1 : 1;
  const dA = D - sx * 2 * c * Math.tan(alphaDeg * Math.PI / 180);
  if (!(dA >= 0)) return null;                       // sražení větší než poloměr
  return {
    corr,
    contour: { a: { z: zFace, d: dA }, b: { z: zFace - c, d: D } },
    prog: { a: { z: zFace, d: dA + 2 * corr.dx }, b: { z: zFace - c + corr.dz, d: D } },
  };
}

/**
 * Rádius 90° mezi čelem (kolmo na osu) a válcem.
 * concave = false: vypouklý – zaoblení hrany čela a válce Ø D (z0 = Z čela).
 * concave = true: vydutý – rádius v osazení; Ø D = válec (díra) u osazení,
 *   z0 = Z čela osazení, které je obrácené k +Z.
 * Programovaný rádius: vypouklý R + rε, vydutý R − rε (vydutý vyžaduje R ≥ rε).
 * @returns {{Rp:number, contour, prog}|null} body {z, d} (d = PRŮMĚR), center {z, d}
 */
function arcCorrection(r, R, D, z0 = 0, { internal = false, concave = false } = {}) {
  if (!(r >= 0) || !(R > 0) || !(D > 0)) return null;
  const sx = internal ? -1 : 1;
  if (!concave) {
    const Rp = R + r;
    return {
      Rp,
      contour: { face: { z: z0, d: D - sx * 2 * R }, cyl: { z: z0 - R, d: D }, center: { z: z0 - R, d: D - sx * 2 * R } },
      prog: { face: { z: z0, d: D - sx * 2 * Rp }, cyl: { z: z0 - Rp, d: D }, center: { z: z0 - Rp, d: D - sx * 2 * Rp } },
    };
  }
  if (R < r) return null;
  const Rp = R - r;
  return {
    Rp,
    contour: { cyl: { z: z0 + R, d: D }, face: { z: z0, d: D + sx * 2 * R }, center: { z: z0 + R, d: D + sx * 2 * R } },
    prog: { cyl: { z: z0 + Rp, d: D }, face: { z: z0, d: D + sx * 2 * Rp }, center: { z: z0 + Rp, d: D + sx * 2 * Rp } },
  };
}

  out.nose = { lineCorrection, chamferPoints, arcCorrection };
  })();
  // ── Roh R/C (cornerMath.js) ──
  (function () {
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Zaoblení a sražení obecného rohu (čistý výpočet)    ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Roh C mezi úsekem P1 → C a C → P2 (libovolné úhly – kužel/válec/čelo).
// Body {z, x}: z = osa, x = POLOMĚR (Ø/2) – úhly a rádius jsou skutečné.
//   δ = úhel otočení směru (0 = rovně), vnitřní úhel rohu = 180° − δ
//   rádius R: tečné body ve vzdálenosti t = R·tan(δ/2) od rohu, střed na
//             normále k 1. úseku ve vzdálenosti R (na vnitřní straně otočení)
//   sražení c: body ve vzdálenosti c od rohu po obou úsecích (stejné odvěsny)

const sub = (a, b) => ({ z: a.z - b.z, x: a.x - b.x });
const len = (v) => Math.hypot(v.z, v.x);

/** Směry obou úseků a otočení. @returns {{d1, d2, turn:number, left:boolean, L1:number, L2:number}|null} */
function cornerDirections(P1, C, P2) {
  const v1 = sub(C, P1), v2 = sub(P2, C);
  const L1 = len(v1), L2 = len(v2);
  if (!(L1 > 1e-9) || !(L2 > 1e-9)) return null;
  const d1 = { z: v1.z / L1, x: v1.x / L1 }, d2 = { z: v2.z / L2, x: v2.x / L2 };
  const cross = d1.z * d2.x - d1.x * d2.z, dot = d1.z * d2.z + d1.x * d2.x;
  const turn = Math.atan2(Math.abs(cross), dot);
  if (turn < 1e-6 || turn > Math.PI - 1e-6) return null;     // rovně nebo obrat zpět – není roh
  return { d1, d2, turn, left: cross > 0, L1, L2 };
}

/**
 * Zaoblení rohu rádiusem R.
 * @returns {{T1, T2, O, t:number, inner:number, ccw:boolean, fits1:boolean, fits2:boolean}|null}
 *   T1/T2 – tečné body na 1./2. úseku, O – střed, t – vzdálenost tečných bodů
 *   od rohu, inner – vnitřní úhel rohu [°], ccw – oblouk proti směru hodin v rovině Z–X
 */
function cornerFillet(P1, C, P2, R) {
  const k = cornerDirections(P1, C, P2);
  if (!k || !(R > 0)) return null;
  const t = R * Math.tan(k.turn / 2);
  const T1 = { z: C.z - k.d1.z * t, x: C.x - k.d1.x * t };
  const T2 = { z: C.z + k.d2.z * t, x: C.x + k.d2.x * t };
  const n = k.left ? { z: -k.d1.x, x: k.d1.z } : { z: k.d1.x, x: -k.d1.z };
  const O = { z: T1.z + n.z * R, x: T1.x + n.x * R };
  return {
    T1, T2, O, t,
    inner: 180 - k.turn * 180 / Math.PI,
    ccw: k.left,
    fits1: t <= k.L1 + 1e-9, fits2: t <= k.L2 + 1e-9,
  };
}

/**
 * Sražení rohu se stejnými odvěsnami c (podél obou úseků).
 * @returns {{A, B, width:number, inner:number, fits1:boolean, fits2:boolean}|null}
 *   width – délka sražení (spojnice A–B)
 */
function cornerChamfer(P1, C, P2, c) {
  const k = cornerDirections(P1, C, P2);
  if (!k || !(c > 0)) return null;
  const A = { z: C.z - k.d1.z * c, x: C.x - k.d1.x * c };
  const B = { z: C.z + k.d2.z * c, x: C.x + k.d2.x * c };
  return {
    A, B, width: len(sub(B, A)),
    inner: 180 - k.turn * 180 / Math.PI,
    fits1: c <= k.L1 + 1e-9, fits2: c <= k.L2 + 1e-9,
  };
}

/** Bod ve vzdálenosti L ve směru úhlu φ [°] (0 = +Z, 90 = +X). */
function pointAtAngle(C, phiDeg, L) {
  const a = phiDeg * Math.PI / 180;
  return { z: C.z + L * Math.cos(a), x: C.x + L * Math.sin(a) };
}

  out.corner = { cornerDirections, cornerFillet, cornerChamfer, pointAtAngle };
  })();
  // ── Oblouk (arcMath.js) ──
  (function () {
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Oblouk: tětiva/výška, tři body, start+konec+R       ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Čistý výpočet v rovině (z, x): z = osa, x = POLOMĚR (Ø/2) – délky a úhly
// jsou skutečné. „ccw" = proti směru hodin v rovině Z (vpravo) – X (nahoru);
// G2/G3 se z něj odvozují až v okně (podle typu stroje, jako CNC export).

const DEG = 180 / Math.PI;

/**
 * Oblouk z libovolných dvou ze tří veličin: tětiva c, výška oblouku h, rádius R.
 * @returns {{c:number, h:number, R:number, angle:number, length:number}|null}
 *   angle – středový úhel [°] (nad 180° při h > R), length – délka oblouku
 */
function arcFromTwo({ c = null, h = null, R = null }) {
  const has = (v) => v !== null && Number.isFinite(v);
  const n = [c, h, R].filter(has).length;
  if (n < 2) return null;
  if ([c, h, R].some(v => has(v) && !(v > 0))) return null;
  if (has(c) && has(h)) R = (c * c / 4 + h * h) / (2 * h);
  else if (has(c) && has(R)) {
    if (c > 2 * R + 1e-9) return null;
    h = R - Math.sqrt(Math.max(R * R - c * c / 4, 0));          // menší oblouk (≤ 180°)
  } else {
    if (h > 2 * R + 1e-9) return null;
    c = 2 * Math.sqrt(Math.max(h * (2 * R - h), 0));
  }
  const angle = 2 * Math.atan2(c / 2, R - h) * DEG;
  return { c, h, R, angle, length: R * angle / DEG };
}

/** Přepočet: z tětivy+R je druhé řešení „přes půlkruh" (h' = 2R − h). */
function arcLargeVariant(r) {
  return arcFromTwo({ R: r.R, h: 2 * r.R - r.h });
}

/**
 * Kružnice a oblouk P1 → P2 → P3 (oblouk prochází středním bodem).
 * @returns {{O:{z,x}, R:number, ccw:boolean, sweep:number, length:number}|null}
 *   null = body leží na přímce (nebo splývají)
 */
function arcFrom3Points(P1, P2, P3) {
  // počítá se vůči P1 (jinak by u malého oblouku daleko od počátku ubývala přesnost)
  const ax = 0, ay = 0, bx = P2.z - P1.z, by = P2.x - P1.x, cx = P3.z - P1.z, cy = P3.x - P1.x;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const scale = Math.max(Math.abs(ax), Math.abs(bx), Math.abs(cx), Math.abs(ay), Math.abs(by), Math.abs(cy), 1);
  if (Math.abs(d) < 1e-9 * scale * scale) return null;
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const O = {
    z: P1.z + (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d,
    x: P1.x + (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d,
  };
  const R = Math.hypot(P1.z - O.z, P1.x - O.x);
  const cross = bx * (cy - by) - by * (cx - bx);
  const ccw = cross > 0;
  const sweep = sweepDeg(O, P1, P3, ccw);
  return { O, R, ccw, sweep, length: R * sweep / DEG };
}

/** Úhel, který oblouk S → E opíše kolem středu O v daném smyslu [°] (0–360). */
function sweepDeg(O, S, E, ccw) {
  const a1 = Math.atan2(S.x - O.x, S.z - O.z), a2 = Math.atan2(E.x - O.x, E.z - O.z);
  let s = (ccw ? a2 - a1 : a1 - a2) * DEG;
  s = ((s % 360) + 360) % 360;
  return s;
}

/**
 * Střed oblouku ze startu S, konce E, rádiusu R, smyslu a velikosti oblouku.
 * @param {boolean} ccw  proti směru hodin v rovině Z–X
 * @param {boolean} large  oblouk přes 180° (v G-kódu záporné R)
 * @returns {{O:{z,x}, I:number, K:number, sweep:number, length:number, chord:number}|null}
 *   I – přírůstek středu ve směru X (poloměr), K – ve směru Z (od startu)
 *   null = R je menší než polovina tětivy, nebo S = E
 */
function arcFromEndsRadius(S, E, R, ccw, large) {
  const dz = E.z - S.z, dx = E.x - S.x;
  const chord = Math.hypot(dz, dx);
  if (!(chord > 1e-9) || !(R > 0)) return null;
  if (chord > 2 * R * (1 + 1e-9)) return null;
  const h = Math.sqrt(Math.max(R * R - chord * chord / 4, 0));
  const nz = -dx / chord, nx = dz / chord;                          // levá normála S → E
  const side = (ccw ? 1 : -1) * (large ? -1 : 1);
  const O = { z: (S.z + E.z) / 2 + nz * h * side, x: (S.x + E.x) / 2 + nx * h * side };
  const sweep = sweepDeg(O, S, E, ccw);
  return { O, I: O.x - S.x, K: O.z - S.z, sweep, length: R * sweep / DEG, chord };
}

  out.arc = { arcFromTwo, arcLargeVariant, arcFrom3Points, arcFromEndsRadius };
  })();
  // ── VBD a držáky (vbdIso.js, holderIsoData.js, insert.js) ──
  (function () {
// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Značení VBD dle ISO 1832 (data + dekódování)        ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Pozice: 1 tvar · 2 úhel hřbetu · 3 třída přesnosti · 4 typ (díra/utvařeč)
// · 5 velikost (DÉLKA BŘITU v mm, ne IC) · 6 tloušťka (kód) · 7 rádius
// · 8 úprava břitu · 9 směr. Za pomlčkou je označení výrobce (utvařeč,
// např. -PM) – není součástí ISO kódu.

const P = (pts, fill) => '<polygon points="' + pts + '" fill="' + fill + '" stroke="#89b4fa" stroke-width="1.5"/>';

/** Tvar: úhel špičky (pro CAM), poměr IC / délka břitu (pro velikost). */
const SHAPES = [
  { v: 'C', d: 'Kosočtverec 80°', dt: 'Nejrozšířenější – podélné i čelní soustružení', angle: 80, icPerEdge: Math.sin(80 * Math.PI / 180), svg: P('35,5 53,35 35,65 17,35', '#3498db') },
  { v: 'D', d: 'Kosočtverec 55°', dt: 'Kopírování, dokončování', angle: 55, icPerEdge: Math.sin(55 * Math.PI / 180), svg: P('35,8 55,35 35,62 15,35', '#e74c3c') },
  { v: 'R', d: 'Kruhový', dt: 'Kopírování, hrubování s velkým rádiusem', angle: null, icPerEdge: 1, svg: '<circle cx="35" cy="35" r="22" fill="#9b59b6" stroke="#89b4fa" stroke-width="1.5"/>' },
  { v: 'S', d: 'Čtverec 90°', dt: 'Hrubování, srážení hran, 4 (8) břity', angle: 90, icPerEdge: 1, svg: P('13,13 57,13 57,57 13,57', '#2ecc71') },
  { v: 'T', d: 'Trojúhelník 60°', dt: 'Univerzální, 3 (6) břity', angle: 60, icPerEdge: 1 / Math.sqrt(3), svg: P('35,10 55,52 15,52', '#f1c40f') },
  { v: 'V', d: 'Kosočtverec 35°', dt: 'Jemné kopírování, nejostřejší špička', angle: 35, icPerEdge: Math.sin(35 * Math.PI / 180), svg: P('35,15 52,35 35,55 18,35', '#1abc9c') },
  { v: 'W', d: 'Trigon 80°', dt: 'Šestibřitý trojúhelník s tupými rohy 80°', angle: 80, icPerEdge: 12.7 / 8.69, svg: P('35,9 41,30 58,49 35,45 12,49 29,30', '#e67e22') },
  { v: 'E', d: 'Kosočtverec 75°', dt: 'Méně časté', angle: 75, icPerEdge: Math.sin(75 * Math.PI / 180), svg: P('35,7 54,35 35,63 16,35', '#5dade2') },
  { v: 'M', d: 'Kosočtverec 86°', dt: 'Méně časté', angle: 86, icPerEdge: Math.sin(86 * Math.PI / 180), svg: P('35,9 59,35 35,61 11,35', '#48c9b0') },
  { v: 'H', d: 'Šestiúhelník 120°', dt: 'Frézování, speciální', angle: 120, icPerEdge: Math.sqrt(3), svg: P('35,10 57,22 57,48 35,60 13,48 13,22', '#d35400') },
  { v: 'O', d: 'Osmiúhelník 135°', dt: 'Frézování', angle: 135, icPerEdge: 1 + Math.SQRT2, svg: P('26,12 44,12 58,26 58,44 44,58 26,58 12,44 12,26', '#a04000') },
  { v: 'P', d: 'Pětiúhelník 108°', dt: 'Frézování', angle: 108, icPerEdge: 1.3764, svg: P('35,10 58,28 49,57 21,57 12,28', '#7d3c98') },
  { v: 'L', d: 'Obdélník 90°', dt: 'Speciální', angle: 90, icPerEdge: null, svg: P('8,22 62,22 62,48 8,48', '#2e86c1') },
  { v: 'A', d: 'Rovnoběžník 85°', dt: 'Frézování', angle: 85, icPerEdge: null, svg: P('14,52 22,18 58,18 50,52', '#566573') },
  { v: 'B', d: 'Rovnoběžník 82°', dt: 'Frézování', angle: 82, icPerEdge: null, svg: P('12,52 22,18 58,18 48,52', '#616a6b') },
  { v: 'K', d: 'Rovnoběžník 55°', dt: 'Frézování, zapichování', angle: 55, icPerEdge: null, svg: P('8,52 30,18 62,18 40,52', '#717d7e') },
];

/** Úhel hřbetu [°]. */
const CLEARANCE_DEG = { A: 3, B: 5, C: 7, D: 15, E: 20, F: 25, G: 30, N: 0, P: 11 };
const CLEARANCE = [
  { v: 'N', d: '0° – negativní', dt: 'Oboustranné destičky, pevný břit, hrubování' },
  { v: 'A', d: '3° – pozitivní', dt: '' },
  { v: 'B', d: '5° – pozitivní', dt: 'Např. VBMT' },
  { v: 'C', d: '7° – pozitivní', dt: 'Šroubové upnutí (CCMT, DCMT), dokončování' },
  { v: 'P', d: '11° – pozitivní', dt: 'Ostré destičky, nízké řezné síly' },
  { v: 'D', d: '15° – pozitivní', dt: '' },
  { v: 'E', d: '20° – pozitivní', dt: '' },
  { v: 'F', d: '25° – pozitivní', dt: '' },
  { v: 'G', d: '30° – pozitivní', dt: '' },
  { v: 'O', d: 'Jiný úhel (zvláštní)', dt: 'Viz katalog' },
];

// Třída přesnosti: m (výška rohu), s (tloušťka), d (vepsaná kružnice) ±mm
const TOLERANCE = [
  ['A', '0,005', '0,025', '0,025', 'broušená'], ['F', '0,005', '0,025', '0,013', 'broušená'],
  ['C', '0,013', '0,025', '0,025', 'broušená'], ['H', '0,013', '0,025', '0,013', 'broušená'],
  ['E', '0,025', '0,025', '0,025', 'broušená'], ['G', '0,025', '0,13', '0,025', 'broušená po obvodu'],
  ['J', '0,005', '0,025', '0,05–0,15', 'broušená'], ['K', '0,013', '0,025', '0,05–0,15', 'broušená'],
  ['L', '0,025', '0,025', '0,05–0,15', 'broušená'], ['M', '0,08–0,2', '0,13', '0,05–0,15', 'lisovaná (nejběžnější)'],
  ['N', '0,08–0,2', '0,025', '0,05–0,15', 'lisovaná'], ['U', '0,13–0,38', '0,13', '0,08–0,25', 'lisovaná, hrubá'],
].map(([v, m, s, d, dt]) => ({ v, d: 'm ±' + m + ', s ±' + s + ', d ±' + d + ' mm', dt }));

const TYPE = [
  ['A', 'Válcová díra, bez utvařeče', 'Upnutí páčkou / klínem'],
  ['B', 'Díra se zahloubením 70–90° (1 strana), bez utvařeče', 'Šroub'],
  ['C', 'Díra se zahloubením 70–90° (2 strany), bez utvařeče', 'Šroub'],
  ['F', 'Bez díry, utvařeč na obou stranách', 'Upínka shora'],
  ['G', 'Válcová díra, utvařeč na obou stranách', 'Páčka / klín, oboustranná'],
  ['H', 'Zahloubení 70–90° (1 strana), utvařeč na 1 straně', 'Šroub'],
  ['J', 'Zahloubení 70–90° (2 strany), utvařeč na obou stranách', 'Šroub'],
  ['M', 'Válcová díra, utvařeč na 1 straně', 'Páčka / klín'],
  ['N', 'Bez díry, bez utvařeče', 'Upínka shora'],
  ['Q', 'Zahloubení 40–60° (2 strany), bez utvařeče', 'Šroub'],
  ['R', 'Bez díry, utvařeč na 1 straně', 'Upínka shora'],
  ['T', 'Zahloubení 40–60° (1 strana), utvařeč na 1 straně', 'Šroub (CCMT, DCMT…)'],
  ['U', 'Zahloubení 40–60° (2 strany), utvařeč na obou stranách', 'Šroub'],
  ['W', 'Zahloubení 40–60° (1 strana), bez utvařeče', 'Šroub'],
  ['X', 'Zvláštní provedení', 'Viz katalog'],
].map(([v, d, dt]) => ({ v, d, dt }));

/** Tloušťka podle kódu [mm]. */
const THICKNESS_MM = { '01': 1.59, T1: 1.98, '02': 2.38, T2: 2.78, '03': 3.18, T3: 3.97, '04': 4.76, '05': 5.56, '06': 6.35, '07': 7.94, '09': 9.52 };
/** Rádius špičky podle kódu [mm]. */
const RADIUS_MM = { '00': 0, '01': 0.1, '02': 0.2, '04': 0.4, '08': 0.8, '12': 1.2, '16': 1.6, '20': 2.0, '24': 2.4, '28': 2.8, '32': 3.2 };

const EDGE = [
  ['F', 'Ostrý břit'], ['E', 'Zaoblený (honovaný) břit'], ['T', 'Fazetka (negativní)'],
  ['S', 'Fazetka + zaoblení'], ['K', 'Dvojitá fazetka'], ['P', 'Dvojitá fazetka + zaoblení'],
].map(([v, d]) => ({ v, d, dt: '' }));

/** Data pozic 1–9 (pro výběr i popis). */
const VBD_ISO = {
  1: { title: 'Tvar', options: SHAPES },
  2: { title: 'Úhel hřbetu', options: CLEARANCE },
  3: { title: 'Třída přesnosti', options: TOLERANCE },
  4: { title: 'Typ (díra, utvařeč)', options: TYPE },
  5: { title: 'Velikost (délka břitu)', options: ['04', '06', '07', '08', '09', '11', '12', '15', '16', '19', '22', '25', '27']
    .map(v => ({ v, d: 'kód ' + v + ' (délka břitu ' + parseInt(v, 10) + '… mm)', dt: '' })) },
  6: { title: 'Tloušťka', options: Object.keys(THICKNESS_MM).map(v => ({ v, d: String(THICKNESS_MM[v]).replace('.', ',') + ' mm', dt: '' })) },
  7: { title: 'Rádius špičky', options: [...Object.keys(RADIUS_MM).map(v => ({ v, d: RADIUS_MM[v] === 0 ? 'ostrá špička' : String(RADIUS_MM[v]).replace('.', ',') + ' mm', dt: '' })),
    { v: 'M0', d: 'kulatá destička, metrický průměr', dt: '' }] },
  8: { title: 'Úprava břitu', options: EDGE },
  9: { title: 'Směr', options: [{ v: 'R', d: 'Pravý', dt: '' }, { v: 'L', d: 'Levý', dt: '' }, { v: 'N', d: 'Neutrální', dt: '' }] },
};

/** Normalizované IC (palcová řada – u ISO VBD standardní). */
const IC_SERIES = [3.97, 4.76, 5.56, 6.35, 7.94, 9.525, 12.7, 15.875, 19.05, 25.4, 31.75];

/**
 * Velikost z kódu poz. 5: IC a skutečná délka břitu.
 * @returns {{ic:number, edge:number}|{diameter:number}|null}
 */
function sizeInfo(shape, code) {
  if (!/^\d\d$/.test(code || '')) return null;
  const n = parseInt(code, 10);
  if (shape === 'R') return { diameter: n };
  const s = SHAPES.find(x => x.v === shape);
  if (!s || !s.icPerEdge) return null;
  const est = (n + 0.5) * s.icPerEdge;                 // kód = délka břitu oříznutá na celé mm
  const ic = IC_SERIES.reduce((b, v) => (Math.abs(v - est) < Math.abs(b - est) ? v : b));
  return { ic, edge: Math.round(ic / s.icPerEdge * 100) / 100 };
}

/**
 * Rozdělí kód VBD na pozice ISO 1–9 a označení výrobce za pomlčkou.
 * „CNMG120408-PM" → {1:'C',…,7:'08',8:'-',9:'-', suffix:'PM'}
 */
function parseVbdCode(code) {
  const raw = (code || '').toUpperCase().trim();
  const dash = raw.search(/[-–]/);
  const iso = (dash >= 0 ? raw.slice(0, dash) : raw).replace(/\s/g, '');
  const suffix = dash >= 0 ? raw.slice(dash + 1).replace(/[\s\-–]/g, '') : '';
  const r = { 1: '-', 2: '-', 3: '-', 4: '-', 5: '-', 6: '-', 7: '-', 8: '-', 9: '-', suffix };
  for (let i = 0; i < 4; i++) if (iso[i]) r[i + 1] = iso[i];
  if (iso.length >= 6) r[5] = iso.slice(4, 6);
  if (iso.length >= 8) r[6] = iso.slice(6, 8);
  if (iso.length >= 10) r[7] = iso.slice(8, 10);
  if (iso.length >= 11) r[8] = iso[10];
  if (iso.length >= 12) r[9] = iso[11];
  return r;
}

/** Popis pozice s ohledem na tvar (velikost, tloušťka, rádius jsou z kódu, ne ze seznamu). */
function describePosition(pos, value, shape) {
  if (!value || value === '-') return null;
  if (pos === 5) {
    const s = sizeInfo(shape, value);
    if (!s) return 'kód ' + value + ' (délka břitu ~' + parseInt(value, 10) + ' mm; IC podle tvaru)';
    if (s.diameter) return 'průměr ' + s.diameter + ' mm';
    return 'délka břitu ' + String(s.edge).replace('.', ',') + ' mm, IC ' + String(s.ic).replace('.', ',') + ' mm';
  }
  if (pos === 6) return THICKNESS_MM[value] !== undefined ? String(THICKNESS_MM[value]).replace('.', ',') + ' mm' : null;
  if (pos === 7) {
    if (value === 'M0') return 'kulatá destička (metrická)';
    return RADIUS_MM[value] !== undefined ? (RADIUS_MM[value] === 0 ? 'ostrá špička' : String(RADIUS_MM[value]).replace('.', ',') + ' mm') : null;
  }
  const o = VBD_ISO[pos].options.find(x => x.v === value);
  return o ? o.d : null;
}

/**
 * Typická upnutí (ISO 5608, 1. písmeno držáku) podle typu destičky:
 * válcová díra → P (páčka), D (tuhé upnutí), M (upínka + kolík); zahloubení → S (šroub);
 * bez díry → C (upínka shora).
 */
function clampingForType(type) {
  if ('AGM'.includes(type)) return ['P', 'D', 'M'];
  if ('BCHJQTUW'.includes(type)) return ['S'];
  if ('FNR'.includes(type)) return ['C'];
  return [];
}

/** Doporučené držáky: upnutí + tvar + styl + úhel hřbetu (R/L). */
function holdersFor(shape, clearance, type) {
  const styles = { C: ['L'], D: ['J'], S: ['S', 'K'], T: ['J', 'G'], V: ['J', 'V'], W: ['L'], R: ['D'] }[shape];
  if (!styles || clearance === '-' || !clearance) return '';
  const clamps = type && type !== '-' ? clampingForType(type) : (clearance === 'N' ? ['P', 'D', 'M'] : ['S']);
  const out = [];
  // Neutrální styly (kulatá D, kosočtverec 35° V – 72,5°) mají ruku N
  for (const c of clamps) for (const st of styles) out.push(c + shape + st + clearance + (shape === 'R' || st === 'V' ? 'N' : 'R/L'));
  return out.slice(0, 4).join(', ');
}

// ── ISO 5608 / ISO 5610 – GEOMETRIE DRŽÁKU ─────────────────────
// Orientační referenční hodnoty konzistentní napříč hlavními výrobci nářadí
// (Sandvik, Seco, Kennametal apod.), NIKOLI certifikovaná katalogová čísla
// konkrétního výrobce. Přesná geometrie (κr, h, b, l1) se u jednotlivých
// výrobců/velikostí může mírně lišit – v UI vždy zobrazovat upozornění
// "Orientační dle ISO 5608, ověřte v katalogu nástroje".

// Styl držáku (pozice 3 kódu dle ISO 5608) → úhel nastavení hlavního ostří κr.
const HOLDER_STYLES = [
  { code: 'A', kappa: 90,   desc: 'Podélné soustružení, přímý' },
  { code: 'B', kappa: 75,   desc: 'Podélné soustružení' },
  { code: 'C', kappa: 90,   desc: 'Čelní/podélné, pravoúhlý' },
  { code: 'D', kappa: 45,   desc: 'Kopírovací' },
  { code: 'E', kappa: 60,   desc: 'Kopírovací' },
  { code: 'F', kappa: 90,   desc: 'Čelní' },
  { code: 'G', kappa: 90,   desc: 'Zapichovací / upichovací' },
  { code: 'J', kappa: 93,   desc: 'Kopírovací' },
  { code: 'K', kappa: 75,   desc: 'Kopírovací' },
  { code: 'L', kappa: 95,   desc: 'Kopírovací' },
  { code: 'M', kappa: 45,   desc: 'Univerzální' },
  { code: 'P', kappa: 90,   desc: 'Univerzální' },
  { code: 'Q', kappa: 45,   desc: 'Kopírovací' },
  { code: 'R', kappa: 75,   desc: 'Univerzální' },
  { code: 'S', kappa: 45,   desc: 'Univerzální' },
  { code: 'T', kappa: 90,   desc: 'Upichovací' },
  { code: 'U', kappa: 93,   desc: 'Kopírovací, dvoubřitý' },
  { code: 'V', kappa: 72.5, desc: 'Kopírovací (destička V)' },
  { code: 'W', kappa: 60,   desc: 'Univerzální (destička W)' },
];

// Typická řada funkční délky l1 [mm] podle výšky tělesa h [mm].
const HOLDER_LENGTH_BY_HEIGHT = [
  { h: 16, l1: 100 },
  { h: 20, l1: 125 },
  { h: 25, l1: 150 },
  { h: 32, l1: 170 },
  { h: 40, l1: 200 },
];

function holderStyleByCode(code) {
  return HOLDER_STYLES.find(function (s) { return s.code === code; }) || null;
}

function suggestL1(h) {
  if (!h || !isFinite(h)) return null;
  var rows = HOLDER_LENGTH_BY_HEIGHT;
  var best = rows[0];
  var bestDiff = Math.abs(rows[0].h - h);
  for (var i = 1; i < rows.length; i++) {
    var diff = Math.abs(rows[i].h - h);
    if (diff < bestDiff) { best = rows[i]; bestDiff = diff; }
  }
  return best.l1;
}

  const vbdIsoData = VBD_ISO;
const holderIso = {
  1: { title:'Způsob upnutí',options:[
    {v:'C',d:'Upínka shora',dt:'Destička bez díry'},
    {v:'D',d:'Tuhé upnutí (upínka + kolík)',dt:'Destička s válcovou dírou'},
    {v:'M',d:'Upínka shora + kolík v otvoru',dt:'Destička s válcovou dírou'},
    {v:'P',d:'Páčka přes otvor',dt:'Destička s válcovou dírou'},
    {v:'S',d:'Šroub přes otvor',dt:'Destička se zahloubenou dírou (CCMT, DCMT…)'}
  ]},
  2: { title:'Tvar destičky',options: SHAPES.filter(function(s) { return 'CDRSTVW'.indexOf(s.v) >= 0; }) },
  // Styl držáku dle ISO 5608 – určuje přístupový úhel κr (orientační, viz holderIsoData.js)
  3: { title:'Styl (κr)',options: HOLDER_STYLES.map(function(s) {
    return { v:s.code, d:s.kappa + '° – ' + s.desc, dt:'Přístupový úhel, orientační dle ISO 5608' };
  }) },
  // Úhel hřbetu destičky – stejné hodnoty jako pozice 2 u vbdIsoData (sdílený zdroj pravdy)
  4: { title:'Úhel hřbetu destičky', options: vbdIsoData[2].options },
  5: { title:'Ruka nástroje',options:[
    {v:'R',d:'Pravé provedení',dt:'Pravostranné operace'},
    {v:'L',d:'Levé provedení',dt:'Levostranné operace'},
    {v:'N',d:'Neutrální',dt:'Standardní operace'}
  ]},
  6: { title:'Výška (h)',options:[
    {v:'16',d:'16 mm',dt:'Menší – přesné obrábění'},
    {v:'20',d:'20 mm',dt:'Standardní'},
    {v:'25',d:'25 mm',dt:'Středně náročné operace'},
    {v:'32',d:'32 mm',dt:'Náročné operace'},
    {v:'40',d:'40 mm',dt:'Těžké obrábění'}
  ]},
  7: { title:'Šířka (b)',options:[
    {v:'16',d:'16 mm',dt:'Úzký – omezené prostory'},
    {v:'20',d:'20 mm',dt:'Standardní'},
    {v:'25',d:'25 mm',dt:'Širší – lepší stabilita'},
    {v:'32',d:'32 mm',dt:'Max. tuhost'}
  ]}
};
function parseHolderCode(code) {
  code = (code || '').replace(/[\s\-]/g, '').toUpperCase();
  var result = {1:'-',2:'-',3:'-',4:'-',5:'-',6:'-',7:'-'};
  if (code.length < 5) return result;
  for (var i = 1; i <= 5; i++) result[i] = code[i - 1] || '-';
  result[6] = code.length >= 7 ? code.substring(5, 7) : '-';
  result[7] = code.length >= 9 ? code.substring(7, 9) : '-';
  return result;
}
  out.vbd = { VBD_ISO, SHAPES, CLEARANCE_DEG, THICKNESS_MM, RADIUS_MM, sizeInfo, parseVbdCode, describePosition, clampingForType, holdersFor, HOLDER_STYLES, holderIso, parseHolderCode };
  })();
  return out;
})();
