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
- **Sinumerik 840D** – příručka: G kódy, M kódy, příkazy, systémové proměnné, zkratky, ukázky programů, data nástrojů, alarmy, rychlý tahák pro karusel; hledání napříč vším
- **Převodník** – mm/palce, úhly (° / rad / ° ′ ″), Ra ↔ Rz, TPI ↔ stoupání, tvrdost HRC/HB/HV, moment, síla, rychlost
- **Nm** – vlastní seznam nožů s momenty, tabulky šroubů VBD, moment šroubu M podle VDI 2230, klíč s prodloužením, převody jednotek
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
| `js/nastroje.js` | tolerance, kužel, drsnost, trigonometrie, kalkulačka |
| `js/sinumerik.js` | příručka Sinumerik 840D |
| `js/prevod-nm.js` | převodník, utahovací momenty |

### Aktualizace ze SKICA

`js/vypocty.js` a `js/sinumerik-data.js` se generují skriptem – ručně je neupravuj:

```
git clone https://github.com/sstistkoo/2D_CAD-CAM ../2D_CAD-CAM
node scripts/prevzit-ze-skici.mjs ../2D_CAD-CAM
```

Odkaz na konkrétní záložku: `…/Bona/#tol`, `#kuzel`, `#drsnost`, `#trig`, `#calc`, `#sinumerik`, `#prevod`, `#nm`.

> Údaje v aplikaci jsou orientační. Vždy platí dokumentace stroje, výkres a technologický postup.
