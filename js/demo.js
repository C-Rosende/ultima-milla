/* Contenido de demostración: las ofertas de ejemplo, los retiros del mapa y el historial de Luis.
   El historial guarda solo datos del pedido. Los costos se calculan siempre con js/costos.js. */

export const OFERTAS_DEMO = [
  { id: 1, platform: 'Uber Eats', gross: 6800, km: 5.2, returnKm: 1.6, minutes: 38, waitMin: 5, from: 'Providencia', to: 'Ñuñoa', restaurant: 'Verde Limón', pickup: [102, 131], drop: [225, 222] },
  { id: 2, platform: 'PedidosYa', gross: 1495, km: 8.4, returnKm: 3.2, minutes: 51, waitMin: 12, from: 'Centro', to: 'La Florida', restaurant: 'Sabor Casero', pickup: [156, 166], drop: [302, 282] },
  { id: 3, platform: 'Rappi', gross: 5400, km: 4.8, returnKm: 1.3, minutes: 32, waitMin: 7, from: 'Las Condes', to: 'Providencia', restaurant: 'Bowl Sur', pickup: [285, 103], drop: [154, 154] },
  { id: 4, platform: 'Uber Eats', gross: 3900, km: 6.1, returnKm: 2.4, minutes: 46, waitMin: 9, from: 'Ñuñoa', to: 'Macul', restaurant: 'La Esquina', pickup: [216, 215], drop: [270, 255] },
  { id: 5, platform: 'Rappi', gross: 8500, km: 8.3, returnKm: 1.8, minutes: 55, waitMin: 4, from: 'Providencia', to: 'Las Condes', restaurant: 'Deli Alto', pickup: [154, 155], drop: [284, 102] }
];

export const PARADAS_RUTA = [
  { name: 'Retiro de ejemplo · Manuel Montt', address: 'Av. Providencia 1453', lat: -33.4295, lon: -70.6204 },
  { name: 'Retiro de ejemplo · Los Leones', address: 'Av. Providencia 2409', lat: -33.4200, lon: -70.6055 },
  { name: 'Retiro de ejemplo · Pedro de Valdivia', address: 'Av. Nueva Providencia 2278', lat: -33.4238, lon: -70.6078 },
  { name: 'Retiro de ejemplo · Tobalaba', address: 'Av. Nueva Providencia 2645', lat: -33.4190, lon: -70.6018 }
];

const FRANJAS = ['09:40', '10:28', '11:17', '12:09', '13:05', '14:18', '15:31', '16:42', '17:35'];
const LUGARES = [
  ['Cocina de barrio', 'Providencia', 'Ñuñoa'],
  ['La Huerta', 'Ñuñoa', 'Providencia'],
  ['Sándwich Club', 'Providencia', 'Las Condes'],
  ['Deli Central', 'Santiago Centro', 'Providencia'],
  ['El Rincón', 'Macul', 'Ñuñoa'],
  ['Café de la Plaza', 'Las Condes', 'Providencia']
];
const PLATAFORMAS = ['Uber Eats', 'PedidosYa', 'Rappi'];

export const fechaLocal = (fecha = new Date()) => fecha.toLocaleDateString('sv-SE');
export const haceDias = (n, desde = new Date()) => { const d = new Date(desde); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return fechaLocal(d); };

/* 30 días de pedidos de Luis, deterministas. Hoy solo incluye los que ya "pasaron" según la hora. */
export function historialDeLuis(ahora = new Date()) {
  const trabajos = [];
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  for (let dia = 29; dia >= 0; dia--) {
    const date = haceDias(dia, ahora);
    const diaSemana = new Date(`${date}T12:00:00`).getDay();
    if (diaSemana === 0) continue;
    const cantidad = diaSemana === 6 ? 5 : 7 + dia % 3;
    for (let i = 0; i < cantidad; i++) {
      const time = FRANJAS[i];
      // Hoy solo entran los pedidos que ya pasaron según la hora, con un mínimo de 3 para que la demo nunca arranque en cero.
      if (dia === 0 && i >= 3 && Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) > minutosAhora - 15) break;
      const [restaurant, from, to] = LUGARES[(i + dia) % LUGARES.length];
      trabajos.push({
        id: `semilla-${date}-${i}`, seed: true, date, time, status: 'completed', waitSource: 'estimada',
        platform: PLATAFORMAS[(i + dia) % 3], restaurant, from, to,
        gross: 3200 + ((i * 5 + dia * 3) % 8) * 450,
        km: Math.round((2.4 + ((i * 3 + dia) % 7) * 0.7) * 10) / 10,
        returnKm: Math.round((0.6 + ((i + dia) % 4) * 0.55) * 100) / 100,
        minutes: 22 + ((i * 7 + dia) % 5) * 7,
        waitMin: 3 + ((i * 4 + dia) % 5) * 3
      });
    }
    if (dia > 0 && diaSemana !== 6 && dia % 4 === 0) {
      trabajos.push({ id: `semilla-rechazo-${date}`, seed: true, date, time: '18:42', status: 'rejected', platform: 'Rappi', restaurant: 'Oferta descartada', gross: 4000, km: 4, returnKm: 1.5, minutes: 30, waitMin: 8, from: 'Retiro', to: 'Entrega' });
    }
  }
  return trabajos;
}
