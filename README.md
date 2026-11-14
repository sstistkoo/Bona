# Bona – CNC pomocník

Jednoduchá webová aplikace pro obsluhu CNC karuselu (svislého soustruhu) se systémem **Sinumerik 840D** při výrobě železničních kol.

Funguje v prohlížeči na PC i mobilu, nic se neinstaluje – stačí otevřít `index.html`.

## Co umí

- **Kalkulačka** – přepočet řezné rychlosti Vc ↔ otáčky n, upozornění na LIMS, posuv za minutu, teoretická drsnost
- **Čas obrábění** – čelní soustružení s G96 a omezením LIMS, podélné soustružení
- **Tahák G-kódů** – přehled příkazů a cyklů Sinumerik 840D pro soustružení, s vyhledáváním
- **Směna** – kontrolní seznam (lze upravit) a počítadlo kusů
- **Poznámky** – ukládají se automaticky v prohlížeči

## Struktura

| Soubor       | Obsah                    |
|--------------|--------------------------|
| `index.html` | stránka a rozložení      |
| `style.css`  | vzhled (i tmavý režim)   |
| `app.js`     | výpočty a logika         |

> Údaje v aplikaci jsou orientační. Vždy platí dokumentace stroje, výkres a technologický postup.
