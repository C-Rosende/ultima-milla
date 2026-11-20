/* Formato y lectura de números en español de Chile. Sin DOM. */

const PESOS = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
export const money = n => PESOS.format(Math.round(Number(n) || 0));
export const moneyDec = n => '$' + new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(Math.round(n * 10) / 10);
export const fmtDec = (n, max = 1) => new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: max }).format(Number(n) || 0);
export const fmtKm = n => `${fmtDec(n, 1)} km`;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Acepta "3,2" y "3.2". NaN si no hay un número. */
export const parseDec = raw => {
  const s = String(raw ?? '').trim().replace(/[\s$]/g, '').replace(',', '.');
  return /^\d*\.?\d+$/.test(s) ? Number(s) : NaN;
};
/* Para montos: también acepta "4.100" y "1.234,5". */
export const parseNum = raw => {
  let s = String(raw ?? '').trim().replace(/[\s$]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  return parseDec(s);
};

export function distanciaTexto(km) {
  return km < 1 ? `${Math.max(10, Math.round(km * 1000 / 10) * 10)} m` : `${fmtDec(km, 1)} km`;
}

/* "hace 2 h". Acepta "2026-11-19 08:01:12" o ISO. */
export function hace(fecha, ahora = Date.now()) {
  if (!fecha) return '';
  const t = Date.parse(String(fecha).includes('T') ? fecha : String(fecha).replace(' ', 'T'));
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((ahora - t) / 60000));
  if (min < 2) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  if (min < 60 * 36) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

/* Envuelve los números de un árbol DOM en <x-n> para dibujarlos con Archivo (el 0 de Atkinson va tachado). */
export function envolverNumeros(raiz) {
  const omitir = new Set(['SCRIPT', 'STYLE', 'OPTION', 'SELECT', 'TEXTAREA', 'INPUT']);
  const nodos = [];
  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: n => !n.nodeValue || !/\d/.test(n.nodeValue) || omitir.has(n.parentElement?.tagName) || n.parentElement?.closest('x-n,.no-n,[data-count]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  while (caminante.nextNode()) nodos.push(caminante.currentNode);
  for (const nodo of nodos) {
    const partes = nodo.nodeValue.split(/(\d+(?:[.,:]\d+)*)/);
    const frag = document.createDocumentFragment();
    partes.forEach((parte, i) => {
      if (i % 2) { const s = document.createElement('x-n'); s.textContent = parte; frag.append(s); }
      else if (parte) frag.append(document.createTextNode(parte));
    });
    nodo.replaceWith(frag);
  }
}
