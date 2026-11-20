/* Vistas: solo interfaz. Cada función devuelve HTML a partir del estado y de js/estado.js.
   No calculan costos ni consultan precios por su cuenta. */

import { S, PLATAFORMAS, DIRECT, hoy, dia, vehiculo, vehiculoBase, tieneEnergia, precio, calcOferta, porKm, rendimientoReal, ofertaManual, costear, todosLosJobs, agregar, recuperacion } from './estado.js';
import { money, moneyDec, fmtDec, escapeHtml, distanciaTexto, hace } from './formato.js';
import { icon, vehIcon } from './iconos.js';
import { CATEGORIAS, nombreCategoria, agrupar, buscar, nombreVehiculo } from './catalogo.js';
import { ZONAS } from './precios.js';
import { estimarCarga } from './costos.js';
import { ubicacionActual } from './energia.js';

const signalText = s => s === 'green' ? 'Conviene' : s === 'yellow' ? 'Justo' : 'No conviene';
const sigIcon = s => s === 'green' ? 'ok' : s === 'yellow' ? 'warn' : 'no';
const logo = p => `<span class="logo" aria-hidden="true">${p === 'Uber Eats' ? 'U' : p === 'PedidosYa' ? 'P' : p === 'Rappi' ? 'R' : '·'}</span>`;
const brandMark = () => '<svg class="mark" viewBox="0 0 44 24" aria-hidden="true"><path class="mk-line" d="M9 12h26"/><circle class="mk-a" cx="9" cy="12" r="5.5"/><circle class="mk-b" cx="35" cy="12" r="5.5"/></svg>';
const backButton = (label, attrs) => `<button class="back" ${attrs}>${icon('back', 'sm')}${label}</button>`;
const sentence = t => t.charAt(0).toUpperCase() + t.slice(1);
const unidadPrecio = pr => pr.unidad === 'kWh' ? 'kWh' : 'L';

let barraInferior = '';

