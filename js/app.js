/* Controlador de la interfaz: eventos, acciones y ciclo de dibujo. Los números salen de costos.js y energia.js. */

import * as energia from './energia.js';
import { S, KEY, DEMO, DIRECT, SCREENS, PLATAFORMAS, hoy, iniciar, guardar, valoresIniciales, interfazInicial, vehiculo, vehiculoBase, tieneEnergia, precio, calcOferta, ofertaManual, todosLosJobs, agregar } from './estado.js';
import { vistaPantalla, listaVehiculos, jobsDelPeriodo, tipoCarga } from './vistas.js';
import { OFERTAS_DEMO, PARADAS_RUTA } from './demo.js';
import { validarVehiculoPropio } from './catalogo.js';
import { posicionUnica, estadoPermiso, hayGps, medirRecorrido, simularRecorrido } from './ubicacion.js';
import { distanciaKm } from './precios.js';
import { money, fmtDec, parseDec, parseNum, distanciaTexto, envolverNumeros } from './formato.js';

const app = document.getElementById('app');
const urlParams = new URLSearchParams(location.search);
let toastTimer = null, demoTimers = [], medidor = null;

if (urlParams.get('embebido') === '1') document.body.classList.add('embedded');
if (DIRECT === 'resumen' && urlParams.get('compacto') === '1') document.body.classList.add('compact-summary');

/* ---------- Dibujo ---------- */
function render() {
  if (S.ui.screen === 'carga' && !tieneEnergia(vehiculo())) S.ui.screen = 'vehiculo';
  const viejo = document.getElementById('main');
  const scroll = viejo?.scrollTop || 0;
  const cambio = S.ui.lastScreen !== S.ui.screen;
  app.innerHTML = vistaPantalla();
  envolverNumeros(app);
  const main = document.getElementById('main');
  if (main) main.scrollTop = cambio ? 0 : scroll;
  if (cambio && S.ui.lastScreen !== null) document.getElementById('page-title')?.focus({ preventScroll: true });
  S.ui.lastScreen = S.ui.screen;
  if (S.ui.confirmarReinicio) document.querySelector('[data-action="reset-cancel"]')?.focus();
  avisarAlPadre();
  animarCifras();
  actualizarTemporizador();
}

function avisarAlPadre() {
  if (window.parent === window) return;
  if (DIRECT === 'resumen') {
    const t = agregar(jobsDelPeriodo());
    window.parent.postMessage({ tipo: 'resumen-luis', gross: t.gross, fuel: t.energia, maintenance: t.mantencion, data: t.datos, net: t.net, waitMin: t.waitMin }, '*');
  }
  if (DIRECT === 'oferta' && S.state.pendingOffer) window.parent.postMessage({ tipo: 'senal-oferta', signal: calcOferta(S.state.pendingOffer).signal }, '*');
}

