# Bona – pracovní poznámky k projektu

Interní přehled pro tvorbu aplikace (pro Clauda i autora). Není to obsah aplikace.

## Zadání
- Webová aplikace pro obsluhu CNC karuselu **CHES4** (Sinumerik 840D, HMI Advanced).
- Autor přepisuje své ručně psané poznámky. Fotky posílá po stránkách, nejasnosti se řeší krátkými otázkami.
- Odpovídat česky, stručně (mobil).

## Struktura aplikace
- `index.html`, `app.js`, `style.css`, `sw.js` (service worker, network-first), `js/*.js`
- **Stroj** (`js/stroj-data.js` + `js/stroj.js`): kategorie Sonda, Nástroje, Reset, Korekce, Poruchy, Manipulátor. Poznámky jsou `{t, p}`, `p` = víceřádkový text.
- **Nová zakázka** (`js/zakazka.js`): checklist, výchozí kroky v kódu (`VYCHOZI`), v localStorage jen odškrtnutí a smazané položky (pole „Přidat do skupiny“ autor nechtěl – doplňky jdou do poznámky).
  - Stroje (`PAR`, `ZAKLAD` = CHES4) s hodnotami: rozteč PARAMDER, konus/posuvy DIRAHOT1 / W_OTVHO1, rádius, Ra, podpěrky VAR_DEF, upnutí ±10, Zero_Offset, Chuck_Stat, OP_Step. Tlačítko nahoře ukazuje vybraný stroj, rozbalí stroje + ＋.
  - Hodnoty se ukazují u bodů seznamu (`HODNOTY_U_BODU`) a v textech postupu přes `{klic}` (`{stroj}` = název).
  - Krok zpět/vpřed: snímky stavu (seznam + stroje) v `bona.zak.zpet/vpred`, max 40. Poznámka do toho nepatří (má pojistku).
  - Výpočet upnutí čelistí u bodu VAR_DEF: skutečná poloha ± rozsah stroje.
  - Jedno tlačítko „Nová zakázka – obnovit vše“ (odškrtne, vrátí smazané body, vymaže poznámku a polohu).
- Odkazy přes hash: `#sonda`, `#reset`, `#korekce`, `#zakazka` …

## Postup změn
1. Upravit data/kód, `node --check`.
2. Zvýšit verzi: `VERZE` v `app.js` **a** cache `bona-X.Y.Z` v `sw.js`.
3. Commit + push do `main` (GitHub Pages).

## Stav kategorií
| Kategorie | Stav |
|---|---|
| Sonda | 2 poznámky |
| Nástroje | 6 poznámek |
| Reset | 1 poznámka |
| Korekce | 4 poznámky |
| Poruchy | 3 poznámky (požadavek na údržbu IWI/IFS, filtry, sonda K1) |
| Manipulátor | 9 poznámek (volant, linka, pozice, bezpečnost, M2 ruční/automat, převoz) |
| MDA | 3 poznámky (OSTORE2, základy MDA, RELEASE/GET/GETD) |
| Nová zakázka | 4 skupiny hotové |

## Funkce přidané navíc
- Přihlašovací brána `js/heslo.js` (SHA-256 otisk v kódu, heslo se pamatuje v telefonu). Není to skutečná ochrana – repozitář i web jsou veřejné.
- Fotky u poznámek: `img/` + pole `f` u poznámky (zmenšit na 1000 px, JPEG ~72). Service worker si je pro offline najde sám v `js/stroj-data.js` a `js/zakazka.js` – do `sw.js` je není třeba dopisovat.
- Záloha dat (sekce Poznámky): export/import všech klíčů `bona.*` do JSON, kromě `bona.pristup`. Před obnovou se uloží kopie (`bonaPredObnovou`) → tlačítko „Vrátit stav před obnovou“. Po 14 dnech bez zálohy lišta s připomenutím („Později“ = +3 dny).
- Pojistky proti ztrátě dat: `window.hlidejText` (app.js) u poznámek – při smazání víc než poloviny textu tlačítko „Vrátit smazaný text“; Směna má „Obnovit smazané body“.
- Kotva `#…` z adresy se po otevření sekce smaže – po dalším načtení se otevře kalkulačka.
- Service worker stahuje s `cache: 'no-cache'` a po aktualizaci se stránka jednou sama obnoví (dřív se míchaly staré a nové soubory).
- Mobil: spodní lišta (`BNAV` v `app.js`), menu s hledáním a „Naposledy“; na šířku karty vedle sebe.
- `js/vypocty.js` je generovaný ze SKICA (`scripts/prevzit-ze-skici.mjs`) – needitovat ani nerozdělovat ručně.
- Veřejnost: v poznámce Manipulátor (volant) je uvedeno heslo operátora k volantu – případně odebrat.

