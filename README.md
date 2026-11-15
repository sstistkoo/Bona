# Bona – CNC pomocník

Jednoduchá webová aplikace pro obsluhu CNC karuselu (svislého soustruhu) se systémem **Sinumerik 840D** při výrobě železničních kol.

Dělaná hlavně pro mobil: menu ☰ se všemi nástroji, velká tlačítka, ± u polí se zápornými hodnotami.
Na telefonu ji lze přidat na plochu jako aplikaci (v prohlížeči „Přidat na plochu“ / „Instalovat aplikaci“) a funguje i **bez signálu** – při prvním otevření se uloží do telefonu. Na PC stačí otevřít `index.html`.

## Co umí

- **Řezné podmínky** – přepočet řezné rychlosti Vc ↔ otáčky n, upozornění na LIMS, posuv za minutu
- **Čas obrábění** – čelní soustružení s G96 a omezením LIMS, podélné soustružení
- **Tolerance** – ISO 286 (díra/hřídel, třídy a stupně IT, rozměry až 3150 mm), vlastní úchylky v mm nebo µm, rozhodující rozměr a střed tolerance, volné míry ISO 2768
- **Kužel** – díra i čep, náčrt řezu (klepnutím na kótu se zadává), Ø z výkresu v hloubce, tolerance (i ISO, např. H7), měřicí místa od spodu i od vrchu s Ø min/max, náklon suportu, tabulky Morse a ISO
- **Drsnost** – Ra/Rz z posuvu a rádiusu špičky s korekcí na materiál, zpětně max. posuv pro cílovou Ra
- **Roztažnost** – přepočet rozměru teplého dílu na 20 °C, teplota pro nalisování, změna vůle spoje
- **Korekce rε** – posun bodů sražení, kužele a rádiusu při obrábění bez G41/G42, body do programu
- **Roh a oblouk** – zaoblení / sražení rohu, oblouk z tětivy a výšky, ze 3 bodů, ze startu, konce a R (G2/G3 s CR= i I/K)
- **VBD a držáky** – rozluštění kódu destičky (ISO 1832) a držáku (ISO 5608), vhodné kombinace
- **Trigonometrie** – pravoúhlý i obecný trojúhelník
- **Kalkulačka** – výrazy, goniometrické funkce ve stupních, historie
- **Sinumerik 840D** – příručka: G kódy, M kódy, příkazy, systémové proměnné, zkratky, ukázky programů, data nástrojů, alarmy, rychlý tahák pro karusel; hledání napříč vším
- **Převodník** – mm/palce, úhly (° / rad / ° ′ ″), Ra ↔ Rz, TPI ↔ stoupání, tvrdost HRC/HB/HV, moment, síla, rychlost
- **Nm** – vlastní seznam nožů s momenty, tabulky šroubů VBD, moment šroubu M podle VDI 2230, klíč s prodloužením, převody jednotek
- **Stroj** – poznámky ke stroji v kategoriích Sonda, Nástroje, Reset, Korekce, Poruchy, Manipulátor; hledání napříč všemi a vlastní poznámky ke každé kategorii
- **Nová zakázka** – údaje o zakázce a upravitelný kontrolní seznam chystání (podklady, upnutí, nástroje, stroj, první kus)
- **Směna** – kontrolní seznam (lze upravit) a počítadlo kusů
- **Poznámky** – ukládají se automaticky v prohlížeči

## Struktura

| Soubor       | Obsah                    |
|--------------|--------------------------|
| `index.html` | stránka a rozložení      |
| `style.css`  | vzhled (i tmavý režim)   |
| `app.js`     | záložky, řezné podmínky, čas, tahák, směna, poznámky |
| `js/vypocty.js` | výpočetní jádra převzatá ze [SKICA 2D CAD/CAM](https://github.com/sstistkoo/2D_CAD-CAM) |
| `js/sinumerik-data.js` | data příručky Sinumerik převzatá ze SKICA |
| `js/nastroje.js` | tolerance, drsnost, trigonometrie, kalkulačka |
| `js/kuzel.js` | kužel s náčrtem (logika převzatá ze SKICA taperBore.js) |
| `js/sinumerik.js` | příručka Sinumerik 840D |
| `js/prevod-nm.js` | převodník, utahovací momenty |
| `js/dilna.js` | roztažnost, korekce rε, roh a oblouk, VBD a držáky |
| `js/stroj-data.js` | poznámky ke stroji (sem se doplňují) |
| `js/stroj.js` | záložka Stroj – kategorie, hledání, vlastní poznámky |
| `js/zakazka.js` | záložka Nová zakázka |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline režim a instalace na plochu (při změně souborů zvyš `VERZE` v `sw.js`) |

### Aktualizace ze SKICA

`js/vypocty.js` a `js/sinumerik-data.js` se generují skriptem – ručně je neupravuj. Opravy chyb v datech příručky Sinumerik (kódy z Fanucu, neexistující kódy, špatné popisy) jsou v `scripts/opravy-sinumerik.mjs` a skript je použije při každém převzetí:

```
git clone https://github.com/sstistkoo/2D_CAD-CAM ../2D_CAD-CAM
node scripts/prevzit-ze-skici.mjs ../2D_CAD-CAM
```

Odkaz na konkrétní záložku: `…/Bona/#tol`, `#kuzel`, `#drsnost`, `#trig`, `#calc`, `#sinumerik`, `#prevod`, `#nm`, `#teplo`, `#rez`, `#geo`, `#vbd`, `#stroj`, `#zakazka`; přímo kategorie poznámek: `#sonda`, `#nastroje`, `#reset`, `#korekce`, `#poruchy`, `#manipulator`, `#mda`.

> Údaje v aplikaci jsou orientační. Vždy platí dokumentace stroje, výkres a technologický postup.
