// Zvýší verzi aplikace najednou v app.js (VERZE) i v sw.js (cache bona-X.Y.Z),
// aby se telefony po vydání přepnuly na nové soubory.
//   node scripts/verze.mjs          → 0.11.1 → 0.11.2
//   node scripts/verze.mjs minor    → 0.11.1 → 0.12.0
//   node scripts/verze.mjs 1.0.0    → přesně tahle verze
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const koren = fileURLToPath(new URL('..', import.meta.url));
const APP = koren + 'app.js', SW = koren + 'sw.js';
const RE_APP = /const VERZE = '(\d+)\.(\d+)\.(\d+)';/;
const RE_SW = /const VERZE = 'bona-(\d+)\.(\d+)\.(\d+)';/;

const app = readFileSync(APP, 'utf8'), sw = readFileSync(SW, 'utf8');
const m = RE_APP.exec(app), ms = RE_SW.exec(sw);
if (!m || !ms) { console.error('Verzi v app.js nebo sw.js se nepodařilo najít.'); process.exit(1); }
const ted = m.slice(1, 4).join('.');
if (ted !== ms.slice(1, 4).join('.')) console.warn(`Pozor: verze se lišily (app.js ${ted}, sw.js ${ms.slice(1, 4).join('.')}) – sjednocuji podle app.js.`);

const arg = process.argv[2] || 'patch';
let [a, b, c] = m.slice(1, 4).map(Number);
let nova;
if (/^\d+\.\d+\.\d+$/.test(arg)) nova = arg;
else if (arg === 'major') nova = `${a + 1}.0.0`;
else if (arg === 'minor') nova = `${a}.${b + 1}.0`;
else if (arg === 'patch') nova = `${a}.${b}.${c + 1}`;
else { console.error('Použití: node scripts/verze.mjs [patch|minor|major|X.Y.Z]'); process.exit(1); }

writeFileSync(APP, app.replace(RE_APP, `const VERZE = '${nova}';`));
writeFileSync(SW, sw.replace(RE_SW, `const VERZE = 'bona-${nova}';`));
console.log(`Verze ${ted} → ${nova} (app.js i sw.js)`);
