// Převezme výpočetní jádra a data příručky Sinumerik ze SKICA 2D CAD/CAM do Bony.
//
// Použití:  node scripts/prevzit-ze-skici.mjs <cesta ke klonu 2D_CAD-CAM>
// Vytvoří:  js/vypocty.js         (window.Vypocty – čisté výpočty)
//           js/sinumerik-data.js  (window.SINUMERIK – G/M kódy, příkazy, proměnné…)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src || !fs.existsSync(path.join(src, 'js/calculators'))) {
  console.error('Zadej cestu ke klonu repozitáře 2D_CAD-CAM.');
  process.exit(1);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (...p) => path.join(src, 'js', ...p);
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

/* ── 1) Výpočty: čisté funkce zabalené do IIFE ── */
const strip = (s) => s.replace(/^import .*$/gm, '').replace(/^export (function|const)/gm, '$1');
const utils = read(J('utils.js')).split('\n');
const fnBlock = (lines, name) => {
  const start = lines.findIndex((l) => new RegExp('^export function ' + name + '\\b').test(l));
  let end = start; while (lines[end] !== '}') end++;
  return lines.slice(start, end + 1).join('\n').replace(/^export /, '');
};
const part = (title, body, exp) => `  // ── ${title} ──\n  (function () {\n${body}\n${exp}\n  })();\n`;

let v = `// VYGENEROVÁNO skriptem scripts/prevzit-ze-skici.mjs – needitovat ručně.
// Výpočetní jádra převzatá beze změny ze SKICA 2D CAD/CAM (sstistkoo/2D_CAD-CAM).
'use strict';
window.Vypocty = (function () {
  const out = {};
`;
v += part('Matematický výraz (utils.js)', fnBlock(utils, '_parseMathExpr') + '\n' + fnBlock(utils, 'safeEvalMath'), '  out.safeEvalMath = safeEvalMath;');
v += part('Pravoúhlý trojúhelník (trigSolver.js)', strip(read(J('trigSolver.js'))), '  out.solveRightTriangle = solveRightTriangle;');
v += part('Obecný trojúhelník (triangleSolver.js)', strip(read(J('triangleSolver.js'))), '  out.solveTriangle = solveTriangle;');
v += part('ISO 286 (iso286.js + iso286Large.js)',
  `  const L = (function () {\n${strip(read(J('calculators/iso286Large.js')))}\n  return { deviationsLarge, itValueLarge };\n  })();\n` +
  '  const deviationsLarge = L.deviationsLarge, itValueLarge = L.itValueLarge;\n' + strip(read(J('calculators/iso286.js'))),
  '  out.deviations = deviations; out.fit = fit; out.itValue = itValue; out.SHAFT_LETTERS = SHAFT_LETTERS; out.HOLE_LETTERS = HOLE_LETTERS;');
v += part('Kužel (taperBoreMath.js)', '  const deviations = out.deviations;\n' + strip(read(J('calculators/taperBoreMath.js'))),
  '  out.taperC = taperC; out.taperForms = taperForms; out.solveTaper = solveTaper; out.ratioToC = ratioToC;');
const tq = strip(read(J('calculators/torqueMath.js')));
const tqNames = [...tq.matchAll(/^(?:function|const) (\w+)/gm)].map((m) => m[1]).filter((n) => n !== 'IC_ISO');
v += part('Utahovací momenty (torqueMath.js)', tq, `  out.torque = { ${tqNames.join(', ')} };`);
v += part('Tepelná roztažnost (thermalMath.js)', strip(read(J('calculators/thermalMath.js'))),
  '  out.thermal = { THERMAL_MATERIALS, REF_TEMP, sizeAtTemp, sizeAtRef, shrinkFit, gapChange };');
v += part('Korekce rádiusu špičky (noseRadiusMath.js)', strip(read(J('calculators/noseRadiusMath.js'))),
  '  out.nose = { lineCorrection, chamferPoints, arcCorrection };');
v += part('Roh R/C (cornerMath.js)', strip(read(J('calculators/cornerMath.js'))),
  '  out.corner = { cornerDirections, cornerFillet, cornerChamfer, pointAtAngle };');
v += part('Oblouk (arcMath.js)', strip(read(J('calculators/arcMath.js'))),
  '  out.arc = { arcFromTwo, arcLargeVariant, arcFrom3Points, arcFromEndsRadius };');
