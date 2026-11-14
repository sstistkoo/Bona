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
  sonda: [],
  nastroje: [],
  reset: [],
  korekce: [],
  poruchy: [],
  manipulator: [],
};