/* ---------- Energía: un solo componente ---------- */
export function origenTexto(pr) {
  if (pr.origen === 'manual') return 'Precio que ingresaste. Reemplaza al de las estaciones.';
  if (pr.origen === 'estación más cercana') {
    const e = pr.estacion, edad = hace(pr.fecha);
    return `${e.nombre}, ${e.comuna} · a ${distanciaTexto(e.distanciaKm)}${edad ? ` · ${edad}` : ''}`;
  }
  if (pr.origen === 'mediana de tu zona') {
    const edad = hace(pr.fecha);
    return `Mediana de la zona ${pr.zona}${edad ? ` · ${edad}` : ''}`;
  }
  if (pr.clave === 'electricidad') return pr.referencia ? `Tarifa residencial estimada. Sin dato de tu zona: referencia de la Región Metropolitana.` : 'Tarifa residencial estimada, Región Metropolitana.';
  const f = pr.fecha ? new Date(`${pr.fecha}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }) : '';
  return `Valor de respaldo${f ? ` del ${f}` : ''}. Los precios en vivo no están disponibles ahora.`;
}

function simuladorCarga(v) {
  const s = S.state.settings;
  const bateria = Number(s.bateriaKwh) || Number(v.bateriaKwh) || 0;
  const carga = estimarCarga({ bateriaKwh: bateria, inicioPct: s.cargaInicio, finPct: s.cargaFin, cargadorKw: s.cargaKw }, precio(v), S.P);
  const campos = [['bateriaKwh', 'Capacidad de la batería', 'kWh', 0, 200, bateria], ['cargaKw', 'Potencia real del cargador', 'kW', 0.1, 350, s.cargaKw], ['cargaInicio', 'Carga actual', '%', 0, 100, s.cargaInicio], ['cargaFin', 'Carga deseada', '%', 0, 100, s.cargaFin]];
  return `<div class="charge-sim"><h3>Tu próxima carga</h3>${carga
    ? `<div class="charge-summary"><div><b>${money(carga.costo)}</b><span>Costo estimado</span></div><div><b>${fmtDec(carga.horas, 1)} h</b><span>Tiempo ideal</span></div></div>`
    : '<p class="note">Indica batería, potencia y porcentajes para calcular costo y tiempo.</p>'}${campos.map(campo => campoNumero(...campo)).join('')}<p class="note">Estimación con ${Math.round(S.P.electricidad.eficienciaCarga * 100)} % de eficiencia. La carga rápida baja de velocidad al final.</p></div>`;
}

function campoNumero(key, label, sufijo, min, max, valor, prefijo = '') {
  return `<div class="field"><label for="setting-${key}">${label}</label><div class="input-wrap"><span class="pre" aria-hidden="true">${prefijo}</span><input id="setting-${key}" class="num-input" type="text" inputmode="decimal" data-setting="${key}" data-min="${min}" data-max="${max}" value="${fmtDec(valor, 2)}" autocomplete="off"><span class="suf" aria-hidden="true">${sufijo}</span></div></div>`;
}

export function bloqueEnergia(v, { compacto = false } = {}) {
  if (!tieneEnergia(v)) return '';
  const pr = precio(v);
  const ub = ubicacionActual();
  const gps = S.ui.gps;
  const zonaDetalle = ub.origen === 'gps' ? `Zona detectada con tu ubicación${ub.region ? ` (${escapeHtml(ub.region)})` : ''}` : ub.origen === 'manual' ? 'Zona elegida por ti' : 'Zona inicial: Metropolitana';
  const comb = v.energia === 'gasolina';
  const manual = pr.origen === 'manual';
  const estimado = pr.estimado ? `<p class="note">Estimado. ${escapeHtml(pr.nota || '')}</p>` : '';
  const controles = compacto ? '' : `<div class="picker-controls">${comb ? `<label>Octanaje<select class="num-input" data-combustible aria-label="Octanaje">${['93', '95', '97'].map(g => `<option value="${g}" ${g === v.combustible ? 'selected' : ''}>${g}</option>`).join('')}</select></label>` : ''}<label class="${comb ? '' : 'span2'}">Zona<select data-zona aria-label="Zona de precios">${ZONAS.map(z => `<option value="${z}" ${z === ub.zona ? 'selected' : ''}>${z}</option>`).join('')}</select></label></div>
    <div class="field"><label for="precio-manual">Ajustar el precio que uso <span>$ por ${unidadPrecio(pr)}</span></label><div class="input-wrap"><span class="pre" aria-hidden="true">$</span><input id="precio-manual" class="num-input" type="text" inputmode="decimal" data-precio-manual autocomplete="off" placeholder="${fmtDec(pr.precio, 0)}" value="${manual ? fmtDec(pr.precio, 1) : ''}"><span class="suf" aria-hidden="true">/${unidadPrecio(pr)}</span></div></div>
    ${manual ? `<button class="btn outline block" data-action="quitar-manual">Quitar mi ajuste y volver al precio automático</button>` : ''}
    ${v.energia === 'electricidad' ? simuladorCarga(v) : ''}`;
  return `<section class="card energia-card" aria-labelledby="energia-titulo"><div class="section-head"><h2 id="energia-titulo">Tu energía</h2><span class="aside">Zona ${escapeHtml(ub.zona)}</span></div>
    <div class="price-highlight"><b>${money(pr.precio)}/${unidadPrecio(pr)}</b><span>${escapeHtml(pr.etiqueta)}</span></div>
    <p class="note origen">${escapeHtml(origenTexto(pr))}</p>${estimado}
    <button class="btn tonal block" data-action="usar-ubicacion" ${gps.estado === 'buscando' ? 'disabled aria-busy="true"' : ''}>${icon('locate', 'sm')}${gps.estado === 'buscando' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}</button>
    <p class="note" role="status" data-gps-status>${escapeHtml(gps.mensaje || `${zonaDetalle}. Usamos tu ubicación solo ahora, para encontrar la estación más cercana. No se guarda.`)}</p>${controles}</section>`;
}

/* ---------- Piezas comunes ---------- */
function evapBar({ net, energia, mantencion, datos, gross }, label) {
  const base = Math.max(gross, 1), cost = energia + mantencion + datos;
  const costPct = gross <= 0 ? 0 : net < 0 ? 100 : Math.min(100, cost / base * 100);
  const seg = (v, cls) => v > 0 ? `<i class="${cls}" style="flex:${v} 1 0"></i>` : '';
  return `<div class="evap ${gross <= 0 ? 'none' : ''}" role="img" aria-label="${escapeHtml(label)}"><span class="evap-costs" style="width:${costPct}%">${seg(energia, 'c1')}${seg(mantencion, 'c2')}${seg(datos, 'c3')}</span></div>`;
}

function head() {
  return `<header class="top"><div class="brand">${brandMark()}<span class="brand-name">Última Milla</span></div><div class="top-right"><span class="demo-chip"><i aria-hidden="true"></i>Demo · Perfil de Luis</span><button class="icon-btn" data-action="speed" aria-label="Probar bloqueo por movimiento" title="Probar bloqueo por movimiento">${icon('shield')}</button></div></header>`;
}

function nav() {
  const v = vehiculo();
  const tabs = [['inicio', 'home', 'Inicio'], ['oferta', 'calc', 'Evaluar'], ['resumen', 'summary', 'Resumen'], ['mapa', 'map', 'Mapa'], ['vehiculo', vehIconName(v), 'Vehículo']];
  return `<nav class="tabbar" aria-label="Navegación principal">${tabs.map(([id, ic, label]) => `<button class="tab" data-screen="${id}" aria-label="${label}" ${S.ui.screen === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${id === 'oferta' && S.state.pendingOffer ? '<i class="badge" aria-hidden="true"></i>' : ''}</button>`).join('')}</nav>`;
}
const vehIconName = v => ({ auto: 'auto', moto: 'moto', scooter: 'scooter' })[v.categoria] || 'bici';

function confirmarReinicio() {
  return `<div class="security" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-desc"><div class="sec-card"><span class="sec-icon neutral">${icon('refresh', 'lg')}</span><h2 id="reset-title" tabindex="-1">¿Reiniciar la demo?</h2><p id="reset-desc">Se borran tus cambios, tus pedidos y tu vehículo. Vuelve el perfil de Luis, con su moto Honda CB125F.</p><div class="btn-col"><button class="btn danger big block" data-action="reset-ok">Sí, reiniciar</button><button class="btn outline big block" data-action="reset-cancel">Cancelar</button></div></div></div>`;
}

function security() {
  return `<div class="security" role="alertdialog" aria-modal="true" aria-labelledby="security-title" aria-describedby="security-desc"><div class="sec-card"><span class="sec-icon">${icon('shield', 'lg')}</span><h2 id="security-title">Primero, detente</h2><p id="security-desc">Sobre 10 km/h bloqueamos los botones. Tu seguridad va primero.</p><div class="sec-speed">${S.ui.speed}<small>km/h</small></div><button class="btn primary big block" data-action="stop">Simular detención</button><p>Control simulado: no usa GPS.</p></div></div>`;
}

function incomingBanner() {
  const o = S.state.pendingOffer;
  if (!o || S.ui.screen === 'oferta') return '';
  return `<button class="incoming-banner" data-screen="oferta"><span class="live-dot on"></span><span class="ib-txt"><strong>${o.manual ? 'Tu pedido' : `Oferta de ${escapeHtml(o.platform)}`}</strong><small>${escapeHtml(o.restaurant)} · Toca para revisar</small></span>${icon('arrow', 'sm')}</button>`;
}

function shell(content) {
  const bloqueado = S.ui.speed > 10 || S.ui.confirmarReinicio;
  const entra = S.ui.lastScreen !== S.ui.screen;
  return `<div class="shell" ${bloqueado ? 'inert' : ''}><a class="skip-link" href="#main">Ir al contenido</a>${head()}<div class="net-banner" role="status" ${S.ui.online ? 'hidden' : ''}>Sin internet. El cálculo funciona igual; el mapa y los precios en vivo necesitan conexión.</div><main class="scroll" id="main" tabindex="-1"><div class="${entra ? 'enter ' : ''}stack">${incomingBanner()}${content}</div></main>${barraInferior}${nav()}</div>${S.ui.speed > 10 ? security() : ''}${S.ui.confirmarReinicio ? confirmarReinicio() : ''}<div class="toast-region" role="status" aria-live="polite"></div>`;
}

/* ---------- Prueba rápida ---------- */
function quickExamples() {
  return `<section class="quick" aria-labelledby="quick-title"><div class="section-head"><h2 id="quick-title">Prueba rápida</h2><span class="aside">Un toque y calcula</span></div><div class="quick-grid">${S.P.ejemplos.map(ex => {
    const c = calcOferta({ ...ofertaManual(ex.gross, ex.km), ...(ex.waitMin ? { waitMin: ex.waitMin } : {}) });
    return `<button class="quick-card ${c.signal}" data-example="${ex.id}"><span class="q-sig">${icon(sigIcon(c.signal), 'sm')}${signalText(c.signal)}</span><span class="q-name">${ex.label}</span><span class="q-data">${money(ex.gross)} · ${fmtDec(ex.km)} km${ex.waitMin ? ` · ${ex.waitMin} min de espera` : ''}</span>${ex.hint ? `<span class="q-hint">${ex.hint}</span>` : ''}</button>`;
  }).join('')}</div></section>`;
}

function shiftCard() {
  const on = S.state.shiftActive;
  return `<section class="card live-card"><h2><span class="live-dot ${on ? 'on' : ''}"></span>Turno ${on ? 'activo' : 'en pausa'}</h2><p class="note">${on ? 'Llegan ofertas de ejemplo de tus plataformas activas.' : 'Inicia el turno para recibir ofertas de ejemplo.'} No lee notificaciones ni pedidos reales.</p><button class="btn ${on ? 'outline' : 'tonal'} block" data-action="${on ? 'shift-pause' : 'shift-start'}">${on ? 'Pausar turno' : 'Iniciar turno'}</button></section>`;
}

const tipoCarga = v => v.energia === 'electricidad' ? { nombre: 'batería', unidad: 'kWh', icono: 'battery' } : { nombre: v.energia === 'diesel' ? 'diésel' : 'bencina', unidad: 'L', icono: 'fuel' };

function refuelSummary(v) {
  if (!tieneEnergia(v)) return '';
  const t = tipoCarga(v), ultima = S.state.refuels.at(-1);
  return `<section class="card refuel-card"><div class="section-head"><h2>Cargas de ${t.nombre}</h2><span class="aside">${S.state.refuels.length} registradas</span></div><p class="note">${ultima ? `Última: ${money(ultima.amount)} · ${fmtDec(ultima.cantidad, 2)} ${ultima.unidad} · ${escapeHtml(ultima.station)}.` : `Registra una carga de ${t.nombre} al terminar.`}</p><button class="btn outline block" data-screen="carga">${icon(t.icono, 'sm')}Registrar carga de ${t.nombre}</button></section>`;
}

function cargasRegistradas(v) {
  if (!tieneEnergia(v) || !S.state.refuels.length) return '';
  const recientes = S.state.refuels.slice(-5).reverse();
  const total = S.state.refuels.reduce((t, i) => t + i.amount, 0);
  return `<section class="card"><div class="section-head"><h2>Cargas registradas</h2><span class="aside">${money(total)} en total</span></div><p class="note">Gasto pagado, separado del costo estimado por km de cada pedido.</p>${recientes.map(i => `<div class="row"><span class="row-ic">${icon(i.unidad === 'kWh' ? 'battery' : 'fuel', 'sm')}</span><span class="main"><span class="t1">${escapeHtml(i.station)}</span><span class="t2">${new Date(i.at).toLocaleDateString('es-CL')} · ${fmtDec(i.cantidad, 2)} ${i.unidad} · ${escapeHtml(i.etiqueta)}</span></span><span class="amt">${money(i.amount)}</span></div>`).join('')}</section>`;
}

function offerWaitCard(offer) {
  const count = Number(offer.waitCount) || 0;
  const source = offer.waitSource === 'promedio' && count >= 2 ? `Promedio de ${count} esperas que mediste aquí`
    : offer.waitSource === 'ultima' && count === 1 ? 'Tu última espera medida aquí'
      : offer.waitSource === 'manual' ? 'Espera que ingresaste para este pedido'
        : offer.manual ? 'Estimación orientativa; puedes editarla' : 'Estimación para esta oferta de prueba';
  return `<section class="wait-insight" aria-label="Espera en el restaurante">${icon('clock', 'lg')}<div><strong>${Number(offer.waitMin) || 0} min de espera ${offer.restaurant === 'Restaurante no indicado' ? 'en el local' : `en ${escapeHtml(offer.restaurant)}`}</strong><p>${source}. No es un dato en vivo del restaurante.</p></div></section>`;
}

function filasCosto(c, etiqueta, { signo = false, clase = 'eq-row' } = {}) {
  const fila = (nombre, valor, minus) => `<div class="${clase} ${minus ? 'minus' : ''}"><span>${nombre}</span><b>${minus ? '−' : ''}${money(valor)}</b></div>`;
  return `${etiqueta ? fila(etiqueta, c.energia, true) : ''}${fila('Mantención', c.mantencion, true)}${fila('Datos móviles', c.datos, true)}`;
}

/* ---------- Inicio ---------- */
function home() {
  const v = vehiculo(), pr = precio(v);
  const jobs = todosLosJobs().filter(j => j.date === hoy() && j.status === 'completed');
  const t = agregar(jobs);
  const costos = t.energia + t.mantencion + t.datos;
  const recientes = todosLosJobs().slice(-4).reverse();
  const nombre = 'Luis';
  const fechaRaw = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="greet"><h1 class="title" id="page-title" tabindex="-1">Hola, ${nombre}.</h1><p class="lead">${sentence(fechaRaw)}</p></div><section class="hero" aria-label="Ganancia neta de hoy"><p class="label">Te queda hoy</p><div class="money" data-count="${Math.round(t.net)}">${money(t.net)}</div>${evapBar({ ...t }, `${money(t.net)} netos de ${money(t.gross)} brutos`)}<p class="sub">De ${money(t.gross)} brutos, ${money(costos)} se fueron en costos.</p><dl class="hero-stats"><div><dt>Por hora</dt><dd>${money(t.hourly)}</dd></div><div><dt>Pedidos</dt><dd>${jobs.length}</dd></div><div><dt>Sin pedido</dt><dd>${fmtDec(t.emptyKm, 1)} km</dd></div></dl></section><button class="btn primary big block" data-screen="oferta">Evaluar un pedido ${icon('arrow', 'sm')}</button>${quickExamples()}${shiftCard()}${S.state.lastOutcomeId ? `<button class="last-result" data-screen="resultado">Ver último resultado ${icon('arrow', 'sm')}</button>` : ''}${bloqueEnergia(v, { compacto: true })}${refuelSummary(v)}<section><div class="section-head"><h2>Plataformas</h2><span class="aside">Conexión simulada</span></div><div class="chips">${PLATAFORMAS.map(p => `<span class="chip ${S.state.connected.includes(p) ? '' : 'off'}">${logo(p)}${p}<small>${S.state.connected.includes(p) ? 'Activa' : 'Apagada'}</small></span>`).join('')}</div></section><section><div class="section-head"><h2>Actividad reciente</h2><button class="btn link" data-screen="resumen">Ver todo</button></div><div class="card">${recientes.length ? recientes.map(j => `<div class="row"><span class="row-ic">${logo(j.platform)}</span><span class="main"><span class="t1">${escapeHtml(j.platform)}</span><span class="t2">${j.status === 'rejected' ? 'Oferta rechazada' : escapeHtml(j.restaurant)} · ${j.date === hoy() ? 'Hoy' : j.date.slice(5)}</span></span><span class="amt ${j.status === 'rejected' ? 'muted' : ''}">${j.status === 'rejected' ? 'Rechazada' : money(costear(j).net)}</span></div>`).join('') : '<div class="empty"><h2>Aún no hay entregas</h2><p>Cuando completes una, aparecerá aquí.</p></div>'}</div></section>${demoCard()}`;
}

function demoCard() {
  return `<section class="card demo-card"><h2>Demo del perfil de Luis</h2><p class="note">Moto Honda CB125F y meta de $5.000 por hora. Lo que pruebes se guarda solo en este teléfono. Cifras de demostración; no recibe ofertas reales.</p><button class="btn outline block" data-action="reset">${icon('refresh', 'sm')}Reiniciar demo</button></section>`;
}

/* ---------- Pedido en curso ---------- */
function mensajeGps() {
  const g = S.ui.pedidoGps, d = S.state.activeDelivery;
  if (!d?.medirGps) return 'Apagado. Se usan los km que escribiste.';
  if (g.estado === 'simulado') return 'Sin permiso de GPS. La demo simula el recorrido y lo marca como simulado.';
  if (g.estado === 'midiendo') return `Midiendo con GPS. Se descartan puntos con precisión peor que ${S.P.gps.precisionMinM} m.`;
  if (g.estado === 'error') return 'El GPS no responde. Se usan los km que escribiste.';
  return 'Empieza a medir cuando retiras el pedido. Los km no salen del teléfono.';
}

function deliveryActions(d, calc) {
  const steps = [['accepted', 'Aceptado'], ['arrived', 'En el local'], ['picked', 'En camino']];
  const activo = steps.findIndex(([s]) => s === d.stage);
  const detalle = d.stage === 'accepted' ? 'Ve al local. Al llegar, toca el botón y el cronómetro mide la espera solo.'
    : d.stage === 'arrived' ? 'El cronómetro corre hasta que retires el pedido.'
      : 'Pedido retirado. Registra la entrega al llegar al destino.';
  const accion = d.stage === 'accepted' ? 'start-wait' : d.stage === 'arrived' ? 'pickup-order' : 'finish-delivery';
  const etiqueta = d.stage === 'accepted' ? 'Llegué al local' : d.stage === 'arrived' ? 'Retiré el pedido' : 'Entregué el pedido';
  const g = S.ui.pedidoGps;
  return `<section class="card journey" aria-label="Estado del pedido"><h2>Pedido en curso</h2><ol class="journey-steps">${steps.map(([s, n], i) => `<li class="${i < activo ? 'done' : i === activo ? 'active' : ''}" ${i === activo ? 'aria-current="step"' : ''}><span aria-hidden="true">${i < activo ? icon('check', 'sm') : i + 1}</span><b>${n}</b></li>`).join('')}</ol><p class="journey-detail">${detalle}</p>${d.stage === 'arrived' ? `<p class="journey-timer">Espera medida <strong id="wait-timer">00:00</strong></p><p class="note">Referencia de la oferta: ${calc.waitMin} min de espera.</p>` : d.stage === 'picked' ? `<p class="note">Espera en el local: ${d.measuredWaitMin} min medidos.</p>` : ''}
    <button class="switch-row" role="switch" aria-checked="${d.medirGps ? 'true' : 'false'}" data-action="toggle-gps"><span class="sw-txt"><b>Medir km con GPS</b><small data-gps-pedido-msg>${escapeHtml(mensajeGps())}</small></span><span class="sw-track" aria-hidden="true"><i></i></span></button>
    ${d.stage === 'picked' && d.medirGps ? `<p class="journey-timer">Recorrido medido <strong id="km-medido">${fmtDec(g.km, 1)} km</strong></p>` : ''}
    <button class="btn accept big block" data-action="${accion}">${etiqueta}</button><button class="btn outline block" data-screen="mapa">${icon('map', 'sm')}Ver mapa de prueba</button><p class="note">El mapa muestra un retiro ilustrativo, no el destino de este pedido.</p></section>`;
}

/* ---------- Evaluar ---------- */
const FIELD_ERR = (id, texto) => `<p class="field-error" id="err-${id}" role="alert" ${texto ? '' : 'hidden'}>${escapeHtml(texto || '')}</p>`;

function manualForm() {
  const d = S.ui.manualDraft;
  const val = (v, dec) => v === undefined || v === null || v === '' ? '' : dec ? fmtDec(v) : v;
  return `<section class="card manual-card"><h2>Escribe tu pedido</h2><p class="note">Solo necesitas 2 datos para empezar.</p><form id="manual-offer-form" class="form" novalidate><label for="manual-gross">Pago ofrecido <span>CLP</span></label><input id="manual-gross" name="gross" class="big-input num-input" type="text" inputmode="numeric" autocomplete="off" placeholder="Ej.: 4100" value="${val(d?.gross)}" aria-describedby="err-gross">${FIELD_ERR('gross')}<label for="manual-km">Distancia del pedido <span>km</span></label><input id="manual-km" name="km" class="big-input num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej.: 3,2" value="${val(d?.km, true)}" aria-describedby="err-km">${FIELD_ERR('km')}<details class="manual-more" ${[d?.minutes, d?.waitMin, d?.returnKm, d?.restaurant].some(v => v !== '' && v != null) ? 'open' : ''}><summary>Ajustar tiempo y contexto <span>Opcional</span></summary><div class="manual-extra"><label for="manual-platform">Plataforma</label><select id="manual-platform" name="platform">${[...PLATAFORMAS, 'Otra'].map(p => `<option ${d?.platform === p ? 'selected' : ''}>${p}</option>`).join('')}</select><label for="manual-restaurant">Restaurante</label><input id="manual-restaurant" name="restaurant" maxlength="60" autocomplete="off" placeholder="Si lo conoces" value="${escapeHtml(d?.restaurant || '')}"><label for="manual-minutes">Tiempo de viaje <span>min · si no lo sabes, lo estimamos</span></label><input id="manual-minutes" name="minutes" class="num-input" type="text" inputmode="numeric" autocomplete="off" placeholder="Estimado según distancia" value="${val(d?.minutes)}" aria-describedby="err-minutes">${FIELD_ERR('minutes')}<label for="manual-wait">Espera en el local <span>min</span></label><input id="manual-wait" name="waitMin" class="num-input" type="text" inputmode="numeric" autocomplete="off" placeholder="${S.P.ofertaManual.esperaMin} min si no la sabes" value="${val(d?.waitMin)}" aria-describedby="err-waitMin">${FIELD_ERR('waitMin')}<label for="manual-return">Regreso sin pedido <span>km</span></label><input id="manual-return" name="returnKm" class="num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="La mitad de la distancia si no lo sabes" value="${val(d?.returnKm, true)}" aria-describedby="err-returnKm">${FIELD_ERR('returnKm')}</div></details><button class="btn primary big block" type="submit">Calcular cuánto me queda ${icon('arrow', 'sm')}</button><p class="manual-trust">${icon('shield', 'sm')}<span>No pedimos tu clave ni tocamos la app de reparto. Nunca aceptamos un pedido por ti.</span></p></form></section>`;
}

function offerPage() {
  const cur = S.state.pendingOffer, act = S.state.activeDelivery;
  if (!cur && !act) return `<div class="decision-intro"><h1 class="title" id="page-title" tabindex="-1">¿Cuánto me queda?</h1><p class="lead">Escribe el pago y los km de una oferta antes de aceptarla, o prueba un ejemplo.</p></div>${quickExamples()}${manualForm()}<div class="demo-separator"><span>O prueba el recorrido completo</span></div><button class="btn outline block" data-action="simulate">Recibir una oferta de ejemplo</button><p class="note center">Estimación, no ingreso garantizado. La app no lee pedidos reales.</p>`;
  const raw = cur || act.offer;
  const o = { ...raw };
  const calc = calcOferta(raw);
  const v = vehiculo(), pr = precio(v);
  const decision = calc.signal === 'green' ? 'Aceptar' : calc.signal === 'yellow' ? 'Revisar antes de aceptar' : 'Rechazar';
  const ratio = Math.max(0, Math.min(100, calc.hourly / S.state.settings.meta * 70));
  const costos = Math.max(0, calc.cost);
  const rise = act ? '' : 'rise';
  const retorno = o.manual ? (o.returnEstimated ? 'Calculado con tus costos y un regreso estimado de la mitad del recorrido.' : o.returnKm > 0 ? 'Calculado con tus costos y el regreso que indicaste.' : 'Calculado con tus costos. No incluye regreso sin pedido.') : 'Calculado con tus costos y el regreso sin pedido.';
  const volver = act ? '' : o.manual ? backButton('Editar datos', 'data-action="edit-manual"') : backButton('Inicio', 'data-screen="inicio"');
  const trampa = raw.example === 'trampa' ? `<aside class="callout ${rise}" style="--i:4">${icon('warn')}<p><b>Por qué es una trampa.</b> Paga más que el pedido bueno, pero los km y la espera de ${calc.waitMin} min te quitan tiempo. Rinde menos por hora.</p></aside>` : '';
  const leyendaEnergia = pr ? `<li><span class="sw c1"></span><span>${escapeHtml(pr.etiqueta)}</span><b>${money(calc.energia)}</b></li>` : '';
  if (!act) barraInferior = `<div class="decide-bar"><div class="decide ${calc.signal === 'red' ? 'red' : ''}"><button class="btn reject" data-action="reject">Rechazar</button><button class="btn accept" data-action="accept">Aceptar pedido</button></div></div>`;
  return `${volver}<div class="${rise}" style="--i:0"><h1 class="title" id="page-title" tabindex="-1">¿Me conviene?</h1><p class="lead">${act ? 'Pedido aceptado' : o.manual ? 'Tus datos' : 'Nueva oferta'} · ${escapeHtml(o.platform)} · ${escapeHtml(o.from)} → ${escapeHtml(o.to)} · ${escapeHtml(o.restaurant)}</p></div><section class="verdict ${calc.signal} ${rise}" style="--i:1" role="status"><div class="v-top"><span class="v-badge">${icon(sigIcon(calc.signal), 'sm')}${signalText(calc.signal)}</span><span class="v-rec">${act ? 'Estado aceptado' : `Recomendación: ${decision}`}</span></div><div class="v-net"><span class="lbl">Te quedaría</span><strong class="big-num ${calc.net < 0 ? 'neg' : ''}" data-count="${Math.round(calc.net)}">${money(calc.net)}</strong><span class="of">De ${money(calc.gross)} que paga la plataforma</span></div>${evapBar(calc, `Pago: ${money(calc.net)} netos y ${money(costos)} en costos`)}<ul class="legend"><li><span class="sw net"></span>Neto <b>${money(calc.net)}</b></li>${leyendaEnergia}<li><span class="sw c2"></span>Mantención <b>${money(calc.mantencion)}</b></li><li><span class="sw c3"></span>Datos <b>${money(calc.datos)}</b></li></ul>${pr ? `<p class="v-price">${escapeHtml(pr.etiqueta)} a ${money(pr.precio)}/${unidadPrecio(pr)} · ${escapeHtml(pr.origen)}</p>` : ''}<p class="v-sub">${calc.signal === 'red' ? 'Por debajo de tu meta por hora. ' : ''}${retorno}</p></section><section class="card hourly ${rise}" style="--i:2" aria-label="Rentabilidad estimada"><div class="hr-top"><div><span class="lbl">Neto por hora</span><strong class="num">${money(calc.hourly)}<small>/h</small></strong></div><div><span class="lbl">Neto por km</span><strong class="num">${money(calc.netPerKm)}<small>/km</small></strong></div></div><div class="gauge-track" role="img" aria-label="${money(calc.hourly)} por hora frente a una meta de ${money(S.state.settings.meta)}"><div class="gauge-fill ${calc.signal} grow" style="width:${ratio}%"></div><span class="goal-mark" style="left:70%"><em>Meta ${money(S.state.settings.meta)}/h</em></span></div><dl class="facts"><div class="fact"><dt>Viaje</dt><dd>${fmtDec(calc.km, 1)} km</dd></div><div class="fact"><dt>Regreso</dt><dd>${fmtDec(calc.returnKm, 1)} km</dd></div><div class="fact"><dt>Tiempo total</dt><dd>${calc.totalMinutes} min</dd></div></dl><p class="note">Tiempo: ${calc.minutes} min de viaje + ${calc.waitMin} min de espera. Distancia: ${fmtDec(calc.totalKm, 1)} km en total. Por km incluye el regreso. Valores estimados, no ingresos garantizados.</p></section>${trampa}<div class="${rise}" style="--i:3">${offerWaitCard(raw)}</div>${o.manual ? `<p class="note ctx">${raw.minutesEstimated ? 'Tiempo de viaje estimado según distancia. ' : 'Tiempo de viaje ingresado por ti. '}${raw.waitSource === 'manual' ? 'Espera ingresada por ti. ' : 'Espera orientativa o de tu historial. '}No usa tráfico en vivo.</p>` : ''}${act ? deliveryActions(act, calc) : `<button class="btn outline block" data-screen="mapa">${icon('map', 'sm')}Ver ruta ilustrativa</button>`}<p class="note center">${o.manual ? 'Estimación orientativa con datos ingresados por ti; no recibe ofertas reales.' : 'Estimación de demostración; no recibe ofertas reales.'}</p>`;
}

/* ---------- Resultado ---------- */
function platformComparison() {
  const filas = PLATAFORMAS.map(name => {
    const jobs = todosLosJobs().filter(j => j.status === 'completed' && j.platform === name);
    return { name, count: jobs.length, net: agregar(jobs).net };
  });
  return `<section class="card platform-comparison"><h2>¿Qué plataforma te rindió más?</h2><p class="note">Entregas de Luis y las tuyas, calculadas con tu vehículo actual.</p>${filas.map(f => `<div class="eq-row"><span>${escapeHtml(f.name)} <small>· ${f.count} ${f.count === 1 ? 'entrega' : 'entregas'}</small></span><b>${money(f.net)}</b></div>`).join('')}<p class="note">El total depende de cuántos pedidos hiciste; no predice la próxima oferta.</p></section>`;
}

function resultPage() {
  const job = S.state.jobs.find(j => j.id === S.state.lastOutcomeId);
  if (!job) return `<div><h1 class="title" id="page-title" tabindex="-1">Sin resultado</h1><p class="lead">Completa o rechaza una oferta de prueba para ver el cierre.</p></div><button class="btn primary block" data-action="simulate">Simular oferta</button>`;
  const pr = precio();
  const completed = job.status === 'completed';
  const c = costear(job);
  const platformJobs = todosLosJobs().filter(j => j.status === 'completed' && j.platform === job.platform);
  const platformTotals = agregar(platformJobs);
  const kmNota = job.kmFuente === 'gps' ? 'medida con GPS' : job.kmFuente === 'simulado' ? 'simulada, sin permiso de GPS' : 'escrita por ti';
  return `${backButton('Inicio', 'data-screen="inicio"')}<div class="result-heading"><h1 class="title" id="page-title" tabindex="-1">${completed ? 'Pedido entregado' : 'Oferta rechazada'}</h1><p class="lead">Simulación · ${escapeHtml(job.platform)} · ${escapeHtml(job.restaurant)} · ${job.time}</p></div>${completed ? `<section class="result-hero" aria-label="Resultado de la entrega"><span>Te quedaría por esta entrega</span><strong data-count="${Math.round(c.net)}">${money(c.net)}</strong>${evapBar(c, `${money(c.net)} netos de ${money(c.gross)} brutos`)}<p>Pago ${money(c.gross)} · costos estimados ${money(c.cost)}</p></section><section class="card"><h2>Así se calcula</h2><div class="eq-row"><span>Pago de la plataforma</span><b>${money(c.gross)}</b></div>${filasCosto(c, pr?.etiqueta)}<div class="eq-row eq-total"><span>Neto estimado</span><b>${money(c.net)}</b></div>${pr ? `<p class="note">${escapeHtml(pr.etiqueta)} a ${money(pr.precio)}/${unidadPrecio(pr)}: ${escapeHtml(origenTexto(pr))}</p>` : ''}</section><section class="result-facts"><div><span>Tiempo total</span><b>${c.totalMinutes} min</b><small>estimado</small></div><div><span>Espera en local</span><b>${c.waitMin} min</b><small>${escapeHtml(job.waitSource || 'estimada')}</small></div><div><span>Distancia total</span><b>${fmtDec(c.totalKm, 1)} km</b><small>viaje ${kmNota}</small></div></section>` : `<section class="card result-rejected"><h2>No se registró ganancia</h2><p>La oferta se rechazó. Habría dejado ${money(c.net)} netos estimados (${money(c.hourly)}/h), según los costos de tu vehículo actual.</p><p class="note">Rechazar no garantiza que llegue otra oferta mejor.</p></section>`}<section class="card"><h2>${escapeHtml(job.platform)} en tu historial</h2><div class="eq-row"><span>Entregas registradas</span><b>${platformJobs.length}</b></div><div class="eq-row"><span>Neto acumulado</span><b>${money(platformTotals.net)}</b></div><div class="eq-row"><span>Promedio por entrega</span><b>${platformJobs.length ? money(platformTotals.net / platformJobs.length) : 'Sin dato'}</b></div><p class="note">Incluye el historial de ejemplo de Luis y lo que hayas probado en este navegador. No hay sincronización con ${escapeHtml(job.platform)}.</p></section>${platformComparison()}<div class="result-actions"><button class="btn primary block" data-screen="resumen">Ver resumen completo</button><button class="btn outline block" data-action="simulate">Probar otra oferta</button></div>`;
}

/* ---------- Resumen ---------- */
export function jobsDelPeriodo() {
  const desde = S.ui.period === 'día' ? dia(0) : S.ui.period === 'semana' ? dia(6) : dia(29);
  return todosLosJobs().filter(j => j.date >= desde);
}

function chart(jobs) {
  const dias = S.ui.period === 'día' ? 1 : S.ui.period === 'semana' ? 7 : 30;
  const buckets = Array.from({ length: dias }, (_, i) => { const date = dia(dias - 1 - i); return { date, net: agregar(jobs.filter(j => j.date === date)).net }; });
  const max = Math.max(1, ...buckets.map(b => b.net));
  return `<div class="chart-wrap"><div class="chart-scale"><span>${money(max)}</span><span>${money(0)}</span></div><div class="bars ${dias === 30 ? 'month' : ''} grow" role="img" aria-label="Ganancia neta por día: ${buckets.map(b => `${b.date}: ${money(b.net)}`).join('; ')}">${buckets.map((b, i) => `<div class="col"><div class="track"><div class="bar ${i === dias - 1 ? 'today' : ''} ${b.net ? '' : 'zero'}" style="--h:${Math.max(3, b.net / max * 100)}%;--i:${i}" title="${b.date}: ${money(b.net)}"></div></div><small>${dias === 1 ? 'Hoy' : dias === 7 ? new Date(`${b.date}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short' }).slice(0, 2) : b.date.slice(8)}</small></div>`).join('')}</div></div>`;
}

function summary() {
  const v = vehiculo(), pr = precio(v);
  const jobs = jobsDelPeriodo(), t = agregar(jobs);
  const label = S.ui.period === 'día' ? 'hoy' : S.ui.period === 'semana' ? 'últimos 7 días' : 'últimos 30 días';
  const seg = `<div class="seg" role="group" aria-label="Período">${[['día', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([id, n]) => `<button data-period="${id}" aria-pressed="${S.ui.period === id}">${n}</button>`).join('')}</div>`;
  if (!t.count) return `<div><h1 class="title" id="page-title" tabindex="-1">Resumen</h1><p class="lead">Datos de ${label}.</p></div>${seg}<div class="card empty"><span class="empty-ic">${icon('summary', 'lg')}</span><h2>Aún no hay entregas</h2><p>Al registrar una entrega, verás aquí lo ganado y lo gastado.</p><button class="btn primary" data-action="simulate">Simular oferta</button></div>`;
  const porPlataforma = PLATAFORMAS.map(p => ({ p, net: agregar(jobs.filter(j => j.platform === p)).net }));
  const max = Math.max(1, ...porPlataforma.map(x => x.net));
  const gastado = t.energia + t.mantencion + t.datos;
  const { inversion, net: neto, restante, progreso } = recuperacion();
  const conceptos = [pr ? pr.etiqueta : null, 'mantención', 'datos móviles'].filter(Boolean);
  const filaEnergia = pr ? `<div class="eq-row minus"><span>${escapeHtml(pr.etiqueta)}</span><b>−${money(t.energia)}</b></div>` : '';
  const gEnergia = pr ? `<div><span class="lbl"><i class="sw c1"></i><span>${escapeHtml(pr.etiqueta)}</span></span><b>${money(t.energia)}</b></div>` : '';
  return `<div><h1 class="title" id="page-title" tabindex="-1">Resumen</h1><p class="lead">Datos de ${label}. ${S.ui.period === 'día' ? 'Caso de Luis · cifras de demostración.' : 'Historial ilustrativo de 30 días.'} Calculado con ${escapeHtml(nombreVehiculo(v))}.</p></div>${seg}<section class="card"><h2>Lo que queda</h2><div class="sum-big ${t.net < 0 ? 'neg' : ''}" data-count="${Math.round(t.net)}">${money(t.net)}</div>${evapBar(t, `${money(t.net)} netos de ${money(t.gross)} brutos`)}<div class="eq-row"><span>Ganado bruto</span><b>${money(t.gross)}</b></div>${filaEnergia}<div class="eq-row minus"><span>Mantención</span><b>−${money(t.mantencion)}</b></div><div class="eq-row minus"><span>Datos móviles</span><b>−${money(t.datos)}</b></div><div class="eq-row eq-total ${t.net < 0 ? 'neg' : ''}"><span>Ganancia neta</span><b>${money(t.net)}</b></div><p class="note">Neto = bruto menos ${conceptos.map(c => c.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' y $1')}.</p></section><div class="stats"><dl class="stat"><dt>Horas trabajadas</dt><dd>${fmtDec(t.realHours, 1)} h</dd></dl><dl class="stat"><dt>Ganancia por hora</dt><dd>${money(t.hourly)}<small>/h</small></dd></dl><dl class="stat"><dt>Pedidos entregados</dt><dd>${t.count}</dd></dl><dl class="stat"><dt>Km sin pedido</dt><dd>${fmtDec(t.emptyKm, 1)} km</dd></dl></div><section class="card"><h2>En qué se fue</h2><div class="rows">${gEnergia}<div><span class="lbl"><i class="sw c2"></i>Mantención</span><b>${money(t.mantencion)}</b></div><div><span class="lbl"><i class="sw c3"></i>Datos móviles</span><b>${money(t.datos)}</b></div><div class="total"><span class="lbl">Gastado total</span><b>${money(gastado)}</b></div></div></section><section class="card"><h2>Invertido en el vehículo</h2><dl class="inv-grid"><div><dt>Inversión</dt><dd>${inversion ? money(inversion) : 'Sin dato'}</dd></div><div><dt>Neto acumulado</dt><dd>${money(neto)}</dd></div><div><dt>Por recuperar*</dt><dd>${inversion ? money(restante) : 'Sin dato'}</dd></div></dl><div class="progress grow"><span style="width:${progreso}%"></span></div><p class="note">* Comparación ilustrativa. No equivale a amortización contable. ${inversion ? '' : 'Escribe lo que invertiste en la pestaña Vehículo.'}</p></section><section class="card"><h2>Ganancia por día</h2>${chart(jobs)}</section><section class="card"><h2>Por plataforma</h2>${porPlataforma.map(x => `<div class="plat"><span class="pname">${x.p}</span><div class="pbar"><span style="width:${Math.max(0, x.net / max * 100)}%"></span></div><span class="amt">${money(x.net)}</span></div>`).join('')}</section><p class="note center">${t.rejected} ofertas rechazadas · ${Math.round(t.waitMin)} min de espera estimada o medida. Cifras de demostración.</p>${cargasRegistradas(v)}`;
}

/* ---------- Mapa ---------- */
function routeMap() {
  const r = S.ui.ruta;
  if (!r.datos) return `<div class="route-empty"><b>${icon('map', 'lg')}</b><strong>El mapa aparecerá aquí</strong><span>Usa tu GPS o prueba con un origen de ejemplo.</span></div>`;
  const view = globalThis.UltimaMillaMap.layout(r.datos.coordinates, r.zoom);
  const path = view.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const [a, b] = [view.points[0], view.points.at(-1)];
  const tiles = view.tiles.map(t => `<image href="https://tile.openstreetmap.org/${t.zoom}/${t.x}/${t.y}.png" x="${t.left.toFixed(1)}" y="${t.top.toFixed(1)}" width="256" height="256"/>`).join('');
  return `<div class="route-map-wrap"><svg class="route-map" viewBox="0 0 350 330" role="img" aria-label="Ruta por calles hacia ${escapeHtml(r.datos.stop.address)}"><rect width="350" height="330" class="map-bg"/>${tiles}<path d="${path}" class="rt-case"/><path d="${path}" class="rt-line"/><circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="9" class="st-a"/><circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="9" class="st-b"/></svg><div class="route-map-controls"><button data-action="route-zoom-in" aria-label="Acercar mapa">${icon('plus')}</button><button data-action="route-zoom-out" aria-label="Alejar mapa">${icon('minus')}</button><button data-action="route-fit" aria-label="Ajustar ruta">${icon('fit')}</button></div><span class="map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></span></div>`;
}

function routePage() {
  const r = S.ui.ruta, d = r.datos, stop = d?.stop, online = S.ui.online;
  const eta = d ? Math.max(1, Math.ceil(d.duration / 60)) : 0;
  const bici = ['bici', 'bici-electrica'].includes(vehiculo().categoria);
  const navUrl = d ? (S.state.settings.navApp === 'waze'
    ? `https://waze.com/ul?ll=${stop.lat}%2C${stop.lon}&navigate=yes`
    : `https://www.google.com/maps/dir/?api=1&origin=${d.origin.lat}%2C${d.origin.lon}&destination=${stop.lat}%2C${stop.lon}&travelmode=${bici ? 'bicycling' : 'driving'}`) : '';
  return `<div><h1 class="title" id="page-title" tabindex="-1">Ruta a un retiro</h1><p class="lead">Una ruta de prueba por calles. El pedido y el retiro son ejemplos.</p></div><section class="card route-card"><div class="route-card-head"><span class="route-badge">RUTA DE PRUEBA</span><span>${online ? 'Con conexión' : 'Sin conexión'}</span></div><h2>${stop ? escapeHtml(stop.name) : '¿Desde dónde partimos?'}</h2><p class="route-address">${stop ? escapeHtml(stop.address) + ', Providencia' : 'El punto de retiro se elegirá al crear la ruta.'}</p>${!d ? `<div class="route-actions"><button class="btn primary" data-action="route-gps" ${r.cargando || !online ? 'disabled' : ''}>${r.cargando ? 'Creando ruta…' : 'Crear ruta con mi GPS'}</button><button class="btn outline" data-action="route-demo" ${r.cargando || !online ? 'disabled' : ''}>Probar sin GPS</button></div>` : ''}<p class="route-status" role="status">${escapeHtml(r.estado)}</p>${routeMap()}${d ? `<div class="route-metrics"><div><b>${eta} min</b><span>ETA base, sin tráfico</span></div><div><b>${fmtDec(d.distance / 1000, 1)} km</b><span>Por calles</span></div></div><label class="route-wait">Espera que tú observes <small>Opcional, no en vivo</small><select class="num-input" data-route-wait aria-label="Espera observada en el local">${[0, 5, 10, 15, 20].map(n => `<option value="${n}" ${r.espera === n ? 'selected' : ''}>${n} min</option>`).join('')}</select></label><p class="route-total">Llegada + espera indicada <b>${eta + r.espera} min</b></p><label class="zone-label">Abrir navegación con<select data-nav-app aria-label="Aplicación de navegación"><option value="waze" ${S.state.settings.navApp === 'waze' ? 'selected' : ''}>Waze</option><option value="google" ${S.state.settings.navApp === 'google' ? 'selected' : ''}>Google Maps</option></select></label><div class="route-actions"><button class="btn outline" data-action="route-another">Otro retiro</button><a class="btn primary" href="${navUrl}" target="_blank" rel="noopener noreferrer">Abrir navegación</a></div><p class="note">Waze abre el destino y calcula desde la ubicación actual. Google Maps recibe origen y destino. Ninguno incluye una espera real del local. La ruta de vista previa es vial para auto.</p>` : '<p class="note">Al crear la ruta se consulta un servicio externo con origen y destino. El mapa usa OpenStreetMap. Tu ubicación no se guarda en el perfil.</p>'}</section>`;
}

/* ---------- Vehículo ---------- */
function etiquetaConsumo(v) {
  if (!tieneEnergia(v)) return 'Sin motor';
  return `${fmtDec(rendimientoReal(v), 1)} ${v.unidad} reales${v.estimado ? ' · estimado' : ''}`;
}

export function listaVehiculos() {
  const cat = S.ui.categoria, q = S.ui.busqueda.trim();
  let lista = buscar(S.catalogo, q, q ? null : cat);
  const total = lista.length;
  const limite = 8;
  const recorte = !q && !S.ui.verTodos && total > limite;
  const actual = vehiculoBase();
  if (recorte) {
    lista = lista.slice(0, limite);
    if (actual.categoria === cat && !lista.some(v => v.id === actual.id) && actual.id !== 'propio') lista = [...lista.slice(0, limite - 1), S.catalogo.find(v => v.id === actual.id)].filter(Boolean);
  }
  if (!lista.length) return `<p class="note vacio">Ningún vehículo coincide con “${escapeHtml(q)}”. Prueba con otra marca o configura el tuyo más abajo.</p>`;
  const filas = lista.map(v => {
    const km = porKm(v).totalKm, activo = v.id === S.state.vehicleId;
    return `<button class="veh" data-vehicle="${v.id}" aria-pressed="${activo}">${vehIcon(v)}<span class="veh-txt"><span class="vn">${escapeHtml(nombreVehiculo(v))}</span><span class="vg">${etiquetaConsumo(v)}</span></span><span class="veh-km"><b>${moneyDec(km)}</b><small>/km</small></span><span class="veh-check">${icon('check', 'sm')}</span></button>`;
  }).join('');
  return `${q ? `<p class="note">${total} ${total === 1 ? 'resultado' : 'resultados'} en todas las categorías.</p>` : ''}${filas}${recorte ? `<button class="btn outline block" data-action="ver-todos">Ver los ${total} modelos</button>` : ''}`;
}

const NOTA_FUENTE = {
  auto: 'Consumo urbano homologado por el Ministerio de Energía de Chile.',
  moto: 'Rendimiento de fábrica, ajustado a lo que rinde una moto en la ciudad.',
  scooter: 'Autonomía de fábrica, ajustada a lo que rinde en la calle.',
  'bici-electrica': 'Consumo estimado según el tipo de bici, ajustado a lo que rinde en la calle.'
};
const notaFuente = cat => NOTA_FUENTE[cat] ? `<p class="note">${NOTA_FUENTE[cat]}</p>` : '';

function selectorVehiculo() {
  const cat = S.ui.categoria;
  const notaBici = cat === 'bici' && !S.ui.busqueda.trim() ? `<p class="note">Sin motor, da igual el modelo. Solo cuenta la mantención.</p>` : '';
  const grupos = agrupar(S.catalogo);
  return `<div class="cat-tabs" role="tablist" aria-label="Tipo de vehículo">${CATEGORIAS.map(c => `<button role="tab" class="cat-tab" aria-selected="${c.id === cat && !S.ui.busqueda.trim()}" data-cat="${c.id}">${c.nombre}<small>${grupos[c.id].length}</small></button>`).join('')}</div><label class="buscar"><span class="visually-hidden">Buscar marca o modelo</span>${icon('search', 'sm')}<input type="search" data-busqueda placeholder="Buscar marca o modelo" value="${escapeHtml(S.ui.busqueda)}" autocomplete="off" enterkeyhint="search"></label>${notaBici}<div class="veh-grid" id="veh-lista">${listaVehiculos()}</div>`;
}

function formPropio() {
  const base = vehiculoBase();
  const d = S.ui.borradorPropio ?? (base.propio ? { categoria: base.categoria, marca: base.marca, modelo: base.modelo, combustible: base.combustible, consumo: base.consumo ? fmtDec(base.consumo, 2) : '', mantencionKm: base.mantencionKm ?? '' } : { categoria: S.ui.categoria, combustible: '93' });
  const cat = d.categoria;
  const e = S.ui.errores;
  const err = id => e[id] ? `<p class="field-error" role="alert">${escapeHtml(e[id])}</p>` : '';
  const inv = id => e[id] ? 'aria-invalid="true"' : '';
  const combustibles = S.P.combustiblesPermitidos[cat] ?? [];
  const nombres = { '93': 'Bencina 93', '95': 'Bencina 95', '97': 'Bencina 97', diesel: 'Diésel' };
  let campos = '';
  if (cat !== 'bici') campos += `<label for="p-marca">Marca</label><input id="p-marca" name="marca" maxlength="40" placeholder="Ej.: Honda" value="${escapeHtml(d.marca || '')}" ${inv('marca')}>${err('marca')}<label for="p-modelo">Modelo</label><input id="p-modelo" name="modelo" maxlength="50" placeholder="Ej.: CB125F" value="${escapeHtml(d.modelo || '')}" ${inv('modelo')}>${err('modelo')}`;
  if (cat === 'auto' || cat === 'moto') campos += `<label for="p-comb">Combustible</label><select id="p-comb" name="combustible" class="num-input">${combustibles.map(c => `<option value="${c}" ${d.combustible === c ? 'selected' : ''}>${nombres[c]}</option>`).join('')}</select>${err('combustible')}<label for="p-consumo">Rendimiento real <span>km por litro</span></label><input id="p-consumo" name="consumo" class="num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej.: 38,5" value="${escapeHtml(d.consumo ?? '')}" ${inv('consumo')}>${err('consumo')}`;
  if (cat === 'scooter' || cat === 'bici-electrica') campos += `<label for="p-consumo">Rendimiento <span>km por kWh, si lo sabes</span></label><input id="p-consumo" name="consumo" class="num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej.: 80" value="${escapeHtml(d.consumo ?? '')}" ${inv('consumo')}>${err('consumo')}<p class="note">Si no lo sabes, deja eso vacío y escribe la batería y la autonomía. La autonomía declarada rinde cerca de un ${Math.round(S.P.factorConsumo.declarado * 100)} % en la calle y la app lo descuenta.</p><label for="p-bateria">Batería <span>kWh</span></label><input id="p-bateria" name="bateriaKwh" class="num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej.: 0,36" value="${escapeHtml(d.bateriaKwh ?? '')}" ${inv('bateriaKwh')}>${err('bateriaKwh')}<label for="p-autonomia">Autonomía declarada <span>km</span></label><input id="p-autonomia" name="autonomiaKm" class="num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej.: 45" value="${escapeHtml(d.autonomiaKm ?? '')}" ${inv('autonomiaKm')}>${err('autonomiaKm')}`;
  const porDefecto = S.P.mantencionKm[cat];
  campos += `<label for="p-mant">Mantención <span>$ por km · vacío usa ${fmtDec(porDefecto, 1)}</span></label><input id="p-mant" name="mantencionKm" class="num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="${fmtDec(porDefecto, 1)}" value="${escapeHtml(d.mantencionKm ?? '')}" ${inv('mantencionKm')}>${err('mantencionKm')}`;
  return `<section class="card custom-card" id="custom-vehicle"><details class="custom-vehicle" ${S.ui.propioAbierto ? 'open' : ''}><summary><span class="sum-ic">${icon('plus')}</span><span class="sum-txt"><b>Configurar mi propio vehículo</b><small>${S.state.vehicleId === 'propio' && base.propio ? `En uso: ${escapeHtml(nombreVehiculo(base))}` : 'Auto, moto, scooter o bici con tus datos'}</small></span><span class="chev">${icon('arrow', 'sm')}</span></summary><p class="note">Usa datos reales si los conoces. Los campos cambian según el tipo.</p><form id="custom-vehicle-form" class="form" novalidate><label for="p-cat">Tipo de vehículo</label><select id="p-cat" name="categoria">${CATEGORIAS.map(c => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${c.nombre}</option>`).join('')}</select>${cat === 'bici' ? '<p class="note">La bici sin motor solo suma mantención. Puedes ajustarla.</p>' : ''}${campos}<button type="button" class="btn primary block" data-action="save-custom-vehicle">Usar este vehículo</button></form></details></section>`;
}

function costPerKmCard(v) {
  const pr = precio(v), c = porKm(v);
  const fila = (label, sub, valor, fuerte) => `<div class="row"><div class="main"><div class="t1">${label}</div>${sub ? `<div class="t2">${sub}</div>` : ''}</div><div class="amt${fuerte ? ' total' : ''}">${moneyDec(valor)}<small>/km</small></div></div>`;
  const energia = pr ? fila(escapeHtml(pr.etiqueta), `${moneyDec(pr.precio)} por ${unidadPrecio(pr)} a ${fmtDec(rendimientoReal(v), 1)} ${v.unidad} reales`, c.energiaKm) : '';
  const nota = v.mantencionKm !== null && v.mantencionKm !== undefined ? 'Mantención que escribiste.' : S.P.mantencionNota[v.categoria];
  return `<section class="card cost-km"><h2>Cuánto te cuesta cada km</h2>${energia}${fila('Mantención', v.categoria === 'bici' ? 'Neumáticos, cadena, frenos y cámaras' : v.energia === 'electricidad' ? 'Neumáticos, frenos y batería' : 'Aceite, neumáticos, cadena y frenos', c.mantencionKm)}${fila('Total', '', c.totalKm, true)}<p class="note cost-km-source">${escapeHtml(nota)}${v.estimado && tieneEnergia(v) ? ' El consumo de este modelo es estimado.' : ''}</p></section>`;
}

function vehiclePage() {
  const v = vehiculo(), base = vehiculoBase();
  const { inversion, net, restante, progreso } = recuperacion();
  const campos = [['datosMes', 'Datos móviles', 'al mes', 0, 100000, '$'], ['horasMes', 'Horas de trabajo', 'al mes', 1, 400, ''], ['meta', 'Meta neta', 'por hora', 1, 100000, '$'], ['inversion', 'Invertido en el vehículo', 'total', 0, 100000000, '$']];
  const lineaUso = tieneEnergia(v) ? `${etiquetaConsumo(v)} · ${moneyDec(porKm(v).totalKm)}/km todo incluido` : `Sin motor · ${moneyDec(porKm(v).totalKm)}/km de mantención`;
  return `<div><h1 class="title" id="page-title" tabindex="-1">Vehículo y costos</h1><p class="lead">Elige un vehículo de la lista o crea el tuyo. Cada modelo trae sus datos de fábrica.</p></div><section class="card veh-now"><div class="vn-head">${vehIcon(v, 'lg')}<div><p class="note">En uso · ${nombreCategoria(v.categoria)}</p><h2>${escapeHtml(nombreVehiculo(v))}</h2><p class="note">${lineaUso}</p></div></div><button class="btn tonal block" data-action="open-custom">${icon('plus', 'sm')}Configurar mi propio vehículo</button><h3>O elige de la lista</h3>${selectorVehiculo()}${notaFuente(S.ui.categoria)}</section>${formPropio()}${costPerKmCard(v)}${bloqueEnergia(v)}<section class="card"><h2>Valores para calcular</h2><div class="fields">${campos.map(([k, l, s, mn, mx, pre]) => campoNumero(k, l, s, mn, mx, S.state.settings[k], pre)).join('')}</div><p class="note">Semáforo: verde si llega a tu meta; amarillo entre ${Math.round(S.P.umbralJusto * 100)} % y 99 %; rojo bajo ${Math.round(S.P.umbralJusto * 100)} %.</p></section><section class="card"><h2>Inversión</h2><dl class="inv-grid"><div><dt>Invertido</dt><dd>${inversion ? money(inversion) : 'Sin dato'}</dd></div><div><dt>Neto acumulado</dt><dd>${money(net)}</dd></div><div><dt>Por recuperar*</dt><dd>${inversion ? money(restante) : 'Sin dato'}</dd></div></dl><div class="progress grow"><span style="width:${progreso}%"></span></div><p class="note">* Comparación ilustrativa, no amortización contable.</p></section><section class="card"><h2>Plataformas de ejemplo</h2><p class="note">Activar una plataforma muestra sus ofertas simuladas. No se conecta a Uber Eats, PedidosYa ni Rappi.</p><div class="connect-list">${PLATAFORMAS.map(p => `<button class="connect" data-connect="${p}" aria-pressed="${S.state.connected.includes(p)}">${logo(p)}<span class="cn-txt"><span class="cn">${p}</span><span class="cs">Sin acceso a tu cuenta real</span></span><span class="state">${S.state.connected.includes(p) ? 'Activa' : 'Activar'}</span></button>`).join('')}</div></section><section class="card"><h2>Demo y seguridad</h2><p class="note">Perfil de Luis, un personaje de ejemplo. No es una cuenta en línea. Velocidad simulada: ${S.ui.speed} km/h.</p><div class="btn-col"><button class="btn outline block" data-action="speed">${icon('shield', 'sm')}Probar bloqueo a 15 km/h</button><button class="btn danger block" data-action="reset">${icon('refresh', 'sm')}Reiniciar demo</button></div></section><p class="note center">Sin cuentas en línea. El GPS se usa solo cuando lo pides o mides un pedido. Los cambios se guardan en este navegador.</p>`;
}

/* ---------- Registrar carga ---------- */
function refuelPage() {
  const v = vehiculo(), pr = precio(v), t = tipoCarga(v), r = S.ui.refuel;
  const esBateria = v.energia === 'electricidad';
  return `${backButton('Inicio', 'data-screen="inicio"')}<div><h1 class="title" id="page-title" tabindex="-1">Registrar carga de ${t.nombre}</h1><p class="lead">${escapeHtml(nombreVehiculo(v))}. Anota cuánto cargaste y pagaste. El precio por ${t.unidad} se calcula solo.</p></div><section class="card"><h2>${esBateria ? '¿Dónde cargaste?' : '¿Dónde cargaste?'}</h2><p class="note" role="status" data-refuel-status>${escapeHtml(esBateria ? 'Anota dónde cargaste y cuánta energía entró.' : r.estado)}</p>${esBateria ? '' : `<button class="btn outline block" data-action="refuel-gps" ${r.cargando ? 'disabled aria-busy="true"' : ''}>${icon('locate', 'sm')}${r.cargando ? 'Buscando estación…' : 'Buscar estación con mi GPS'}</button><p class="note">Solo al tocar este botón se usa tu ubicación. Se compara con la lista de estaciones de Bencina en Línea y no se guarda.</p>`}<form id="refuel-form" class="form" novalidate><label for="refuel-station">${esBateria ? 'Lugar' : 'Estación'} <span>${esBateria ? 'Ej.: casa, cargador del trabajo' : 'confirma la sugerencia'}</span></label><input id="refuel-station" name="station" autocomplete="off" maxlength="80" placeholder="${esBateria ? 'Ej.: Casa' : 'Ej.: Copec, Providencia'}" value="${escapeHtml(r.estacion)}" required>${v.energia === 'gasolina' ? `<label for="refuel-grade">Octanaje cargado</label><select id="refuel-grade" name="grade" class="num-input">${['93', '95', '97'].map(g => `<option value="${g}" ${v.combustible === g ? 'selected' : ''}>${g} octanos</option>`).join('')}</select>` : ''}<label for="refuel-qty">${esBateria ? 'Energía cargada' : 'Litros cargados'} <span>${t.unidad}</span></label><input id="refuel-qty" name="cantidad" class="num-input" inputmode="decimal" type="text" autocomplete="off" placeholder="${esBateria ? 'Ej.: 0,3' : 'Ej.: 8,5'}" required><label for="refuel-amount">Total pagado <span>$</span></label><input id="refuel-amount" name="amount" class="num-input" inputmode="numeric" type="text" autocomplete="off" placeholder="Ej.: 11000" required><p class="note">Se guarda como gasto real y fija ${escapeHtml(pr.etiqueta.toLowerCase())} a lo que pagaste por ${t.unidad}. En el análisis de pedidos el costo sigue estimado por km; no se descuenta dos veces.</p><button class="btn primary big block" type="button" data-action="refuel-save">Guardar carga</button></form></section>`;
}

export function vistaPantalla() {
  barraInferior = '';
  const mapa = { inicio: home, oferta: offerPage, resultado: resultPage, resumen: summary, mapa: routePage, vehiculo: vehiclePage, carga: refuelPage };
  return shell(mapa[S.ui.screen]());
}

export { tipoCarga };
