import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acumularPunto, medicionVacia, medirRecorrido } from './ubicacion.js';

const P = JSON.parse(readFileSync(new URL('../data/parametros.json', import.meta.url), 'utf8'));
const t0 = Date.parse('2026-11-19T12:00:00Z');
const punto = (lat, lon, seg, precision = 10) => ({ lat, lon, precision, t: t0 + seg * 1000 });

test('suma km reales entre puntos con buena precisión', () => {
  let m = medicionVacia();
  m = acumularPunto(m, punto(-33.4500, -70.6600, 0), P);
  m = acumularPunto(m, punto(-33.4455, -70.6600, 60), P);
  m = acumularPunto(m, punto(-33.4410, -70.6600, 120), P);
  assert.ok(Math.abs(m.km - 1.0) < 0.02, `km ${m.km}`);
  assert.equal(m.aceptados, 3);
});

test('descarta puntos con precisión peor que el mínimo', () => {
  let m = acumularPunto(medicionVacia(), punto(-33.45, -70.66, 0), P);
  m = acumularPunto(m, punto(-33.44, -70.66, 30, 120), P);
  assert.equal(m.km, 0);
  assert.equal(m.descartados, 1);
  assert.equal(m.motivo, 'precision');
});

test('descarta saltos imposibles de velocidad', () => {
  let m = acumularPunto(medicionVacia(), punto(-33.45, -70.66, 0), P);
  m = acumularPunto(m, punto(-33.35, -70.66, 10), P);
  assert.equal(m.km, 0);
  assert.equal(m.motivo, 'salto');
});

test('el temblor estando quieto no suma, pero el avance lento sí se acumula', () => {
  let m = acumularPunto(medicionVacia(), punto(-33.45, -70.66, 0), P);
  m = acumularPunto(m, punto(-33.45003, -70.66, 5), P);
  assert.equal(m.km, 0);
  assert.equal(m.motivo, 'quieto');
  for (let i = 1; i <= 6; i++) m = acumularPunto(m, punto(-33.45 + i * 0.00003, -70.66, 5 + i * 10), P);
  assert.ok(m.km > 0.015);
});

test('medirRecorrido usa watchPosition, suma y se detiene', () => {
  let callback, limpiado = null;
  const nav = { geolocation: { watchPosition: cb => { callback = cb; return 7; }, clearWatch: id => { limpiado = id; } } };
  const cambios = [];
  const medidor = medirRecorrido(P, { nav, onCambio: m => cambios.push(m.km) });
  callback({ coords: { latitude: -33.45, longitude: -70.66, accuracy: 8 }, timestamp: t0 });
  callback({ coords: { latitude: -33.4455, longitude: -70.66, accuracy: 8 }, timestamp: t0 + 60000 });
  const final = medidor.detener();
  assert.equal(limpiado, 7);
  assert.ok(Math.abs(final.km - 0.5) < 0.02);
  assert.equal(cambios.length, 2);
});

test('sin GPS avisa por onError y no falla', () => {
  let error;
  const medidor = medirRecorrido(P, { nav: {}, onError: e => { error = e; } });
  assert.equal(error.code, 0);
  assert.equal(medidor.detener().km, 0);
});
