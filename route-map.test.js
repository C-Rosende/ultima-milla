const test = require('node:test');
const assert = require('node:assert/strict');
const { layout } = require('./route-map');

test('ajusta ambos extremos de una ruta local en el mapa sin recortarlos', () => {
  const result = layout([[-70.6343, -33.4372], [-70.6125, -33.4252]]);
  assert.ok(result.zoom >= 10 && result.zoom <= 18);
  assert.ok(result.tiles.length > 0 && result.tiles.length <= 9);
  for (const point of result.points) {
    assert.ok(point.x >= 0 && point.x <= 350);
    assert.ok(point.y >= 0 && point.y <= 330);
  }
});

test('rechaza coordenadas externas malformadas antes de dibujar', () => {
  for (const coordinates of [[], [[Infinity, -33]], [[-70, NaN]], [[200, -33]], [[-70, -91]]]) {
    assert.throws(() => layout(coordinates), /Geometría de ruta inválida/);
  }
});

test('mantiene zoom solicitado dentro del rango admitido', () => {
  const route = [[-70.6343, -33.4372], [-70.633, -33.436]];
  assert.equal(layout(route, 2).zoom, 10);
  assert.equal(layout(route, 25).zoom, 18);
});
