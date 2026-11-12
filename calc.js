/* Cálculo puro: importable en Node o desde file://. Los costos y precios son ilustrativos. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UltimaMillaCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function calculateOffer(offer, vehicle, settings) {
    const km = Math.max(0, Number(offer.km) || 0);
    const returnKm = Math.max(0, Number(offer.returnKm) || 0);
    const minutes = Math.max(1, Number(offer.minutes) || 1);
    const waitMin = Math.max(0, Number(offer.waitMin) || 0);
    const totalKm = km + returnKm;
    const totalMinutes = minutes + waitMin;
    const gross = Math.max(0, Number(offer.gross) || 0);
    const consumption = Math.max(0.001, Number(vehicle.consumption) || 1);
    const fuelUnit = vehicle.type === 'electric' ? Number(settings.kwhPrice) : Number(settings.fuelPrice);
    const fuel = Math.round(vehicle.type === 'human' ? 0 : totalKm / consumption * Math.max(0, fuelUnit || 0));
    const maintenance = Math.round(totalKm * Math.max(0, Number(vehicle.maintenance) || 0));
    const data = Math.round(totalMinutes / 60 * Math.max(0, Number(settings.dataMonthly) || 0) / Math.max(1, Number(settings.hoursMonthly) || 1));
    const net = gross - fuel - maintenance - data;
    const hourly = net * 60 / totalMinutes;
    const goal = Math.max(1, Number(settings.goal) || 1);
    const signal = hourly >= goal ? 'green' : hourly >= goal * 0.9 ? 'yellow' : 'red';
    return { gross, km, returnKm, totalKm, minutes, waitMin, totalMinutes, fuel, maintenance, data, cost: fuel + maintenance + data, net, hourly, signal };
  }
  return { calculateOffer };
});
