(function () {
  'use strict';
  const { calculateOffer } = globalThis.UltimaMillaCalc;
  const KEY = 'ultima-milla-demo-v1';
  const DEMO = new URLSearchParams(location.search).get('demo') === '1';
  const DIRECT = new URLSearchParams(location.search).get('pantalla');
  const LUIS = globalThis.DATOS?.luis?.cifras || { espera_min:110, pedidos:19 };
  if (new URLSearchParams(location.search).get('embebido') === '1') document.body.classList.add('embedded');
  if (DIRECT === 'resumen' && new URLSearchParams(location.search).get('compacto') === '1') document.body.classList.add('compact-summary');
  const SCREENS = ['inicio', 'oferta', 'resumen', 'mapa', 'vehiculo'];
  const MONEY = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const VEHICLES = [
    { id:'cb190', group:'Moto', name:'Honda CB190R', type:'fuel', consumption:35, maintenance:57, investment:2850000, icon:'🏍', unit:'km/l' },
    { id:'fz', group:'Moto', name:'Yamaha FZ', type:'fuel', consumption:38, maintenance:52, investment:2600000, icon:'🏍', unit:'km/l' },
    { id:'gixxer', group:'Moto', name:'Suzuki Gixxer', type:'fuel', consumption:37, maintenance:54, investment:2750000, icon:'🏍', unit:'km/l' },
    { id:'sail', group:'Auto', name:'Chevrolet Sail', type:'fuel', consumption:13, maintenance:98, investment:8300000, icon:'🚗', unit:'km/l' },
    { id:'swift', group:'Auto', name:'Suzuki Swift', type:'fuel', consumption:17, maintenance:92, investment:10400000, icon:'🚗', unit:'km/l' },
    { id:'urban', group:'Bicicleta', name:'Bicicleta urbana', type:'human', consumption:1, maintenance:22, investment:280000, icon:'🚲', unit:'sin combustible' },
    { id:'ebike', group:'Bici eléctrica', name:'Oxford E-Bike', type:'electric', consumption:75, maintenance:32, investment:1250000, icon:'⚡', unit:'km/kWh' },
    { id:'emoto', group:'Moto eléctrica', name:'Moto eléctrica urbana', type:'electric', consumption:38, maintenance:38, investment:2400000, icon:'⚡', unit:'km/kWh' },
    { id:'scooter', group:'Scooter', name:'Xiaomi Electric Scooter', type:'electric', consumption:40, maintenance:28, investment:580000, icon:'🛴', unit:'km/kWh' }
  ];
  const OFFERS = [
    { id:1, platform:'Uber Eats', gross:6800, km:5.2, returnKm:1.6, minutes:38, waitMin:5, from:'Providencia', to:'Ñuñoa', restaurant:'Verde Limón', pickup:[102,131], drop:[225,222] },
    { id:2, platform:'PedidosYa', gross:1495, km:8.4, returnKm:3.2, minutes:51, waitMin:12, from:'Centro', to:'La Florida', restaurant:'Sabor Casero', pickup:[156,166], drop:[302,282] },
    { id:3, platform:'Rappi', gross:5400, km:4.8, returnKm:1.3, minutes:32, waitMin:7, from:'Las Condes', to:'Providencia', restaurant:'Bowl Sur', pickup:[285,103], drop:[154,154] },
    { id:4, platform:'Uber Eats', gross:3900, km:6.1, returnKm:2.4, minutes:46, waitMin:9, from:'Ñuñoa', to:'Macul', restaurant:'La Esquina', pickup:[216,215], drop:[270,255] },
    { id:5, platform:'Rappi', gross:8500, km:8.3, returnKm:1.8, minutes:55, waitMin:4, from:'Providencia', to:'Las Condes', restaurant:'Deli Alto', pickup:[154,155], drop:[284,102] }
  ];
  const STATIONS = [
    {id:'centro',name:'Centro',brand:'Copec',price:1299,x:116,y:195},
    {id:'provi',name:'Providencia',brand:'Shell',price:1325,x:176,y:152},
    {id:'nunoa',name:'Ñuñoa',brand:'Aramco',price:1288,x:255,y:235},
    {id:'condes',name:'Las Condes',brand:'Copec',price:1340,x:285,y:116}
  ];
  const app = document.getElementById('app');
  const money = n => MONEY.format(Math.round(Number(n) || 0));
  const vehicle = () => state.vehicleId === 'custom' && state.customVehicle ? state.customVehicle : VEHICLES.find(v => v.id === state.vehicleId) || VEHICLES[0];
  const today = () => new Date().toLocaleDateString('sv-SE');
  const dayAgo = n => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-n); return d.toLocaleDateString('sv-SE'); };
  function seedHistory() {
    const jobs = [];
    for (let day=29; day>=0; day--) {
      if (day === 9 || day === 4) continue;
      if (day === 0) {
        for (let i=0; i<19; i++) {
          const gross=i===18?4400:3200, fuel=i===18?560:480, totalMinutes=i===18?48:34;
          const waitMin=Math.floor((i+1)*LUIS.espera_min/LUIS.pedidos)-Math.floor(i*LUIS.espera_min/LUIS.pedidos);
          jobs.push({id:`luis-${i}`,date:today(),time:`${String(9+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`,platform:['Uber Eats','PedidosYa','Rappi'][i%3],restaurant:'Pedido entregado',from:'Santiago',to:'Entrega',status:'completed',gross,fuel,maintenance:0,data:0,cost:fuel,net:gross-fuel,totalMinutes,minutes:totalMinutes-waitMin,waitMin,km:3.2,returnKm:.8,totalKm:4,signal:'green'});
        }
        continue;
      }
      const count = 5 + (day*7)%4;
      for (let i=0; i<count; i++) {
        const platform = ['Uber Eats','PedidosYa','Rappi'][(i+day)%3];
        const gross = 3300 + ((i*5+day*3)%8)*570;
        const km = 2.4 + ((i*3+day)%7)*0.7;
        const returnKm = 0.6 + ((i+day)%4)*0.55;
        const minutes = 22 + ((i*7+day)%5)*7;
        const waitMin = 3 + ((i*4+day)%5)*3;
        const calc = calculateOffer({gross,km,returnKm,minutes,waitMin}, VEHICLES[0], defaults().settings);
        jobs.push({ id:`seed-${day}-${i}`, date:dayAgo(day), time:`${10+Math.floor(i*1.3)}:${String((i*17)%60).padStart(2,'0')}`, platform, restaurant:['Local Centro','Cocina Norte','La Huerta','Sándwich Club'][i%4], from:'Santiago', to:'Entrega', status:'completed', ...calc });
      }
      if (day%3===0) jobs.push({id:`reject-${day}`,date:dayAgo(day),time:'18:42',platform:'Rappi',restaurant:'Oferta descartada',status:'rejected',gross:0,net:0,totalKm:0,returnKm:0,waitMin:0,totalMinutes:0,signal:'red',fuel:0,maintenance:0,data:0});
    }
    return jobs;
  }
  function defaults() { return { onboarded:false, profile:null, connected:[], vehicleId:'cb190', customVehicle:null, settings:{fuelPrice:1300,kwhPrice:220,dataMonthly:12000,hoursMonthly:200,goal:5000,investment:2850000}, jobs:[], speed:0, offerCursor:0 }; }
  function load() {
    if (DEMO || DIRECT) return { ...defaults(), jobs:seedHistory() };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && Array.isArray(raw.jobs) && raw.settings) {
        if (raw.jobs.some(j=>j.id?.startsWith('seed-13-')) && !raw.jobs.some(j=>j.id?.startsWith('seed-14-'))) {
          raw.jobs = [...seedHistory().filter(j=>j.date<dayAgo(13)), ...raw.jobs];
        }
        return { ...defaults(), ...raw, onboarded: Boolean(raw.onboarded && raw.profile), speed:0 };
      }
    } catch (_) { /* El prototipo sigue funcionando si el almacenamiento está deshabilitado. */ }
    return defaults();
  }
  let state = load();
  let screen = SCREENS.includes(DIRECT) ? DIRECT : 'inicio';
  let introStep = 0;
  let currentOffer = null;
  let waitStart = 0;
  let acceptedOffer = null;
  let acceptedCalc = null;
  let period = 'día';
  let stationId = 'nunoa';
  let toastTimer = null;
  let demoTimers = [];
  let lastScreen = null;
  if (DIRECT) { state.onboarded = true; state.connected = ['Uber Eats','PedidosYa','Rappi']; if (DIRECT==='oferta') { currentOffer={...OFFERS[0]}; state.offerCursor=1; } }
  function save() { if (DEMO) return; try { const {speed,...stored}=state; localStorage.setItem(KEY,JSON.stringify(stored)); } catch (_) {} }
  function toast(message,error=false) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div'); el.className=error?'toast error':'toast'; el.textContent=message; (app.querySelector('.toast-region')||app).appendChild(el);
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.remove(),2600);
  }
  function signalText(s) { return s === 'green' ? 'Conviene' : s === 'yellow' ? 'Justo en la meta' : 'No conviene'; }
  function platformClass(p) { return p === 'Uber Eats' ? 'uber' : p === 'PedidosYa' ? 'pedidos' : 'rappi'; }
  const icon = (name, cls='') => {
    const paths={arrow:'<path d="M5 16 16 5M7 5h9v9"/>',home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/>',offer:'<path d="M4 7h16M4 12h16M4 17h10"/><circle cx="19" cy="17" r="2"/>',summary:'<path d="M4 20V10m6 10V4m6 16v-8m4 8V7"/>',map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',shield:'<path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',check:'<path d="m4 12 5 5L20 6"/>',fuel:'<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M7 7h6v5H7zM15 8h2l2 3v7a2 2 0 0 0 2 0v-6l-2-2"/>',bike:'<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m5 17 5-9 4 9H5m9 0 5-8h-4m-6-3h3"/>',car:'<path d="m4 16 2-8h12l2 8v4H4zM2 16h20M7 20v2m10-2v2"/>',bolt:'<path d="m13 2-8 11h6l-1 9 9-12h-6z"/>'};
    return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
  };
  const logo = p => `<span class="logo ${platformClass(p)}" aria-hidden="true">${p==='Uber Eats'?'U':p==='PedidosYa'?'P':'R'}</span>`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function head(showSafety=true) { return `<header class="top"><div class="brand"><span class="brand-ic">${icon('arrow')}</span>Última Milla</div><div class="top-right"><span class="demo-pill">DEMOSTRACIÓN<small>SIN CONEXIÓN</small></span>${showSafety?`<button class="icon-btn" data-action="speed" aria-label="Probar bloqueo por movimiento" title="Probar bloqueo por movimiento">${icon('shield')}</button>`:''}</div></header>`; }
  function nav() { return `<nav class="tabbar" aria-label="Navegación principal">${[['inicio','home','Inicio'],['oferta','offer','Oferta'],['resumen','summary','Resumen'],['mapa','map','Mapa'],['vehiculo','settings','Ajustes']].map(([id,ic,label])=>`<button class="tab ${screen===id?'pop':''}" data-screen="${id}" aria-label="${label}" ${screen===id?'aria-current="page"':''}>${icon(ic)}<span>${label}</span>${id==='oferta'&&currentOffer?'<i class="badge" aria-hidden="true"></i>':''}</button>`).join('')}</nav>`; }
  function shell(content) { if (screen==='inicio' && state.profile?.name) content=content.replace('Hola, Luis.',`Hola, ${escapeHtml(state.profile.name.split(/\s+/)[0])}.`); if(screen==='vehiculo') { const page=content.replace(/^<div>.*?<\/div>/,'').replace('<h2>Vehículo</h2>',`<h2>Vehículo</h2><p class="note">En uso: ${escapeHtml(vehicle().name)}</p>`); content=settingsExtras()+page.replace('</section>',`</section>${customVehicleEditor()}`); } return `<div class="shell" ${state.speed>10?'inert':''}><a class="skip-link" href="#main">Ir al contenido</a>${head()}<main class="scroll" id="main" tabindex="-1"><div class="${lastScreen!==screen?'enter ':''}stack">${content}</div></main>${nav()}</div>${state.speed>10?security():''}<div class="toast-region" role="status" aria-live="polite"></div>`; }
  function onboarding() {
    const step = introStep;
    const title = ['Tu turno empieza aquí.', 'Elige las plataformas.', 'Cada kilómetro cuenta.'][step];
    const description = [
      'Crea un perfil local para recorrer la app como repartidor. No necesitas contraseña.',
      'Activa las plataformas cuyos pedidos de ejemplo quieres recibir.',
      'Elige tu vehículo para estimar combustible, mantención y ganancia neta.'
    ][step];
    const platforms = ['Uber Eats','PedidosYa','Rappi'];
    const body = step === 0
      ? `<form class="signup-form" id="signup-form"><label for="signup-name">Tu nombre</label><input id="signup-name" name="name" autocomplete="name" required minlength="2" maxlength="40" placeholder="Ej. Camila" value="${escapeHtml(state.profile?.name)}"><label for="signup-email">Tu correo</label><input id="signup-email" name="email" type="email" autocomplete="email" required maxlength="120" placeholder="nombre@correo.com" value="${escapeHtml(state.profile?.email)}"><p class="privacy-note">Este perfil vive solo en este navegador. No enviamos datos ni creamos una cuenta en un servidor.</p></form>`
      : step === 1
      ? `<div class="connect-list">${platforms.map(p=>`<button class="connect" data-connect="${p}" aria-pressed="${state.connected.includes(p)}">${logo(p)}<span><span class="cn">${p}</span><br><span class="cs">Pedidos de ejemplo · sin acceso a tu cuenta</span></span><span class="state">${state.connected.includes(p)?'Activo':'Activar'}</span></button>`).join('')}</div><p class="trust">${icon('shield')} Nunca ingreses aquí tu clave de las plataformas.</p>`
      : `<div class="veh-grid onboarding-vehicles">${VEHICLES.map(v=>`<button class="veh" data-vehicle="${v.id}" aria-pressed="${v.id===state.vehicleId}">${icon(v.type==='human'?'bike':v.type==='electric'?'bolt':v.group==='Auto'?'car':'fuel')}<span><span class="vn">${v.name}</span><br><span class="vg">${v.group}</span></span></button>`).join('')}</div><p class="trust">${icon('check')} Puedes ajustar modelo, motor y costos en Ajustes.</p>`;
    return `<div class="intro onboard">${head(false)}<div class="intro-body"><p class="step">PASO ${step+1} DE 3 · PERFIL LOCAL</p><h1 tabindex="-1" id="page-title">${title}</h1><p class="lead">${description}</p>${body}</div><div class="intro-bottom"><div class="steps-dots" aria-hidden="true"><i class="on"></i><i class="${step>0?'on':''}"></i><i class="${step>1?'on':''}"></i></div><div class="onboard-actions">${step>0?'<button class="btn outline" data-action="onboard-back">Atrás</button>':''}<button class="btn lime big" data-action="${step===0?'save-profile-first':step===1?'intro-next':'finish-onboarding'}">${step===0?'Crear perfil':step===1?'Elegir vehículo':'Empezar mi turno'} ${icon('arrow','sm')}</button></div></div></div><div class="toast-region" role="status" aria-live="polite"></div>`;
  }
  function settingsExtras() {
    const platforms = ['Uber Eats','PedidosYa','Rappi'];
    return `<div><p class="kicker">Tu espacio de trabajo</p><h1 class="title" id="page-title" tabindex="-1">Ajustes</h1><p class="lead">Controla tu perfil, plataformas de ejemplo y costos.</p></div><section class="card"><h2>Perfil local</h2><form class="signup-form compact" id="profile-form"><label for="profile-name">Nombre</label><input id="profile-name" name="name" required minlength="2" maxlength="40" value="${escapeHtml(state.profile?.name)}"><label for="profile-email">Correo</label><input id="profile-email" name="email" type="email" required maxlength="120" value="${escapeHtml(state.profile?.email)}"><button type="button" class="btn outline block" data-action="save-profile">Guardar perfil</button></form><p class="note">Solo en este dispositivo. No es una cuenta en línea.</p></section><section class="card"><h2>Plataformas de ejemplo</h2><p class="note">Activar una plataforma muestra sus ofertas simuladas. No se conecta a Uber Eats, PedidosYa ni Rappi.</p><div class="connect-list settings-connect">${platforms.map(p=>`<button class="connect" data-connect="${p}" aria-pressed="${state.connected.includes(p)}">${logo(p)}<span><span class="cn">${p}</span><br><span class="cs">Sin acceso a tu cuenta real</span></span><span class="state">${state.connected.includes(p)?'Activo':'Activar'}</span></button>`).join('')}</div></section>`;
  }
  function customVehicleEditor() {
    const v=state.customVehicle;
    return `<section class="card"><details class="custom-vehicle"><summary>Configurar mi propio vehículo ${icon('arrow','sm')}</summary><p class="note">Usa datos reales si los conoces; si no, parte de una estimación y ajústala después.</p><form id="custom-vehicle-form" class="signup-form compact"><label for="custom-group">Tipo de vehículo</label><select id="custom-group" name="group"><option ${v?.group==='Auto'?'selected':''}>Auto</option><option ${v?.group==='Moto'?'selected':''}>Moto</option><option ${v?.group==='Bicicleta'?'selected':''}>Bicicleta</option><option ${v?.group==='Scooter'?'selected':''}>Scooter</option></select><label for="custom-type">Propulsión</label><select id="custom-type" name="type"><option value="fuel" ${v?.type==='fuel'?'selected':''}>Gasolina</option><option value="electric" ${v?.type==='electric'?'selected':''}>Eléctrica</option><option value="human" ${v?.type==='human'?'selected':''}>Sin motor</option></select><label for="custom-name">Modelo o nombre</label><input id="custom-name" name="model" maxlength="50" placeholder="Ej. moto urbana 150 cc" value="${escapeHtml(v?.name)}"><label for="custom-motor">Potencia del motor eléctrico (W)</label><input id="custom-motor" name="motorW" type="number" min="100" max="15000" step="1" inputmode="numeric" placeholder="Ej. 500" value="${v?.motorW||''}"><p class="note">Si es eléctrico, indica el modelo o la potencia del motor.</p><label for="custom-consumption">Rendimiento: km/l o km/kWh</label><input id="custom-consumption" name="consumption" type="number" min="0.1" max="500" step="0.1" inputmode="decimal" required value="${v?.consumption||35}"><p class="note">El motor en W no basta para calcular el gasto; ajusta el rendimiento.</p><label for="custom-maintenance">Mantención estimada ($/km)</label><input id="custom-maintenance" name="maintenance" type="number" min="0" max="1000" step="1" inputmode="numeric" required value="${v?.maintenance??50}"><label for="custom-investment">Precio o inversión ($)</label><input id="custom-investment" name="investment" type="number" min="0" max="100000000" step="1000" inputmode="numeric" required value="${v?.investment??0}"><button type="button" class="btn lime block" data-action="save-custom-vehicle">Usar este vehículo</button></form></details></section>`;
  }
  function syncCustomVehicleForm(form) {
    const group=form.elements.group.value, type=form.elements.type;
    for (const option of type.options) option.disabled=(option.value==='fuel' && ['Bicicleta','Scooter'].includes(group)) || (option.value==='human' && group!=='Bicicleta') || (group==='Scooter' && option.value!=='electric');
    if (type.selectedOptions[0]?.disabled) type.value=group==='Scooter'?'electric':group==='Bicicleta'?'human':'fuel';
    const electric=type.value==='electric', human=type.value==='human';
    form.elements.motorW.disabled=!electric;
    form.elements.consumption.disabled=human;
    form.querySelector('label[for="custom-consumption"]').textContent=human?'Rendimiento: no aplica':`Rendimiento estimado (${electric?'km/kWh':'km/l'})`;
  }
  function intro() {
    const second=introStep===1;
    return `<div class="intro">${head(false)}<div class="intro-body"><p class="step">PASO ${second?'2':'1'} DE 2 · DEMOSTRACIÓN</p><h1 tabindex="-1" id="page-title">${second?'Tu vehículo.<br>Tu ganancia.':'Más entregas.<br>Más claridad.'}</h1><p class="lead">${second?'Elige tu vehículo. Puedes ajustar sus costos después.':'Antes de aceptar, mira cuánto queda después de cada kilómetro y cada minuto.'}</p>${second?`<div class="veh-grid" style="margin-top:20px">${VEHICLES.map(v=>`<button class="veh" data-vehicle="${v.id}" aria-pressed="${v.id===state.vehicleId}">${icon(v.type==='human'?'bike':v.type==='electric'?'bolt':v.group==='Auto'?'car':'fuel')}<span><span class="vn">${v.name}</span><br><span class="vg">${v.group}</span></span></button>`).join('')}</div><p class="trust">${icon('check')} Valores iniciales editables.</p>`:`<div class="connect-list">${['Uber Eats','PedidosYa','Rappi'].map(p=>`<button class="connect" data-connect="${p}" aria-pressed="${state.connected.includes(p)}">${logo(p)}<span><span class="cn">${p}</span><br><span class="cs">Conexión simulada</span></span><span class="state">${state.connected.includes(p)?'Lista':'Conectar'}</span></button>`).join('')}</div><p class="trust">${icon('shield')} Sin claves ni acceso a tus aplicaciones.</p>`}</div><div class="intro-bottom"><div class="steps-dots" aria-hidden="true"><i class="on"></i><i class="${second?'on':''}"></i></div><button class="btn lime big block" data-action="${second?'finish-onboarding':'intro-next'}">${second?'Entrar a mi turno':'Conectar las 3 y seguir'} ${icon('arrow','sm')}</button></div></div><div class="toast-region" role="status" aria-live="polite"></div>`;
  }
  function home() {
    const jobs = state.jobs.filter(j=>j.date===today() && j.status==='completed');
    const totals = aggregate(jobs);
    const recent = state.jobs.slice(-4).reverse();
    return `<div><p class="kicker">Tu turno · ${new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</p><h1 class="title" id="page-title" tabindex="-1">Hola, Luis.</h1><p class="lead">Así va tu día en Santiago.</p></div><section class="hero deco" aria-label="Ganancia neta de hoy"><p class="label">Te queda hoy</p><div class="money" data-count="${Math.round(totals.net)}">${money(totals.net)}</div><p class="sub">Después de ${money(totals.fuel+totals.maintenance+totals.data)} en costos</p><dl class="hero-stats"><div><dt>Por hora</dt><dd>${money(totals.hourly)}</dd></div><div><dt>Pedidos</dt><dd>${jobs.length}</dd></div><div><dt>Sin pedido</dt><dd>${totals.emptyKm.toFixed(1)} km</dd></div></dl></section><div class="decide"><button class="btn lime" data-action="simulate">Simular oferta</button><button class="btn outline" data-screen="resumen">Ver resumen ${icon('arrow','sm')}</button></div><section><div class="section-head"><h2>Plataformas</h2><span class="aside">Conexión simulada</span></div><div class="chips">${['Uber Eats','PedidosYa','Rappi'].map(p=>`<span class="chip ${state.connected.includes(p)?'':'off'}">${logo(p)}${p}</span>`).join('')}</div></section><section><div class="section-head"><h2>Actividad reciente</h2><button class="btn link" data-screen="resumen">Ver todo</button></div><div class="card">${recent.length?recent.map(j=>`<div class="row"><span class="dot ${j.status==='rejected'?'red':'green'}"></span><span class="main"><span class="t1">${j.platform}</span> <span class="t2">${j.status==='rejected'?'Oferta rechazada':j.restaurant} · ${j.date===today()?'Hoy':j.date.slice(5)}</span></span><span class="amt ${j.status==='rejected'?'neg':''}">${j.status==='rejected'?'Rechazada':money(j.net)}</span></div>`).join(''):'<div class="empty"><h2>Aún no hay entregas</h2><p>Cuando completes una, aparecerá aquí.</p></div>'}</div></section><p class="note center">Cifras de demostración. No recibe ofertas reales.</p>`;
  }
  function offerPage() {
    if (!currentOffer && !acceptedOffer) return `<div><p class="kicker">Decide con tus números</p><h1 class="title" id="page-title" tabindex="-1">¿Me conviene?</h1><p class="lead">Mira lo que te quedaría antes de aceptar.</p></div><div class="card empty"><span class="empty-ic">${icon('offer','lg')}</span><h2>No hay ofertas por ahora</h2><p>Prueba con una oferta de ejemplo.</p><button class="btn primary" data-action="simulate">Simular oferta</button></div><p class="note center">La interacción se bloquea sobre 10 km/h.</p>`;
    const o = currentOffer || acceptedOffer;
    const calc = acceptedOffer ? acceptedCalc : calculateOffer(o,vehicle(),state.settings);
    const ratio=Math.max(0,Math.min(100,calc.hourly/state.settings.goal*70));
    const costs=Math.max(0,calc.cost), base=Math.max(calc.gross,1);
return `<div><p class="kicker">${acceptedOffer?'Pedido aceptado':'Nueva oferta'} · ${o.platform}</p><h1 class="title" id="page-title" tabindex="-1">¿Me conviene?</h1><p class="lead">${o.from} → ${o.to} · ${o.restaurant}</p></div><div class="card offer-top"><div class="tl on-${calc.signal} ${acceptedOffer?'':'fresh'}" aria-hidden="true"><i class="r"></i><i class="y"></i><i class="g"></i></div><div><p class="kicker">Semáforo de tu meta</p><h2>${signalText(calc.signal)}</h2><p class="note">${money(calc.hourly)}/h · meta ${money(state.settings.goal)}/h</p></div></div><div class="verdict ${calc.signal} ${acceptedOffer?'':'fresh'}" role="status"><div class="v-title">${signalText(calc.signal)}</div><p class="v-sub">${calc.signal==='red'?'Por debajo de tu meta por hora':'Calculado con tus costos y el regreso sin pedido.'}</p></div><div class="card"><div class="net-line"><span class="lbl">Te quedaría</span><strong class="big-num ${calc.net<0?'neg':''}" data-count="${Math.round(calc.net)}">${money(calc.net)}</strong></div><p class="note">De ${money(calc.gross)} que paga la plataforma</p><div class="stackbar reveal" role="img" aria-label="Pago: ${money(calc.net)} netos y ${money(costs)} en costos"><span class="s-net" style="width:${Math.max(0,calc.net)/base*100}%"></span><span class="s-fuel" style="width:${calc.fuel/base*100}%"></span><span class="s-wrench" style="width:${calc.maintenance/base*100}%"></span><span class="s-data" style="width:${calc.data/base*100}%"></span></div><ul class="legend"><li><span class="sw net"></span>Neto <b>${money(calc.net)}</b></li><li><span class="sw fuel"></span>${vehicle().type==='human'?'Sin combustible':vehicle().type==='electric'?'Electricidad':'Bencina'} <b>${money(calc.fuel)}</b></li><li><span class="sw wrench"></span>Mantención <b>${money(calc.maintenance)}</b></li><li><span class="sw data"></span>Datos <b>${money(calc.data)}</b></li></ul></div><div class="card"><div class="gauge-head"><span>Pago por hora estimado</span><b>${money(calc.hourly)}/h</b></div><div class="gauge-track"><div class="gauge-fill ${calc.signal} grow" style="width:${ratio}%"></div><span class="goal-mark" style="left:70%"><em>Tu meta</em></span></div><dl class="facts"><div class="fact"><dt>Viaje</dt><dd>${calc.km.toFixed(1)} km</dd></div><div class="fact"><dt>Regreso</dt><dd>${calc.returnKm.toFixed(1)} km</dd></div><div class="fact"><dt>Tiempo total</dt><dd>${calc.totalMinutes} min</dd></div></dl><p class="note" style="margin-top:10px">Tiempo: ${calc.minutes} min de viaje + ${calc.waitMin} min de espera. Distancia: ${calc.totalKm.toFixed(1)} km en total.</p></div>${acceptedOffer?`<div class="card wait"><div class="ring" id="wait-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="264"/></svg><div class="ring-txt"><b id="wait-timer">00:00</b><small>espera</small></div></div><p class="wait-msg">El cronómetro registra la espera en el local. <b>Se sumará al tiempo real.</b></p></div><button class="btn accept big block" data-action="finish-delivery">Registrar entrega</button>`:`<div class="decide ${calc.signal==='red'?'red':''}"><button class="btn reject" data-action="reject">Rechazar</button><button class="btn accept" data-action="accept">Aceptar pedido</button></div><button class="btn outline block" data-screen="mapa">Ver ruta ilustrativa ${icon('arrow','sm')}</button>`}<p class="note center">Estimación de demostración; no recibe ofertas reales.</p>`;
  }
  function aggregate(jobs) {
    const accepted = jobs.filter(j=>j.status==='completed');
    const sum = k => accepted.reduce((a,j)=>a+(Number(j[k])||0),0);
    const gross=sum('gross'),net=sum('net'),minutes=sum('totalMinutes'),waitMin=sum('waitMin'),emptyKm=sum('returnKm');
    const costs=accepted.reduce((total,j)=>{
      const keys=['fuel','maintenance','data'];
      const legacy=j.id?.startsWith('luis-') && Number(j.maintenance)===0 && Number(j.data)===0;
      const missing=keys.filter(k=>legacy || !Number.isFinite(Number(j[k])) || j[k]==null);
      const parts=Object.fromEntries(keys.map(k=>[k,missing.includes(k)?0:Number(j[k])]));
      if(missing.length){
        const estimate=calculateOffer({gross:j.gross,km:j.km,returnKm:j.returnKm,minutes:j.minutes||j.totalMinutes,waitMin:j.waitMin},vehicle(),state.settings);
        const rest=Math.round(Number(j.gross)-Number(j.net)-keys.reduce((n,k)=>n+parts[k],0));
        const weight=missing.reduce((n,k)=>n+estimate[k],0);
        let assigned=0;
        missing.forEach((k,i)=>{parts[k]=i===missing.length-1?rest-assigned:Math.round(rest*(weight?estimate[k]/weight:1/missing.length));assigned+=parts[k];});
      }
      keys.forEach(k=>total[k]+=parts[k]);return total;
    },{fuel:0,maintenance:0,data:0});
    const {fuel,maintenance,data}=costs;
    const days=new Set(accepted.map(j=>j.date)).size;
    const realHours=minutes/60;
    const lostWait=waitMin*state.settings.goal/60;
    const redLoss=accepted.filter(j=>j.signal==='red').reduce((a,j)=>a+Math.max(0,state.settings.goal*(j.totalMinutes||0)/60-j.net),0);
    return {gross,fuel,maintenance,data,net,minutes,waitMin,emptyKm,realHours,hourly:realHours?net/realHours:0,lostWait,redLoss,count:accepted.length,rejected:jobs.filter(j=>j.status==='rejected').length};
  }
  function periodJobs() {
    const start=period==='día'?dayAgo(0):period==='semana'?dayAgo(6):dayAgo(29);
    return state.jobs.filter(j=>j.date>=start);
  }
  function chart(jobs) {
    const days=period==='día'?1:period==='semana'?7:30;
    const buckets=Array.from({length:days},(_,i)=>{const date=dayAgo(days-1-i); return {date,net:aggregate(jobs.filter(j=>j.date===date)).net};});
    const max=Math.max(1,...buckets.map(b=>b.net));
    return `<div class="chart-wrap"><div class="chart-scale"><span>${money(max)}</span><span>${money(0)}</span></div><div class="bars ${days===30?'month':''} grow" role="img" aria-label="Ganancia neta por día: ${buckets.map(b=>`${b.date}: ${money(b.net)}`).join('; ')}">${buckets.map((b,i)=>`<div class="col"><div class="track"><div class="bar ${i===days-1?'today':''} ${b.net?'':'zero'}" style="--h:${Math.max(3,b.net/max*100)}%;--i:${i}" title="${b.date}: ${money(b.net)}"></div></div><small>${days===1?'Hoy':days===7?new Date(`${b.date}T12:00:00`).toLocaleDateString('es-CL',{weekday:'short'}).slice(0,2):b.date.slice(8)}</small></div>`).join('')}</div></div>`;
  }
  function recovery() {
    const investment=Math.max(0,Number(state.settings.investment)||0);
    const net=aggregate(state.jobs).net;
    return {investment,net,remaining:Math.max(0,investment-net),progress:investment?Math.min(100,Math.max(0,net/investment*100)):100};
  }
  function summary() {
    const jobs=periodJobs(),t=aggregate(jobs);
    const label=period==='día'?'hoy':period==='semana'?'últimos 7 días':'últimos 30 días';
    if (!t.count) return `<div><p class="kicker">Tu plata, sin vueltas</p><h1 class="title" id="page-title" tabindex="-1">Resumen</h1><p class="lead">Datos de ${label}.</p></div><div class="seg" role="group" aria-label="Período">${[['día','Día'],['semana','Semana'],['mes','Mes']].map(([id,name])=>`<button data-period="${id}" aria-pressed="${period===id}">${name}</button>`).join('')}</div><div class="card empty"><span class="empty-ic">${icon('summary','lg')}</span><h2>Aún no hay entregas</h2><p>Al registrar una entrega, verás aquí lo ganado y lo gastado.</p><button class="btn primary" data-action="simulate">Simular oferta</button></div>`;
    const platformSums=['Uber Eats','PedidosYa','Rappi'].map(p=>({p,net:aggregate(jobs.filter(j=>j.platform===p)).net}));
    const max=Math.max(1,...platformSums.map(x=>x.net));
    const spent=t.fuel+t.maintenance+t.data,{investment,net:recoveredNet,remaining,progress}=recovery();
    return `<div><p class="kicker">Tu plata, sin vueltas</p><h1 class="title" id="page-title" tabindex="-1">Resumen</h1><p class="lead">Datos de ${label}. ${period==='día'?'Caso de Luis · cifras de demostración.':'Historial ilustrativo de 30 días.'}</p></div><div class="seg" role="group" aria-label="Período">${[['día','Día'],['semana','Semana'],['mes','Mes']].map(([id,label])=>`<button data-period="${id}" aria-pressed="${period===id}">${label}</button>`).join('')}</div><section class="card"><h2>Lo que queda</h2><div class="eq-row"><span>Ganado bruto</span><b data-count="${Math.round(t.gross)}">${money(t.gross)}</b></div><div class="eq-row minus"><span>Bencina o electricidad</span><b>−${money(t.fuel)}</b></div><div class="eq-row minus"><span>Mantención</span><b>−${money(t.maintenance)}</b></div><div class="eq-row minus"><span>Datos móviles</span><b>−${money(t.data)}</b></div><div class="eq-row eq-total ${t.net<0?'neg':''}"><span>Ganancia neta</span><b data-count="${Math.round(t.net)}">${money(t.net)}</b></div><div class="splitbar" role="img" aria-label="${money(t.net)} netos de ${money(t.gross)} brutos"><span class="keep" style="width:${t.gross?Math.max(0,t.net/t.gross*100):0}%"></span><span class="spent" style="width:${t.gross?Math.max(0,spent/t.gross*100):0}%"></span></div><p class="note">Neto = bruto − bencina o electricidad − mantención − datos.</p></section><div class="stats"><dl class="stat"><dt>Horas trabajadas</dt><dd>${t.realHours.toLocaleString('es-CL',{maximumFractionDigits:1})} h</dd></dl><dl class="stat"><dt>Ganancia por hora</dt><dd>${money(t.hourly)}<small>/h</small></dd></dl><dl class="stat"><dt>Pedidos entregados</dt><dd>${t.count}</dd></dl><dl class="stat"><dt>Km sin pedido</dt><dd>${t.emptyKm.toFixed(1)} km</dd></dl></div><section class="card"><h2>En qué se fue</h2><div class="rows"><div><span class="lbl"><i class="sw fuel"></i>Bencina o electricidad</span><b>${money(t.fuel)}</b></div><div><span class="lbl"><i class="sw wrench"></i>Mantención</span><b>${money(t.maintenance)}</b></div><div><span class="lbl"><i class="sw data"></i>Datos móviles</span><b>${money(t.data)}</b></div><div class="total"><span class="lbl">Gastado total</span><b>${money(spent)}</b></div></div></section><section class="card"><h2>Invertido en el vehículo</h2><dl class="inv-grid"><div><dt>Inversión</dt><dd>${money(investment)}</dd></div><div><dt>Neto acumulado</dt><dd>${money(recoveredNet)}</dd></div><div><dt>Por recuperar*</dt><dd>${money(remaining)}</dd></div></dl><div class="progress grow"><span style="width:${progress}%"></span></div><p class="note" style="margin-top:10px">* Comparación ilustrativa. No equivale a amortización contable.</p></section><section class="card"><h2>Ganancia por día</h2>${chart(jobs)}</section><section class="card"><h2>Por plataforma</h2>${platformSums.map(x=>`<div class="plat"><span class="pname">${x.p}</span><div class="pbar"><span style="width:${Math.max(0,x.net/max*100)}%"></span></div><span class="amt">${money(x.net)}</span></div>`).join('')}</section><p class="note center">${t.rejected} ofertas rechazadas · ${Math.round(t.waitMin)} min de espera registrada. Cifras de demostración.</p>`;
  }
  function mapSvg() {
    const o=currentOffer||acceptedOffer||OFFERS[0];
    const route=`M${o.pickup[0]} ${o.pickup[1]} Q${(o.pickup[0]+o.drop[0])/2-24} ${(o.pickup[1]+o.drop[1])/2+30} ${o.drop[0]} ${o.drop[1]}`;
    return `<svg class="map" viewBox="0 0 350 330" role="img" aria-label="Mapa esquemático de Santiago. Ruta entre ${o.from} y ${o.to}; bencineras de demostración"><rect width="350" height="330" fill="#eef1e8"/><path class="park" d="M0 20Q75 0 140 40T350 16V0H0ZM0 265Q65 218 125 270T350 275V330H0Z"/><path class="hill" d="M270 0h80v140q-38-24-55-58z"/><path class="river" d="M-5 112Q72 127 130 121T355 124"/><path class="ave-edge" d="M-10 80Q87 73 143 106T359 92M-10 156Q92 140 170 158T360 139M-10 241Q119 246 166 214T360 235M83 -10Q95 99 130 177T106 340M197 -10Q177 100 205 179T237 340M296 -10Q267 98 288 166T319 340"/><path class="ave" d="M-10 80Q87 73 143 106T359 92M-10 156Q92 140 170 158T360 139M-10 241Q119 246 166 214T360 235M83 -10Q95 99 130 177T106 340M197 -10Q177 100 205 179T237 340M296 -10Q267 98 288 166T319 340"/><path class="street" d="M13 17 347 308M-15 306 315 5M15 195 344 198M5 292 335 38"/><text x="30" y="65" class="map-label area">SANTIAGO</text><text x="150" y="112" class="map-label area">PROVIDENCIA</text><text x="212" y="284" class="map-label area">ÑUÑOA</text><text x="258" y="55" class="map-label area">LAS CONDES</text><path class="route-case" d="${route}"/><path class="route draw" d="${route}"/><circle class="pin-pick" cx="${o.pickup[0]}" cy="${o.pickup[1]}" r="8"/><circle class="pin-drop" cx="${o.drop[0]}" cy="${o.drop[1]}" r="8"/>${STATIONS.map(s=>`<g class="st ${stationId===s.id?'sel':''} ${s.price===1288?'cheap':''}" aria-hidden="true"><circle class="dot-st" cx="${s.x}" cy="${s.y}" r="6"/><path class="stem" d="M${s.x} ${s.y-6}v-6"/><rect class="tag" x="${s.x-30}" y="${s.y-34}" width="60" height="22" rx="7"/><text class="txt" x="${s.x}" y="${s.y-19}" text-anchor="middle">${money(s.price)}</text></g>`).join('')}</svg>`;
  }
  function mapPage() {
    const cheap=STATIONS.reduce((a,b)=>a.price<b.price?a:b),selected=STATIONS.find(s=>s.id===stationId)||cheap;
    return `<div><p class="kicker">Ruta y combustible</p><h1 class="title" id="page-title" tabindex="-1">Santiago a la vista</h1><p class="lead">Ruta y precios ilustrativos, sin conexión.</p></div><div class="card map-card">${mapSvg()}<div class="map-legend"><span><i class="lg-route"></i>Ruta</span><span><i class="lg-pick"></i>Retiro</span><span><i class="lg-cheap"></i>Menor precio</span></div></div><section class="card"><h2>Bencineras del ejemplo</h2><p class="note">Precio por litro · datos ficticios</p><div class="station-list" style="margin-top:12px">${STATIONS.map(s=>`<button class="station-row" data-station="${s.id}" aria-pressed="${stationId===s.id}"><span><span class="t1">${s.brand} · ${s.name}</span><br><span class="t2">${s.id===cheap.id?'Menor precio del mapa':'Precio referencial'}</span></span><span class="price">${money(s.price)}<small class="${s.id===cheap.id?'':'more'}">/litro</small></span></button>`).join('')}</div></section><p class="note center">Seleccionada: ${selected.brand} · ${selected.name}. No uses este mapa para navegar ni cargar combustible.</p>`;
  }
  function vehiclePage() {
    const v=vehicle(),{investment,net,remaining,progress}=recovery();
    const fields=[['fuelPrice','Precio de bencina 93','por litro',0,3000,1],['kwhPrice','Precio de electricidad','por kWh',0,1000,1],['dataMonthly','Datos móviles','al mes',0,100000,100],['hoursMonthly','Horas de trabajo','al mes',1,400,1],['goal','Meta neta','por hora',1,100000,100],['investment','Invertido en el vehículo','total',0,100000000,1000]];
    return `<div><p class="kicker">Tus costos reales</p><h1 class="title" id="page-title" tabindex="-1">Tu vehículo, tus números</h1><p class="lead">Partimos con valores de ejemplo. Ajústalos cuando quieras.</p></div><section class="card"><h2>Vehículo</h2><div class="veh-grid" style="margin-top:12px">${VEHICLES.map(x=>`<button class="veh" data-vehicle="${x.id}" aria-pressed="${x.id===v.id}">${icon(x.type==='human'?'bike':x.type==='electric'?'bolt':x.group==='Auto'?'car':'fuel')}<span><span class="vn">${x.name}</span><br><span class="vg">${x.group}</span></span></button>`).join('')}</div><p class="note" style="margin-top:10px">${v.type==='human'?'Sin combustible':`${v.consumption} ${v.unit}`} · ${money(v.maintenance)}/km en mantención estimada.</p></section><section class="card"><h2>Valores para calcular</h2><div class="fields" style="margin-top:12px">${fields.map(([key,label,suffix,min,max,step])=>`<div class="field"><label for="setting-${key}">${label}</label><div class="input-wrap"><span class="pre" aria-hidden="true">${key==='hoursMonthly'?'':'$'}</span><input id="setting-${key}" type="text" inputmode="numeric" min="${min}" max="${max}" step="${step}" data-setting="${key}" value="${Number(state.settings[key]).toLocaleString('es-CL')}" aria-describedby="hint-${key}"><span class="suf" aria-hidden="true">${suffix}</span></div><p class="hint" id="hint-${key}">Valor de demostración; se guarda solo aquí.</p></div>`).join('')}</div><p class="note" style="margin-top:14px">Semáforo: verde si llega a tu meta; amarillo entre 90 % y 99 %; rojo bajo 90 %.</p></section><section class="card"><h2>Inversión</h2><dl class="inv-grid"><div><dt>Invertido</dt><dd>${money(investment)}</dd></div><div><dt>Neto acumulado</dt><dd>${money(net)}</dd></div><div><dt>Por recuperar*</dt><dd>${money(remaining)}</dd></div></dl><div class="progress grow"><span style="width:${progress}%"></span></div><p class="note" style="margin-top:10px">* Comparación ilustrativa, no amortización contable.</p></section><section class="card"><h2>Demostración y seguridad</h2><p class="note">Velocidad simulada: ${state.speed} km/h.</p><div class="btn-col" style="margin-top:12px"><button class="btn outline block" data-action="speed">Probar bloqueo a 15 km/h</button><button class="btn danger block" data-action="reset">Borrar mis datos locales</button></div></section><p class="note center">Sin cuentas en línea ni GPS. Los cambios se guardan en este navegador.</p>`;
  }
  function security() { return `<div class="security" role="alertdialog" aria-modal="true" aria-labelledby="security-title" aria-describedby="security-desc"><div class="sec-card"><span class="sec-icon">${icon('shield','lg')}</span><h2 id="security-title">Primero, detente</h2><p id="security-desc">Sobre 10 km/h bloqueamos los botones. Tu seguridad va primero.</p><div class="sec-speed">${state.speed}<small>km/h</small></div><button class="btn lime big block" data-action="stop">Simular detención</button><p>Control simulado: no usa GPS.</p></div></div>`; }
  function render() {
    const oldScroll=document.getElementById('main')?.scrollTop||0;
    const changed=lastScreen!==screen;
    const markup=!state.onboarded?onboarding():shell(({inicio:home,oferta:offerPage,resumen:summary,mapa:mapPage,vehiculo:vehiclePage})[screen]());
    app.innerHTML=markup.replace(/(\d+)\.(\d+)(?=\s*km\b)/g,'$1,$2');
    const main=document.getElementById('main');
    const customForm=document.getElementById('custom-vehicle-form');
    if(customForm) syncCustomVehicleForm(customForm);
    if (main) main.scrollTop=changed?0:oldScroll;
    if (changed && lastScreen!==null) document.getElementById('page-title')?.focus({preventScroll:true});
    lastScreen=screen;
    if (window.parent!==window && DIRECT==='resumen') {
      const {gross,fuel,maintenance,data,net,waitMin}=aggregate(periodJobs());
      window.parent.postMessage({tipo:'resumen-luis',gross,fuel,maintenance,data,net,waitMin},'*');
    }
    if (window.parent!==window && DIRECT==='oferta' && currentOffer) {
      const {signal}=calculateOffer(currentOffer,vehicle(),state.settings);
      window.parent.postMessage({tipo:'senal-oferta',signal},'*');
    }
    animateCounts();
    updateTimer();
  }
  function animateCounts() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    app.querySelectorAll('[data-count]').forEach(el=>{
      const target=Number(el.dataset.count);
      if (!Number.isFinite(target) || target===0) return;
      const start=performance.now(),duration=650;
      const tick=now=>{
        if (!el.isConnected) return;
        const p=Math.min(1,(now-start)/duration);
        el.textContent=money(Math.round(target*(1-Math.pow(1-p,3))));
        if (p<1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  function updateTimer() {
    const el=document.getElementById('wait-timer'); if(!el||!waitStart)return;
    const s=Math.floor((Date.now()-waitStart)/1000);
    el.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    const ring=document.querySelector('#wait-ring .fg');
    if (ring) ring.style.strokeDashoffset=String(264*(1-Math.min(1,s/300)));
    document.getElementById('wait-ring')?.classList.toggle('over',s>=300);
    document.querySelector('.wait-msg')?.classList.toggle('over',s>=300);
  }
  function simulate(index) {
    if (acceptedOffer) { toast('Finaliza el pedido en espera primero.');return; }
    const available=OFFERS.filter(o=>state.connected.includes(o.platform));
    if (index==null && !available.length) { screen='vehiculo';render();toast('Activa una plataforma de ejemplo en Ajustes.',true);return; }
    currentOffer={...(index==null?available[state.offerCursor++%available.length]:OFFERS[index])}; screen='oferta'; save();render();
  }
  function finishDelivery() {
    if(!acceptedOffer)return;
    const calc=acceptedCalc;
    state.jobs.push({id:`live-${Date.now()}`,date:today(),time:new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}),platform:acceptedOffer.platform,restaurant:acceptedOffer.restaurant,from:acceptedOffer.from,to:acceptedOffer.to,status:'completed',...calc});
    acceptedOffer=null;acceptedCalc=null;currentOffer=null;waitStart=0;screen='inicio';save();render();toast('Entrega registrada automáticamente.');
  }
  function rejectOffer() {
    if(!currentOffer)return;
    state.jobs.push({id:`reject-${Date.now()}`,date:today(),time:new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}),platform:currentOffer.platform,restaurant:currentOffer.restaurant,status:'rejected',gross:0,net:0,totalKm:0,returnKm:0,waitMin:0,totalMinutes:0,signal:calculateOffer(currentOffer,vehicle(),state.settings).signal,fuel:0,maintenance:0,data:0});
    currentOffer=null;save();render();toast('Oferta rechazada y registrada.');
  }
  app.addEventListener('click',e=>{
    const button=e.target.closest('[data-action],[data-screen],[data-period],[data-vehicle],[data-connect],[data-station]');
    if(!button)return;
    const action=button.dataset.action;
    if(state.speed>10 && action!=='stop')return;
    if(button.dataset.screen){screen=button.dataset.screen;render();return;}
    if(button.dataset.period){period=button.dataset.period;render();return;}
    if(button.dataset.vehicle){state.vehicleId=button.dataset.vehicle;state.settings.investment=vehicle().investment;save();render();return;}
    if(button.dataset.station){stationId=button.dataset.station;render();return;}
    if(button.dataset.connect){const p=button.dataset.connect;if(state.connected.includes(p))state.connected=state.connected.filter(x=>x!==p);else state.connected.push(p);save();render();return;}
    if(action==='save-profile-first' || action==='save-profile'){
      const form=document.getElementById(action==='save-profile-first'?'signup-form':'profile-form');
      if(!form.reportValidity())return;
      const name=form.elements.name.value.trim().replace(/\s+/g,' '),email=form.elements.email.value.trim();
      if(name.length<2 || name.length>40 || email.length>120){toast('Revisa tu nombre y correo.',true);return;}
      state.profile={name,email};save();
      if(action==='save-profile-first'){introStep=1;render();}else{render();toast('Perfil guardado en este dispositivo.');}
      return;
    }
    if(action==='onboard-back'){introStep=Math.max(0,introStep-1);render();return;}
    if(action==='intro-next'){if(!state.connected.length){toast('Activa al menos una plataforma de ejemplo.',true);return;}introStep=2;save();render();return;}
    if(action==='finish-onboarding'){state.onboarded=true;save();screen='inicio';render();return;}
    if(action==='save-custom-vehicle'){
      const form=document.getElementById('custom-vehicle-form');if(!form.reportValidity())return;
      const group=form.elements.group.value,type=form.elements.type.value,name=form.elements.model.value.trim(),motorW=Number(form.elements.motorW.value)||0;
      if((group==='Scooter' && type!=='electric') || (group==='Bicicleta' && type==='fuel') || ((group==='Auto'||group==='Moto') && type==='human')){toast('Esa combinación de vehículo y propulsión no es válida.',true);return;}
      if(type==='electric' && !name && !motorW){toast('Para un eléctrico, indica modelo o potencia del motor.',true);return;}
      const consumption=Number(form.elements.consumption.value),maintenance=Number(form.elements.maintenance.value),investment=Number(form.elements.investment.value);
      if(!Number.isFinite(consumption)||consumption<.1||consumption>500||!Number.isFinite(maintenance)||maintenance<0||maintenance>1000||!Number.isFinite(investment)||investment<0||investment>100000000){toast('Revisa los valores del vehículo.',true);return;}
      const fallbackName=type==='electric'?`${group} ${['Moto','Bicicleta'].includes(group)?'eléctrica':'eléctrico'}`:`${group} personalizado`;
      state.customVehicle={id:'custom',group,name:name||fallbackName,motorW,type,consumption:type==='human'?1:consumption,maintenance,investment,unit:type==='fuel'?'km/l':type==='electric'?'km/kWh':'sin combustible'};
      state.vehicleId='custom';state.settings.investment=investment;save();render();toast('Vehículo personalizado activo.');return;
    }
    if(action==='simulate'){simulate();return;}
    if(action==='accept'){acceptedOffer=currentOffer;acceptedCalc=calculateOffer(currentOffer,vehicle(),state.settings);currentOffer=null;waitStart=Date.now();render();toast('Pedido aceptado · cronómetro iniciado.');return;}
    if(action==='reject'){rejectOffer();return;}
    if(action==='finish-delivery'){finishDelivery();return;}
    if(action==='speed'){state.speed=15;render();return;}
    if(action==='stop'){state.speed=0;render();toast('Interacción desbloqueada.');return;}
    if(action==='reset'){if(confirm('¿Borrar el perfil, la configuración y el historial guardados en este navegador?')){try{localStorage.removeItem(KEY)}catch(_){}state=defaults();introStep=0;currentOffer=null;acceptedOffer=null;acceptedCalc=null;waitStart=0;screen='inicio';render();}return;}
  });
  app.addEventListener('change',e=>{
    if(state.speed>10)return;
    const t=e.target;
    if(t.id==='custom-group' || t.id==='custom-type'){syncCustomVehicleForm(t.form);return;}
    if(t.dataset.field==='vehicleId'){state.vehicleId=t.value;state.settings.investment=vehicle().investment;save();render();return;}
    if(t.dataset.setting){const key=t.dataset.setting,raw=t.value.trim()===''?NaN:Number(t.value.replace(/\./g,'')),lo=Number(t.min),hi=Number(t.max);if(!Number.isFinite(raw)||!Number.isInteger(raw)||raw<lo||raw>hi){t.setAttribute('aria-invalid','true');t.closest('.field')?.classList.add('invalid');toast(`Ingresa un valor entre ${lo} y ${hi}.`,true);return;}state.settings[key]=raw;save();render();toast('Valor actualizado.');}
  });
  app.addEventListener('input',e=>{if(e.target.dataset.setting){e.target.removeAttribute('aria-invalid');e.target.closest('.field')?.classList.remove('invalid');}});
  app.addEventListener('focusin',e=>{if(e.target.dataset.setting)e.target.value=e.target.value.replace(/\./g,'');});
  window.addEventListener('message',e=>{
    if (e.source!==window.parent || !e.data || e.data.tipo!=='simular') return;
    demoTimers.forEach(clearTimeout); demoTimers=[];
    if (!state.onboarded) { state.onboarded=true; state.connected=['Uber Eats','PedidosYa','Rappi']; }
    simulate();
  });
  setInterval(updateTimer,1000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(registration => registration.update()).catch(() => {}));
  }
  if(DEMO && !DIRECT){
    function loop() {
      demoTimers.forEach(clearTimeout);demoTimers=[];
      state={...defaults(),jobs:seedHistory()};state.onboarded=true;state.connected=['Uber Eats','PedidosYa','Rappi'];introStep=0;currentOffer=null;acceptedOffer=null;acceptedCalc=null;waitStart=0;screen='inicio';render();
      const later=(ms,fn)=>demoTimers.push(setTimeout(fn,ms));
      later(1600,()=>simulate(0));
      later(4300,()=>{acceptedOffer=currentOffer;acceptedCalc=calculateOffer(currentOffer,vehicle(),state.settings);currentOffer=null;waitStart=Date.now();render();});
      later(6800,()=>{screen='oferta';render();});
      later(9200,finishDelivery);
      later(11500,()=>simulate(1));
      later(14400,()=>{rejectOffer();toast('No conviene: está por debajo de tu meta por hora.');});
      later(16400,()=>{screen='resumen';period='día';render();});
      later(21500,loop);
    }
    loop();
  } else render();
})();
