// Opravy dat příručky Sinumerik převzatých ze SKICA. Použije je scripts/prevzit-ze-skici.mjs,
// takže vydrží i další převzetí. Klíč = název položky.
//
// stav:  'iso'  – kód z Fanuc / ISO dialektu: na 840D jen po přepnutí do ISO režimu (G291)
//        'ne'   – v 840D (režim Siemens) tento kód nejspíš neexistuje
//        'stroj'– není standard Siemens, význam určuje výrobce stroje (PLC)
//        'oprava' – popis ve SKICE nesedí, opraveno
// popis: opravený popis (nahradí původní)

const ISO = 'Fanuc / ISO dialekt – na 840D funguje jen po přepnutí do ISO režimu (G291). V režimu Siemens (G290) použij ekvivalent Siemens.';
const NE = 'Tento kód v Sinumeriku 840D (režim Siemens) podle dostupné dokumentace neexistuje – ověř v dokumentaci Siemens / výrobce stroje.';
const STROJ = 'Není standard Siemens. Význam (pokud vůbec existuje) určuje výrobce stroje v PLC – ověř v dokumentaci karuselu.';
const FANUC_M = 'Fanuc / Haas. Na 840D se podprogram volá jménem (např. L10 nebo MUJ_PODPROG) a končí M17 nebo RET; M98/M99 jen v ISO režimu.';

const G_ISO = ['G15', 'G43', 'G44', 'G45', 'G46', 'G47', 'G50', 'G51', 'G51.1', 'G52', 'G54.1', 'G68', 'G69', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89'];
const G_NE = ['G14', 'G195', 'G196', 'G808', 'G915', 'G927', 'G928', 'G932', 'G964', 'G965', 'G974', 'G975', 'G977', 'G979', 'G990', 'G993', 'G994', 'G995'];
const M_STANDARD = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M17', 'M19', 'M30', 'M40', 'M41', 'M42', 'M43', 'M70', 'M2=3', 'M2=4', 'M2=5'];
const M_FANUC = ['M96', 'M97', 'M98', 'M99'];

export const OPRAVY = {
  gkody: {
    ...Object.fromEntries(G_ISO.map((k) => [k, { stav: 'iso', pozn: ISO }])),
    ...Object.fromEntries(G_NE.map((k) => [k, { stav: 'ne', pozn: NE }])),
    G961: { stav: 'oprava', popis: 'Typ posuvu: konstantní řezná rychlost a lineární posuv (mm/min, jako G94).' },
    G962: { stav: 'oprava', popis: 'Typ posuvu: lineární nebo otáčkový posuv a konstantní řezná rychlost.' },
    G971: { stav: 'oprava', popis: 'Typ posuvu: zmrazení otáček vřetena a lineární posuv (mm/min, jako G94).' },
    G973: { stav: 'oprava', popis: 'Typ posuvu: otáčkový posuv (mm/ot) bez omezení otáček vřetena.' },
    G952: { stav: 'oprava', popis: 'Na 840D je G952 typ posuvu (skupina G 15 spolu s G94/G95/G96…), ne dokončovací cyklus. Přesný význam ověř v dokumentaci Siemens.' },
    G335: { stav: 'oprava', popis: 'Soustružení závitu po kontuře ve směru hodin (G336 proti směru) – ne proměnná hloubka řezu. Dostupnost závisí na verzi SW.' },
    G642: { stav: 'oprava', popis: 'Zaoblení přechodu mezi bloky s dodržením tolerancí os (velikost zaoblení ADIS / strojní data).' },
  },
  mkody: {
    ...Object.fromEntries(M_FANUC.map((k) => [k, { stav: 'iso', pozn: FANUC_M }])),
    M19: { stav: 'oprava', popis: 'Polohování vřetena na úhel uložený v nastavovacích datech (SD 43240 M19_SPOS). Úhel přímo v programu: SPOS=…' },
    // ostatní nestandardní M kódy se označí automaticky (viz oznacitM)
  },
  prikazy: {
    KONT: { stav: 'oprava', popis: 'Chování při nájezdu/odjezdu s korekcí G41/G42: obejet bod kontury (když výchozí/koncový bod leží za konturou). Opak NORM.' },
  },
};

/** Nestandardní M kódy (mimo seznam Siemens) dostanou štítek „výrobce stroje“. */
export function oznacitM(name) {
  if (M_STANDARD.includes(name) || OPRAVY.mkody[name]) return null;
  return { stav: 'stroj', pozn: STROJ };
}