// VBD (ISO 1832) + držák (ISO 5608): data držáku jsou v insert.js mezi „const holderIso = {" a „};"
const ins = read(J('calculators/insert.js'));
const holderIso = ins.slice(ins.indexOf('const holderIso = {'), ins.indexOf('\n};', ins.indexOf('const holderIso = {')) + 3);
const parseHolder = ins.slice(ins.indexOf('export function parseHolderCode'), ins.indexOf('\n}', ins.indexOf('export function parseHolderCode')) + 2).replace(/^export /, '');
v += part('VBD a držáky (vbdIso.js, holderIsoData.js, insert.js)',
  strip(read(J('calculators/vbdIso.js'))) + '\n' + strip(read(J('calculators/holderIsoData.js'))) +
  '\n  const vbdIsoData = VBD_ISO;\n' + holderIso + '\n' + parseHolder,
  '  out.vbd = { VBD_ISO, SHAPES, CLEARANCE_DEG, THICKNESS_MM, RADIUS_MM, sizeInfo, parseVbdCode, describePosition, clampingForType, holdersFor, HOLDER_STYLES, holderIso, parseHolderCode };');
v += '  return out;\n})();\n';
fs.writeFileSync(path.join(ROOT, 'js/vypocty.js'), v);

/* ── 2) Data příručky Sinumerik: moduly se načtou s náhradami DOM závislostí ── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bona-'));
const stub = {
  'dialogFactory.js': 'export const makeOverlay = () => null;',
  'htmlEscape.js': 'export const escapeHtml = (s) => s;',
  'ctrlRefViewer.js': 'export function ref(name, syntax, description, code, note = "") { return { name, syntax, description, examples: code ? [{ title: "Příklad:", code, description: note }] : [] }; }\nexport const openRefList = () => {}; export const openRefExamples = () => {}; export const openControlHub = () => {};',
};
const mods = {
  gcode: ['commandGroups', 'commandsList'], mcode: ['commandGroups', 'commandsList'], commands: ['commandGroups', 'commandsList'],
  sysvar: ['variableGroups'], shortcuts: ['shortcutGroups'], cncExamples: ['examples'],
  sinumerikWear: [], sinumerikTools: [], sinumerikAlarms: [],
};
fs.mkdirSync(path.join(tmp, 'calculators'));
for (const [f, s] of Object.entries(stub)) fs.writeFileSync(path.join(tmp, f), s);
fs.writeFileSync(path.join(tmp, 'calculators/ctrlRefViewer.js'), stub['ctrlRefViewer.js']);
for (const [m, names] of Object.entries(mods)) {
  let s = read(J('calculators', m + '.js'));
  s = s.replace(/^import .*'\.\.\/(?!dialogFactory|htmlEscape)[^']*';$/gm, ''); // jiné závislosti nejsou potřeba
  if (names.length) s += `\nexport { ${names.join(', ')} };\n`;
  fs.writeFileSync(path.join(tmp, 'calculators', m + '.mjs'), s.replace(/from '\.\/(\w+)\.js'/g, (a, n) => (n === 'ctrlRefViewer' ? a : `from './${n}.mjs'`)));
}
const load = (m) => import(pathToFileURL(path.join(tmp, 'calculators', m + '.mjs')).href);
const [g, mc, c, sv, sc, ex, tl, al] = await Promise.all(['gcode', 'mcode', 'commands', 'sysvar', 'shortcuts', 'cncExamples', 'sinumerikTools', 'sinumerikAlarms'].map(load));

const refList = (groups, items) => ({ groups, items });
const data = {
  gkody: refList(g.commandGroups, g.commandsList),
  mkody: refList(mc.commandGroups, mc.commandsList),
  prikazy: refList(c.commandGroups, c.commandsList),
  promenne: sv.variableGroups,
  zkratky: sc.shortcutGroups,
  ukazky: ex.examples,
  nastroje: refList(tl.snToolGroups, tl.snToolItems),
  alarmy: refList(al.snAlarmGroups, al.snAlarmItems),
};
fs.writeFileSync(path.join(ROOT, 'js/sinumerik-data.js'),
  '// VYGENEROVÁNO skriptem scripts/prevzit-ze-skici.mjs ze SKICA 2D CAD/CAM – needitovat ručně.\nwindow.SINUMERIK = ' + JSON.stringify(data) + ';\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Hotovo: js/vypocty.js, js/sinumerik-data.js',
  Object.fromEntries(Object.entries(data).map(([k, d]) => [k, Array.isArray(d) ? d.length : (d.items ? d.items.length : Object.keys(d).length)])));
