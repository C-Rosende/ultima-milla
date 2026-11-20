import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { consumoReal, costoPorKm, estimarOfertaManual, calcularPedido, mantencionKm } from './costos.js';

const P = JSON.parse(readFileSync(new URL('../data/parametros.json', import.meta.url), 'utf8'));
const { vehiculos } = JSON.parse(readFileSync(new URL('../data/vehiculos.json', import.meta.url), 'utf8'));
const porId = id => vehiculos.find(v => v.id === id);
const ajustes = { datosMes: P.gastosMensuales.datosMoviles, horasMes: P.gastosMensuales.horasTrabajo, meta: P.luis.metaPorHora };

test('caso ancla del pitch: CB125F, bencina a 1576, oferta 4100 y 3,2 km', () => {
  const luis = porId(P.luis.vehiculoId);
  assert.equal(luis.modelo, 'CB125F Twister');
  const oferta = estimarOfertaManual(4100, 3.2, P);
  assert.deepEqual([oferta.returnKm, oferta.minutes, oferta.waitMin], [1.6, 28, 12]);
  const r = calcularPedido(oferta, luis, { precio: 1576 }, ajustes, P);
  assert.ok(Math.abs(r.net - 3760) <= 5, `neto ${r.net}`);
  assert.ok(Math.abs(r.hourly - 5640) <= 15, `por hora ${r.hourly}`);
  assert.equal(r.signal, 'green');
});

test('consumo real: autos sin factor, motos 0,85 y scooters 0,70', () => {
  assert.equal(consumoReal(porId('honda-cb125f-twister'), P), 45 * 0.85);
  const auto = vehiculos.find(v => v.categoria === 'auto');
  assert.equal(consumoReal(auto, P), auto.consumo);
  const scooter = porId('xiaomi-electric-scooter-6');
  assert.ok(Math.abs(consumoReal(scooter, P) - scooter.consumo * 0.7) < 1e-9);
});

test('el scooter usa electricidad: km/kWh real y costo por km con el precio de la luz', () => {
  const scooter = porId('xiaomi-electric-scooter-6');
  assert.equal(scooter.energia, 'electricidad');
  assert.equal(scooter.unidad, 'km/kWh');
  const c = costoPorKm(scooter, { precio: 240 }, P);
  assert.ok(Math.abs(c.energiaKm - 240 / (scooter.consumo * 0.7)) < 1e-9);
  assert.equal(c.mantencionKm, P.mantencionKm.scooter);
});

test('bici sin motor: la energía cuesta 0 aunque llegue un precio', () => {
  const bici = vehiculos.find(v => v.categoria === 'bici');
  assert.equal(bici.energia, 'ninguna');
  assert.equal(consumoReal(bici, P), null);
  const c = costoPorKm(bici, { precio: 1500 }, P);
  assert.equal(c.energiaKm, 0);
  assert.equal(c.mantencionKm, 13.8);
  const r = calcularPedido(estimarOfertaManual(3000, 3, P), bici, null, ajustes, P);
  assert.equal(r.energia, 0);
  assert.equal(r.net, r.gross - r.mantencion - r.datos);
});

test('mantención propia manda sobre la de la categoría', () => {
  assert.equal(mantencionKm({ categoria: 'moto', mantencionKm: 30 }, P), 30);
  assert.equal(mantencionKm({ categoria: 'moto', mantencionKm: null }, P), 20.7);
});

test('catálogo: 21 autos (15 del top y 6 citycars), 15 motos, 15 scooters, 6 bicis eléctricas y 1 bici', () => {
  const n = c => vehiculos.filter(v => v.categoria === c).length;
  assert.equal(n('auto'), 21);
  assert.equal(n('moto'), 15);
  assert.equal(n('scooter'), 15);
  assert.equal(n('bici-electrica'), 6);
  assert.equal(n('bici'), 1);
  for (const nombre of ['Swift', 'Yaris', 'Accent', 'Morning', 'Celerio', 'Versa']) assert.ok(vehiculos.some(v => v.modelo.includes(nombre)), nombre);
  const campos = ['id', 'categoria', 'marca', 'modelo', 'energia', 'combustible', 'consumo', 'unidad', 'consumoTipo', 'mantencionKm', 'fuenteRanking', 'fuenteConsumo', 'estimado', 'nota'];
  for (const v of vehiculos) {
    for (const campo of campos) assert.ok(campo in v, `${v.id} sin ${campo}`);
    assert.ok(P.factorConsumo[v.consumoTipo] !== undefined, `${v.id}: consumoTipo ${v.consumoTipo}`);
    if (v.categoria === 'auto' || v.categoria === 'moto') assert.equal(v.energia, 'gasolina');
    if (v.categoria === 'scooter' || v.categoria === 'bici-electrica') assert.equal(v.energia, 'electricidad');
  }
  assert.equal(new Set(vehiculos.map(v => v.id)).size, vehiculos.length);
});

test('un pedido deficitario nunca aparece como conveniente', () => {
  const r = calcularPedido({ gross: 100, km: 30, returnKm: 0, minutes: 60, waitMin: 0 }, porId('honda-navi'), { precio: 1600 }, ajustes, P);
  assert.ok(r.net < 0);
  assert.equal(r.signal, 'red');
});

test('la espera baja el ingreso por hora y puede cambiar la señal', () => {
  const bici = vehiculos.find(v => v.categoria === 'bici');
  const base = estimarOfertaManual(4100, 3.2, P);
  const rapido = calcularPedido({ ...base, waitMin: 0 }, bici, null, ajustes, P);
  const lento = calcularPedido({ ...base, waitMin: 35 }, bici, null, ajustes, P);
  assert.ok(lento.hourly < rapido.hourly);
  assert.equal(rapido.signal, 'green');
  assert.equal(lento.signal, 'red');
});

test('los cuatro ejemplos rápidos dan verde, amarillo, rojo y la trampa rinde menos que el bueno', () => {
  const luis = porId(P.luis.vehiculoId);
  const r = Object.fromEntries(P.ejemplos.map(ex => [ex.id, calcularPedido({ ...estimarOfertaManual(ex.gross, ex.km, P), ...(ex.waitMin ? { waitMin: ex.waitMin } : {}) }, luis, { precio: 1539 }, ajustes, P)]));
  assert.deepEqual([r.bueno.signal, r.justo.signal, r.malo.signal], ['green', 'yellow', 'red']);
  assert.ok(r.trampa.gross > r.bueno.gross && r.trampa.hourly < r.bueno.hourly);
});

test('estimarCarga: costo y tiempo de la próxima carga salen de costos.js', async () => {
  const { estimarCarga } = await import('./costos.js');
  const P = { electricidad: { eficienciaCarga: 0.9 } };
  const r = estimarCarga({ bateriaKwh: 0.45, inicioPct: 20, finPct: 80, cargadorKw: 0.1 }, { precio: 240 }, P);
  assert.equal(Math.round(r.kwh * 1000), 300);
  assert.equal(r.costo, 72);
  assert.equal(estimarCarga({ bateriaKwh: 0, inicioPct: 20, finPct: 80, cargadorKw: 1 }, { precio: 240 }, P), null);
});
