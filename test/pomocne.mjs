// Načtení skriptů aplikace (psaných pro prohlížeč) do Node pro testy.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const KOREN = fileURLToPath(new URL('..', import.meta.url));
export const cti = (soubor) => readFileSync(KOREN + soubor, 'utf8');

export function nactiVypocty() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(cti('js/vypocty.js'), ctx);
  return ctx.window.Vypocty;
}

// Funkce schovaná uvnitř (function () { … })() – vytáhne se její zdrojový text a spustí samostatně.
export function vytahniFunkci(soubor, jmeno) {
  const zdroj = cti(soubor).replace(/\r\n/g, '\n');
  const m = new RegExp(`\\n( *)function ${jmeno}\\(`).exec(zdroj);
  if (!m) throw new Error(`Funkce ${jmeno} v ${soubor} nenalezena`);
  const konec = zdroj.indexOf(`\n${m[1]}}\n`, m.index + 1); // zavírací } na stejném odsazení
  return vm.runInNewContext(`(${zdroj.slice(m.index + 1, konec + m[1].length + 2)})`);
}