function animarCifras() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  app.querySelectorAll('[data-count]').forEach(el => {
    const meta = Number(el.dataset.count);
    if (!Number.isFinite(meta) || meta === 0) return;
    const inicio = performance.now(), duracion = 650;
    const paso = ahora => {
      if (!el.isConnected) return;
      const p = Math.min(1, (ahora - inicio) / duracion);
      el.textContent = money(Math.round(meta * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

function actualizarTemporizador() {
  const el = document.getElementById('wait-timer'), d = S.state.activeDelivery;
  if (!el || !d?.startedAt) return;
  const s = Math.floor((Date.now() - d.startedAt) / 1000);
  el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function actualizarKm() {
  const el = document.getElementById('km-medido');
  if (el) { el.textContent = `${fmtDec(S.ui.pedidoGps.km, 1)} km`; envolverNumeros(el.parentElement); }
}

function toast(mensaje, error = false) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = error ? 'toast error' : 'toast';
  el.textContent = mensaje;
  (app.querySelector('.toast-region') || app).appendChild(el);
  envolverNumeros(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

/* ---------- Ofertas ---------- */
function offerWithWait(oferta) {
  const medidas = S.state.jobs.filter(j => j.status === 'completed' && j.restaurant === oferta.restaurant && j.waitSource === 'medida' && Number.isFinite(Number(j.waitMin)));
  const waitMin = medidas.length ? Math.round(medidas.reduce((t, j) => t + Number(j.waitMin), 0) / medidas.length) : oferta.waitMin;
  return { ...oferta, waitMin, waitCount: medidas.length, waitSource: medidas.length >= 2 ? 'promedio' : medidas.length === 1 ? 'ultima' : 'ejemplo' };
}

function construirOfertaManual({ gross, km, platform = 'Otra', restaurant = '', minutes = null, waitMin = null, returnKm = null, example }) {
  const est = ofertaManual(gross, km);
  return {
    id: `manual-${Date.now()}`, manual: true, example, platform, gross, km,
    returnKm: returnKm ?? est.returnKm, returnEstimated: returnKm === null,
    minutes: minutes ?? est.minutes, minutesEstimated: minutes === null,
    waitMin: waitMin ?? est.waitMin, waitSource: waitMin === null ? 'estimada' : 'manual',
    from: 'Retiro', to: 'Entrega', restaurant: restaurant || 'Restaurante no indicado'
  };
}

function ejecutarManual(datos) {
  if (S.state.activeDelivery) { toast('Finaliza el pedido en curso primero.'); return; }
  S.ui.manualDraft = { gross: datos.gross, km: datos.km, platform: datos.platform || 'Uber Eats', restaurant: datos.restaurant || '', minutes: datos.minutes ?? '', waitMin: datos.waitMin ?? '', returnKm: datos.returnKm ?? '' };
  const oferta = construirOfertaManual(datos);
  S.state.pendingOffer = datos.waitMin == null && datos.restaurant ? offerWithWait(oferta) : oferta;
  S.ui.screen = 'oferta'; guardar(); render();
}

function simular(indice) {
  if (S.state.activeDelivery) { toast('Finaliza el pedido en curso primero.'); return; }
  const disponibles = OFERTAS_DEMO.filter(o => S.state.connected.includes(o.platform));
  if (indice == null && !disponibles.length) { S.ui.screen = 'vehiculo'; render(); toast('Activa una plataforma de ejemplo.', true); return; }
  S.state.pendingOffer = offerWithWait(indice == null ? disponibles[S.state.offerCursor++ % disponibles.length] : OFERTAS_DEMO[indice]);
  S.ui.screen = 'oferta'; guardar(); render();
}

function programarOferta() { S.state.nextOfferAt = Date.now() + 18000 + Math.floor(Math.random() * 12000); }

function pasoTurno() {
  const s = S.state;
  if (!s.shiftActive || s.pendingOffer || s.activeDelivery || !S.ui.online || document.visibilityState === 'hidden' || S.ui.screen === 'vehiculo' || S.ui.screen === 'carga' || S.ui.speed > 10 || Date.now() < s.nextOfferAt) return;
  const disponibles = OFERTAS_DEMO.filter(o => s.connected.includes(o.platform));
  if (!disponibles.length) return;
  s.pendingOffer = offerWithWait(disponibles[s.offerCursor++ % disponibles.length]);
  programarOferta(); guardar(); render();
  if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
  toast(`Nueva oferta de ejemplo: ${s.pendingOffer.platform}`);
}

/* ---------- Pedido en curso ---------- */
function aceptar() {
  const o = S.state.pendingOffer;
  if (!o) return;
  S.state.activeDelivery = { offer: o, stage: 'accepted', startedAt: 0, measuredWaitMin: null, medirGps: true, kmMedido: 0 };
  S.state.pendingOffer = null;
  S.ui.pedidoGps = { estado: 'off', km: 0, simulado: false, base: 0 };
  guardar(); render(); toast('Pedido aceptado. Avanza al local.');
}

function llegue() {
  const d = S.state.activeDelivery;
  if (!d || d.stage !== 'accepted') return;
  d.startedAt = Date.now(); d.stage = 'arrived';
  guardar(); render(); toast('Llegada registrada. El cronómetro corre solo.');
}

function retire() {
  const d = S.state.activeDelivery;
  if (!d || d.stage !== 'arrived') return;
  d.measuredWaitMin = d.startedAt > 0 ? Math.max(0, Math.round((Date.now() - d.startedAt) / 60000)) : null;
  d.startedAt = 0; d.stage = 'picked';
  iniciarMedicion();
  guardar(); render(); toast('Retiro registrado.');
}

function simularMedicion() {
  const d = S.state.activeDelivery;
  medidor?.detener();
  S.ui.pedidoGps = { estado: 'simulado', km: d.kmMedido || 0, simulado: true, base: 0 };
  medidor = simularRecorrido(d.offer.km * S.P.gps.kmSimuladoFactor, { onCambio: m => { S.ui.pedidoGps.km = m.km; actualizarKm(); } });
}

async function iniciarMedicion() {
  const d = S.state.activeDelivery;
  if (!d || !d.medirGps || medidor) return;
  if (DEMO || !hayGps() || await estadoPermiso() === 'denied') { simularMedicion(); refrescarMensajeGps(); return; }
  const base = d.kmMedido || 0;
  S.ui.pedidoGps = { estado: 'midiendo', km: base, simulado: false, base };
  medidor = medirRecorrido(S.P, {
    onCambio: m => { S.ui.pedidoGps.km = base + m.km; actualizarKm(); },
    // Solo un permiso negado o la falta de GPS pasan a la simulación. Un fallo puntual de señal (código 2 o 3) no corta la medición.
    onError: e => { if (e?.code === 1 || e?.code === 0) { simularMedicion(); refrescarMensajeGps(); } }
  });
  refrescarMensajeGps();
}

function refrescarMensajeGps() { if (S.ui.screen === 'oferta') render(); }

function detenerMedicion() {
  const d = S.state.activeDelivery;
  if (!medidor) return { km: 0, fuente: null };
  const m = medidor.detener();
  medidor = null;
  const base = S.ui.pedidoGps.simulado ? 0 : (S.ui.pedidoGps.base || 0);
  const km = base + m.km;
  S.ui.pedidoGps = { estado: 'off', km: 0, simulado: false, base: 0 };
  d.kmMedido = 0;
  return { km, fuente: m.simulado ? 'simulado' : 'gps' };
}

function entregue() {
  const d = S.state.activeDelivery;
  if (!d || d.stage !== 'picked') return;
  const medicion = detenerMedicion();
  const usaMedido = medicion.fuente && medicion.km >= S.P.limites.kmMin;
  const observada = d.measuredWaitMin !== null;
  const km = usaMedido ? Math.round(medicion.km * 10) / 10 : d.offer.km;
  const o = d.offer;
  const job = {
    id: `vivo-${Date.now()}`, date: hoy(), time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    platform: o.platform, restaurant: o.restaurant, from: o.from, to: o.to, status: 'completed',
    waitSource: observada ? 'medida' : 'estimada', kmFuente: usaMedido ? medicion.fuente : 'escrito',
    gross: o.gross, km, returnKm: o.returnKm, minutes: o.minutes, waitMin: observada ? d.measuredWaitMin : o.waitMin
  };
  S.state.jobs.push(job); S.state.lastOutcomeId = job.id; S.state.activeDelivery = null;
  S.ui.screen = 'resultado'; programarOferta(); guardar(); render();
}

function rechazar() {
  const o = S.state.pendingOffer;
  if (!o) return;
  const job = { id: `rechazo-${Date.now()}`, date: hoy(), time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }), platform: o.platform, restaurant: o.restaurant, from: o.from, to: o.to, status: 'rejected', gross: o.gross, km: o.km, returnKm: o.returnKm, minutes: o.minutes, waitMin: o.waitMin };
  S.state.jobs.push(job); S.state.lastOutcomeId = job.id; S.state.pendingOffer = null;
  S.ui.screen = 'resultado'; programarOferta(); guardar(); render();
}

function alternarGps() {
  const d = S.state.activeDelivery;
  if (!d) return;
  d.medirGps = !d.medirGps;
  if (d.stage === 'picked') {
    if (d.medirGps) iniciarMedicion();
    else { d.kmMedido = S.ui.pedidoGps.km; medidor?.detener(); medidor = null; S.ui.pedidoGps = { ...S.ui.pedidoGps, estado: 'off' }; }
  }
  guardar(); render();
}

/* ---------- Reinicio ---------- */
function reiniciarDemo() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
  demoTimers.forEach(clearTimeout); demoTimers = [];
  medidor?.detener(); medidor = null;
  S.state = valoresIniciales();
  energia.restaurarEstado(S.state.energia);
  S.memo.clear();
  const online = S.ui.online;
  S.ui = interfazInicial(); S.ui.online = online; S.ui.categoria = vehiculoBase().categoria;
  guardar(); render();
  toast('Demo reiniciada. Volvió el perfil de Luis.');
}

/* ---------- GPS y zona ---------- */
async function usarMiUbicacion({ silencioso = false } = {}) {
  if (S.ui.gps.estado === 'buscando') return;
  S.ui.gps = { estado: 'buscando', mensaje: 'Buscando tu ubicación. Se hace una sola vez.' };
  if (!silencioso) render();
  try {
    const pos = await posicionUnica(S.P);
    if (!(pos.precision <= S.P.gps.precisionZonaMaxM)) throw Object.assign(new Error('precision'), { code: 'precision' });
    await energia.cargarPrecios();
    const zona = energia.fijarUbicacion(pos);
    const pr = precio(vehiculo());
    const detalle = pr?.estacion ? ` Estación más cercana: ${pr.estacion.nombre}, a ${distanciaTexto(pr.estacion.distanciaKm)}.` : '';
    S.ui.gps = { estado: 'ok', mensaje: `Zona detectada: ${zona.zona}.${detalle}` };
    guardar(); render();
    if (!silencioso) toast(`Zona detectada: ${zona.zona}.`);
  } catch (error) {
    const texto = error?.code === 1 ? 'No diste permiso. Elige tu zona en el selector y sigue con los precios de esa zona.'
      : error?.code === 'precision' ? 'El GPS no tiene precisión suficiente. Elige tu zona en el selector.'
        : error?.code === 3 ? 'El GPS tardó demasiado. Inténtalo otra vez o elige tu zona en el selector.'
          : 'No se pudo leer tu ubicación. Elige tu zona en el selector.';
    S.ui.gps = { estado: 'error', mensaje: texto };
    render();
  }
}

async function buscarEstacionDeCarga() {
  const r = S.ui.refuel;
  if (r.cargando) return;
  const clave = energia.clavePrecio(vehiculo());
  r.cargando = true; r.estado = 'Ubicándote. Esta búsqueda se hace solo ahora.'; actualizarEstadoCarga();
  try {
    const pos = await posicionUnica(S.P);
    await energia.cargarPrecios();
    const e = energia.estacionCercana(pos.lat, pos.lon, clave);
    if (!e) r.estado = 'No encontré una estación cercana en la lista. Escribe su nombre.';
    else if (e.distanciaKm > 0.35) r.estado = `La estación más cercana está a ${distanciaTexto(e.distanciaKm)} (${e.nombre}). Escribe el nombre si cargaste en otra.`;
    else {
      const input = document.getElementById('refuel-station');
      r.estacion = `${e.nombre}, ${e.comuna}`.slice(0, 80); r.sugerida = r.estacion;
      if (input) input.value = r.estacion;
      r.estado = `Sugerencia: ${e.nombre}, a ${distanciaTexto(e.distanciaKm)}. Confirma que sea la correcta.`;
    }
  } catch (error) {
    r.estado = error?.code === 1 ? 'No diste permiso al GPS. Puedes escribir la estación.' : 'No se pudo buscar la estación. Escríbela para continuar.';
  } finally { r.cargando = false; actualizarEstadoCarga(); }
}

function actualizarEstadoCarga() {
  const r = S.ui.refuel;
  const estado = app.querySelector('[data-refuel-status]'), boton = app.querySelector('[data-action="refuel-gps"]');
  if (estado) estado.textContent = r.estado;
  if (boton) { boton.disabled = r.cargando; boton.setAttribute('aria-busy', String(r.cargando)); }
}

/* ---------- Ruta ilustrativa ---------- */
async function crearRuta(demo = false, mantenerOrigen = false) {
  const r = S.ui.ruta;
  if (r.cargando) return;
  if (!navigator.onLine) { r.estado = 'Sin conexión. Reconéctate e inténtalo de nuevo.'; render(); return; }
  const anterior = r.datos;
  r.cargando = true; r.estado = demo ? 'Preparando origen de ejemplo…' : 'Solicitando ubicación al teléfono…'; render();
  try {
    let origen;
    if (mantenerOrigen && r.datos) origen = r.datos.origen;
    else if (demo) origen = { lat: -33.4372, lon: -70.6343 };
    else {
      const pos = await posicionUnica(S.P);
      origen = { lat: pos.lat, lon: pos.lon };
      energia.fijarUbicacion(origen); guardar();
    }
    if (distanciaKm(origen, { lat: -33.425, lon: -70.61 }) > 35) throw new Error('La demostración está en Santiago. Usa “Probar sin GPS” si estás lejos.');
    const indice = mantenerOrigen ? (r.cursor + 1) % PARADAS_RUTA.length : crypto.getRandomValues(new Uint32Array(1))[0] % PARADAS_RUTA.length;
    r.cursor = indice;
    const parada = PARADAS_RUTA[indice];
    r.estado = 'Calculando el trayecto por calles…'; render();
    const control = new AbortController(), timer = setTimeout(() => control.abort(), 12000);
    let respuesta;
    try { respuesta = await fetch(`https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${parada.lon},${parada.lat}?overview=full&geometries=geojson&steps=false`, { signal: control.signal }); }
    finally { clearTimeout(timer); }
    if (!respuesta.ok) throw new Error('El servicio de rutas no respondió. Inténtalo de nuevo.');
    const datos = await respuesta.json(), res = datos.routes?.[0];
    if (datos.code !== 'Ok' || !res || !Number.isFinite(res.duration) || !Number.isFinite(res.distance) || !res.geometry?.coordinates?.length) throw new Error('No se encontró una ruta por calles. Prueba otro retiro.');
    globalThis.UltimaMillaMap.layout(res.geometry.coordinates);
    r.datos = { origen, stop: parada, demo: demo || Boolean(mantenerOrigen && anterior?.demo), duration: res.duration, distance: res.distance, coordinates: res.geometry.coordinates };
    r.zoom = null; r.espera = 0; r.estado = r.datos.demo ? 'Ruta desde origen de ejemplo.' : 'Ruta desde tu GPS. Ubicación no guardada.';
  } catch (error) {
    r.datos = mantenerOrigen ? anterior : null;
    const motivo = error?.code === 1 ? 'Permiso denegado. Actívalo en el navegador o prueba sin GPS.' : error?.code === 3 ? 'El GPS tardó demasiado. Vuelve a intentar o prueba sin GPS.' : error?.name === 'AbortError' ? 'La ruta tardó demasiado. Revisa tu conexión.' : error?.message || 'No se pudo crear la ruta.';
    r.estado = r.datos ? `${motivo} Se conserva la ruta anterior.` : motivo;
  } finally { r.cargando = false; render(); }
}

/* ---------- Formularios ---------- */
const ETIQUETAS_CAMPO = { gross: 'el pago', km: 'la distancia', minutes: 'el tiempo de viaje', waitMin: 'la espera', returnKm: 'el regreso' };

function errorDeCampo(form, nombre, mensaje) {
  const input = form.elements[nombre], err = form.querySelector(`#err-${nombre}`);
  input.setAttribute('aria-invalid', 'true');
  if (err) { err.textContent = mensaje; err.hidden = false; }
  if (nombre !== 'gross' && nombre !== 'km') input.closest('details')?.setAttribute('open', '');
}
function limpiarErrores(form) {
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(el => { el.hidden = true; el.textContent = ''; });
}

function datosFormPropio() {
  const f = document.getElementById('custom-vehicle-form');
  if (!f) return null;
  return Object.fromEntries([...new FormData(f).entries()].map(([k, v]) => [k === 'categoria' ? 'categoria' : k, v]));
}

app.addEventListener('submit', e => {
  if (e.target.id !== 'manual-offer-form') return;
  e.preventDefault();
  if (S.ui.speed > 10) return;
  if (S.state.activeDelivery) { toast('Finaliza el pedido en curso primero.'); return; }
  const form = e.target, L = S.P.limites;
  limpiarErrores(form);
  const gross = parseNum(form.elements.gross.value), km = parseDec(form.elements.km.value);
  const opcional = (nombre, max, decimal) => {
    const raw = form.elements[nombre].value.trim();
    if (!raw) return null;
    const valor = decimal ? parseDec(raw) : parseNum(raw);
    if (Number.isFinite(valor) && valor >= 0 && valor <= max) return valor;
    errorDeCampo(form, nombre, `Revisa ${ETIQUETAS_CAMPO[nombre]}: un número entre 0 y ${max}.`);
    return NaN;
  };
  let malo = null;
  if (!Number.isInteger(gross) || gross < L.pagoMin || gross > L.pagoMax) { errorDeCampo(form, 'gross', `Escribe el pago en pesos, entre ${money(L.pagoMin)} y ${money(L.pagoMax)}. Ej.: 4100.`); malo = 'gross'; }
  if (!Number.isFinite(km) || km < L.kmMin || km > L.kmMax) { errorDeCampo(form, 'km', `Escribe la distancia en km, entre ${fmtDec(L.kmMin)} y ${L.kmMax}. Ej.: 3,2.`); malo = malo || 'km'; }
  const minutes = opcional('minutes', 360, false), waitMin = opcional('waitMin', 180, false), returnKm = opcional('returnKm', 200, true);
  if (malo || [minutes, waitMin, returnKm].some(n => Number.isNaN(n))) {
    form.querySelector('[aria-invalid]')?.focus();
    toast('Revisa los datos marcados.', true); return;
  }
  const restaurant = form.elements.restaurant.value.trim().replace(/\s+/g, ' ').slice(0, 60);
  ejecutarManual({ gross, km, platform: form.elements.platform.value, restaurant, minutes, waitMin, returnKm });
});

function guardarVehiculoPropio() {
  const datos = datosFormPropio();
  if (!datos) return;
  const r = validarVehiculoPropio(datos, S.P);
  S.ui.borradorPropio = datos; S.ui.propioAbierto = true;
  if (!r.ok) { S.ui.errores = r.errores; render(); document.querySelector('#custom-vehicle [aria-invalid]')?.focus(); toast('Revisa los datos marcados.', true); return; }
  S.state.vehiculoPropio = r.vehiculo; S.state.vehicleId = 'propio'; S.state.combustible = null;
  S.state.settings.inversion = 0;
  S.ui.errores = {}; S.ui.borradorPropio = null; S.ui.categoria = r.vehiculo.categoria; S.ui.propioAbierto = false;
  guardar(); render(); toast('Vehículo propio activo.');
}

function guardarCarga() {
  const v = vehiculo(), t = tipoCarga(v), form = document.getElementById('refuel-form');
  if (!tieneEnergia(v) || !form?.reportValidity()) return;
  const estacion = form.elements.station.value.trim().replace(/\s+/g, ' ');
  const cantidad = parseDec(form.elements.cantidad.value), amount = parseNum(form.elements.amount.value);
  const unitario = Math.round(amount / cantidad);
  const [minU, maxU] = t.unidad === 'kWh' ? [10, 2000] : [100, 5000];
  const grado = form.elements.grade?.value;
  if (estacion.length < 2 || estacion.length > 80 || !Number.isFinite(cantidad) || cantidad < 0.01 || cantidad > (t.unidad === 'kWh' ? 200 : 200) || !Number.isInteger(amount) || amount < 100 || amount > 1000000 || unitario < minU || unitario > maxU) {
    toast(`Revisa ${t.unidad === 'kWh' ? 'el lugar, los kWh' : 'la estación, los litros'} y el total pagado.`, true); return;
  }
  if (grado && ['93', '95', '97'].includes(grado)) S.state.combustible = grado;
  const clave = energia.clavePrecio(vehiculo());
  energia.fijarManual(clave, unitario);
  const etiqueta = precio(vehiculo()).etiqueta;
  S.state.refuels.push({ id: `carga-${Date.now()}`, at: new Date().toISOString(), station: estacion, cantidad, unidad: t.unidad, amount, unitPrice: unitario, clave, etiqueta, vehiculo: v.id });
  S.ui.refuel = { estacion: '', sugerida: '', estado: 'Busca una estación cercana con tu GPS o escribe su nombre.', cargando: false };
  S.ui.screen = 'inicio'; guardar(); render();
  toast(`Carga guardada: ${money(amount)} · ${money(unitario)}/${t.unidad}.`);
}

/* ---------- Eventos ---------- */
app.addEventListener('click', e => {
  const b = e.target.closest('[data-action],[data-screen],[data-period],[data-vehicle],[data-connect],[data-example],[data-cat]');
  if (!b) return;
  const accion = b.dataset.action;
  if (S.ui.speed > 10 && accion !== 'stop') return;
  if (b.dataset.example) { const ex = S.P.ejemplos.find(x => x.id === b.dataset.example); if (ex) ejecutarManual({ ...ex, example: ex.id }); return; }
  if (b.dataset.screen) { S.ui.screen = b.dataset.screen; render(); return; }
  if (b.dataset.period) { S.ui.period = b.dataset.period; render(); return; }
  if (b.dataset.cat) { S.ui.categoria = b.dataset.cat; S.ui.busqueda = ''; S.ui.verTodos = false; render(); return; }
  if (b.dataset.vehicle) {
    S.state.vehicleId = b.dataset.vehicle; S.state.combustible = null;
    const v = vehiculoBase();
    S.state.settings.inversion = v.precioReferencia ?? 0;
    S.ui.categoria = v.categoria;
    guardar(); render(); toast(`Vehículo: ${v.marca} ${v.modelo}.`); return;
  }
  if (b.dataset.connect) { const p = b.dataset.connect; S.state.connected = S.state.connected.includes(p) ? S.state.connected.filter(x => x !== p) : [...S.state.connected, p]; guardar(); render(); return; }
  switch (accion) {
    case 'open-custom': { S.ui.propioAbierto = true; render(); const sec = document.getElementById('custom-vehicle'); sec?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); document.getElementById('p-cat')?.focus({ preventScroll: true }); return; }
    case 'save-custom-vehicle': guardarVehiculoPropio(); return;
    case 'ver-todos': S.ui.verTodos = true; render(); return;
    case 'shift-start': if (!S.state.connected.length) { S.ui.screen = 'vehiculo'; render(); toast('Activa una plataforma de ejemplo.', true); return; } S.state.shiftActive = true; S.state.nextOfferAt = Date.now() + 6000; guardar(); render(); toast('Turno de demostración iniciado.'); return;
    case 'shift-pause': S.state.shiftActive = false; guardar(); render(); toast('Turno en pausa.'); return;
    case 'usar-ubicacion': usarMiUbicacion(); return;
    case 'quitar-manual': energia.fijarManual(energia.clavePrecio(vehiculo()), null); guardar(); render(); toast('Vuelve el precio automático.'); return;
    case 'refuel-gps': buscarEstacionDeCarga(); return;
    case 'refuel-save': guardarCarga(); return;
    case 'simulate': simular(); return;
    case 'edit-manual': if (!S.state.pendingOffer?.manual) return; S.state.pendingOffer = null; guardar(); render(); document.getElementById('manual-gross')?.focus(); return;
    case 'accept': aceptar(); return;
    case 'start-wait': llegue(); return;
    case 'pickup-order': retire(); return;
    case 'finish-delivery': entregue(); return;
    case 'toggle-gps': alternarGps(); return;
    case 'reject': rechazar(); return;
    case 'speed': S.ui.speed = 15; render(); return;
    case 'stop': S.ui.speed = 0; render(); toast('Interacción desbloqueada.'); return;
    case 'reset': S.ui.confirmarReinicio = true; render(); return;
    case 'reset-cancel': S.ui.confirmarReinicio = false; render(); return;
    case 'reset-ok': S.ui.confirmarReinicio = false; reiniciarDemo(); return;
    case 'route-gps': crearRuta(false); return;
    case 'route-demo': crearRuta(true); return;
    case 'route-another': crearRuta(S.ui.ruta.datos?.demo || false, true); return;
    case 'route-zoom-in': case 'route-zoom-out': case 'route-fit': {
      const r = S.ui.ruta;
      if (!r.datos) return;
      const ajustado = globalThis.UltimaMillaMap.layout(r.datos.coordinates).zoom;
      r.zoom = accion === 'route-fit' ? null : Math.max(10, Math.min(18, (r.zoom ?? ajustado) + (accion === 'route-zoom-in' ? 1 : -1)));
      render(); return;
    }
    default:
  }
});

app.addEventListener('change', e => {
  if (S.ui.speed > 10) return;
  const t = e.target;
  if (t.matches('[data-route-wait]')) { S.ui.ruta.espera = Number(t.value) || 0; render(); return; }
  if (t.hasAttribute('data-nav-app')) { S.state.settings.navApp = t.value; guardar(); render(); return; }
  if (t.hasAttribute('data-zona')) { energia.fijarZona(t.value); S.ui.gps = { estado: 'idle', mensaje: '' }; guardar(); render(); return; }
  if (t.hasAttribute('data-combustible')) { S.state.combustible = t.value; guardar(); render(); return; }
  if (t.id === 'p-cat') { S.ui.borradorPropio = { ...datosFormPropio(), categoria: t.value }; S.ui.errores = {}; S.ui.propioAbierto = true; render(); return; }
  if (t.hasAttribute('data-precio-manual')) {
    const clave = energia.clavePrecio(vehiculo());
    const texto = t.value.trim();
    if (texto === '') { energia.fijarManual(clave, null); guardar(); render(); return; }
    const valor = parseNum(texto);
    if (!(valor > 0 && valor <= 20000)) { t.setAttribute('aria-invalid', 'true'); toast('Escribe un precio entre 1 y 20.000.', true); return; }
    energia.fijarManual(clave, valor); guardar(); render(); toast('Precio ajustado. Reemplaza al automático.'); return;
  }
  if (t.dataset.setting) {
    const clave = t.dataset.setting, valor = t.value.trim() === '' ? NaN : parseNum(t.value), min = Number(t.dataset.min), max = Number(t.dataset.max);
    if (!Number.isFinite(valor) || valor < min || valor > max) { t.setAttribute('aria-invalid', 'true'); t.closest('.field')?.classList.add('invalid'); toast(`Ingresa un valor entre ${fmtDec(min, 2)} y ${fmtDec(max, 2)}.`, true); return; }
    S.state.settings[clave] = valor; guardar(); render(); toast('Valor actualizado.');
  }
});

app.addEventListener('input', e => {
  const t = e.target;
  if (t.closest('#manual-offer-form') && t.hasAttribute('aria-invalid')) { t.removeAttribute('aria-invalid'); const er = document.getElementById('err-' + t.name); if (er) { er.hidden = true; er.textContent = ''; } }
  if (t.id === 'refuel-station') S.ui.refuel.estacion = t.value;
  if (t.dataset.setting || t.hasAttribute('data-precio-manual')) { t.removeAttribute('aria-invalid'); t.closest('.field')?.classList.remove('invalid'); }
  if (t.hasAttribute('data-busqueda')) {
    S.ui.busqueda = t.value;
    const lista = document.getElementById('veh-lista');
    if (lista) { lista.innerHTML = listaVehiculos(); envolverNumeros(lista); }
    document.querySelectorAll('.cat-tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.cat === S.ui.categoria && !t.value.trim())));
  }
});

app.addEventListener('toggle', e => { if (e.target.classList?.contains('custom-vehicle')) S.ui.propioAbierto = e.target.open; }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.ui.confirmarReinicio) { S.ui.confirmarReinicio = false; render(); } });

window.addEventListener('message', e => {
  if (e.source !== window.parent || !e.data || e.data.tipo !== 'simular') return;
  demoTimers.forEach(clearTimeout); demoTimers = [];
  S.state.connected = [...PLATAFORMAS];
  simular();
});

window.addEventListener('online', () => { S.ui.online = true; document.querySelectorAll('.net-banner').forEach(el => { el.hidden = true; }); energia.cargarPrecios().then(render); if (S.ui.screen === 'mapa' && !S.ui.ruta.datos) render(); });
window.addEventListener('offline', () => { S.ui.online = false; document.querySelectorAll('.net-banner').forEach(el => { el.hidden = false; }); if (S.ui.screen === 'mapa' && !S.ui.ruta.datos) render(); });

/* ---------- Arranque ---------- */
function bucleDemo() {
  demoTimers.forEach(clearTimeout); demoTimers = [];
  S.state = valoresIniciales(); energia.restaurarEstado(S.state.energia); S.memo.clear();
  S.ui.screen = 'inicio'; render();
  const luego = (ms, fn) => demoTimers.push(setTimeout(fn, ms));
  luego(1600, () => simular(0));
  luego(4300, () => { aceptar(); llegue(); });
  luego(6800, () => { S.ui.screen = 'oferta'; render(); });
  luego(8500, retire);
  luego(9200, entregue);
  luego(11500, () => simular(1));
  luego(14400, () => { rechazar(); toast('No conviene: está por debajo de tu meta por hora.'); });
  luego(16400, () => { S.ui.screen = 'resumen'; S.ui.period = 'día'; render(); });
  luego(21500, bucleDemo);
}

export async function iniciarApp(parametros, catalogo) {
  iniciar(parametros, catalogo);
  const s = S.state;
  if (DIRECT) { s.connected = [...PLATAFORMAS]; if (DIRECT === 'oferta') { s.pendingOffer = offerWithWait(OFERTAS_DEMO[0]); s.offerCursor = 1; } }
  if (s.activeDelivery?.stage === 'picked') iniciarMedicion();
  setInterval(() => {
    actualizarTemporizador();
    pasoTurno();
    const d = S.state.activeDelivery;
    if (d?.stage === 'picked' && d.medirGps) { d.kmMedido = S.ui.pedidoGps.km; guardar(); }
  }, 1000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // El módulo principal espera datos con await: el evento load puede haber pasado ya.
    const registrar = () => navigator.serviceWorker.register('./sw.js').then(r => r.update()).catch(() => {});
    if (document.readyState === 'complete') registrar(); else window.addEventListener('load', registrar);
  }
  if (DEMO && !DIRECT) bucleDemo(); else render();
  energia.cargarPrecios().then(() => render());
  if (!DEMO && await estadoPermiso() === 'granted') usarMiUbicacion({ silencioso: true });
}
