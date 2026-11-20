import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as energia from './energia.js';

const leer = ruta => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'));
const P0 = leer('../data/parametros.json');
const P = { ...P0, estaciones: { ...P0.estaciones, minimoValidas: 10 } };
const { vehiculos } = leer('../data/vehiculos.json');
const fixture = leer('../scripts/fixtures/estaciones-mini.json');
const moto = vehiculos.find(v => v.id === 'honda-cb125f-twister');
const scooter = vehiculos.find(v => v.categoria === 'scooter');
const bici = vehiculos.find(v => v.categoria === 'bici');

const almacenFalso = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), _m: m }; };
const respuesta = cuerpo => ({ ok: true, status: 200, json: async () => cuerpo });
const sinRed = async () => { throw new Error('sin red'); };

function iniciar({ fetchFn, storage = almacenFalso(), ahora = () => Date.parse('2026-11-19T20:00:00Z') } = {}) {
  energia.iniciarEnergia(P, { fetchFn: fetchFn ?? (async url => respuesta(String(url).includes('bencinaenlinea') ? fixture : leer('../fuel-prices.json'))), storage, ahora });
  return storage;
}

test('bici sin motor: precioPara devuelve null y no existe clave de precio', () => {
  iniciar();
  assert.equal(energia.precioPara(bici), null);
  assert.equal(energia.clavePrecio(bici), null);
});

test('electricidad por zona: 240 en la RM y referencia RM en otras zonas', () => {
  iniciar();
  const rm = energia.precioPara(scooter);
  assert.equal(rm.etiqueta, 'Electricidad');
  assert.equal(rm.unidad, 'kWh');
  assert.equal(rm.precio, 240);
  assert.equal(rm.estimado, true);
  energia.fijarZona('Sur');
  const sur = energia.precioPara(scooter);
  assert.equal(sur.referencia, 'RM');
  assert.equal(sur.zona, 'Sur');
});

test('sin red ni copia: respaldo de parametros.json', async () => {
  iniciar({ fetchFn: sinRed });
  const estado = await energia.cargarPrecios();
  assert.equal(estado.fuente, 'respaldo');
  const p = energia.precioPara(moto);
  assert.equal(p.origen, 'respaldo');
  assert.equal(p.etiqueta, 'Bencina 93');
  assert.equal(p.precio, P.respaldoCombustible.zonas.Metropolitana['93']);
});

test('sin estaciones pero con fuel-prices.json: mediana de la zona', async () => {
  const copia = { fetchedAt: '2026-11-19T12:00:00Z', zonas: Object.fromEntries(['Norte', 'Centro', 'Metropolitana', 'Sur'].map(z => [z, { 93: { mediana: 1600 }, 95: { mediana: 1650 }, 97: { mediana: 1700 }, diesel: { mediana: 1500 } }])) };
  iniciar({ fetchFn: async url => String(url).includes('bencinaenlinea') ? Promise.reject(new Error('caída')) : respuesta(copia) });
  const estado = await energia.cargarPrecios();
  assert.equal(estado.fuente, 'copia');
  const p = energia.precioPara(moto);
  assert.equal(p.origen, 'mediana de tu zona');
  assert.equal(p.precio, 1600);
});

test('con estaciones: GPS en Santiago, Antofagasta y Temuco detecta zona y estación', async () => {
  iniciar();
  const estado = await energia.cargarPrecios();
  assert.equal(estado.fuente, 'red');
  const casos = [['Santiago', -33.4489, -70.6693, 'Metropolitana'], ['Antofagasta', -23.65, -70.40, 'Norte'], ['Temuco', -38.7359, -72.5904, 'Sur']];
  for (const [nombre, lat, lon, zona] of casos) {
    const r = energia.fijarUbicacion({ lat, lon });
    assert.equal(r.zona, zona, nombre);
    const p = energia.precioPara(moto);
    assert.equal(p.origen, 'estación más cercana', nombre);
    assert.equal(p.zona, zona);
    assert.ok(p.estacion.nombre.length > 3 && p.estacion.distanciaKm < 10, `${nombre}: ${p.estacion.nombre} a ${p.estacion.distanciaKm}`);
    assert.ok(p.precio > 1300 && p.precio < 2000);
  }
});

test('sin ubicación, con estaciones: mediana de la zona elegida', async () => {
  iniciar();
  await energia.cargarPrecios();
  const p = energia.precioPara(moto);
  assert.equal(p.origen, 'mediana de tu zona');
  assert.equal(p.zona, 'Metropolitana');
});

test('el ajuste manual vive en un solo campo y gana sobre todo lo demás', async () => {
  iniciar();
  await energia.cargarPrecios();
  energia.fijarUbicacion({ lat: -33.4489, lon: -70.6693 });
  energia.fijarManual('93', 1700);
  const p = energia.precioPara(moto);
  assert.equal(p.origen, 'manual');
  assert.equal(p.precio, 1700);
  assert.deepEqual(energia.manualActual(), { 93: 1700 });
  assert.deepEqual(energia.exportarEstado().manual, { 93: 1700 });
  energia.fijarManual('93', null);
  assert.notEqual(energia.precioPara(moto).origen, 'manual');
  energia.fijarManual('electricidad', 300);
  assert.equal(energia.precioPara(scooter).precio, 300);
});

test('caché: dentro del TTL no vuelve a pedir la red, y guarda campos reducidos', async () => {
  let pedidos = 0;
  const fetchFn = async url => { if (String(url).includes('bencinaenlinea')) pedidos++; return respuesta(fixture); };
  const storage = iniciar({ fetchFn });
  await energia.cargarPrecios();
  assert.equal(pedidos, 1);
  const crudo = JSON.parse(storage._m.get(P.estaciones.claveCache));
  assert.ok(Array.isArray(crudo.e[0]) && crudo.e.length > 10);
  iniciar({ fetchFn, storage });
  const estado = await energia.cargarPrecios();
  assert.equal(pedidos, 1);
  assert.equal(estado.fuente, 'cache');
});

test('caché vencida y sin red: se usa la caché vieja antes que el respaldo', async () => {
  const storage = iniciar();
  await energia.cargarPrecios();
  const viejo = () => Date.parse('2026-11-19T20:00:00Z') + 5 * 3600000;
  iniciar({ fetchFn: sinRed, storage, ahora: viejo });
  const estado = await energia.cargarPrecios();
  assert.equal(estado.fuente, 'cache-vieja');
});

test('la estación con precio absurdo no contamina el precio de la zona', async () => {
  iniciar();
  await energia.cargarPrecios();
  const p = energia.precioPara({ ...moto, combustible: '97' });
  assert.ok(p.precio < 3000);
});

test('el diésel usa su propio precio y etiqueta', async () => {
  iniciar();
  await energia.cargarPrecios();
  const p = energia.precioPara({ ...moto, energia: 'diesel', combustible: null });
  assert.equal(p.etiqueta, 'Diésel');
  assert.equal(p.unidad, 'L');
});
