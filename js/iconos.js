/* Íconos SVG de trazo único (24 px). Ninguna pantalla usa emojis como íconos. */

export const ICONS = {
  home: '<path d="m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  summary: '<path d="M5 20v-9m7 9V4m7 16v-6"/>',
  map: '<path d="m9 4-6 2.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5m6-11V20"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3 7.8 7.5 9.5 4.5-1.7 7.5-5 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/>',
  warn: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2m0 3h.01"/>',
  no: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<circle cx="12" cy="12" r="3"/><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4v7h-7"/>',
  fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M7 7h6v4H7zM15 8h2.5l2.5 2.5V17a1.5 1.5 0 0 1-3 0v-3"/>',
  bolt: '<path d="m13 2.5-8 11h6l-1 8 9-11.5h-6z"/>',
  battery: '<rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3M7 11.5v2M11 11.5v2"/>',
  pin: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  auto: '<path d="M5 17H3v-4l2-5h14l2 5v4h-2"/><path d="M3 13h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
  moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M8.5 16.5h5l3.5-7h-3.5M13.5 16.5 11 9.5H7.5M14 9.5l1.2-2.5H18"/>',
  bici: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 8h6l3.5 8.5M9 8l3 8.5H5.5M7.5 5.5H11M15 8l-1-2.5h2.5"/>',
  scooter: '<circle cx="6" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M8.5 18h8M17 18 14.5 5H18M12 18l2.2-6"/>'
};

export const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.arrow}</svg>`;

/* Ícono por categoría de vehículo. La bici eléctrica lleva el rayo; la bici sin motor, no. */
export const iconoCategoria = categoria => ({ auto: 'auto', moto: 'moto', scooter: 'scooter', 'bici-electrica': 'bici', bici: 'bici' })[categoria] || 'moto';
export const vehIcon = (v, cls = '') => `<span class="veh-ic ${cls}">${icon(iconoCategoria(v.categoria))}${v.energia === 'electricidad' ? `<i class="bolt">${icon('bolt')}</i>` : ''}</span>`;
