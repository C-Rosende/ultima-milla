import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const SOURCE = 'https://api.bencinaenlinea.cl/api/estaciones/precios_combustibles/export_zonal';
const OUTPUT = fileURLToPath(new URL('../fuel-prices.json', import.meta.url));
const ZONES = ['Zona Norte', 'Zona Centro', 'Metropolitana', 'Zona Sur'];

export function parseCsv(input) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (quoted) throw new Error('CSV incompleto');
  row.push(field.replace(/\r$/, ''));
  if (row.some(Boolean)) rows.push(row);
  const [headers, ...data] = rows;
  if (!headers?.includes('precio_promedio') || !headers.includes('zona_geografica_nombre')) throw new Error('Cabecera CSV desconocida');
  return data.map(cells => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ''), cells[index]])));
}

export function extractPrices(rows, fetchedAt = new Date().toISOString()) {
  const matches = rows.filter(row => row.combustible_nombre_corto === '93' || row.combustible_nombre_largo === 'Gasolina 93');
  const zones = ZONES.map(name => {
    const row = matches.find(item => item.zona_geografica_nombre === name);
    if (!row || row.unidad_cobro_nombre_corto !== '$/L') throw new Error(`Falta Gasolina 93 en ${name}`);
    const average = Number(row.precio_promedio), min = Number(row.precio_min), max = Number(row.precio_max);
    if (![average, min, max].every(Number.isFinite) || min <= 0 || min > average || average > max) throw new Error(`Precio inválido en ${name}`);
    return { name, average, min, max };
  });
  return { source: SOURCE, product: 'Gasolina 93', unit: 'CLP/L', fetchedAt, zones };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Fuente respondió ${response.status}`);
  const prices = extractPrices(parseCsv(await response.text()));
  await writeFile(OUTPUT, `${JSON.stringify(prices, null, 2)}\n`, 'utf8');
  process.stdout.write(`Actualizadas ${prices.zones.length} zonas (${prices.fetchedAt})\n`);
}
