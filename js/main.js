/* Punto de entrada: lee los datos y arranca la interfaz. */

import { cargarCatalogo } from './catalogo.js';
import { iniciarApp } from './app.js';

const contenedor = document.getElementById('app');

async function leerJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo leer ${url} (${r.status}).`);
  return r.json();
}

try {
  const [parametros, catalogo] = await Promise.all([leerJson('./data/parametros.json'), cargarCatalogo('./data/vehiculos.json')]);
  await iniciarApp(parametros, catalogo);
} catch (error) {
  contenedor.innerHTML = `<div class="shell"><main class="scroll"><div class="stack"><h1 class="title">No se pudo abrir la demo</h1><p class="lead">Faltan los datos de la app. Abre la demo desde su dirección web y vuelve a intentar.</p><p class="note"></p></div></main></div>`;
  contenedor.querySelector('.note').textContent = String(error?.message || error);
}
