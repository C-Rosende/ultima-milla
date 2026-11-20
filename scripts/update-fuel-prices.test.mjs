import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { construirPrecios, SOURCE } from './update-fuel-prices.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/estaciones-mini.json', import.meta.url), 'utf8'));

test('escribe medianas por zona de 93, 95, 97 y diésel con fecha, sin red', () => {
  const datos = construirPrecios(fixture, '2026-11-19T00:00:00.000Z', { minEstaciones: 10 });
  assert.equal(datos.source, SOURCE);
  assert.equal(datos.fetchedAt, '2026-11-19T00:00:00.000Z');
  assert.equal(datos.unit, 'CLP/L');
  for (const zona of ['Norte', 'Centro', 'Metropolitana', 'Sur']) {
    for (const combustible of ['93', '95', '97', 'diesel']) {
      const m = datos.zonas[zona][combustible];
      assert.ok(m.mediana > 1000 && m.mediana < 2500, `${zona} ${combustible}: ${m?.mediana}`);
      assert.ok(m.n >= 1);
    }
  }
});

test('el error de digitación del fixture (97 a 16.710) no infla la mediana', () => {
  const datos = construirPrecios(fixture, '2026-11-19T00:00:00.000Z', { minEstaciones: 10 });
  assert.ok(datos.zonas.Metropolitana['97'].mediana < 2500);
});

test('rechaza una respuesta corta en vez de publicar un precio erróneo', () => {
  assert.throws(() => construirPrecios(fixture), /al menos 500/);
  assert.throws(() => construirPrecios({ data: [] }, undefined, { minEstaciones: 1 }), /Solo 0 estaciones/);
});

test('rechaza si falta un combustible en una zona', () => {
  const soloRm = { data: fixture.data.filter(s => s.region.includes('Metropolitana')) };
  assert.throws(() => construirPrecios(soloRm, undefined, { minEstaciones: 1 }), /Falta .* en Norte/);
});
