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
