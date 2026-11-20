/* Catálogo: carga y agrupa data/vehiculos.json (única fuente de vehículos), busca y valida el vehículo propio. */

export const CATEGORIAS = [
  { id: 'auto', nombre: 'Auto' },
  { id: 'moto', nombre: 'Moto' },
  { id: 'scooter', nombre: 'Scooter' },
  { id: 'bici-electrica', nombre: 'Bici eléctrica' },
  { id: 'bici', nombre: 'Bici' }
];

export const nombreCategoria = id => CATEGORIAS.find(c => c.id === id)?.nombre ?? id;

export function agrupar(vehiculos) {
  const grupos = Object.fromEntries(CATEGORIAS.map(c => [c.id, []]));
  for (const v of vehiculos) (grupos[v.categoria] ||= []).push(v);
  return grupos;
}

export const nombreVehiculo = v => v.categoria === 'bici' && !v.marca?.trim() ? 'Bicicleta' : `${v.marca} ${v.modelo}`.trim();

const quitar = texto => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function buscar(vehiculos, texto, categoria = null) {
  const palabras = quitar(texto).split(/\s+/).filter(Boolean);
  return vehiculos.filter(v => (!categoria || v.categoria === categoria) && palabras.every(p => quitar(`${v.marca} ${v.modelo}`).includes(p)));
}

export async function cargarCatalogo(url, fetchFn = fetch) {
  const r = await fetchFn(url);
  if (!r.ok) throw new Error(`No se pudo leer el catálogo (${r.status}).`);
  const datos = await r.json();
  if (!Array.isArray(datos.vehiculos) || !datos.vehiculos.length) throw new Error('Catálogo vacío.');
  return datos.vehiculos;
}

const decimal = valor => {
  const texto = String(valor ?? '').trim().replace(',', '.');
  return /^\d*\.?\d+$/.test(texto) ? Number(texto) : NaN;
};

/* Campos por categoría:
   auto o moto: km/L y combustible. scooter o bici eléctrica: km/kWh, o batería (kWh) más autonomía (km). bici: solo mantención.
   Devuelve { ok, errores: {campo: mensaje}, vehiculo }. */
export function validarVehiculoPropio(datos, parametros) {
  const errores = {};
  const categoria = datos.categoria;
  const lim = parametros.limites;
  if (!CATEGORIAS.some(c => c.id === categoria)) return { ok: false, errores: { categoria: 'Elige un tipo de vehículo.' }, vehiculo: null };

  const marca = String(datos.marca ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const modelo = String(datos.modelo ?? '').trim().replace(/\s+/g, ' ').slice(0, 50);
  if (categoria !== 'bici' && !marca) errores.marca = 'Escribe la marca.';
  if (categoria !== 'bici' && !modelo) errores.modelo = 'Escribe el modelo.';

  const base = { id: 'propio', categoria, marca: categoria === 'bici' ? 'Mi' : marca, modelo: categoria === 'bici' ? 'bicicleta' : modelo, estimado: false, propio: true, fuenteRanking: null, fuenteConsumo: null, nota: 'Vehículo configurado por la persona.' };
  let vehiculo;

  if (categoria === 'auto' || categoria === 'moto') {
    const consumo = decimal(datos.consumo);
    const combustible = String(datos.combustible ?? '');
    if (!(consumo >= 1 && consumo <= lim.consumoMax)) errores.consumo = `Escribe los km por litro, entre 1 y ${lim.consumoMax}. Ej.: 38,5.`;
    if (!parametros.combustiblesPermitidos[categoria].includes(combustible)) errores.combustible = 'Elige un combustible válido para este vehículo.';
    vehiculo = { ...base, energia: combustible === 'diesel' ? 'diesel' : 'gasolina', combustible, consumo, unidad: 'km/L', consumoTipo: 'propio' };
  } else if (categoria === 'scooter' || categoria === 'bici-electrica') {
    const directo = String(datos.consumo ?? '').trim() !== '';
    let consumo, tipo = 'propio';
    if (directo) {
      consumo = decimal(datos.consumo);
      if (!(consumo >= 1 && consumo <= lim.consumoMax)) errores.consumo = `Escribe los km por kWh, entre 1 y ${lim.consumoMax}. Ej.: 80.`;
    } else {
      const bateria = decimal(datos.bateriaKwh), autonomia = decimal(datos.autonomiaKm);
      if (!(bateria > 0 && bateria <= 20)) errores.bateriaKwh = 'Escribe la batería en kWh, entre 0,05 y 20. Ej.: 0,36.';
      if (!(autonomia > 0 && autonomia <= 500)) errores.autonomiaKm = 'Escribe la autonomía en km, entre 1 y 500.';
      if (!errores.bateriaKwh && !errores.autonomiaKm) { consumo = autonomia / bateria; tipo = 'declarado'; }
      else errores.consumo = 'Escribe los km por kWh, o la batería y la autonomía.';
    }
    vehiculo = { ...base, energia: 'electricidad', combustible: null, consumo, unidad: 'km/kWh', consumoTipo: tipo, bateriaKwh: directo ? null : decimal(datos.bateriaKwh), autonomiaKm: directo ? null : decimal(datos.autonomiaKm) };
  } else {
    vehiculo = { ...base, energia: 'ninguna', combustible: null, consumo: null, unidad: null, consumoTipo: 'estimado' };
  }

  const mantencionTexto = String(datos.mantencionKm ?? '').trim();
  if (mantencionTexto === '') vehiculo.mantencionKm = null;
  else {
    const m = decimal(mantencionTexto);
    if (!(m >= 0 && m <= lim.mantencionMax)) errores.mantencionKm = `Escribe la mantención en $ por km, entre 0 y ${lim.mantencionMax}.`;
    else vehiculo.mantencionKm = m;
  }
  vehiculo.precioReferencia = null;
  return { ok: Object.keys(errores).length === 0, errores, vehiculo: Object.keys(errores).length ? null : vehiculo };
}
