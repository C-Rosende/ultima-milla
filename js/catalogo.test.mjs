import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agrupar, buscar, validarVehiculoPropio, CATEGORIAS, nombreVehiculo } from './catalogo.js';
import { consumoReal } from './costos.js';

const leer = ruta => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'));
const P = leer('../data/parametros.json');
const { vehiculos } = leer('../data/vehiculos.json');

test('agrupa en las cinco categorías', () => {
  const g = agrupar(vehiculos);
  assert.deepEqual(Object.keys(g), CATEGORIAS.map(c => c.id));
  assert.equal(g.bici.length, 1);
});

test('busca por marca o modelo sin tildes ni mayúsculas', () => {
  assert.ok(buscar(vehiculos, 'HONDA cb125').some(v => v.id === 'honda-cb125f-twister'));
  assert.ok(buscar(vehiculos, 'xiaomi 6 pro', 'scooter').length >= 1);
  assert.equal(buscar(vehiculos, 'zzzz').length, 0);
  assert.equal(nombreVehiculo(vehiculos.find(v => v.id === 'honda-cb125f-twister')), 'Honda CB125F Twister');
});

test('vehículo propio auto o moto: km/L y combustible según la categoría', () => {
  const ok = validarVehiculoPropio({ categoria: 'auto', marca: 'Kia', modelo: 'Rio', consumo: '12,5', combustible: 'diesel' }, P);
  assert.equal(ok.ok, true);
  assert.equal(ok.vehiculo.energia, 'diesel');
  assert.equal(consumoReal(ok.vehiculo, P), 12.5);
  const moto = validarVehiculoPropio({ categoria: 'moto', marca: 'Honda', modelo: 'Navi', consumo: '40', combustible: 'diesel' }, P);
  assert.equal(moto.ok, false);
  assert.ok(moto.errores.combustible);
  const sinConsumo = validarVehiculoPropio({ categoria: 'moto', marca: 'Honda', modelo: 'Navi', combustible: '93' }, P);
  assert.ok(sinConsumo.errores.consumo);
});

test('vehículo propio eléctrico: km/kWh directo, o batería más autonomía con factor de autonomía declarada', () => {
  const directo = validarVehiculoPropio({ categoria: 'scooter', marca: 'Xiaomi', modelo: 'X', consumo: '80' }, P);
  assert.equal(directo.ok, true);
  assert.equal(consumoReal(directo.vehiculo, P), 80);
  const bateria = validarVehiculoPropio({ categoria: 'bici-electrica', marca: 'Oxford', modelo: 'E', consumo: '', bateriaKwh: '0,5', autonomiaKm: '40' }, P);
  assert.equal(bateria.ok, true);
  assert.equal(bateria.vehiculo.consumo, 80);
  assert.ok(Math.abs(consumoReal(bateria.vehiculo, P) - 56) < 1e-9);
  const incompleto = validarVehiculoPropio({ categoria: 'scooter', marca: 'A', modelo: 'B', consumo: '' }, P);
  assert.equal(incompleto.ok, false);
});

test('bici propia: solo mantención, sin energía ni marca obligatoria', () => {
  const r = validarVehiculoPropio({ categoria: 'bici', mantencionKm: '15' }, P);
  assert.equal(r.ok, true);
  assert.equal(r.vehiculo.energia, 'ninguna');
  assert.equal(r.vehiculo.mantencionKm, 15);
  const sin = validarVehiculoPropio({ categoria: 'bici' }, P);
  assert.equal(sin.vehiculo.mantencionKm, null);
  const mala = validarVehiculoPropio({ categoria: 'bici', mantencionKm: '99999' }, P);
  assert.ok(mala.errores.mantencionKm);
});
