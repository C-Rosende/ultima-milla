/* Energía: el ÚNICO módulo que la interfaz consulta para precios de combustible y electricidad.
   Orden de fuentes para combustibles: ajuste manual, estación más cercana (GPS), mediana de la zona
   (estaciones en vivo, luego fuel-prices.json) y, al final, el respaldo de data/parametros.json.
   El ajuste manual vive en UN solo campo de estado: ctx.manual. */

import { ZONAS, normalizarEstaciones, medianaPorZona, estacionMasCercana, zonaAproximada } from './precios.js';

const ETIQUETAS = { '93': 'Bencina 93', '95': 'Bencina 95', '97': 'Bencina 97', diesel: 'Diésel', electricidad: 'Electricidad' };

let ctx = null;

export function iniciarEnergia(parametros, deps = {}) {
  ctx = {
    p: parametros,
    fetchFn: deps.fetchFn ?? ((...a) => globalThis.fetch(...a)),
    storage: deps.storage ?? (() => { try { return globalThis.localStorage; } catch { return null; } })(),
    ahora: deps.ahora ?? (() => Date.now()),
    urlCopia: deps.urlCopia ?? './fuel-prices.json',
    estaciones: null, medianas: null, zonal: null,
    fuente: 'respaldo', fechaDatos: null,
    ubicacion: { lat: null, lon: null, zona: parametros.zonaPorDefecto, origen: 'defecto', region: null },
    manual: {},
    version: 0, memo: new Map(), cargando: null
  };
  return ctx;
}

const requerir = () => { if (!ctx) throw new Error('Falta llamar a iniciarEnergia().'); return ctx; };
const cambio = () => { ctx.version++; ctx.memo.clear(); };

/* ---------- Caché con campos reducidos ---------- */
const reducir = e => [e.id, e.marca, e.direccion, e.comuna, e.region, ZONAS.indexOf(e.zona), e.lat, e.lon, Object.fromEntries(Object.entries(e.precios).map(([k, v]) => [k, [v.precio, v.fecha]]))];
const expandir = r => ({ id: r[0], marca: r[1], direccion: r[2], comuna: r[3], region: r[4], zona: ZONAS[r[5]], lat: r[6], lon: r[7], precios: Object.fromEntries(Object.entries(r[8]).map(([k, v]) => [k, { precio: v[0], fecha: v[1] }])) });

function leerCache() {
  try {
    const crudo = ctx.storage?.getItem(ctx.p.estaciones.claveCache);
    const dato = crudo ? JSON.parse(crudo) : null;
    if (dato && Array.isArray(dato.e) && dato.e.length >= ctx.p.estaciones.minimoValidas && Number.isFinite(dato.t)) return { t: dato.t, estaciones: dato.e.map(expandir) };
  } catch { /* caché dañada: se ignora */ }
  return null;
}
function guardarCache(estaciones) {
  try { ctx.storage?.setItem(ctx.p.estaciones.claveCache, JSON.stringify({ t: ctx.ahora(), e: estaciones.map(reducir) })); } catch { /* sin espacio: no es grave */ }
}

/* Edad típica de los precios de cada zona: la fecha mediana de las estaciones, no la hora en que se descargó la lista. */
function fechaTipicaPorZona(estaciones) {
  const resultado = {};
  for (const zona of ZONAS) {
    const tiempos = estaciones.filter(e => e.zona === zona).flatMap(e => Object.values(e.precios).map(p => Date.parse(String(p.fecha).replace(' ', 'T')))).filter(Number.isFinite).sort((a, b) => a - b);
    if (tiempos.length) resultado[zona] = new Date(tiempos[tiempos.length >> 1]).toISOString();
  }
  return resultado;
}

function usarEstaciones(estaciones, fuente, instante) {
  ctx.estaciones = estaciones;
  ctx.medianas = medianaPorZona(estaciones);
  ctx.fechasZona = fechaTipicaPorZona(estaciones);
  ctx.fuente = fuente;
  ctx.fechaDatos = instante;
  recalcularZona();
  cambio();
}

