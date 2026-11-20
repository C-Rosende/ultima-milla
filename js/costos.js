/* Costos: lógica PURA (sin DOM, sin red). Reemplaza a calc.js.
   Toda cifra de resultado, resumen, tarjeta del vehículo, historial, ejemplos y simulación sale de aquí.
   Las constantes viven en data/parametros.json y los precios llegan ya resueltos por js/energia.js. */

const num = (valor, respaldo = 0) => Number.isFinite(Number(valor)) ? Number(valor) : respaldo;

/* km/L o km/kWh que de verdad rinde el vehículo: el consumo declarado por el factor de su consumoTipo. */
export function consumoReal(vehiculo, parametros) {
  if (!vehiculo || vehiculo.energia === 'ninguna' || !(Number(vehiculo.consumo) > 0)) return null;
  const factor = parametros.factorConsumo[vehiculo.consumoTipo] ?? 1;
  return Number(vehiculo.consumo) * factor;
}

export function mantencionKm(vehiculo, parametros) {
  const propia = vehiculo?.mantencionKm;
  if (propia !== null && propia !== undefined && Number.isFinite(Number(propia))) return Number(propia);
  return num(parametros.mantencionKm[vehiculo?.categoria], 0);
}

/* precio: el objeto de energia.precioPara() o null. Un vehículo sin energía nunca gasta en ella. */
export function costoPorKm(vehiculo, precio, parametros) {
  const real = consumoReal(vehiculo, parametros);
  const energiaKm = real && precio && Number(precio.precio) > 0 ? Number(precio.precio) / real : 0;
  const mantencion = mantencionKm(vehiculo, parametros);
  return { energiaKm, mantencionKm: mantencion, totalKm: energiaKm + mantencion };
}

/* Próxima carga de un vehículo eléctrico: energía que entra a la batería, costo y tiempo ideal. */
export function estimarCarga({ bateriaKwh, inicioPct, finPct, cargadorKw }, precio, parametros) {
  const delta = (num(finPct) - num(inicioPct)) / 100;
  const bateria = Math.max(0, num(bateriaKwh));
  if (!(bateria > 0 && delta > 0 && num(cargadorKw) > 0)) return null;
  const kwh = bateria * delta / parametros.electricidad.eficienciaCarga;
  return { kwh, costo: Math.round(kwh * Math.max(0, num(precio?.precio))), horas: kwh / num(cargadorKw) };
}

/* Completa una oferta de la que solo se conocen pago y km. */
export function estimarOfertaManual(pago, km, parametros) {
  const o = parametros.ofertaManual;
  const distancia = Math.max(0, num(km));
  return {
    gross: Math.max(0, num(pago)),
    km: distancia,
    returnKm: Math.round(distancia * o.vueltaPorKm * 10) / 10,
    minutes: Math.max(o.minutosMinimos, Math.round(o.minutosBase + distancia * o.minutosPorKm)),
    waitMin: o.esperaMin
  };
}

/* oferta: {gross, km, returnKm, minutes, waitMin}. ajustes: {datosMes, horasMes, meta}. */
export function calcularPedido(oferta, vehiculo, precio, ajustes, parametros) {
  const km = Math.max(0, num(oferta.km));
  const returnKm = Math.max(0, num(oferta.returnKm));
  const minutes = Math.max(1, num(oferta.minutes, 1));
  const waitMin = Math.max(0, num(oferta.waitMin));
  const gross = Math.max(0, num(oferta.gross));
  const totalKm = km + returnKm;
  const totalMinutes = minutes + waitMin;
  const porKm = costoPorKm(vehiculo, precio, parametros);
  const energia = Math.round(totalKm * porKm.energiaKm);
  const mantencion = Math.round(totalKm * porKm.mantencionKm);
  const datos = Math.round(totalMinutes / 60 * Math.max(0, num(ajustes.datosMes)) / Math.max(1, num(ajustes.horasMes, 1)));
  const net = gross - energia - mantencion - datos;
  const hourly = net * 60 / totalMinutes;
  const meta = Math.max(1, num(ajustes.meta, 1));
  const signal = hourly >= meta ? 'green' : hourly >= meta * parametros.umbralJusto ? 'yellow' : 'red';
  return {
    gross, km, returnKm, totalKm, minutes, waitMin, totalMinutes,
    energia, mantencion, datos, cost: energia + mantencion + datos,
    net, hourly, netPerKm: totalKm > 0 ? net / totalKm : 0, signal
  };
}
