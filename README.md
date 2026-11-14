# Bona – CNC pomocník

Jednoduchá webová aplikace pro obsluhu CNC karuselu (svislého soustruhu) se systémem **Sinumerik 840D** při výrobě železničních kol.

Funguje v prohlížeči na PC i mobilu, nic se neinstaluje – stačí otevřít `index.html`.

## Co umí

- **Řezné podmínky** – přepočet řezné rychlosti Vc ↔ otáčky n, upozornění na LIMS, posuv za minutu
- **Čas obrábění** – čelní soustružení s G96 a omezením LIMS, podélné soustružení
- **Tolerance** – ISO 286 (díra/hřídel, třídy a stupně IT, rozměry až 3150 mm), vlastní úchylky, volné míry ISO 2768
- **Kužel** – ze 3 hodnot dopočítá zbytek (D, d, L, 1:x, úhly), tabulky Morse a poměrových kuželů
- **Drsnost** – Ra/Rz z posuvu a rádiusu špičky s korekcí na materiál, zpětně max. posuv pro cílovou Ra
- **Trigonometrie** – pravoúhlý i obecný trojúhelník
- **Kalkulačka** – výrazy, goniometrické funkce ve stupních, historie
- **Tahák G-kódů** – přehled příkazů a cyklů Sinumerik 840D pro soustružení, s vyhledáváním
- **Směna** – kontrolní seznam (lze upravit) a počítadlo kusů
- **Poznámky** – ukládají se automaticky v prohlížeči

## Struktura

| Soubor       | Obsah                    |
|--------------|--------------------------|
| `index.html` | stránka a rozložení      |
| `style.css`  | vzhled (i tmavý režim)   |
| `app.js`     | záložky, řezné podmínky, čas, tahák, směna, poznámky |
| `js/vypocty.js` | výpočetní jádra převzatá ze [SKICA 2D CAD/CAM](https://github.com/sstistkoo/2D_CAD-CAM) |
| `js/nastroje.js` | tolerance, kužel, drsnost, trigonometrie, kalkulačka |

Odkaz na konkrétní záložku: `…/Bona/#tol`, `#kuzel`, `#drsnost`, `#trig`, `#calc`.

> Údaje v aplikaci jsou orientační. Vždy platí dokumentace stroje, výkres a technologický postup.
