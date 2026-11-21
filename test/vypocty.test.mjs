// Testy výpočtů. Spuštění: node --test   (žádné balíčky se neinstalují)
// Hodnoty tolerancí jsou z tabulek ISO 286-2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nactiVypocty } from './pomocne.mjs';

const V = nactiVypocty();
const blizko = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const uch = (letter, grade, dim) => { const r = V.deviations(letter, grade, dim); return [r.upper, r.lower]; };

test('ISO 286 – díry a hřídele (µm)', () => {
  assert.deepEqual(uch('H', 7, 50), [25, 0]);
  assert.deepEqual(uch('g', 6, 50), [-9, -25]);
  assert.deepEqual(uch('f', 7, 25), [-20, -41]);
  assert.deepEqual(uch('js', 6, 50), [8, -8]);
  assert.deepEqual(uch('H', 7, 926), [90, 0]); // velké rozměry (nad 500 mm) – kola
});

test('ISO 286 – uložení H7/g6 Ø 50 je s vůlí 9–50 µm', () => {
  const f = V.fit('H', 7, 'g', 6, 50);
  assert.equal(f.type, 'vůle');
  assert.equal(f.minClearance, 9);
  assert.equal(f.maxClearance, 50);
});

test('ISO 286 – chybné vstupy vrátí chybu, ne číslo', () => {
  assert.ok(V.deviations('H', 7, 4000).error);
  assert.ok(V.deviations('H', 0, 50).error);
  assert.ok(V.deviations('Q', 7, 50).error);
});

test('Kužel – kuželovitost 1:10 a dopočet malého průměru', () => {
  assert.equal(V.ratioToC('1:10'), 0.1);
  assert.equal(V.ratioToC('1,5 : 30'), 0.05);
  const t = V.solveTaper({ D: 100, d: null, L: 50, C: 0.1 }, null, 'B');
  assert.equal(t.error, undefined);
  blizko(t.d, 95);
});

test('Roztažnost – přepočet na 20 °C', () => {
  blizko(V.thermal.sizeAtTemp(1000, 11.5, 30), 1000.115);
  blizko(V.thermal.sizeAtRef(1000.12, 12, 30), 1000);
});

test('Kalkulačka – výrazy, desetinná čárka, stupně, nebezpečný vstup', () => {
  assert.equal(V.safeEvalMath('2+3*4'), 14);
  assert.equal(V.safeEvalMath('1,5*2'), 3);
  blizko(V.safeEvalMath('sin(30)'), 0.5);
  assert.ok(Number.isNaN(V.safeEvalMath('alert(1)')));
  assert.ok(Number.isNaN(V.safeEvalMath('(1+2')));
});

test('Trigonometrie – pravoúhlý trojúhelník 3-4-5', () => {
  const r = V.solveRightTriangle({ a: 3, b: 4 });
  assert.ok(r.ok);
  blizko(r.c, 5);
  blizko(r.alpha + r.beta, 90);
});

test('Oblouk ze 3 bodů a zaoblení rohu', () => {
  const a = V.arc.arcFrom3Points({ x: 0, z: 10 }, { x: 10, z: 0 }, { x: 0, z: -10 });
  blizko(a.R, 10);
  blizko(a.sweep, 180);
  const r = V.corner.cornerFillet({ x: 0, z: 10 }, { x: 0, z: 0 }, { x: 10, z: 0 }, 2);
  blizko(r.t, 2); // pravý úhel: tečné body ve vzdálenosti R od rohu
  blizko(r.inner, 90);
});