async function pedirJson(url, ms) {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), ms);
  try {
    const r = await ctx.fetchFn(url, { signal: control.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

/* Carga estaciones (caché vigente, red, caché vieja) y, si nada sirve, la copia fuel-prices.json. Nunca lanza. */
export function cargarPrecios() {
  const c = requerir();
  if (c.cargando) return c.cargando;
  c.cargando = (async () => {
    const cache = leerCache();
    const ttl = c.p.estaciones.ttlCacheMin * 60000;
    if (cache && c.ahora() - cache.t < ttl) { usarEstaciones(cache.estaciones, 'cache', cache.t); return estadoEnergia(); }
    try {
      const estaciones = normalizarEstaciones(await pedirJson(c.p.estaciones.url, c.p.estaciones.tiempoEsperaMs));
      if (estaciones.length < c.p.estaciones.minimoValidas) throw new Error('Respuesta de estaciones incompleta');
      guardarCache(estaciones);
      usarEstaciones(estaciones, 'red', c.ahora());
      return estadoEnergia();
    } catch { /* sigue con lo que haya */ }
    if (cache) { usarEstaciones(cache.estaciones, 'cache-vieja', cache.t); return estadoEnergia(); }
    try {
      const copia = await pedirJson(c.urlCopia, c.p.estaciones.tiempoEsperaMs);
      if (copia?.zonas && ZONAS.every(z => copia.zonas[z])) {
        c.zonal = copia; c.fuente = 'copia'; c.fechaDatos = Date.parse(copia.fetchedAt) || null;
        cambio();
      }
    } catch { /* queda el respaldo de parametros.json */ }
    return estadoEnergia();
  })().finally(() => { c.cargando = null; });
  return c.cargando;
}

/* ---------- Ubicación y zona ---------- */
function recalcularZona() {
  const u = ctx.ubicacion;
  if (u.origen !== 'gps' || u.lat === null) return;
  const cerca = ctx.estaciones && estacionMasCercana(ctx.estaciones, u.lat, u.lon, null, { maxKm: ctx.p.estaciones.distanciaMaxKm });
  if (cerca) { u.zona = cerca.estacion.zona; u.region = cerca.estacion.region; }
  else { u.zona = zonaAproximada(u.lat, u.lon); u.region = null; }
}

export function fijarUbicacion({ lat, lon }) {
  const c = requerir();
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  c.ubicacion = { lat, lon, zona: c.ubicacion.zona, origen: 'gps', region: null };
  recalcularZona();
  cambio();
  return { zona: c.ubicacion.zona, region: c.ubicacion.region };
}

export function fijarZona(zona) {
  const c = requerir();
  if (!ZONAS.includes(zona)) return;
  c.ubicacion = { lat: null, lon: null, zona, origen: 'manual', region: null };
  cambio();
}

export const ubicacionActual = () => ({ ...requerir().ubicacion });

/* ---------- Ajuste manual: un solo campo de estado ---------- */
export function fijarManual(clave, precio) {
  const c = requerir();
  if (!(clave in ETIQUETAS)) return;
  if (precio === null || precio === undefined) delete c.manual[clave];
  else if (Number.isFinite(precio) && precio > 0) c.manual[clave] = Math.round(precio * 10) / 10;
  cambio();
}
export const manualActual = () => ({ ...requerir().manual });
export const exportarEstado = () => { const c = requerir(); return { manual: { ...c.manual }, zonaManual: c.ubicacion.origen === 'manual' ? c.ubicacion.zona : null }; };
export function restaurarEstado(estado) {
  const c = requerir();
  c.manual = {};
  for (const [k, v] of Object.entries(estado?.manual ?? {})) if (k in ETIQUETAS && Number.isFinite(v) && v > 0) c.manual[k] = v;
  c.ubicacion = { lat: null, lon: null, zona: c.p.zonaPorDefecto, origen: 'defecto', region: null };
  if (ZONAS.includes(estado?.zonaManual)) c.ubicacion = { lat: null, lon: null, zona: estado.zonaManual, origen: 'manual', region: null };
  recalcularZona();
  cambio();
}

/* ---------- Consulta ---------- */
export function clavePrecio(vehiculo) {
  if (!vehiculo || vehiculo.energia === 'ninguna') return null;
  if (vehiculo.energia === 'electricidad') return 'electricidad';
  if (vehiculo.energia === 'diesel') return 'diesel';
  return vehiculo.combustible || requerir().p.combustiblePorDefecto[vehiculo.categoria] || '93';
}

export function nombreEstacion(estacion) {
  const c = requerir();
  const marca = c.p.estaciones.marcas[String(estacion.marca)] ?? 'Estación';
  const titulo = t => String(t).toLowerCase().replace(/(^|[\s.\-/])([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase());
  return `${marca} ${titulo(estacion.direccion)}`.trim();
}

export function precioPara(vehiculo, ubicacion = null) {
  const c = requerir();
  const clave = clavePrecio(vehiculo);
  if (!clave) return null;
  const ub = ubicacion ? { ...c.ubicacion, ...ubicacion } : c.ubicacion;
  const zona = ZONAS.includes(ub.zona) ? ub.zona : c.p.zonaPorDefecto;
  const llave = `${clave}|${zona}|${ub.lat?.toFixed?.(3) ?? ''}|${ub.lon?.toFixed?.(3) ?? ''}|${c.manual[clave] ?? ''}|${c.version}`;
  if (c.memo.has(llave)) return c.memo.get(llave);
  const resultado = resolver(clave, zona, ub);
  c.memo.set(llave, resultado);
  return resultado;
}

function resolver(clave, zona, ub) {
  const c = ctx;
  const base = { etiqueta: ETIQUETAS[clave], clave, unidad: clave === 'electricidad' ? 'kWh' : 'L', zona };
  if (c.manual[clave]) return { ...base, precio: c.manual[clave], origen: 'manual', fecha: null };

  if (clave === 'electricidad') {
    const dato = c.p.electricidad.porZona[zona] ?? c.p.electricidad.porZona[c.p.zonaPorDefecto];
    return { ...base, precio: dato.precio, origen: 'respaldo', fecha: null, estimado: true, referencia: dato.referencia ?? null, nota: dato.nota };
  }

  if (c.estaciones && Number.isFinite(ub.lat) && Number.isFinite(ub.lon)) {
    const cerca = estacionMasCercana(c.estaciones, ub.lat, ub.lon, clave, { maxKm: c.p.estaciones.distanciaMaxKm, medianas: c.medianas, tolerancia: c.p.estaciones.toleranciaAtipico });
    if (cerca) {
      const e = cerca.estacion;
      return { ...base, zona: e.zona, precio: cerca.precio, origen: 'estación más cercana', fecha: cerca.fecha, estacion: { nombre: nombreEstacion(e), comuna: e.comuna, distanciaKm: cerca.distanciaKm } };
    }
  }
  const viva = c.medianas?.[zona]?.[clave]?.mediana;
  if (viva) return { ...base, precio: viva, origen: 'mediana de tu zona', fecha: c.fechasZona?.[zona] ?? null };
  const copia = c.zonal?.zonas?.[zona]?.[clave];
  const valorCopia = typeof copia === 'object' ? copia?.mediana : copia;
  if (valorCopia) return { ...base, precio: valorCopia, origen: 'mediana de tu zona', fecha: c.zonal.fetchedAt ?? null };
  const r = c.p.respaldoCombustible;
  return { ...base, precio: r.zonas[zona][clave], origen: 'respaldo', fecha: r.fecha };
}

/* Para sugerir la estación al registrar una carga (misma lógica de selección que precioPara). */
export function estacionCercana(lat, lon, clave) {
  const c = requerir();
  if (!c.estaciones) return null;
  const r = estacionMasCercana(c.estaciones, lat, lon, clave, { maxKm: c.p.estaciones.distanciaMaxKm, medianas: c.medianas, tolerancia: c.p.estaciones.toleranciaAtipico });
  return r && { nombre: nombreEstacion(r.estacion), comuna: r.estacion.comuna, distanciaKm: r.distanciaKm, precio: r.precio, fecha: r.fecha };
}

export function estadoEnergia() {
  const c = requerir();
  return { fuente: c.fuente, estaciones: c.estaciones?.length ?? 0, fecha: c.fechaDatos, zona: c.ubicacion.zona, origenZona: c.ubicacion.origen, region: c.ubicacion.region, version: c.version, cargando: Boolean(c.cargando) };
}
