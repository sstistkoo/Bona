'use strict';
/* Jednoduchá přihlašovací brána (jen proti náhodným zvědavcům – web je veřejný). */
(function () {
  const HASH = '926fece1003e70f3e1570a3940c8c828d6fa6da2613bc8cac6647148f30dcc4e';
  const KLIC = 'bona.pristup';
  const sha = async (t) => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bona-pristup:' + t));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  let ulozeno = null;
  try { ulozeno = localStorage.getItem(KLIC); } catch { /* nic */ }
  if (ulozeno === HASH) return;

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
      const h = await sha(d.querySelector('#brana-h').value.trim());
      if (h === HASH) {
        try { localStorage.setItem(KLIC, HASH); } catch { /* nic */ }
        document.documentElement.classList.remove('zamceno');
        d.remove();
      } else {
        d.querySelector('#brana-chyba').textContent = 'Špatné heslo';
      }
    });
  });
})();
