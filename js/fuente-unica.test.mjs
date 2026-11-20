import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const IGNORAR = new Set(['.git', 'node_modules']);

function archivos(dir) {
  return readdirSync(dir).flatMap(nombre => {
    if (IGNORAR.has(nombre)) return [];
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}
const TEXTO = /\.(js|mjs|json|html|css|webmanifest|yml|svg)$/;
const todos = archivos(RAIZ).filter(r => TEXTO.test(r)).map(r => ({ ruta: relative(RAIZ, r).split(sep).join('/'), texto: readFileSync(r, 'utf8') }));
const esPrueba = ruta => /\.test\.(mjs|js)$/.test(ruta);

test('los precios y constantes de energía viven solo en energia.js, parametros.json y las pruebas', () => {
  const permitidos = new Set(['js/energia.js', 'data/parametros.json']);
  const prohibido = /fuelPrice|kwhPrice|fuelGrade|priceZone|\b1576\b|\b1300\b/;
  const fuera = todos.filter(a => prohibido.test(a.texto) && !permitidos.has(a.ruta) && !esPrueba(a.ruta)).map(a => a.ruta);
  assert.deepEqual(fuera, []);
});

test('la API de estaciones solo se nombra en parametros.json y en el actualizador de Node', () => {
  const fuera = todos.filter(a => a.texto.includes('bencinaenlinea.cl/api') && !['data/parametros.json', 'scripts/update-fuel-prices.mjs', 'fuel-prices.json'].includes(a.ruta) && !esPrueba(a.ruta)).map(a => a.ruta);
  assert.deepEqual(fuera, []);
});

test('los módulos de interfaz no calculan costos ni leen precios por su cuenta', () => {
  const ui = todos.filter(a => ['js/app.js', 'js/vistas.js', 'js/estado.js'].includes(a.ruta));
  assert.equal(ui.length, 3);
  for (const a of ui) {
    assert.ok(!/calculateOffer|\/ consumo|\* mantencion/.test(a.texto), `${a.ruta} calcula costos`);
    assert.ok(!/parametros\.respaldoCombustible|electricidad\.porZona/.test(a.texto), `${a.ruta} lee precios de parametros`);
  }
});

test('el catálogo de vehículos no está duplicado en el código', () => {
  const duplicados = todos.filter(a => a.ruta.endsWith('.js') && !esPrueba(a.ruta) && /Honda CB125F|Xiaomi Electric Scooter|Chery Tiggo/.test(a.texto) && a.ruta !== 'js/vistas.js').map(a => a.ruta);
  assert.deepEqual(duplicados, []);
});

test('no hay guiones largos en el texto del producto', () => {
  const producto = todos.filter(a => !esPrueba(a.ruta) && !a.ruta.startsWith('data/vehiculos.json') && a.ruta !== 'fuel-prices.json');
  const conRaya = producto.filter(a => /—/.test(a.texto)).map(a => a.ruta);
  assert.deepEqual(conRaya, []);
});
