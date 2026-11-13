const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateOffer } = require('./calc');

const offer = { gross: 4100, km: 3.2, returnKm: 1, minutes: 18, waitMin: 8 };
const settings = { fuelPrice: 1300, kwhPrice: 220, dataMonthly: 12000, hoursMonthly: 160, goal: 6000 };

test('el mismo pedido adapta su costo energético al vehículo', () => {
  const base = { consumption: 20, maintenance: 30 };
  const petrol = calculateOffer(offer, { ...base, type: 'fuel' }, settings);
  const electric = calculateOffer(offer, { ...base, type: 'electric' }, settings);
  const bicycle = calculateOffer(offer, { ...base, type: 'human' }, settings);
  assert.equal(bicycle.fuel, 0);
  assert.ok(electric.fuel > 0 && electric.fuel < petrol.fuel);
  assert.ok(bicycle.net > electric.net && electric.net > petrol.net);
  assert.equal(petrol.net, petrol.gross - petrol.cost);
});

test('la espera reduce el ingreso por hora y puede cambiar la recomendación', () => {
  const vehicle = { type: 'human', consumption: 1, maintenance: 0 };
  const fast = calculateOffer({ ...offer, waitMin: 0 }, vehicle, settings);
  const slow = calculateOffer({ ...offer, waitMin: 35 }, vehicle, settings);
  assert.ok(slow.hourly < fast.hourly);
  assert.equal(fast.signal, 'green');
  assert.equal(slow.signal, 'red');
});

test('un pedido deficitario nunca aparece como conveniente', () => {
  const result = calculateOffer({ ...offer, gross: 100, km: 30 }, { type: 'fuel', consumption: 10, maintenance: 100 }, settings);
  assert.ok(result.net < 0);
  assert.equal(result.signal, 'red');
});

test('la lectura por km incluye el regreso y no divide por cero', () => {
  const vehicle = { type: 'human', consumption: 1, maintenance: 0 };
  const noReturn = calculateOffer({ ...offer, returnKm: 0 }, vehicle, settings);
  const withReturn = calculateOffer({ ...offer, returnKm: 4 }, vehicle, settings);
  assert.ok(withReturn.netPerKm < noReturn.netPerKm);
  const noDistance = calculateOffer({ ...offer, km: 0, returnKm: 0 }, vehicle, settings);
  assert.equal(noDistance.netPerKm, 0);
  assert.ok(Number.isFinite(noDistance.netPerKm));
});
