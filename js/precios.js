/* Precios de combustible: lógica PURA (sin DOM, sin red).
   La usan el navegador (js/energia.js) y el actualizador de Node (scripts/update-fuel-prices.mjs). */

export const ZONAS = ['Norte', 'Centro', 'Metropolitana', 'Sur'];
export const COMBUSTIBLES = ['93', '95', '97', 'diesel'];

/* Región (como la entrega Bencina en Línea) → zona. Verificado contra export_zonal. */
export const ZONA_DE_REGION = {
  'arica y parinacota': 'Norte',
  'tarapaca': 'Norte',
  'antofagasta': 'Norte',
  'atacama': 'Norte',
  'coquimbo': 'Norte',
  'valparaiso': 'Centro',
  'del libertador gral. bernardo ohiggins': 'Centro',
  'del maule': 'Centro',
  'nuble': 'Centro',
  'del biobio': 'Centro',
  'metropolitana de santiago': 'Metropolitana',
  'de la araucania': 'Sur',
  'de los rios': 'Sur',
  'de los lagos': 'Sur',
  'aysen del gral. carlos ibanez del campo': 'Sur',
  'magallanes y de la antartica chilena': 'Sur'
};

// Raíces para tolerar tildes rotas o nombres abreviados.
const RAICES = [
  ['arica', 'Norte'], ['tarapac', 'Norte'], ['antofagasta', 'Norte'], ['atacama', 'Norte'], ['coquimbo', 'Norte'],
  ['valpara', 'Centro'], ['higgins', 'Centro'], ['maule', 'Centro'], ['uble', 'Centro'], ['biob', 'Centro'],
  ['metropolitana', 'Metropolitana'], ['santiago', 'Metropolitana'],
  ['araucan', 'Sur'], ['lagos', 'Sur'], ['ays', 'Sur'], ['magallanes', 'Sur']
];

const limpiar = texto => String(texto ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[�'’`´]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

export function zonaDeRegion(region) {
  const clave = limpiar(region);
  if (!clave) return null;
  if (ZONA_DE_REGION[clave]) return ZONA_DE_REGION[clave];
  if (/\blos r/.test(clave)) return 'Sur';
  const hallada = RAICES.find(([raiz]) => clave.includes(raiz));
  return hallada ? hallada[1] : null;
}

/* Respaldo sin red: cortes de latitud aproximados (95,5 % de acierto; los errores son RM contra Centro en el borde).
   Con la lista de estaciones cargada se usa la región de la estación más cercana, que es más robusta. */
export function zonaAproximada(lat, lon) {
  if (lat >= -32.2) return 'Norte';
  if (lat <= -37.6) return 'Sur';
  if (lat >= -34.3 && lat <= -32.9 && lon >= -71.0 && lon <= -69.9) return 'Metropolitana';
  return 'Centro';
}

/* "−33,45" y "−33.45" valen lo mismo. Descarta lo que no cabe en Chile. */
export function parsearNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : NaN;
  const texto = String(valor ?? '').trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(texto) ? Number(texto) : NaN;
}

function claveCombustible(nombreLargo) {
  const nombre = limpiar(nombreLargo);
  const gasolina = nombre.match(/^gasolina\s*(93|95|97)\b/);
  if (gasolina) return gasolina[1];
  if (/diesel/.test(nombre)) return 'diesel';
  return null;
}

const PRECIO_MIN = 300;
const PRECIO_MAX = 5000;

export function normalizarEstaciones(raw) {
  const lista = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  const salida = [];
  for (const item of lista) {
    if (!item || item.en_mantenimiento_bandera) continue;
    const lat = parsearNumero(item.latitud), lon = parsearNumero(item.longitud);
    if (!(lat >= -57 && lat <= -17 && lon >= -110 && lon <= -65)) continue;
    const zona = zonaDeRegion(item.region);
    if (!zona) continue;
    const precios = {};
    for (const comb of item.combustibles || []) {
      if (comb.suministra === 0) continue;
      const clave = claveCombustible(comb.nombre_largo);
      const precio = parsearNumero(comb.precio);
      if (!clave || !(precio >= PRECIO_MIN && precio <= PRECIO_MAX)) continue;
      const fecha = comb.precio_fecha || comb.updated_at || null;
      if (!precios[clave] || String(fecha) > String(precios[clave].fecha)) precios[clave] = { precio, fecha };
    }
    if (!Object.keys(precios).length) continue;
    salida.push({
      id: item.id,
      marca: item.marca,
      direccion: String(item.direccion ?? '').trim(),
      comuna: String(item.comuna ?? '').trim(),
      region: String(item.region ?? '').trim(),
      zona, lat, lon, precios
    });
  }
  return salida;
}

export function mediana(numeros) {
  const orden = numeros.filter(Number.isFinite).sort((a, b) => a - b);
  if (!orden.length) return null;
  const medio = orden.length >> 1;
  return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
}

/* → { Norte: { '93': { mediana, n }, ... }, ... }. La mediana ignora los errores de digitación que inflan el promedio. */
export function medianaPorZona(estaciones) {
  const resultado = {};
  for (const zona of ZONAS) {
    resultado[zona] = {};
    for (const comb of COMBUSTIBLES) {
      const valores = estaciones.filter(e => e.zona === zona && e.precios[comb]).map(e => e.precios[comb].precio);
      const m = mediana(valores);
      if (m !== null) resultado[zona][comb] = { mediana: Math.round(m), n: valores.length };
    }
  }
  return resultado;
}

export function distanciaKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* Estación más cercana que vende `combustible` (o cualquiera si es null).
   Con `medianas` descarta precios a más de 25 % de la mediana de su zona (errores de digitación). */
export function estacionMasCercana(estaciones, lat, lon, combustible = null, opciones = {}) {
  const { maxKm = Infinity, medianas = null, tolerancia = 0.25 } = opciones;
  let mejor = null;
  for (const e of estaciones) {
    if (combustible) {
      const p = e.precios[combustible];
      if (!p) continue;
      const ref = medianas?.[e.zona]?.[combustible]?.mediana;
      if (ref && Math.abs(p.precio - ref) / ref > tolerancia) continue;
    }
    const d = distanciaKm({ lat, lon }, e);
    if (d <= maxKm && (!mejor || d < mejor.distanciaKm)) mejor = { estacion: e, distanciaKm: d };
  }
  return mejor && {
    ...mejor,
    precio: combustible ? mejor.estacion.precios[combustible].precio : null,
    fecha: combustible ? mejor.estacion.precios[combustible].fecha : null
  };
}
