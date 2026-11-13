(function (root) {
  'use strict';
  const SIZE = 256;
  const W = 350;
  const H = 330;
  function project(lon, lat, zoom) {
    const scale = SIZE * 2 ** zoom;
    const safeLat = Math.max(-85.0511, Math.min(85.0511, lat));
    const sin = Math.sin(safeLat * Math.PI / 180);
    return { x: (lon + 180) / 360 * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
  }
  function layout(coordinates, preferredZoom) {
    if (!Array.isArray(coordinates) || !coordinates.length || coordinates.some(p => !Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) throw new Error('Geometría de ruta inválida');
    let zoom = preferredZoom;
    if (!Number.isInteger(zoom)) {
      for (zoom = 18; zoom > 10; zoom--) {
        const points = coordinates.map(p => project(p[0], p[1], zoom));
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        if (Math.max(...xs) - Math.min(...xs) < W - 78 && Math.max(...ys) - Math.min(...ys) < H - 78) break;
      }
    }
    zoom = Math.max(10, Math.min(18, zoom));
    const points = coordinates.map(p => project(p[0], p[1], zoom));
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const left = centerX - W / 2, top = centerY - H / 2;
    const tiles = [];
    const maxTile = 2 ** zoom - 1;
    for (let y = Math.max(0, Math.floor(top / SIZE)); y <= Math.min(maxTile, Math.floor((top + H) / SIZE)); y++) {
      for (let x = Math.max(0, Math.floor(left / SIZE)); x <= Math.min(maxTile, Math.floor((left + W) / SIZE)); x++) {
        tiles.push({ x, y, left: x * SIZE - left, top: y * SIZE - top, zoom });
      }
    }
    return { zoom, points: points.map(p => ({ x: p.x - left, y: p.y - top })), tiles };
  }
  const api = { layout, project };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UltimaMillaMap = api;
})(globalThis);