## Ovládání stroje – ověřené (podle autora)
- **Nahrát** (HD→NC, Load) a **Navolit** je jeden krok.
- **Odložit** (NC→HD) jen vyloží program do paměti řídicího systému, neposílá do PC.
- **X ve sloupci „Zaveden“** = program je navolen/nahrán ve stroji. Starý se nejdřív zruší, pak se navolí nový.
- **CIMCO**: DOWN/UP jsou složky (DOWN = z PC do stroje, UP = ze stroje do PC), ne tlačítka.
- Odeslání do stroje jde i pravým tlačítkem myši.
- **Reset** vynuluje posunutí nulového bodu → před ním si zapsat OFFSET X, Z a po resetu je zadat znovu.
- Barvy obrobku při resetu: šedá = neobrobeno, zelená = obrobeno, červená = zmetek.
- Skok na operaci v programu: **CUT_MEM** (rozdělovač skoků); číslo operace se bere odtud.
- Středník před `GOTOF` udělá z řádku poznámku → měrný řez se přeskočí (po resetu jít rovnou na sondu a hotovo).
- **Korekce rozměru**: Select → Parametry → klávesa CHANNEL (kanál 2 = suport) → seznam zásobníku (kurzorem na správný nůž) → Detaily nástroje → Data břitu → druhá geometrie (u díry −0,01 = menší průměr). Opotřebení: Opot-L 1–3 v seznamu.
- Názvy: konus = `_KO`, posuv = `_F1/_F2`, úběr 0,03 jde do `_D1`; „íčko“ = podpěrky.

## Otevřené otázky (zatím nezodpovězeno)
- Nástroje: ověřit klávesu „>“ (přepnutí softkláves; klávesa ^ = o úroveň zpět potvrzeno). Délky 1/2 a radius FR25 potvrzeno.
- Manipulátor: sklady S2–S4 potvrzeny; v ruční obrazovce jsou tlačítka X a Y (v sešitu X a Z).
- MDA OSTORE2: C_OFF (2) potvrzeno (vypnutí režimu C-osy pro osu/vřeteno 2); G56 z dokumentace.
- „Nahrát program“ na konci „Přepsání programu“: samostatný krok, nebo duplicita?
- Reset: je „Auto → Start“ a „2× Start“ jeden krok?
- Sonda: význam „K1“, co dělat při rozdílu > 0,01, prázdná čísla v menu.
- Má se středník u `GOTOF` po použití zase smazat? Význam „1205 (vypnout měrný řez)“.
- Přesný zápis proměnných (Name_OF_Workpiece, OP_Step, Zero_Offset, Chuck_Stat…).
- Seřizování: kde je podpěrka 97,7, význam „upínání −10/+10 od skutečné“.
- Korekce: které pole je „druhá geometrie“, platí −0,01 vždy, nebo je to příklad? Opotřebení vrtáku přímo v seznamu zásobníku?

## Pravidla pro zápis poznámek
- Přepisovat věrně, nic si nedomýšlet; nejasné buď zeptat, nebo označit.
- Kroky číslovat, obrazovky a tlačítka pojmenovat tak, jak jsou na stroji.
- Název poznámky stručný a konkrétní.