test('kužel – přechod R (převzato ze SKICA): R12 na Ø330, α 10°', () => {
  const TF = nactiVypocty().taperFillet;
  const DEG = Math.PI / 180, C = 2 * Math.tan(10 * DEG);
  const r = TF.taperFillets({ D: 330 + 100 * Math.tan(10 * DEG), d: 330, L: 50, C, bigSide: 'A',
    edges: { B: { R: 12, face: 'in', given: 'corner', faceEndDia: 218 }, A: null } });
  const e = r.edges.B, t = 12 / Math.tan(50 * DEG);
  assert.ok(Math.abs(e.onFace.dia - (330 - 2 * t)) < 1e-9);          // 309.862
  assert.ok(Math.abs(e.onCone.dia - (330 + 2 * t * Math.sin(10 * DEG))) < 1e-9);
  assert.ok(Math.abs(50 - e.center.z - 12) < 1e-9);
  assert.ok(Math.abs(e.faceLen - 56) < 1e-9);
  assert.equal(e.error, '');
  // zpětně ze začátku R na čele
  assert.ok(Math.abs(TF.cornerFromStart(330 - 2 * t, 12, 'B', C, 'A', 'in') - 330) < 1e-9);
  // R se na krátké čelo nevejde
  const kratke = TF.taperFillets({ D: 340, d: 330, L: 50, C, bigSide: 'A', edges: { B: { R: 12, face: 'in', given: 'corner', faceLen: 5 } } });
  assert.match(kratke.edges.B.error, /nevejde/);
});

test('rozteč děr a osazení (kolo vagonu)', async () => {
  const vm = await import('node:vm');
  const { cti } = await import('./pomocne.mjs');
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(cti('js/roztec.js'), ctx);
  const R = ctx.window.RoztecMath;
  // naproti sobě, vnější hrany: 680 + 20 − 30 = 670
  blizko(R.roztecDer({ d: 30, m: 680, k: 20 }).pcd, 670);
  // vnitřní hrany: 640 + 30 = 670
  blizko(R.roztecDer({ d: 30, m: 640, mode: 'in' }).pcd, 670);
  // sousední díry, 6 děr: tětiva = rozteč/2
  blizko(R.roztecDer({ d: 30, m: 345, k: 20, holes: 'adj', n: 6 }).pcd, 670);
  assert.ok(R.roztecDer({ d: 30, m: 345, holes: 'adj' }).err);
  assert.ok(R.roztecDer({ d: 30 }).err);
  // lichý počet (5 děr): nejvzdálenější dvojice = rozteč·cos(18°)
  const t5 = 670 * Math.cos(Math.PI / 10);
  blizko(R.roztecDer({ d: 30, m: t5 - 20 + 30, k: 20, n: 5 }).pcd, 670);
  blizko(R.roztecDer({ d: 30, m: 680, k: 20, n: 6 }).pcd, 670);
  assert.ok(R.roztecDer({ d: 30, m: 680, k: 20, n: 5.5 }).err);
  // plochá tlapka t=8 v díře Ø30: e = 15 − √(225 − 16)
  const e = 15 - Math.sqrt(209);
  blizko(R.roztecDer({ d: 30, m: 680, k: 20, t: 8 }).pcd, 670 + 2 * e);
  blizko(R.roztecDer({ d: 30, m: 640, mode: 'in', t: 8 }).pcd, 670 - 2 * e);
  assert.ok(R.roztecDer({ d: 30, m: 680, k: 20, t: 30 }).err);
  const o = R.osazeni({ pcd: 670, b: 30, aOut: 25, aIn: 40 });
  blizko(o.out, 750); blizko(o.in, 560); blizko(o.sirka, 95);
  const jen = R.osazeni({ pcd: 670, b: 30, aOut: 25, aIn: null });
  assert.equal(jen.in, undefined);
});

test('kalkulačka – procenta jako na běžné kalkulačce', async () => {
  const { vytahniFunkci } = await import('./pomocne.mjs');
  const procenta = vytahniFunkci('js/nastroje.js', 'procenta');
  const p = (s) => V.safeEvalMath(procenta(s).replace(/(\d+(?:\.\d*)?|\.\d+)%/g, '($1/100)'));
  blizko(p('200+10%'), 220); blizko(p('200-10%'), 180); blizko(p('200*10%'), 20);
  blizko(p('200/10%'), 2000); blizko(p('3*(200+10%)'), 660); blizko(p('5*-10%'), -0.5);
});
