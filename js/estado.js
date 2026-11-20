/* Estado de la app: lo que se guarda, lo efímero y las funciones que combinan vehículo, precio y costos.
   Todo cálculo pasa por js/costos.js y todo precio por js/energia.js. */

import * as energia from './energia.js';
import { calcularPedido, estimarOfertaManual, costoPorKm, consumoReal } from './costos.js';
import { historialDeLuis, fechaLocal, haceDias } from './demo.js';

// Espacio propio para la demostración de Luis: no se mezclan perfiles de versiones anteriores.
export const KEY = 'ultima-milla-luis-demo-v3';
export const PLATAFORMAS = ['Uber Eats', 'PedidosYa', 'Rappi'];

const params = new URLSearchParams(location.search);
export const DEMO = params.get('demo') === '1';
export const DIRECT = params.get('pantalla');
export const SCREENS = ['inicio', 'oferta', 'resultado', 'resumen', 'mapa', 'vehiculo', 'carga'];

export const S = { P: null, catalogo: [], state: null, ui: null, seed: null, memo: new Map() };

export const hoy = () => fechaLocal();
export const dia = n => haceDias(n);

export function valoresIniciales() {
  const P = S.P;
  const luis = S.catalogo.find(v => v.id === P.luis.vehiculoId);
  return {
    vehicleId: P.luis.vehiculoId, vehiculoPropio: null, combustible: null,
    settings: { datosMes: P.gastosMensuales.datosMoviles, horasMes: P.gastosMensuales.horasTrabajo, meta: P.luis.metaPorHora, inversion: luis?.precioReferencia ?? 0, navApp: 'waze', bateriaKwh: 0, cargaKw: 2, cargaInicio: 20, cargaFin: 80 },
    energia: { manual: {}, zonaManual: null },
    connected: [...PLATAFORMAS], jobs: [], refuels: [], shiftActive: false, nextOfferAt: 0, offerCursor: 0,
    pendingOffer: null, activeDelivery: null, lastOutcomeId: null
  };
}

export function cargarGuardado() {
  if (DEMO || DIRECT) return valoresIniciales();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.jobs) && raw.settings && typeof raw.vehicleId === 'string') {
      const base = valoresIniciales();
      const vehicleOk = raw.vehicleId === 'propio' ? Boolean(raw.vehiculoPropio) : S.catalogo.some(v => v.id === raw.vehicleId);
      return {
        ...base, ...raw,
        vehicleId: vehicleOk ? raw.vehicleId : base.vehicleId,
        settings: { ...base.settings, ...raw.settings },
        energia: { ...base.energia, ...raw.energia },
        connected: Array.isArray(raw.connected) ? raw.connected : base.connected,
        refuels: Array.isArray(raw.refuels) ? raw.refuels : [],
        jobs: raw.jobs.filter(j => !j.seed)
      };
    }
  } catch { /* La demo sigue funcionando si el almacenamiento está deshabilitado. */ }
  return valoresIniciales();
}

export function interfazInicial() {
  return {
    screen: SCREENS.includes(DIRECT) ? DIRECT : 'inicio', lastScreen: null, period: 'día', online: navigator.onLine, speed: 0,
    categoria: null, busqueda: '', verTodos: false, confirmarReinicio: false,
    gps: { estado: 'idle', mensaje: '' },
    pedidoGps: { estado: 'off', km: 0, simulado: false, base: 0 },
    refuel: { estacion: '', sugerida: '', estado: 'Busca una estación cercana con tu GPS o escribe su nombre.', cargando: false },
    ruta: { datos: null, estado: 'Toca “Crear ruta con mi GPS” para ver un trayecto real por calles.', cargando: false, espera: 0, zoom: null, cursor: -1 },
    errores: {}, borradorPropio: null
  };
}

export function guardar(extra = {}) {
  if (DEMO || DIRECT) return;
  try {
    const guardado = { ...S.state, energia: energia.exportarEstado(), ...extra };
    localStorage.setItem(KEY, JSON.stringify(guardado));
  } catch { /* sin almacenamiento */ }
}

/* ---------- Vehículo, precio y ajustes ---------- */
export function vehiculoBase() {
  const s = S.state;
  if (s.vehicleId === 'propio' && s.vehiculoPropio) return s.vehiculoPropio;
  return S.catalogo.find(v => v.id === s.vehicleId) ?? S.catalogo.find(v => v.id === S.P.luis.vehiculoId);
}

export function vehiculo() {
  const base = vehiculoBase();
  const c = S.state.combustible;
  if (base.energia === 'gasolina' && ['93', '95', '97'].includes(c) && c !== base.combustible) return { ...base, combustible: c };
  return base;
}

export const tieneEnergia = v => v.energia !== 'ninguna';
export const precio = (v = vehiculo()) => energia.precioPara(v);
export const ajustes = () => ({ datosMes: S.state.settings.datosMes, horasMes: S.state.settings.horasMes, meta: S.state.settings.meta });

export function calcOferta(oferta, v = vehiculo()) {
  return calcularPedido(oferta, v, precio(v), ajustes(), S.P);
}
export const porKm = (v = vehiculo()) => costoPorKm(v, precio(v), S.P);
export const rendimientoReal = (v = vehiculo()) => consumoReal(v, S.P);
export const ofertaManual = (pago, km) => estimarOfertaManual(pago, km, S.P);

/* Costos de un pedido guardado: siempre con el vehículo y el precio de ahora. */
export function costear(job) {
  const v = vehiculo(), pr = precio(v), a = ajustes();
  const llave = [v.id, v.combustible, v.consumo, v.mantencionKm, pr?.precio ?? 'sin', a.datosMes, a.horasMes, a.meta].join('|');
  const previo = S.memo.get(job.id);
  if (previo && previo.llave === llave) return previo.calc;
  const calc = { ...calcularPedido(job, v, pr, a, S.P) };
  S.memo.set(job.id, { llave, calc });
  return calc;
}

export function jobsSemilla() {
  const hoyTexto = hoy();
  if (!S.seed || S.seed.fecha !== hoyTexto) S.seed = { fecha: hoyTexto, jobs: historialDeLuis() };
  return S.seed.jobs;
}
export const todosLosJobs = () => [...jobsSemilla(), ...S.state.jobs];

export function agregar(jobs) {
  const hechos = jobs.filter(j => j.status === 'completed');
  const calcs = hechos.map(j => ({ j, c: costear(j) }));
  const suma = k => calcs.reduce((t, { c }) => t + (Number(c[k]) || 0), 0);
  const gross = suma('gross'), net = suma('net'), minutes = suma('totalMinutes');
  const horas = minutes / 60;
  return {
    gross, energia: suma('energia'), mantencion: suma('mantencion'), datos: suma('datos'), net, minutes,
    waitMin: suma('waitMin'), emptyKm: suma('returnKm'), realHours: horas, hourly: horas ? net / horas : 0,
    count: hechos.length, rejected: jobs.filter(j => j.status === 'rejected').length
  };
}

export function recuperacion() {
  const inversion = Math.max(0, Number(S.state.settings.inversion) || 0);
  const net = agregar(todosLosJobs()).net;
  return { inversion, net, restante: Math.max(0, inversion - net), progreso: inversion ? Math.min(100, Math.max(0, net / inversion * 100)) : 0 };
}

export function iniciar(P, catalogo) {
  S.P = P; S.catalogo = catalogo;
  energia.iniciarEnergia(P);
  S.state = cargarGuardado();
  energia.restaurarEstado(S.state.energia);
  S.ui = interfazInicial();
  S.ui.categoria = vehiculoBase().categoria;
}
