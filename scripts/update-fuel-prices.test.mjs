import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, extractPrices } from './update-fuel-prices.mjs';

test('lee comillas, comas y CRLF del archivo oficial', () => {
  const rows = parseCsv('zona_geografica_nombre,precio_promedio,extra\r\n"Metropolitana",1575.4,"1,8"\r\n');
  assert.deepEqual(rows, [{ zona_geografica_nombre: 'Metropolitana', precio_promedio: '1575.4', extra: '1,8' }]);
});

test('rechaza datos incompletos en vez de publicar un precio erróneo', () => {
  assert.throws(() => extractPrices([]), /Falta Gasolina 93/);
});

test('separa el precio por octanaje aunque el nombre corto varíe', () => {
  const rows = ['Zona Norte', 'Zona Centro', 'Metropolitana', 'Zona Sur'].flatMap(name => ['93', '95', '97'].map(grade => ({
    zona_geografica_nombre: name, combustible_nombre_corto: grade === '95' ? 'A95' : grade,
    combustible_nombre_largo: `Gasolina ${grade}`, unidad_cobro_nombre_corto: '$/L',
    precio_promedio: String(1000 + Number(grade)), precio_min: '1000', precio_max: '1200'
  })));
  const data = extractPrices(rows, '2026-11-13T00:00:00.000Z');
  assert.equal(data.zones[2].prices['95'].average, 1095);
  assert.equal(data.zones[2].prices['97'].average, 1097);
});
