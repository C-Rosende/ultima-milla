import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizarEstaciones, medianaPorZona, mediana, zonaDeRegion, ZONA_DE_REGION, estacionMasCercana, distanciaKm, zonaAproximada, parsearNumero } from './precios.js';

const fixture = JSON.parse(readFileSync(new URL('../scripts/fixtures/estaciones-mini.json', import.meta.url), 'utf8'));
const est = normalizarEstaciones(fixture);

test('lee coordenadas con coma decimal y nombres cortos distintos (A93, ADI)', () => {
  const bruto = { data: [
    { id: 1, marca: 5, direccion: 'A', latitud: '-33,4489', longitud: '-70,6693', region: 'Metropolitana de Santiago', comuna: 'Santiago', combustibles: [
      { nombre_corto: 'A93', nombre_largo: 'Gasolina 93', suministra: 1, precio: '1539.000', precio_fecha: '2026-11-19 08:00:00' },
      { nombre_corto: 'ADI', nombre_largo: 'Petroleo Diesel', suministra: 1, precio: '1460.000', precio_fecha: '2026-11-19 08:00:00' },
      { nombre_corto: 'KE', nombre_largo: 'Kerosene', suministra: 1, precio: '900.000', precio_fecha: '2026-11-19 08:00:00' }] },
    { id: 2, marca: 4, direccion: 'B', latitud: '-33.40', longitud: '-70.60', region: 'Metropolitana de Santiago', comuna: 'Providencia', combustibles: [
      { nombre_corto: '93', nombre_largo: 'Gasolina 93', suministra: 1, precio: '1545', precio_fecha: '2026-11-19 09:00:00' },
      { nombre_corto: 'DI', nombre_largo: 'Petróleo Diésel', suministra: 1, precio: '1470', precio_fecha: '2026-11-19 09:00:00' }] }
  ] };
  const r = normalizarEstaciones(bruto);
  assert.equal(r.length, 2);
  assert.equal(r[0].lat, -33.4489);
  assert.equal(r[0].precios['93'].precio, 1539);
  assert.equal(r[0].precios.diesel.precio, 1460);
  assert.equal(r[1].precios.diesel.precio, 1470);
  assert.deepEqual(Object.keys(r[0].precios).sort(), ['93', 'diesel']);
});

test('descarta precios absurdos, coordenadas fuera de Chile y estaciones en mantención', () => {
  const r = normalizarEstaciones([
    { id: 1, latitud: '-33.4', longitud: '-70.6', region: 'Metropolitana de Santiago', combustibles: [{ nombre_largo: 'Gasolina 97', suministra: 1, precio: '16710' }, { nombre_largo: 'Gasolina 93', suministra: 1, precio: '1540' }] },
    { id: 2, latitud: '33.4', longitud: '-70.6', region: 'Metropolitana de Santiago', combustibles: [{ nombre_largo: 'Gasolina 93', suministra: 1, precio: '1540' }] },
    { id: 3, latitud: '-33.4', longitud: '-70.6', region: 'Metropolitana de Santiago', en_mantenimiento_bandera: 1, combustibles: [{ nombre_largo: 'Gasolina 93', suministra: 1, precio: '1540' }] }
  ]);
  assert.equal(r.length, 1);
  assert.deepEqual(Object.keys(r[0].precios), ['93']);
});

test('la mediana ignora los errores de digitación que inflan el promedio', () => {
  assert.equal(mediana([1650, 1655, 1660, 16710, 1645]), 1655);
  const lista = [1500, 1510, 1520, 1530, 17749].map((precio, i) => ({ zona: 'Centro', precios: { 97: { precio } }, id: i }));
  const m = medianaPorZona(lista);
  assert.equal(m.Centro['97'].mediana, 1520);
  assert.equal(m.Centro['97'].n, 5);
  const promedio = lista.reduce((t, e) => t + e.precios[97].precio, 0) / lista.length;
  assert.ok(promedio > 4000);
});

test('región a zona: las 16 regiones, también con tildes rotas', () => {
  const casos = { 'Arica y Parinacota': 'Norte', 'Tarapacá': 'Norte', 'Antofagasta': 'Norte', 'Atacama': 'Norte', 'Coquimbo': 'Norte',
    'Valparaíso': 'Centro', "Del Libertador Gral. Bernardo O'Higgins": 'Centro', 'Del Maule': 'Centro', 'Ñuble': 'Centro', 'Del Biobío': 'Centro',
    'Metropolitana de Santiago': 'Metropolitana',
    'De la Araucanía': 'Sur', 'De los Ríos': 'Sur', 'De los Lagos': 'Sur', 'Aysén del Gral. Carlos Ibáñez del Campo': 'Sur', 'Magallanes y de la Antártica Chilena': 'Sur' };
  for (const [region, zona] of Object.entries(casos)) {
    assert.equal(zonaDeRegion(region), zona, region);
    assert.equal(zonaDeRegion(region.replace(/[áéíóúñÁÉÍÓÚÑ]/g, '�')), zona, `${region} con tildes rotas`);
  }
  assert.equal(Object.keys(ZONA_DE_REGION).length, 16);
  assert.equal(zonaDeRegion('Región inventada'), null);
});

test('estación más cercana por haversine, con el combustible pedido', () => {
  const santiago = estacionMasCercana(est, -33.4489, -70.6693, '93');
  assert.equal(santiago.estacion.zona, 'Metropolitana');
  assert.ok(santiago.distanciaKm < 5);
  const antofagasta = estacionMasCercana(est, -23.65, -70.40, '93');
  assert.equal(antofagasta.estacion.zona, 'Norte');
  assert.equal(antofagasta.estacion.comuna, 'Antofagasta');
  const temuco = estacionMasCercana(est, -38.7359, -72.5904, 'diesel');
  assert.equal(temuco.estacion.zona, 'Sur');
  assert.equal(temuco.estacion.comuna, 'Temuco');
  assert.equal(estacionMasCercana(est, -23.65, -70.40, '93', { maxKm: 0.001 }), null);
});

test('la estación con un precio absurdo no se elige si se pasan las medianas', () => {
  const medianas = medianaPorZona(est);
  const a = estacionMasCercana(est, -33.4489, -70.6693, '97', { medianas });
  assert.ok(a.precio < 3000);
});

test('distancia y zona aproximada sin red', () => {
  assert.ok(Math.abs(distanciaKm({ lat: -33.45, lon: -70.66 }, { lat: -33.45, lon: -70.56 }) - 9.3) < 0.2);
  assert.equal(zonaAproximada(-33.45, -70.66), 'Metropolitana');
  assert.equal(zonaAproximada(-23.65, -70.4), 'Norte');
  assert.equal(zonaAproximada(-38.74, -72.59), 'Sur');
  assert.equal(zonaAproximada(-33.04, -71.61), 'Centro');
  assert.ok(Number.isNaN(parsearNumero('abc')));
});
