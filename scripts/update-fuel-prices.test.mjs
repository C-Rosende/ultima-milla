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
