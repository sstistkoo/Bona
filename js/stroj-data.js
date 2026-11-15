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
  { id: 'mda', nazev: 'MDA', ikona: '⌨️', popis: 'Programy pro ruční režim (MDA)' },
];

window.STROJ_POZNAMKY = {
  mda: [
    {
      t: 'OSTORE2 (SYF\\OSTORE2.SYF)',
      p: [
        'DIAMOF',
        'GETD (S1)',
        'SETMS (1)',
        'G56',
        'C_OFF (2)',
        'M1=3 S1=80',
        'G91 G1 X2=33 Z2=0.16 F0.9',
      ].join('\n'),
      f: ['mda-ostore2.jpg'],
    },
  ],
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
      t: 'Sonda – naměřeno mimo rozsah (K1, pozice 5)',
      p: 'Chyba – sonda naměřila hodnotu mimo rozsah (K1 obrobek, měrná pozice 5 pod Dif): zkontrolovat rozdíl, tolerance 0,01.',
    },
  ],
  nastroje: [
    {
      t: 'Výměna nástroje (zásobník)',
      p: [
        '1. Tlačítko s ikonou dvou obdélníků (první řada vlevo) – chvilku počkat, než se přepne.',
        '2. Klíč C2 / C1 – dveře levé / pravé.',
        '3. Otevření dveří (zásobník + dveře ↑).',
        '4. Natočení zásobníku – tlačítko v první řadě úplně vpravo.',
        '5. Vyndání nože – otočný přepínač (zásobník + šipka ven) do polohy vyndání.',
        '6. Zasunutí nože – tentýž přepínač do druhé polohy.',
        '7. Zavření dveří (laser).',
      ].join('\n'),
      f: ['panel-zasobnik.jpg'],
    },
    {
      t: 'Zapsání nástroje',
      p: [
        'Menu Select → Parametry → Nástroj (softklávesa).',
        'Když softklávesa Nástroj není vidět, přepnout lištu softkláves na další tlačítka (klávesa „>“).',
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
    {
      t: 'Data břitu – délka 1 a délka 2 (pravý suport)',
      p: [
        'Délka 1 = hodnota X (vodorovně, od osy po střed/špičku nástroje).',
        'Délka 2 = hodnota Z (svisle, od čela upínače dolů ke středu/špičce nástroje).',
        'Příklad na náčrtku: délka 1 = X, −50; délka 2 = Z, cca 120 mm.',
      ].join('\n'),
    },
    {
      t: 'Fréza FR – nastavit 2. geometrii (radius)',
      p: [
        'FR = fréza → nastavit 2. geometrii (radius).',
        'Příklad FR25: radius 12,5 + 0,2 (díra menší o 0,4 mm).',
      ].join('\n'),
    },
    {
      t: 'Spindel – nůž s displejem',
      p: [
        'Spindel je nůž, který má na sobě displej pro přesné nastavení plátků.',
        'Nastavuje se průměr (Ø) na tomto displeji.',
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
      f: ['reset-klavesy-neo.jpg', 'reset-klavesa-machine.jpg', 'upinac-osazeni.jpg'],
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
      f: ['zasobnik-parametry.jpg'],
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
      f: ['w-otvho1-dira.jpg'],
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
      f: ['sprungverteiler.jpg', 'goto-cut-mem.jpg'],
    },
  ],
  poruchy: [
    {
      t: 'Porucha – požadavek na údržbu (IWI / IFS)',
      p: [
        'Na PC: IWI → IFS (IWI požadavek).',
        '1. Requestor → nový požadavek.',
        '2. Typ 01 – Reaktivní údržba (poruchy, závady).',
        '3. Středisko údržby → UDR.',
        '4. Struktura – výběr objektu (stroj): Chess4 / Hessap4 / Lk4.',
        '5. Provoz údržby 2 – studená část.',
        '6. Šablona úlohy.',
        '7. Popis závady, např. „filtry vysokotlakého čerpadla – znečištění“.',
        '8. Priorita 0 – odstranit ihned.',
        '9. Zaškrtnout „odstávka zařízení“ (ikona se zaškrtnutím).',
      ].join('\n'),
    },
    {
      t: 'Výměna filtrů (oprava / údržba)',
      p: [
        'Postup: nahlásit požadavek na údržbu v IWI / IFS (viz „Porucha – požadavek na údržbu“).',
        'Příklad: filtry vysokotlakého čerpadla – znečištění → priorita 0, odstranit ihned, odstávka zařízení.',
      ].join('\n'),
    },
    {
      t: 'Měřicí sonda obrobku K1 – porucha (Marposs)',
      p: [
        'K1 = měřicí sonda obrobku Marposs.',
        'Porucha: sonda nereaguje, protože v ní chybí (došly) baterie → vyměnit baterie v sondě.',
      ].join('\n'),
    },
  ],
  manipulator: [
    {
      t: 'Manipulátor (volant) – přihlášení a tlačítka F1–F18',
      p: [
        'Nastavení: jméno Obsluha, heslo 100.',
        '',
        'F1 – menu',
        'F2 – zpět',
        'F3 až F7 – nepoužito',
        'F8 – výběr menu',
        'F9 – výběr zařízení pro ovládání',
        'F10 – vypnutí manipulátoru (pro druhý volant)',
        'F11 – F12: pojezd manipulátoru',
        'F13 – F14: zdvih',
        'F15 – F16: rotace',
        'F17 – F18: ovládání upnutí',
        '',
        'Rotace chapadel: 0° = nákolek nahoru, 180° = nákolek dolů.',
      ].join('\n'),
    },
    {
      t: 'Manipulátor – přehled linky (dopravníky, sklady, stroje)',
      p: [
        'VD3 – dopravník (nakládání surových kol).',
        'VD4 – dopravník (nakládání obrobených kol, odvoz kol).',
        'VD5 – dopravník (hotová kola; UZ = ultrazvuk, Mag. = magnetická zkouška).',
        'VD6 – dopravník (za vyvažovačkou).',
        'S2, S3, S4 – sklady (S2 u VD4, S3 u VD5, S4 u VD6).',
        'HES3, HES4 – stroje; VDM3, VDM4 – stroje; VYV – vyvažovačka.',
        'Stroj HES4 = 123; stojan na surová kola 122, stojan na hotová kola 124.',
        '',
        'Na obrazovce: bílá výplň = obsazená pozice, šedá = prázdná.',
      ].join('\n'),
      f: ['manipulator-m2.jpg', 'stojan-124.jpg'],
    },
    {
      t: 'Informace o kole a nastavení (menu)',
      p: [
        'Pozice (tlačítko): informace o kole z obrazovky PŘEHLED stlačením příslušné pozice.',
        '',
        'NASTAVENÍ:',
        '• Výběr zařízení pro ovládání (F9) – volba části linky, kterou chceme z panelu ovládat. Aktivní panel, ruční ovládání.',
        '• Komunikace se stroji – diagnostika komunikace mezi manipulátory a stroji v lince.',
        '• TYP KOLA – přehled a editace rozměrů kol v lince.',
        '• SERVIS – okno s nastavením parametrů linky.',
      ].join('\n'),
    },
    {
      t: 'M2 – ruční režim',
      p: [
        'OVLÁDÁNÍ:',
        '• Pojezd: dvě tlačítka X a Z; když jsou dosaženy, prosvětlí bílou barvou.',
        '• Žádaná pozice: bílé pole = zadávání, šedé pole = přehled pozic; obsazené pozice jsou zabarvené zeleně.',
        '• Šedé pole (přehled pozic): vybrat a Potvrzení.',
        '• Stisknutím tlačítek X a Z se aktivuje pohyb manipulátoru.',
        '• Otočení chapadel: 0° nákolek nahoru, 180° nákolek dolů.',
        '• Upínání chapadel: UVOLNI a UPNI.',
        '• Zdvih manipulátoru: nahoru a dolů.',
        '• VD3, VD4 a VD5: rotace 0°.',
      ].join('\n'),
    },
    {
      t: 'M2 – automat (VDM): výměna kol mezi stroji',
      p: [
        'Ovládání (VDM, přesun).',
        'Podmínky: zdvih v horní poloze, manipulátor prázdný, chapadla v poloze 0°.',
        '',
        'VDM3 – VDM4:',
        '• Typ kola.',
        '• Naložení surových kol z: dopravník VD3.',
        '• Vyložení hotových kol do: sklad S2, sklad S3, dopravník VD4, dopravník VD5, stroj HES3, stroj HES4.',
        '',
        'HES3 – HES4:',
        '• Typ kola.',
        '• Naložení surových kol: stroj VDM3, VDM4, sklad S2, dopravník VD4.',
        '• Volba operace: 1 operace – 180°, 1 operace – 0°, 2 operace.',
        '• Vyložení kol: dopravník VD4, sklad S3, dopravník VD5.',
      ].join('\n'),
    },
    {
      t: 'M2 – automat (přesun)',
      p: [
        '• Typ kola.',
        '• Přesun kola z: sklad S2, dopravník VD4, sklad S3, dopravník VD5.',
        '• Přesun kola do: S2, VD4, S3, VD5.',
      ].join('\n'),
    },
    {
      t: 'Nastavení převozu (zjištění kola, zadání čísla)',
      p: [
        'PŘEHLED: zjistit ve skladu pozici kola (na kterém stojanu je).',
        'Potřeba zjistit číslo kola: kliknout na pozici dle stojanu (typ kola).',
        '',
        'OVLÁDÁNÍ: zadat číslo kola, pole TYP.',
      ].join('\n'),
    },
  ],
};
