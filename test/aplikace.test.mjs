// Kontroly, na které se při vydání snadno zapomene, a odhad polohy upnutí.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { KOREN, cti, vytahniFunkci } from './pomocne.mjs';

test('verze v app.js a sw.js se shodují', () => {
  const app = /const VERZE = '([\d.]+)'/.exec(cti('app.js'))[1];
  const sw = /const VERZE = 'bona-([\d.]+)'/.exec(cti('sw.js'))[1];
  assert.equal(sw, app, 'Spusť node scripts/verze.mjs');
});

test('offline seznam v sw.js obsahuje všechny skripty a nic neexistujícího', () => {
  const sw = cti('sw.js');
  const soubory = [.../const SOUBORY = \[([\s\S]*?)\];/.exec(sw)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  soubory.filter((f) => f !== './').forEach((f) => assert.ok(existsSync(KOREN + f), `${f} v sw.js neexistuje`));
  const skripty = [...cti('index.html').matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  skripty.forEach((s) => assert.ok(soubory.includes(s), `${s} chybí v SOUBORY v sw.js (offline by nefungoval)`));
  readdirSync(KOREN + 'js').forEach((f) => assert.ok(skripty.includes('js/' + f), `js/${f} není načtený v index.html`));
});

test('všechny fotky u poznámek existují v img/', () => {
  const fotky = ['js/stroj-data.js', 'js/zakazka.js'].flatMap((s) => [...cti(s).matchAll(/f: \[([^\]]*)\]/g)])
    .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  assert.ok(fotky.length > 0);
  fotky.forEach((f) => assert.ok(existsSync(KOREN + 'img/' + f), `img/${f} chybí`));
});

test('odhad polohy upnutí – přímka nejmenších čtverců', () => {
  const primka = vytahniFunkci('js/zakazka.js', 'primka');
  assert.equal(primka([{ d: 900, p: 150 }]), null); // jeden záznam nestačí
  assert.equal(primka([{ d: 900, p: 150 }, { d: 900, p: 155 }]), null); // stejný Ø
  const r = primka([{ d: 900, p: 150 }, { d: 926, p: 176 }, { d: 910, p: 160 }]);
  assert.ok(Math.abs(r.b - 1) < 1e-9 && Math.abs(r.a + 750) < 1e-9); // poloha = Ø − 750
  assert.equal(r.odch, 0);
});
