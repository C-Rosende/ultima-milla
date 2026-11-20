/* Ubicación: permiso de GPS, posición única para detectar la zona y medición de km del pedido en curso.
   La suma de km (acumularPunto) es pura y se prueba sin navegador. Nada se guarda ni se envía. */

import { distanciaKm } from './precios.js';

export const hayGps = (nav = globalThis.navigator) => Boolean(nav?.geolocation);

/* 'granted' | 'prompt' | 'denied' | 'desconocido' */
export async function estadoPermiso(nav = globalThis.navigator) {
  if (!hayGps(nav)) return 'denied';
  try { return (await nav.permissions.query({ name: 'geolocation' })).state; } catch { return 'desconocido'; }
}

export function posicionUnica(parametros, nav = globalThis.navigator) {
  return new Promise((resolver, rechazar) => {
    if (!hayGps(nav)) { rechazar(Object.assign(new Error('Este dispositivo no ofrece GPS.'), { code: 0 })); return; }
    nav.geolocation.getCurrentPosition(
      p => {
        const { latitude: lat, longitude: lon, accuracy: precision } = p.coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) rechazar(Object.assign(new Error('El GPS devolvió una ubicación inválida.'), { code: 0 }));
        else resolver({ lat, lon, precision });
      },
      rechazar,
      { enableHighAccuracy: true, timeout: parametros.gps.tiempoEsperaMs, maximumAge: 60000 }
    );
  });
}

export const medicionVacia = () => ({ km: 0, ultimo: null, aceptados: 0, descartados: 0 });

/* Suma un punto GPS al recorrido. Descarta puntos imprecisos, saltos imposibles y el temblor estando quieto. */
export function acumularPunto(medicion, punto, parametros) {
  const g = parametros.gps;
  const descartar = motivo => ({ ...medicion, descartados: medicion.descartados + 1, motivo });
  if (![punto?.lat, punto?.lon, punto?.t].every(Number.isFinite)) return descartar('invalido');
  if (!(punto.precision <= g.precisionMinM)) return descartar('precision');
  if (!medicion.ultimo) return { ...medicion, ultimo: punto, aceptados: 1, motivo: 'inicio' };
  const d = distanciaKm(medicion.ultimo, punto);
  const horas = (punto.t - medicion.ultimo.t) / 3600000;
  if (horas <= 0) return descartar('tiempo');
  if (d / horas > g.velocidadMaxKmH) return descartar('salto');
  if (d * 1000 < g.pasoMinimoM) return { ...medicion, motivo: 'quieto' };
  return { km: medicion.km + d, ultimo: punto, aceptados: medicion.aceptados + 1, descartados: medicion.descartados, motivo: 'ok' };
}

/* Mide el recorrido real con watchPosition. onCambio(medicion) se llama con cada punto.
   Devuelve { detener() → medicion final, medicion() }. */
export function medirRecorrido(parametros, { onCambio = () => {}, onError = () => {}, nav = globalThis.navigator, ahora = () => Date.now() } = {}) {
  let medicion = medicionVacia();
  if (!hayGps(nav)) { onError(Object.assign(new Error('Este dispositivo no ofrece GPS.'), { code: 0 })); return { detener: () => medicion, medicion: () => medicion }; }
  const id = nav.geolocation.watchPosition(
    p => {
      medicion = acumularPunto(medicion, { lat: p.coords.latitude, lon: p.coords.longitude, precision: p.coords.accuracy, t: p.timestamp || ahora() }, parametros);
      onCambio(medicion);
    },
    onError,
    { enableHighAccuracy: true, maximumAge: 0, timeout: parametros.gps.tiempoEsperaMs }
  );
  return { detener: () => { nav.geolocation.clearWatch(id); return medicion; }, medicion: () => medicion };
}

/* Recorrido de demostración para cuando no hay permiso: avanza hacia kmObjetivo y queda marcado como simulado. */
export function simularRecorrido(kmObjetivo, { onCambio = () => {}, pasoMs = 1000, pasos = 8 } = {}) {
  let medicion = { ...medicionVacia(), simulado: true };
  let n = 0;
  const timer = setInterval(() => {
    n = Math.min(pasos, n + 1);
    medicion = { ...medicion, km: kmObjetivo * n / pasos, aceptados: n };
    onCambio(medicion);
    if (n >= pasos) clearInterval(timer);
  }, pasoMs);
  return { detener: () => { clearInterval(timer); medicion = { ...medicion, km: kmObjetivo, aceptados: pasos }; return medicion; }, medicion: () => medicion };
}
