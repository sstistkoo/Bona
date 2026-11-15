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
        'Menu Select → Menu 2 → klávesa ^ → měření.',
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
  nastroje: [
    {
      t: 'Výměna nástroje (zásobník)',
      p: [
        '1. Tlačítko s ikonou dvou obdélníků (vlevo nahoře) – chvilku počkat.',
        '2. Klíč C2 / C1 – dveře levé / pravé.',
        '3. Otevření dveří (zásobník + dveře ↑).',
        '4. Natočení zásobníku (tlačítko s ikonou zásobníku a šipkami).',
        '5. Vyndání nože (otočný přepínač).',
        '6. Zasunutí nože (otočný přepínač).',
        '7. Zavření dveří (laser).',
      ].join('\n'),
    },
    {
      t: 'Zapsání nástroje',
      p: [
        'Menu Select → Parametry → Nástroj (záložka 1 zleva).',
      ].join('\n'),
    },
    {
      t: 'Výměna vrtáku',
      p: [
        '1. Displej: najet na pozici v tabulce (přepínání zásobníku).',
        '2. Displej → Detail nástroje.',
        '3. Displej → Data břitu.',
        '4. Displej → GEOMETRIE = L (délka vrtáku), 2× Input.',
        '5. Zpět (<<) – 2×.',
        '',
        'Délka L se měří od čela upínače (dosedací plochy) po špičku vrtáku.',
      ].join('\n'),
    },
  ],
  reset: [
    {
      t: 'Reset a najetí programu',
      p: [
        '1. Ještě před resetem: OFFSET X, Z zkontrolovat a zapsat si. Reset vynuluje posunutí nulového bodu, po resetu se musí zadat znovu.',
        '2. Menu Select → Program.',
        '3. Vybrat program: CH1 = 1. operace, CH2 = 2. operace.',
        '4. Zjistit číslo operace: v programu najít rozdělovač skoků (Sprungverteiler) – řádky IF (CUT_MEM==číslo) GOTOF …; za středníkem je název operace. Příklad z 118550_1_CH1: 0 = start programu, 10 = centrování, 50 = měření desky, 100 = VN_DIA, 200 = deska, 300 = DR_SJETI, 1205 = MESS_CUT.',
        '5. Tlačítko upínač osazení (obrázek čelistí, vpravo vedle C3): zkontrolovat, popřípadě zadat číslo operace do pole CUT_MEM („Skok programu ke značce“).',
        '6. Tlačítko NEO: mačkat, dokud obrázek obrobku není šedý. Šedé = neobrobené, zelené = obrobené, červené = zmetek.',
        '7. Auto → Start.',
        '8. 2× Start. Pozor na CUT_MEM (hláška o přerušení nulového bodu). Zapsat zpět posunutí nulového bodu (OFFSET X, Z z kroku 1).',
      ].join('\n'),
    },
  ],
  korekce: [
    {
      t: 'Korekce rozměru – díra',
      p: [
        '1. Menu Select (klávesa na panelu).',
        '2. Program (klávesa na panelu).',
        '3. Otevřít program DIRAHOT1.',
        '4. Najít řádek W_OTVHO1.',
        '5. Zpětný překlad (softklávesa na panelu) – otevře se okno DÍRA NA HOTOVO / W_OTVHOT s parametry cyklu.',
        '',
        'Při tupém plátku a menším Ø a opětovném braní špony díry: ve zpětném překladu zmenšit PRUMER _D1 o 0,03 mm (např. 217.707 → 217.677). Cyklus pak udělá o 0,03 menší průměr.',
      ].join('\n'),
    },
    {
      t: 'Korekce rozměru – parametry (korekce nástroje)',
      p: [
        '1. Menu Select → Parametry.',
        '2. Klávesa CHANNEL (obrázek 1…N se šipkami): přepnout na kanál 2 – suport (strana).',
        '3. V seznamu zásobníku najet kurzorem na správný nástroj (správná pozice nože).',
        '4. Detaily nástroje (softklávesa vpravo).',
        '5. Data břitu.',
        '6. Druhá geometrie (u díry): −0,01 (menší o stovku).',
        '',
        'Nebo opotřebení (sloupce Opot-L 1 až 3 přímo v seznamu zásobníku), např. u vrtáku.',
      ].join('\n'),
    },
    {
      t: 'W_OTVHO1 – parametry cyklu (díra na hotovo)',
      p: [
        'Pořadí v řádku: W_OTVHO1(D1, Z0, Z1, R1, K1, KU, D2, KO, F1, F2, SO)',
        'Příklad: W_OTVHO1(217.707,184.19,185.5,1,2,,,0.034,0.22,0.2,)',
        '',
        '_D1 – průměr (217.707) – zadávat při dolním čele',
        '_Z0 – horní čelo abs. (184.190)',
        '_Z1 – výška náboje (185.500)',
        '_R1 – sražení ×45° (1.000)',
        '_K1 – rádius × sražení (RAD)',
        '_KU – kuželovitost (prázdné)',
        '_D2 – průměr (prázdné)',
        '_KO – konus (0.034)',
        '_F1 – posuv (0.220)',
        '_F2 – posuv rad (0.200)',
        '_SO – soudek (prázdné)',
      ].join('\n'),
    },
    {
      t: 'Díra náboje – vynechání měrného řezu (reset před sondou)',
      p: [
        'V díře se nejdřív udělá měrný řez, sonda ho změří a potom se udělá řez na hotovo.',
        'Když se po měrném řezu něco stane nebo je nutný reset, měrný řez se musí vynechat: jít rovnou na sondu a na hotovo.',
        '',
        'Jak na to:',
        '– 1205 (vypnout měrný řez)',
        '– Otevřít Messschnitt_CH2.SPF (uživatelské cykly).',
        '– Řádek GOTOF AAA ; měření bez řezu: GOTOF AAA nutí program skočit na měrný řez. Středník na začátku řádku z něj udělá poznámku, program měrný řez přeskočí a jde rovnou na sondu a na hotovo.',
      ].join('\n'),
    },
  ],
  poruchy: [],
  manipulator: [],
};
