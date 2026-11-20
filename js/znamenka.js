'use strict';
// Lišta + − × ÷ ( ) = nad číselnou klávesnicí (převzato ze SKICA – mathKeyBar.js).
// Číselná pole mají na mobilu klávesnici jen s číslicemi, tečkou a mínusem –
// výraz jako 34+135+25 nebo 50/2 nešel napsat. Pro celou aplikaci:
//  • u polí s inputmode="decimal" a type="number" se nad klávesnicí ukáže lišta,
//  • pole type="number" je na dobu psaní textové (znaménko by smazalo),
//  • výraz se při potvrzení pole (change / Enter) přepočítá na číslo – i tam,
//    kde kalkulačka čte jen parseFloat (z „50/2" by jinak tiše bylo 50).
// Pole s data-no-math lišta i přepočet vynechá.

(function () {
  const ev = (s) => window.Vypocty && window.Vypocty.safeEvalMath ? window.Vypocty.safeEvalMath(s) : NaN;
  const dotyk = () => !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const CISLO = /^\s*[-+]?(\d+[.,]?\d*|[.,]\d+)?\s*$/;         // obyčejné číslo – nic nepřepočítávat

  function jeCiselne(el) {
    if (!el || el.tagName !== 'INPUT' || el.disabled || el.readOnly) return false;
    if (el.dataset && el.dataset.noMath != null) return false;
    if (el.type === 'number') return true;
    return el.type === 'text' && el.getAttribute('inputmode') === 'decimal';
  }

  /** Přepočítá výraz v poli na číslo. @returns {boolean} změnilo se */
  function spocitej(el) {
    const raw = el.value;
    if (CISLO.test(raw)) return false;
    const n = ev(raw);
    if (!Number.isFinite(n)) return false;
    const v = String(+n.toFixed(6));
    if (v === raw) return false;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // ── type="number" ↔ text po dobu psaní (jen dotyk) ──
  function naText(el) {
    if (el.type !== 'number' || !dotyk()) return;
    el.dataset.znCislo = el.getAttribute('inputmode') || '';
    el.type = 'text';
    el.setAttribute('inputmode', 'decimal');
  }
  function naCislo(el) {
    if (!el.dataset || el.dataset.znCislo == null) return;
    spocitej(el);
    if (/^\s*[-+]?\d*,\d+\s*$/.test(el.value)) {           // číselné pole čárku nebere
      el.value = el.value.trim().replace(',', '.');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const im = el.dataset.znCislo;
    delete el.dataset.znCislo;
    el.type = 'number';
    if (im) el.setAttribute('inputmode', im); else el.removeAttribute('inputmode');
  }

  function napis(el, t) {
    const len = el.value.length;
    let a = el.selectionStart, b = el.selectionEnd;
    if (a == null) { a = b = len; }
    // celé pole označené: znaménko číslo nepřepíše, připíše se za něj (jen „(" nahradí)
    if (len && a === 0 && b === len && t !== '(') a = b = len;
    el.setRangeText(t, a, b, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ── Lišta ──
  const KLAVESY = [['+', '+', 'Plus'], ['-', '−', 'Mínus'], ['*', '×', 'Krát'], ['/', '÷', 'Děleno'], ['(', '(', 'Závorka'], [')', ')', 'Závorka'], ['=', '=', 'Spočítat']];
  let lista = null, cil = null, vyska = 0;
  function vytvor() {
    if (lista) { if (!lista.isConnected) document.body.appendChild(lista); return lista; }
    lista = document.createElement('div');
    lista.className = 'znam-lista';
    lista.hidden = true;
    lista.innerHTML = KLAVESY.map(([k, l, t]) => `<button type="button" class="znam-k${k === '=' ? ' znam-eq' : ''}" data-zk="${k}" title="${t}">${l}</button>`).join('');
    const drz = (e) => { if (e.target.closest('button')) e.preventDefault(); };   // nebrat poli fokus
    lista.addEventListener('pointerdown', drz);
    lista.addEventListener('mousedown', drz);
    lista.addEventListener('click', (e) => {
      const b = e.target.closest('[data-zk]');
      if (!b || !cil || !cil.isConnected) return;
      if (document.activeElement !== cil) cil.focus();
      naText(cil);
      if (b.dataset.zk === '=') spocitej(cil); else napis(cil, b.dataset.zk);
    });
    document.body.appendChild(lista);
    return lista;
  }
  function umisti() {
    if (!lista || lista.hidden) return;
    const vv = window.visualViewport;
    // přiblížení prsty: lištu zmenšit zpět na běžnou velikost přes viditelnou šířku
    const sc = vv && vv.scale > 1.01 ? vv.scale : 1;
    const w = vv ? vv.width : window.innerWidth;
    lista.style.transformOrigin = '0 0';
    lista.style.transform = sc > 1 ? 'scale(' + (1 / sc) + ')' : '';
    lista.style.width = (w * sc) + 'px';
    lista.style.left = (vv ? vv.offsetLeft : 0) + 'px';
    vyska = lista.offsetHeight / sc;
    const top = vv ? vv.offsetTop + vv.height - vyska : window.innerHeight - vyska;
    lista.style.top = Math.max(0, top) + 'px';
    // ať jde dolní obsah odrolovat nad lištu
    document.body.style.paddingBottom = vyska + 'px';
  }
  function ukaz(el) { cil = el; vytvor().hidden = false; umisti(); }
  function skryj() {
    cil = null;
    if (!lista || lista.hidden) return;
    lista.hidden = true;
    document.body.style.paddingBottom = '';
  }

  document.addEventListener('pointerdown', (e) => {
    const el = e.target;
    if (el && el.tagName === 'INPUT' && el.type === 'number' && jeCiselne(el)) {
      naText(el);
      setTimeout(() => { if (document.activeElement !== el) naCislo(el); }, 800);   // jen posun prstem
    }
  }, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!jeCiselne(el)) return;
    naText(el);
    if (dotyk()) ukaz(el);
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (el && el.dataset && el.dataset.znCislo != null) naCislo(el);
    setTimeout(() => { if (!jeCiselne(document.activeElement)) skryj(); }, 0);
  });
  // potvrzení pole: přepočítat výraz DŘÍV, než ho přečte kalkulačka (capture)
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!jeCiselne(el)) return;
    if (el.dataset.znCislo != null) naCislo(el); else spocitej(el);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && jeCiselne(e.target)) spocitej(e.target); }, true);
  const vv = window.visualViewport;
  if (vv) { vv.addEventListener('resize', umisti); vv.addEventListener('scroll', umisti); }

  window.BonaZnamenka = { spocitej, jeCiselne };
})();
