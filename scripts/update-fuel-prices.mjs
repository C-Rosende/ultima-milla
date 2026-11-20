import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { normalizarEstaciones, medianaPorZona, ZONAS, COMBUSTIBLES } from '../js/precios.js';

/* Copia diaria de medianas por zona para la app (respaldo cuando el navegador no alcanza la API).
   Usa la misma lógica pura que la app: js/precios.js. */
export const SOURCE = 'https://api.bencinaenlinea.cl/api/busqueda_estacion_filtro';
const OUTPUT = fileURLToPath(new URL('../fuel-prices.json', import.meta.url));

/* raw: respuesta de la API. Lanza si la respuesta no alcanza para publicar un precio confiable. */
export function construirPrecios(raw, fetchedAt = new Date().toISOString(), { minEstaciones = 500 } = {}) {
  const estaciones = normalizarEstaciones(raw);
  if (estaciones.length < minEstaciones) throw new Error(`Solo ${estaciones.length} estaciones válidas; se esperaban al menos ${minEstaciones}`);
  const zonas = medianaPorZona(estaciones);
  for (const zona of ZONAS) {
    for (const combustible of COMBUSTIBLES) {
      if (!zonas[zona][combustible]) throw new Error(`Falta ${combustible} en ${zona}`);
    }
  }
  return { source: SOURCE, product: 'Gasolinas 93, 95 y 97 y diésel', unit: 'CLP/L', method: 'mediana por zona', fetchedAt, estaciones: estaciones.length, zonas };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Fuente respondió ${response.status}`);
  const precios = construirPrecios(await response.json());
  await writeFile(OUTPUT, `${JSON.stringify(precios, null, 2)}\n`, 'utf8');
  process.stdout.write(`Actualizadas ${ZONAS.length} zonas con ${precios.estaciones} estaciones (${precios.fetchedAt})\n`);
}
