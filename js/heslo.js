'use strict';
/* Jednoduchá přihlašovací brána (jen proti náhodným zvědavcům – web je veřejný).
   Dvě hesla: jedno zobrazí aplikaci bez fotek, druhé s fotkami.
   Pozor: fotky ve složce img/ jsou na webu dostupné i bez hesla – heslo je jen schová z obrazovky. */
(function () {
  const HESLA = {
    '926fece1003e70f3e1570a3940c8c828d6fa6da2613bc8cac6647148f30dcc4e': 'bez', // bez fotek
    '4accb410959915fd19b0eb8ad95080f8b8029c2393ad1da668689f3bceff6f90': 'foto', // s fotkami
  };
  const KLIC = 'bona.pristup';
  const sha = async (t) => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bona-pristup:' + t));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  const nastavRezim = (h) => {
    const bez = HESLA[h] !== 'foto';
    window.BONA_BEZ_FOTEK = bez;
    document.documentElement.classList.toggle('bez-fotek', bez);
  };
  // Odhlášení (tlačítko v Poznámkách) – příště se zadá heslo znovu
  window.bonaOdhlasit = () => { try { localStorage.removeItem(KLIC); } catch { /* nic */ } location.reload(); };

  let ulozeno = null;
  try { ulozeno = localStorage.getItem(KLIC); } catch { /* nic */ }
  if (ulozeno && HESLA[ulozeno]) { nastavRezim(ulozeno); return; }

  nastavRezim(null); // dokud se nepřihlásí, bez fotek
  document.documentElement.classList.add('zamceno');
  document.addEventListener('DOMContentLoaded', () => {
    const d = document.createElement('div');
    d.id = 'brana';
    d.innerHTML = '<form><h2>Bona</h2><p>Zadej heslo</p>' +
      '<input type="password" id="brana-h" autocomplete="current-password" autofocus>' +
      '<button type="submit">Vstoupit</button><div id="brana-chyba" role="alert"></div></form>';
    document.body.appendChild(d);
    d.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const h = await sha(d.querySelector('#brana-h').value.trim().toLowerCase());
      if (HESLA[h]) {
        try { localStorage.setItem(KLIC, h); } catch { /* nic */ }
        // znovu načíst, aby se poznámky vykreslily v režimu s fotkami / bez fotek
        location.reload();
      } else {
        d.querySelector('#brana-chyba').textContent = 'Špatné heslo';
      }
    });
  });
})();
