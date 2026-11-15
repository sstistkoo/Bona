'use strict';
// Poznámky ke stroji (karusel) – rozdělené do kategorií.
// Sem se doplňují poznámky, které mají být součástí aplikace (uvidí je každý na každém zařízení).
// Každá poznámka: { t: 'Nadpis', p: 'Text poznámky – může mít víc řádků' }
// Vlastní poznámky z telefonu (pole „Moje poznámky“) se ukládají jen v prohlížeči.

window.STROJ_KAT = [
  { id: 'sonda', nazev: 'Sonda', ikona: '📡', popis: 'Měřicí sonda – kalibrace, měření, postupy' },
  { id: 'nastroje', nazev: 'Nástroje', ikona: '🛠️', popis: 'Nástroje, držáky, zásobník, výměna' },
  { id: 'reset', nazev: 'Reset', ikona: '🔁', popis: 'Reset stroje, najetí do reference, obnova po přerušení' },
  { id: 'korekce', nazev: 'Korekce', ikona: '🎯', popis: 'Korekce nástrojů a posunutí nulových bodů' },
  { id: 'poruchy', nazev: 'Poruchy', ikona: '⚠️', popis: 'Poruchy, alarmy a jak je řešit' },
  { id: 'manipulator', nazev: 'Manipulátor', ikona: '🦾', popis: 'Manipulátor – zakládání a odebírání kol' },
];

window.STROJ_POZNAMKY = {
  sonda: [
    {
      t: 'Měření sondou',
      p: [
        'Menu Select → Menu 2 → tlačítko s ikonou ▲ v rámečku → měření.',
        '',
        'Čísla v nabídce měření:',
        '1 – koncové měření',
        '5 – měrný řez (dif)',
        '9 – čelist 1',
        '10 – čelist 2',
        '11 – čelist 3',
      ].join('\n'),
    },
    {
      t: 'Sonda – chyba měření (K1, pozice 5)',
      p: 'Chyba – K1 obrobek, měrné pozice 5 pod Dif: zkontrolovat rozdíl, tolerance 0,01.',
    },
  ],
  nastroje: [],
  reset: [
    {
      t: 'Reset a najetí programu',
      p: [
        '1. Menu Select → Program.',
        '2. Vybrat program: CH1 = 1. operace, CH2 = 2. operace.',
        '3. Zjistit číslo operace.',
        '4. Tlačítko upínač osazení (obrázek čelistí, vpravo vedle C3): zkontrolovat, popřípadě zadat číslo operace.',
        '5. Tlačítko NEO: mačkat, dokud není šedé.',
        '6. Auto → Start.',
        '7. OFFSET X, Z: zkontrolovat a zapsat. Posunutí nulového bodu se vynuluje při najíždění po resetu.',
        '8. 2× Start. Pozor na CUT_MEM (hláška o přerušení nulového bodu) – zapsat posunutí nulového bodu.',
      ].join('\n'),
    },
  ],
  korekce: [],
  poruchy: [],
  manipulator: [],
};
