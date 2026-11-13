(function () {
  'use strict';
  const { calculateOffer } = globalThis.UltimaMillaCalc;
  // Espacio propio para la demostración de Luis: no se mezclan perfiles de versiones anteriores.
  const KEY = 'ultima-milla-luis-demo-v2';
  const DEMO = new URLSearchParams(location.search).get('demo') === '1';
  const DIRECT = new URLSearchParams(location.search).get('pantalla');
  const LUIS = globalThis.DATOS?.luis?.cifras || { espera_min:110, pedidos:19 };
  if (new URLSearchParams(location.search).get('embebido') === '1') document.body.classList.add('embedded');
  if (DIRECT === 'resumen' && new URLSearchParams(location.search).get('compacto') === '1') document.body.classList.add('compact-summary');
  const SCREENS = ['inicio', 'oferta', 'resultado', 'resumen', 'mapa', 'vehiculo', 'carga'];
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
    { id:'scooter', group:'Scooter', name:'Xiaomi Electric Scooter', type:'electric', consumption:40, maintenance:28, investment:580000, icon:'🛴', unit:'km/kWh' },
    { id:'ybr125', group:'Moto', name:'Yamaha YBR 125', type:'fuel', consumption:42, maintenance:48, investment:1900000, unit:'km/l' },
    { id:'pulsar200', group:'Moto', name:'Bajaj Pulsar NS 200', type:'fuel', consumption:33, maintenance:60, investment:2900000, unit:'km/l' },
    { id:'gn125', group:'Moto', name:'Suzuki GN 125', type:'fuel', consumption:40, maintenance:47, investment:2100000, unit:'km/l' },
    { id:'cb125f', group:'Moto', name:'Honda CB125F', type:'fuel', consumption:45, maintenance:46, investment:2200000, unit:'km/l' },
    { id:'morbidelli', group:'Moto', name:'Super Soco TC Max', type:'electric', consumption:42, maintenance:36, investment:4200000, unit:'km/kWh' },
    { id:'spark', group:'Auto', name:'Chevrolet Spark', type:'fuel', consumption:16, maintenance:87, investment:7900000, unit:'km/l' },
    { id:'morning', group:'Auto', name:'Kia Morning', type:'fuel', consumption:16, maintenance:90, investment:9400000, unit:'km/l' },
    { id:'i10', group:'Auto', name:'Hyundai Grand i10', type:'fuel', consumption:15, maintenance:90, investment:10500000, unit:'km/l' },
    { id:'alto', group:'Auto', name:'Suzuki Alto', type:'fuel', consumption:18, maintenance:85, investment:7900000, unit:'km/l' },
    { id:'leaf', group:'Auto', name:'Nissan Leaf', type:'electric', consumption:6, maintenance:60, investment:22000000, unit:'km/kWh' },
    { id:'oxford', group:'Bicicleta', name:'Oxford Urbana', type:'human', consumption:1, maintenance:22, investment:330000, unit:'sin combustible' },
    { id:'trek', group:'Bicicleta', name:'Trek FX', type:'human', consumption:1, maintenance:25, investment:850000, unit:'sin combustible' },
    { id:'specialized', group:'Bicicleta', name:'Specialized Turbo Vado', type:'electric', consumption:80, maintenance:34, investment:3900000, unit:'km/kWh' },
    { id:'ninebot', group:'Scooter', name:'Segway Ninebot F2', type:'electric', consumption:38, maintenance:28, investment:690000, unit:'km/kWh' },
    { id:'navee', group:'Scooter', name:'Navee V50', type:'electric', consumption:42, maintenance:29, investment:620000, unit:'km/kWh' },
    { id:'navi', group:'Moto', name:'Honda Navi 110', type:'fuel', consumption:40, maintenance:48, investment:1850000, unit:'km/l' },
    { id:'xr150', group:'Moto', name:'Honda XR150L', type:'fuel', consumption:36, maintenance:55, investment:2700000, unit:'km/l' },
    { id:'boxer', group:'Moto', name:'Bajaj Boxer CT 100', type:'fuel', consumption:47, maintenance:45, investment:1650000, unit:'km/l' },
    { id:'apache', group:'Moto', name:'TVS Apache RTR 160', type:'fuel', consumption:38, maintenance:52, investment:2350000, unit:'km/l' },
    { id:'yaris', group:'Auto', name:'Toyota Yaris', type:'fuel', consumption:16, maintenance:90, investment:12500000, unit:'km/l' },
    { id:'soluto', group:'Auto', name:'Kia Soluto', type:'fuel', consumption:15, maintenance:90, investment:10500000, unit:'km/l' },
    { id:'accent', group:'Auto', name:'Hyundai Accent', type:'fuel', consumption:15, maintenance:92, investment:11900000, unit:'km/l' },
    { id:'baleno', group:'Auto', name:'Suzuki Baleno', type:'fuel', consumption:17, maintenance:89, investment:11200000, unit:'km/l' },
    { id:'onix', group:'Auto', name:'Chevrolet Onix', type:'fuel', consumption:16, maintenance:91, investment:11300000, unit:'km/l' },
    { id:'celerio', group:'Auto', name:'Suzuki Celerio', type:'fuel', consumption:18, maintenance:86, investment:8900000, unit:'km/l' },
    { id:'orion', group:'Bicicleta', name:'Oxford Orion', type:'human', consumption:1, maintenance:24, investment:350000, unit:'sin combustible' },
    { id:'marlin', group:'Bicicleta', name:'Trek Marlin 5', type:'human', consumption:1, maintenance:26, investment:760000, unit:'sin combustible' },
    { id:'escape', group:'Bicicleta', name:'Giant Escape 3', type:'human', consumption:1, maintenance:24, investment:650000, unit:'sin combustible' },
    { id:'sirrus', group:'Bicicleta', name:'Specialized Sirrus', type:'human', consumption:1, maintenance:25, investment:900000, unit:'sin combustible' },
    { id:'quick', group:'Bicicleta', name:'Cannondale Quick 4', type:'human', consumption:1, maintenance:26, investment:950000, unit:'sin combustible' },
    { id:'turbo', group:'Bicicleta', name:'Specialized Turbo Como', type:'electric', consumption:75, maintenance:35, investment:4200000, unit:'km/kWh' },
    { id:'mi4', group:'Scooter', name:'Xiaomi Electric Scooter 4', type:'electric', consumption:40, maintenance:28, investment:550000, unit:'km/kWh' },
    { id:'mipro2', group:'Scooter', name:'Xiaomi Mi Pro 2', type:'electric', consumption:38, maintenance:28, investment:600000, unit:'km/kWh' },
    { id:'maxg2', group:'Scooter', name:'Segway Ninebot Max G2', type:'electric', consumption:43, maintenance:29, investment:1000000, unit:'km/kWh' },
    { id:'f2pro', group:'Scooter', name:'Segway Ninebot F2 Pro', type:'electric', consumption:40, maintenance:29, investment:850000, unit:'km/kWh' },
    { id:'kqi2', group:'Scooter', name:'NIU KQi2 Pro', type:'electric', consumption:39, maintenance:29, investment:750000, unit:'km/kWh' },
    { id:'kqi3', group:'Scooter', name:'NIU KQi3 Pro', type:'electric', consumption:42, maintenance:30, investment:950000, unit:'km/kWh' },
    { id:'s65', group:'Scooter', name:'Navee S65', type:'electric', consumption:43, maintenance:30, investment:850000, unit:'km/kWh' }
  ];
  const OFFERS = [
    { id:1, platform:'Uber Eats', gross:6800, km:5.2, returnKm:1.6, minutes:38, waitMin:5, from:'Providencia', to:'Ñuñoa', restaurant:'Verde Limón', pickup:[102,131], drop:[225,222] },
    { id:2, platform:'PedidosYa', gross:1495, km:8.4, returnKm:3.2, minutes:51, waitMin:12, from:'Centro', to:'La Florida', restaurant:'Sabor Casero', pickup:[156,166], drop:[302,282] },
    { id:3, platform:'Rappi', gross:5400, km:4.8, returnKm:1.3, minutes:32, waitMin:7, from:'Las Condes', to:'Providencia', restaurant:'Bowl Sur', pickup:[285,103], drop:[154,154] },
    { id:4, platform:'Uber Eats', gross:3900, km:6.1, returnKm:2.4, minutes:46, waitMin:9, from:'Ñuñoa', to:'Macul', restaurant:'La Esquina', pickup:[216,215], drop:[270,255] },
    { id:5, platform:'Rappi', gross:8500, km:8.3, returnKm:1.8, minutes:55, waitMin:4, from:'Providencia', to:'Las Condes', restaurant:'Deli Alto', pickup:[154,155], drop:[284,102] }
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
  function defaults() { return { onboarded:true, profile:{name:'Luis',email:'luis@demo.example'}, connected:['Uber Eats','PedidosYa','Rappi'], vehicleId:'cb190', customVehicle:null, settings:{fuelGrade:'93',priceZone:'Metropolitana',fuelPrice:1300,fuelPriceManual:false,kwhPrice:220,batteryKwh:0,chargeKw:2,chargeStart:20,chargeEnd:80,navApp:'waze',dataMonthly:12000,hoursMonthly:200,goal:5000,investment:2850000}, jobs:[], refuels:[], shiftActive:false, nextOfferAt:0, speed:0, offerCursor:0, pendingOffer:null, activeDelivery:null, lastOutcomeId:null }; }
  function load() {
    if (DEMO || DIRECT) return { ...defaults(), jobs:seedHistory() };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && Array.isArray(raw.jobs) && raw.settings) {
        if (raw.jobs.some(j=>j.id?.startsWith('seed-13-')) && !raw.jobs.some(j=>j.id?.startsWith('seed-14-'))) {
          raw.jobs = [...seedHistory().filter(j=>j.date<dayAgo(13)), ...raw.jobs];
        }
        return { ...defaults(), ...raw, profile:defaults().profile, connected:raw.onboarded&&Array.isArray(raw.connected)?raw.connected:defaults().connected, refuels:Array.isArray(raw.refuels)?raw.refuels:[], settings:{...defaults().settings,...raw.settings}, onboarded:true, speed:0 };
      }
    } catch (_) { /* El prototipo sigue funcionando si el almacenamiento está deshabilitado. */ }
    return defaults();
  }
  let state = load();
  // El QR siempre aterriza en Inicio; una vista específica solo se abre mediante enlace explícito.
  let screen = SCREENS.includes(DIRECT) ? DIRECT : 'inicio';
  let introStep = 0;
  let currentOffer = state.pendingOffer;
  let manualDraft = currentOffer?.manual ? {
    gross:currentOffer.gross, km:currentOffer.km, platform:currentOffer.platform,
    restaurant:currentOffer.restaurant==='Restaurante no indicado'?'':currentOffer.restaurant,
    minutes:currentOffer.minutesEstimated?'':currentOffer.minutes,
    waitMin:currentOffer.waitSource==='manual'?currentOffer.waitMin:'',
    returnKm:currentOffer.returnKm||''
  } : null;
  let waitStart = state.activeDelivery?.startedAt || 0;
  let acceptedOffer = state.activeDelivery?.offer || null;
  let acceptedCalc = state.activeDelivery?.calc || null;
  let deliveryStage = state.activeDelivery?.stage || (waitStart ? 'arrived' : 'accepted');
  let measuredWaitMin = state.activeDelivery?.measuredWaitMin ?? null;
  let fuelPrices = null;
  let priceZone = state.settings.priceZone;
  let online = navigator.onLine;
  const ROUTE_STOPS = [
    { name:'Retiro de ejemplo · Manuel Montt', address:'Av. Providencia 1453', lat:-33.4295, lon:-70.6204 },
    { name:'Retiro de ejemplo · Los Leones', address:'Av. Providencia 2409', lat:-33.4200, lon:-70.6055 },
    { name:'Retiro de ejemplo · Pedro de Valdivia', address:'Av. Nueva Providencia 2278', lat:-33.4238, lon:-70.6078 },
    { name:'Retiro de ejemplo · Tobalaba', address:'Av. Nueva Providencia 2645', lat:-33.4190, lon:-70.6018 }
  ];
  let routeData = null;
  let routeStatus = 'Toca “Crear ruta con mi GPS” para ver un trayecto real por calles.';
  let routeLoading = false;
  let refuelStation = '';
  let refuelSuggestedStation = '';
  let refuelStatus = 'Busca una estación cercana con tu GPS o escribe su nombre.';
  let refuelLoading = false;
  let routeWait = 0;
  let routeZoom = null;
  let routeCursor = -1;
  function loadPrices() {
    fetch('./fuel-prices.json', {cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Sin copia');return r.json();}).then(data=>{
      if(!Array.isArray(data.zones) || !data.zones.every(z=>['93','95','97'].every(g=>Number.isFinite(z.prices?.[g]?.average) && z.prices[g].average>0))) return;
      fuelPrices=data;
      if(!state.settings.fuelPriceManual)syncFuelPrice();
      if(screen==='mapa'||screen==='vehiculo') render();
    }).catch(()=>{});
  }
  let period = 'día';
  function syncFuelPrice() {
    const average=fuelPrices?.zones?.find(z=>z.name===priceZone)?.prices?.[state.settings.fuelGrade]?.average;
    if(Number.isFinite(average)){state.settings.fuelPrice=Math.round(average);save();}
  }
  let toastTimer = null;
  let demoTimers = [];
  let lastScreen = null;
  if (DIRECT) { state.onboarded = true; state.connected = ['Uber Eats','PedidosYa','Rappi']; if (DIRECT==='oferta') { currentOffer=offerWithWait(OFFERS[0]); state.offerCursor=1; } }
  function save() { if (DEMO || DIRECT) return; try { const {speed,...stored}=state; stored.pendingOffer=currentOffer; stored.activeDelivery=acceptedOffer?{offer:acceptedOffer,calc:acceptedCalc,startedAt:waitStart,stage:deliveryStage,measuredWaitMin}:null; localStorage.setItem(KEY,JSON.stringify(stored)); } catch (_) {} }
  function toast(message,error=false) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div'); el.className=error?'toast error':'toast'; el.textContent=message; (app.querySelector('.toast-region')||app).appendChild(el);
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.remove(),2600);
  }
  function signalText(s) { return s === 'green' ? 'Conviene' : s === 'yellow' ? 'Cerca de tu meta' : 'No conviene'; }
  function offerWithWait(offer) {
    const observed=state.jobs.filter(j=>j.status==='completed' && j.restaurant===offer.restaurant && j.waitSource==='medida' && Number.isFinite(Number(j.waitMin)));
    const waitMin=observed.length ? Math.round(observed.reduce((sum,j)=>sum+Number(j.waitMin),0)/observed.length) : offer.waitMin;
    return {...offer,waitMin,waitCount:observed.length,waitSource:observed.length>=2?'promedio':observed.length===1?'ultima':'ejemplo'};
  }
  function platformClass(p) { return p === 'Uber Eats' ? 'uber' : p === 'PedidosYa' ? 'pedidos' : p === 'Rappi' ? 'rappi' : 'other'; }
  const icon = (name, cls='') => {
    const paths={arrow:'<path d="M5 16 16 5M7 5h9v9"/>',home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/>',offer:'<path d="M4 7h16M4 12h16M4 17h10"/><circle cx="19" cy="17" r="2"/>',summary:'<path d="M4 20V10m6 10V4m6 16v-8m4 8V7"/>',map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',shield:'<path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',check:'<path d="m4 12 5 5L20 6"/>',fuel:'<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M7 7h6v5H7zM15 8h2l2 3v7a2 2 0 0 0 2 0v-6l-2-2"/>',bike:'<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m5 17 5-9 4 9H5m9 0 5-8h-4m-6-3h3"/>',car:'<path d="m4 16 2-8h12l2 8v4H4zM2 16h20M7 20v2m10-2v2"/>',bolt:'<path d="m13 2-8 11h6l-1 9 9-12h-6z"/>'};
    return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
  };
  const logo = p => `<span class="logo ${platformClass(p)}" aria-hidden="true">${p==='Uber Eats'?'U':p==='PedidosYa'?'P':p==='Rappi'?'R':'·'}</span>`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const vehicleGroup = v => v.group.includes('Bici') ? 'Bicicleta' : v.group.includes('Moto') ? 'Moto' : v.group;
  const vehicleBrand = v => v.brand || ({urban:'Genérica',emoto:'Genérica',scooter:'Xiaomi',morbidelli:'Super Soco',ninebot:'Segway',i10:'Hyundai',ebike:'Oxford'}[v.id] || v.name.split(' ')[0]);
  let pickerGroup = vehicleGroup(vehicle());
  let pickerBrand = vehicleBrand(vehicle());
  function vehiclePicker(onboard=false) {
    const groups=['Auto','Moto','Bicicleta','Scooter'];
    const matches=[...VEHICLES,...(state.customVehicle?[state.customVehicle]:[])].filter(v=>vehicleGroup(v)===pickerGroup);
    const brands=[...new Set(matches.map(vehicleBrand))].sort((a,b)=>a.localeCompare(b,'es'));
    const visible=matches.filter(v=>vehicleBrand(v)===pickerBrand);
    return `<div class="picker-controls"><label>Tipo de vehículo<select data-picker="group" aria-label="Tipo de vehículo">${groups.map(g=>`<option ${g===pickerGroup?'selected':''}>${g}</option>`).join('')}</select></label><label>Marca<select data-picker="brand" aria-label="Marca">${brands.map(b=>`<option ${b===pickerBrand?'selected':''}>${escapeHtml(b)}</option>`).join('')}</select></label></div><div class="veh-grid ${onboard?'onboarding-vehicles':''}">${visible.map(v=>`<button class="veh" data-vehicle="${v.id}" aria-pressed="${v.id===state.vehicleId}">${icon(v.type==='human'?'bike':v.type==='electric'?'bolt':v.group==='Auto'?'car':'fuel')}<span><span class="vn">${escapeHtml(v.name)}</span><br><span class="vg">${v.type==='electric'?'Eléctrico':v.type==='human'?'Sin motor':'Gasolina'} · estimación editable</span></span></button>`).join('')}</div>`;
  }
  function head(showSafety=true) { return `<header class="top"><div class="brand"><span class="brand-ic">${icon('arrow')}</span><span>Última Milla</span></div><div class="top-right"><span class="demo-pill">MODO DEMO<small class="network-label">${online?'EN LÍNEA':'SIN INTERNET'}</small></span>${showSafety?`<button class="icon-btn" data-action="speed" aria-label="Probar bloqueo por movimiento" title="Probar bloqueo por movimiento">${icon('shield')}</button>`:''}</div></header>`; }
  function nav() { return `<nav class="tabbar" aria-label="Navegación principal">${[['inicio','home','Inicio'],['oferta','offer','Oferta'],['resumen','summary','Resumen'],['mapa','map','Mapa'],['vehiculo','settings','Ajustes']].map(([id,ic,label])=>`<button class="tab ${screen===id?'pop':''}" data-screen="${id}" aria-label="${label}" ${screen===id?'aria-current="page"':''}>${icon(ic)}<span>${label}</span>${id==='oferta'&&currentOffer?'<i class="badge" aria-hidden="true"></i>':''}</button>`).join('')}</nav>`; }
  function shiftCard() {
    return `<section class="card live-card"><div class="section-head"><h2><span class="live-dot ${state.shiftActive?'on':''}"></span>Turno ${state.shiftActive?'activo':'en pausa'}</h2><span class="aside">DEMO</span></div><p class="note">${state.shiftActive?'Llegarán ofertas de ejemplo de tus plataformas conectadas.':'Activa el turno para recibir ofertas de ejemplo.'} No lee notificaciones ni pedidos reales.</p><button class="btn ${state.shiftActive?'outline':'primary'} block" data-action="${state.shiftActive?'shift-pause':'shift-start'}" style="margin-top:12px">${state.shiftActive?'Pausar turno':'Iniciar turno'}</button></section>`;
  }
  function refuelSummary() {
    if (vehicle().type!=='fuel') return '';
    const last=state.refuels.at(-1);
    return `<section class="card refuel-card"><div class="section-head"><h2>Cargas de combustible</h2><span class="aside">${state.refuels.length} registradas</span></div><p class="note">${last?`Última: ${money(last.amount)} · ${last.liters.toLocaleString('es-CL')} l · ${escapeHtml(last.station)}.`:'Registra una carga al salir de la estación.'}</p><button class="btn outline block" data-screen="carga" style="margin-top:12px">Registrar carga ${icon('arrow','sm')}</button></section>`;
  }
  function fuelLedger() {
    if (!state.refuels.length) return '';
    const recent=state.refuels.slice(-5).reverse();
    const total=state.refuels.reduce((sum,item)=>sum+item.amount,0);
    return `<section class="card"><div class="section-head"><h2>Cargas registradas</h2><span class="aside">${money(total)} en total</span></div><p class="note" style="margin:8px 0">Gasto pagado, separado del costo estimado por km de cada pedido.</p>${recent.map(item=>`<div class="row"><span class="dot green"></span><span class="main"><span class="t1">${escapeHtml(item.station)}</span><span class="t2">${new Date(item.at).toLocaleDateString('es-CL')} · ${Number(item.liters).toLocaleString('es-CL')} l · ${escapeHtml(item.grade)} octanos</span></span><span class="amt">${money(item.amount)}</span></div>`).join('')}</section>`;
  }
  function incomingBanner() {
    if (!currentOffer || screen==='oferta') return '';
    return `<button class="incoming-banner" data-screen="oferta"><span class="live-dot on"></span><span><strong>Oferta de ${escapeHtml(currentOffer.platform)}</strong><small>${escapeHtml(currentOffer.restaurant)} · Toca para revisar</small></span>${icon('arrow','sm')}</button>`;
  }
  function offerWaitCard(offer) {
    const count=Number(offer.waitCount)||0;
    const source=offer.waitSource==='promedio' && count>=2
      ? `Promedio de ${count} esperas que mediste aquí`
      : offer.waitSource==='ultima' && count===1
        ? 'Tu última espera medida aquí'
        : offer.waitSource==='manual' ? 'Espera que ingresaste para este pedido' : offer.manual ? 'Estimación orientativa; puedes editarla' : 'Estimación para esta oferta de prueba';
    return `<section class="card wait-insight" aria-label="Espera en el restaurante"><div class="wait-insight-head"><div><p class="kicker">ESPERA EN ${escapeHtml(offer.restaurant)}</p><strong>${Number(offer.waitMin)||0} <small>min</small></strong></div>${icon('clock','lg')}</div><p>${source}. No es un dato en vivo del restaurante.</p></section>`;
  }
  function shell(content) {
    if (screen==='inicio') {
      content=content.replace('<div class="decide"><button class="btn lime" data-action="simulate">Simular oferta</button>', '<div class="home-decision"><span class="home-decision-index">LA HERRAMIENTA PRINCIPAL</span><strong>Antes de aceptar,<br>mira lo que queda.</strong><p>Ingresa el pago y los km de cualquier oferta.</p><button class="btn lime block" data-screen="oferta">Evaluar mi pedido <span aria-hidden="true">→</span></button></div><div class="decide"><button class="btn outline" data-action="simulate">Probar oferta demo</button>');
      if(state.profile?.name) content=content.replace('Hola, Luis.',`Hola, ${escapeHtml(state.profile.name.split(/\s+/)[0])}.`);
      content=content.replace('Así va tu día en Santiago.','Así va tu turno.');
      content=content.replace('</section><div class="decide">',`</section>${shiftCard()}${state.lastOutcomeId?'<button class="last-result" data-screen="resultado">Ver último resultado <span aria-hidden="true">→</span></button>':''}<div class="decide">`);
      content=content.replace('</section><section><div class="section-head"><h2>Actividad reciente',`</section>${refuelSummary()}<section><div class="section-head"><h2>Actividad reciente`);
    }
    if(screen==='vehiculo') {
      const page=content.replace(/^<div>.*?<\/div>/,'').replace('<h2>Vehículo</h2>',`<h2>Vehículo</h2><p class="note">En uso: ${escapeHtml(vehicle().name)}</p>`);
      content=settingsExtras()+page.replace('</section>',`</section>${customVehicleEditor()}`);
    }
    if(screen==='resumen') content+=fuelLedger();
    if(screen==='oferta' && (currentOffer||acceptedOffer)) {
      const offer=currentOffer||acceptedOffer;
      const calc=acceptedOffer?acceptedCalc:calculateOffer(offer,vehicle(),state.settings);
      const decision=calc.signal==='green'?'Aceptar':calc.signal==='yellow'?'Revisar antes de aceptar':'Rechazar';
      content=content.replace('<div class="verdict ',`${offerWaitCard(offer)}<div class="verdict `);
      if(!acceptedOffer) content=content.replace(`<div class="v-title">${signalText(calc.signal)}</div>`,`<div class="v-title">Recomendación: ${decision}</div>`);
      if(offer.manual) {
        content=content.replace('Nueva oferta · ', 'Tus datos · ');
        content=content.replace('Calculado con tus costos y el regreso sin pedido.', offer.returnKm>0?'Calculado con tus costos y el regreso que indicaste.':'Calculado con tus costos. No incluye regreso sin pedido.');
        content=content.replace('Estimación de demostración; no recibe ofertas reales.', 'Estimación orientativa con datos ingresados por ti; no recibe ofertas reales.');
        content=content.replace('<div class="card"><div class="net-line">', `<div class="manual-context"><span>02 / 02 · ANÁLISIS</span><p>${offer.minutesEstimated?'Tiempo de viaje estimado según distancia. ':'Tiempo de viaje ingresado por ti. '}${offer.waitSource==='manual'?'Espera ingresada por ti. ':'Espera orientativa o de tu historial. '}No usa tráfico en vivo.</p>${!acceptedOffer?'<button class="btn link" data-action="edit-manual">Editar datos</button>':''}</div><div class="card"><div class="net-line">`);
      }
    }
    if(screen==='resultado') content=content.replace('<div class="result-actions">',`${platformComparison()}<div class="result-actions">`);
    content=content.replace('Si cargas a otro precio, escríbelo en Ajustes. El GPS de esta demo solo sirve para rutas en Santiago; no detecta la estación.','Al registrar una carga, el precio real por litro actualiza tus próximos cálculos.');
    content=content.replace('El GPS se usa solo cuando pides una ruta o buscas una estación.','El GPS se usa solo cuando creas una ruta o buscas una estación.');
    return `<div class="shell" ${state.speed>10?'inert':''}><a class="skip-link" href="#main">Ir al contenido</a>${head()}<main class="scroll" id="main" tabindex="-1"><div class="${lastScreen!==screen?'enter ':''}stack">${incomingBanner()}${content}</div></main>${nav()}</div>${state.speed>10?security():''}<div class="toast-region" role="status" aria-live="polite"></div>`;
  }
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
      : `${vehiclePicker(true)}<p class="trust">${icon('check')} Puedes ajustar modelo, motor y costos en Ajustes.</p>`;
    return `<div class="intro onboard">${head(false)}<div class="intro-body"><p class="step">PASO ${step+1} DE 3 · PERFIL LOCAL</p><h1 tabindex="-1" id="page-title">${title}</h1><p class="lead">${description}</p>${body}</div><div class="intro-bottom"><div class="steps-dots" aria-hidden="true"><i class="on"></i><i class="${step>0?'on':''}"></i><i class="${step>1?'on':''}"></i></div><div class="onboard-actions">${step>0?'<button class="btn outline" data-action="onboard-back">Atrás</button>':''}<button class="btn lime big" data-action="${step===0?'save-profile-first':step===1?'intro-next':'finish-onboarding'}">${step===0?'Crear perfil':step===1?'Elegir vehículo':'Empezar mi turno'} ${icon('arrow','sm')}</button></div></div></div><div class="toast-region" role="status" aria-live="polite"></div>`;
  }
  function settingsExtras() {
    const platforms = ['Uber Eats','PedidosYa','Rappi'];
    return `<div><p class="kicker">Tu espacio de trabajo</p><h1 class="title" id="page-title" tabindex="-1">Ajustes</h1><p class="lead">Controla las plataformas de ejemplo y los costos del caso de Luis.</p></div><section class="card"><h2>Perfil de demostración</h2><p><strong>Luis</strong></p><p class="note">La sesión de Luis ya está iniciada. Es un personaje de ejemplo, no una cuenta en línea. Las pruebas se guardan solo en este dispositivo.</p></section><section class="card"><h2>Plataformas de ejemplo</h2><p class="note">Activar una plataforma muestra sus ofertas simuladas. No se conecta a Uber Eats, PedidosYa ni Rappi.</p><div class="connect-list settings-connect">${platforms.map(p=>`<button class="connect" data-connect="${p}" aria-pressed="${state.connected.includes(p)}">${logo(p)}<span><span class="cn">${p}</span><br><span class="cs">Sin acceso a tu cuenta real</span></span><span class="state">${state.connected.includes(p)?'Activo':'Activar'}</span></button>`).join('')}</div></section>`;
  }
  function customVehicleEditor() {
    const v=state.customVehicle;
    return `<section class="card"><details class="custom-vehicle"><summary>Configurar mi propio vehículo ${icon('arrow','sm')}</summary><p class="note">Usa datos reales si los conoces; si no, parte de una estimación y ajústala después.</p><form id="custom-vehicle-form" class="signup-form compact"><label for="custom-group">Tipo de vehículo</label><select id="custom-group" name="group"><option ${v?.group==='Auto'?'selected':''}>Auto</option><option ${v?.group==='Moto'?'selected':''}>Moto</option><option ${v?.group==='Bicicleta'?'selected':''}>Bicicleta</option><option ${v?.group==='Scooter'?'selected':''}>Scooter</option></select><label for="custom-type">Propulsión</label><select id="custom-type" name="type"><option value="fuel" ${v?.type==='fuel'?'selected':''}>Gasolina</option><option value="electric" ${v?.type==='electric'?'selected':''}>Eléctrica</option><option value="human" ${v?.type==='human'?'selected':''}>Sin motor</option></select><label for="custom-brand">Marca</label><input id="custom-brand" name="brand" required maxlength="40" placeholder="Ej. Honda" value="${escapeHtml(v?.brand)}"><label for="custom-name">Modelo</label><input id="custom-name" name="model" maxlength="50" placeholder="Ej. moto urbana 150 cc" value="${escapeHtml(v?.model||(!v?.brand?v?.name:''))}"><label for="custom-motor">Potencia del motor eléctrico (W)</label><input id="custom-motor" name="motorW" type="number" min="100" max="15000" step="1" inputmode="numeric" placeholder="Ej. 500" value="${v?.motorW||''}"><p class="note">Si es eléctrico, indica el modelo o la potencia del motor.</p><label for="custom-consumption">Rendimiento: km/l o km/kWh</label><input id="custom-consumption" name="consumption" type="number" min="0.1" max="500" step="0.1" inputmode="decimal" required value="${v?.consumption||35}"><p class="note">El motor en W no basta para calcular el gasto; ajusta el rendimiento.</p><label for="custom-maintenance">Mantención estimada ($/km)</label><input id="custom-maintenance" name="maintenance" type="number" min="0" max="1000" step="1" inputmode="numeric" required value="${v?.maintenance??50}"><label for="custom-investment">Precio o inversión ($)</label><input id="custom-investment" name="investment" type="number" min="0" max="100000000" step="1000" inputmode="numeric" required value="${v?.investment??0}"><button type="button" class="btn lime block" data-action="save-custom-vehicle">Usar este vehículo</button></form></details></section>`;
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
    const recent = state.jobs.slice(-4).reverse().map(j=>({...j,platform:escapeHtml(j.platform),restaurant:escapeHtml(j.restaurant)}));
    return `<div><p class="kicker">Tu turno · ${new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</p><h1 class="title" id="page-title" tabindex="-1">Hola, Luis.</h1><p class="lead">Así va tu día en Santiago.</p></div><section class="hero deco" aria-label="Ganancia neta de hoy"><p class="label">Te queda hoy</p><div class="money" data-count="${Math.round(totals.net)}">${money(totals.net)}</div><p class="sub">Después de ${money(totals.fuel+totals.maintenance+totals.data)} en costos</p><dl class="hero-stats"><div><dt>Por hora</dt><dd>${money(totals.hourly)}</dd></div><div><dt>Pedidos</dt><dd>${jobs.length}</dd></div><div><dt>Sin pedido</dt><dd>${totals.emptyKm.toFixed(1)} km</dd></div></dl></section><div class="decide"><button class="btn lime" data-action="simulate">Simular oferta</button><button class="btn outline" data-screen="resumen">Ver resumen ${icon('arrow','sm')}</button></div><section><div class="section-head"><h2>Plataformas</h2><span class="aside">Conexión simulada</span></div><div class="chips">${['Uber Eats','PedidosYa','Rappi'].map(p=>`<span class="chip ${state.connected.includes(p)?'':'off'}">${logo(p)}${p}</span>`).join('')}</div></section><section><div class="section-head"><h2>Actividad reciente</h2><button class="btn link" data-screen="resumen">Ver todo</button></div><div class="card">${recent.length?recent.map(j=>`<div class="row"><span class="dot ${j.status==='rejected'?'red':'green'}"></span><span class="main"><span class="t1">${j.platform}</span> <span class="t2">${j.status==='rejected'?'Oferta rechazada':j.restaurant} · ${j.date===today()?'Hoy':j.date.slice(5)}</span></span><span class="amt ${j.status==='rejected'?'neg':''}">${j.status==='rejected'?'Rechazada':money(j.net)}</span></div>`).join(''):'<div class="empty"><h2>Aún no hay entregas</h2><p>Cuando completes una, aparecerá aquí.</p></div>'}</div></section><p class="note center">Cifras de demostración. No recibe ofertas reales.</p>`;
  }
  function deliveryActions() {
    const steps=[['accepted','Aceptado'],['arrived','En el local'],['picked','En camino']];
    const active=steps.findIndex(([stage])=>stage===deliveryStage);
    const detail=deliveryStage==='accepted'
      ? 'Ve al local. Al llegar, inicia la medición de espera.'
      : deliveryStage==='arrived'
        ? 'La espera se mide hasta que retires el pedido.'
        : 'Pedido retirado. Registra la entrega al llegar al destino.';
    const action=deliveryStage==='accepted'?'start-wait':deliveryStage==='arrived'?'pickup-order':'finish-delivery';
    const label=deliveryStage==='accepted'?'Llegué al local':deliveryStage==='arrived'?'Retiré el pedido':'Entregué el pedido';
    return `<section class="card journey" aria-label="Estado del pedido"><p class="kicker">PEDIDO EN CURSO · DEMO</p><ol class="journey-steps">${steps.map(([stage,name],i)=>`<li class="${i<active?'done':i===active?'active':''}"><span aria-hidden="true">${i<active?'✓':i+1}</span><b>${name}</b></li>`).join('')}</ol><p class="journey-detail">${detail}</p>${deliveryStage==='arrived'?`<p class="journey-timer">Espera medida <strong id="wait-timer">00:00</strong></p>`:deliveryStage==='picked'?`<p class="note">Espera en el local: ${measuredWaitMin} min medidos.</p>`:''}<button class="btn accept big block" data-action="${action}">${label}</button><button class="btn outline block" data-screen="mapa">Ver mapa de prueba</button><p class="note">El mapa muestra un retiro ilustrativo, no el destino de este pedido.</p></section>`;
  }
  function offerPage() {
    if (!currentOffer && !acceptedOffer) return `<div class="decision-intro"><p class="kicker">LA DECISIÓN ANTES DEL PEDIDO</p><h1 class="title" id="page-title" tabindex="-1">¿Cuánto me queda?</h1><p class="lead">Pon el pago y la distancia de la oferta. Te mostramos el neto estimado antes de aceptar.</p></div><section class="card manual-card"><div class="manual-card-head"><span class="manual-mark">01 / 02</span><h2>Evalúa tu pedido</h2><p>Solo necesitas 2 datos para empezar.</p></div><form id="manual-offer-form" class="manual-form"><div class="manual-primary"><label for="manual-gross">Pago ofrecido <span>CLP</span></label><input id="manual-gross" name="gross" type="number" inputmode="numeric" min="100" max="1000000" step="1" placeholder="Ej.: 4100" value="${manualDraft?.gross??''}" required><label for="manual-km">Distancia del pedido <span>km</span></label><input id="manual-km" name="km" type="number" inputmode="decimal" min="0.1" max="200" step="0.1" placeholder="Ej.: 3,2" value="${manualDraft?.km??''}" required></div><details class="manual-more"><summary>Ajustar tiempo y contexto <span>Opcional</span></summary><div class="manual-extra"><label for="manual-platform">Plataforma</label><select id="manual-platform" name="platform">${['Uber Eats','PedidosYa','Rappi','Otra'].map(p=>`<option ${manualDraft?.platform===p?'selected':''}>${p}</option>`).join('')}</select><label for="manual-restaurant">Restaurante</label><input id="manual-restaurant" name="restaurant" maxlength="60" autocomplete="off" placeholder="Si lo conoces" value="${escapeHtml(manualDraft?.restaurant||'')}"><label for="manual-minutes">Tiempo de viaje <span>min · si no lo sabes, lo estimamos</span></label><input id="manual-minutes" name="minutes" type="number" inputmode="numeric" min="1" max="360" step="1" placeholder="Estimado según distancia" value="${manualDraft?.minutes??''}"><label for="manual-wait">Espera en el local <span>min</span></label><input id="manual-wait" name="waitMin" type="number" inputmode="numeric" min="0" max="180" step="1" placeholder="8 min si no la sabes" value="${manualDraft?.waitMin??''}"><label for="manual-return">Regreso sin pedido <span>km</span></label><input id="manual-return" name="returnKm" type="number" inputmode="decimal" min="0" max="200" step="0.1" placeholder="0 km si no lo sabes" value="${manualDraft?.returnKm??''}"></div></details><button class="btn primary big block manual-submit" type="submit">Calcular cuánto me queda ${icon('arrow','sm')}</button></form></section><div class="demo-separator"><span>O prueba el recorrido completo</span></div><button class="btn outline block" data-action="simulate">Recibir una oferta de ejemplo</button><p class="note center">Estimación, no ingreso garantizado. La app no lee pedidos reales.</p>`;
    const o = {...(currentOffer || acceptedOffer)};
    for (const key of ['platform','restaurant','from','to']) o[key]=escapeHtml(o[key]);
    const calc = acceptedOffer ? acceptedCalc : calculateOffer(o,vehicle(),state.settings);
    const ratio=Math.max(0,Math.min(100,calc.hourly/state.settings.goal*70));
    const costs=Math.max(0,calc.cost), base=Math.max(calc.gross,1);
return `<div><p class="kicker">${acceptedOffer?'Pedido aceptado':'Nueva oferta'} · ${o.platform}</p><h1 class="title" id="page-title" tabindex="-1">¿Me conviene?</h1><p class="lead">${o.from} → ${o.to} · ${o.restaurant}</p></div><div class="card offer-top"><div class="tl on-${calc.signal} ${acceptedOffer?'':'fresh'}" aria-hidden="true"><i class="r"></i><i class="y"></i><i class="g"></i></div><div><p class="kicker">Semáforo de tu meta</p><h2>${signalText(calc.signal)}</h2><p class="note">${money(calc.hourly)}/h · meta ${money(state.settings.goal)}/h</p></div></div><div class="verdict ${calc.signal} ${acceptedOffer?'':'fresh'}" role="status"><div class="v-title">${signalText(calc.signal)}</div><p class="v-sub">${calc.signal==='red'?'Por debajo de tu meta por hora':'Calculado con tus costos y el regreso sin pedido.'}</p></div><div class="card"><div class="net-line"><span class="lbl">Te quedaría</span><strong class="big-num ${calc.net<0?'neg':''}" data-count="${Math.round(calc.net)}">${money(calc.net)}</strong></div><p class="note">De ${money(calc.gross)} que paga la plataforma</p><div class="stackbar reveal" role="img" aria-label="Pago: ${money(calc.net)} netos y ${money(costs)} en costos"><span class="s-net" style="width:${Math.max(0,calc.net)/base*100}%"></span><span class="s-fuel" style="width:${calc.fuel/base*100}%"></span><span class="s-wrench" style="width:${calc.maintenance/base*100}%"></span><span class="s-data" style="width:${calc.data/base*100}%"></span></div><ul class="legend"><li><span class="sw net"></span>Neto <b>${money(calc.net)}</b></li><li><span class="sw fuel"></span>${vehicle().type==='human'?'Sin combustible':vehicle().type==='electric'?'Electricidad':'Bencina'} <b>${money(calc.fuel)}</b></li><li><span class="sw wrench"></span>Mantención <b>${money(calc.maintenance)}</b></li><li><span class="sw data"></span>Datos <b>${money(calc.data)}</b></li></ul></div><div class="card"><div class="gauge-head"><span>Pago por hora estimado</span><b>${money(calc.hourly)}/h</b></div><div class="gauge-track"><div class="gauge-fill ${calc.signal} grow" style="width:${ratio}%"></div><span class="goal-mark" style="left:70%"><em>Tu meta</em></span></div><dl class="facts"><div class="fact"><dt>Viaje</dt><dd>${calc.km.toFixed(1)} km</dd></div><div class="fact"><dt>Regreso</dt><dd>${calc.returnKm.toFixed(1)} km</dd></div><div class="fact"><dt>Tiempo total</dt><dd>${calc.totalMinutes} min</dd></div></dl><p class="note" style="margin-top:10px">Tiempo: ${calc.minutes} min de viaje + ${calc.waitMin} min de espera. Distancia: ${calc.totalKm.toFixed(1)} km en total.</p></div>${acceptedOffer?deliveryActions():`<div class="decide ${calc.signal==='red'?'red':''}"><button class="btn reject" data-action="reject">Rechazar</button><button class="btn accept" data-action="accept">Aceptar pedido</button></div><button class="btn outline block" data-screen="mapa">Ver ruta ilustrativa ${icon('arrow','sm')}</button>`}<p class="note center">Estimación de demostración; no recibe ofertas reales.</p>`;
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
    return `<div><p class="kicker">Tu plata, sin vueltas</p><h1 class="title" id="page-title" tabindex="-1">Resumen</h1><p class="lead">Datos de ${label}. ${period==='día'?'Caso de Luis · cifras de demostración.':'Historial ilustrativo de 30 días.'}</p></div><div class="seg" role="group" aria-label="Período">${[['día','Día'],['semana','Semana'],['mes','Mes']].map(([id,label])=>`<button data-period="${id}" aria-pressed="${period===id}">${label}</button>`).join('')}</div><section class="card"><h2>Lo que queda</h2><div class="eq-row"><span>Ganado bruto</span><b data-count="${Math.round(t.gross)}">${money(t.gross)}</b></div><div class="eq-row minus"><span>Bencina o electricidad</span><b>−${money(t.fuel)}</b></div><div class="eq-row minus"><span>Mantención</span><b>−${money(t.maintenance)}</b></div><div class="eq-row minus"><span>Datos móviles</span><b>−${money(t.data)}</b></div><div class="eq-row eq-total ${t.net<0?'neg':''}"><span>Ganancia neta</span><b data-count="${Math.round(t.net)}">${money(t.net)}</b></div><div class="splitbar" role="img" aria-label="${money(t.net)} netos de ${money(t.gross)} brutos"><span class="keep" style="width:${t.gross?Math.max(0,t.net/t.gross*100):0}%"></span><span class="spent" style="width:${t.gross?Math.max(0,spent/t.gross*100):0}%"></span></div><p class="note">Neto = bruto − bencina o electricidad − mantención − datos.</p></section><div class="stats"><dl class="stat"><dt>Horas trabajadas</dt><dd>${t.realHours.toLocaleString('es-CL',{maximumFractionDigits:1})} h</dd></dl><dl class="stat"><dt>Ganancia por hora</dt><dd>${money(t.hourly)}<small>/h</small></dd></dl><dl class="stat"><dt>Pedidos entregados</dt><dd>${t.count}</dd></dl><dl class="stat"><dt>Km sin pedido</dt><dd>${t.emptyKm.toFixed(1)} km</dd></dl></div><section class="card"><h2>En qué se fue</h2><div class="rows"><div><span class="lbl"><i class="sw fuel"></i>Bencina o electricidad</span><b>${money(t.fuel)}</b></div><div><span class="lbl"><i class="sw wrench"></i>Mantención</span><b>${money(t.maintenance)}</b></div><div><span class="lbl"><i class="sw data"></i>Datos móviles</span><b>${money(t.data)}</b></div><div class="total"><span class="lbl">Gastado total</span><b>${money(spent)}</b></div></div></section><section class="card"><h2>Invertido en el vehículo</h2><dl class="inv-grid"><div><dt>Inversión</dt><dd>${money(investment)}</dd></div><div><dt>Neto acumulado</dt><dd>${money(recoveredNet)}</dd></div><div><dt>Por recuperar*</dt><dd>${money(remaining)}</dd></div></dl><div class="progress grow"><span style="width:${progress}%"></span></div><p class="note" style="margin-top:10px">* Comparación ilustrativa. No equivale a amortización contable.</p></section><section class="card"><h2>Ganancia por día</h2>${chart(jobs)}</section><section class="card"><h2>Por plataforma</h2>${platformSums.map(x=>`<div class="plat"><span class="pname">${x.p}</span><div class="pbar"><span style="width:${Math.max(0,x.net/max*100)}%"></span></div><span class="amt">${money(x.net)}</span></div>`).join('')}</section><p class="note center">${t.rejected} ofertas rechazadas · ${Math.round(t.waitMin)} min de espera estimada o medida. Cifras de demostración.</p>`;
  }
  function platformComparison() {
    const rows=['Uber Eats','PedidosYa','Rappi'].map(name=>{
      const jobs=state.jobs.filter(job=>job.status==='completed'&&job.platform===name);
      return {name,count:jobs.length,net:aggregate(jobs).net};
    });
    return `<section class="card platform-comparison"><h2>¿Qué plataforma te rindió más?</h2><p class="note">Solo tus entregas guardadas en este teléfono.</p>${rows.map(row=>`<div class="eq-row"><span>${escapeHtml(row.name)} <small>· ${row.count} ${row.count===1?'entrega':'entregas'}</small></span><b>${money(row.net)}</b></div>`).join('')}<p class="note">El total depende de cuántos pedidos hiciste; no predice la próxima oferta.</p></section>`;
  }
  function resultPage() {
    const job=state.jobs.find(j=>j.id===state.lastOutcomeId);
    if(!job)return `<div><h1 class="title" id="page-title" tabindex="-1">Sin resultado</h1><p class="lead">Completa o rechaza una oferta de prueba para ver el cierre.</p></div><button class="btn primary block" data-action="simulate">Simular oferta</button>`;
    const completed=job.status==='completed';
    const platformJobs=state.jobs.filter(j=>j.status==='completed'&&j.platform===job.platform);
    const platformTotals=aggregate(platformJobs);
    return `<div class="result-heading"><p class="kicker">SIMULACIÓN · ${escapeHtml(job.platform)}</p><h1 class="title" id="page-title" tabindex="-1">${completed?'Pedido entregado':'Oferta rechazada'}</h1><p class="lead">${escapeHtml(job.restaurant)} · ${job.time}</p></div>${completed?`<section class="result-hero" aria-label="Resultado de la entrega"><span>Te quedaría por esta entrega</span><strong>${money(job.net)}</strong><p>Pago ${money(job.gross)} · costos estimados ${money(job.fuel+job.maintenance+job.data)}</p></section><section class="card"><h2>Así se calcula</h2><div class="eq-row"><span>Pago de la plataforma</span><b>${money(job.gross)}</b></div><div class="eq-row minus"><span>${job.fuelLabel||'Bencina o electricidad'}</span><b>−${money(job.fuel)}</b></div><div class="eq-row minus"><span>Mantención</span><b>−${money(job.maintenance)}</b></div><div class="eq-row minus"><span>Datos móviles</span><b>−${money(job.data)}</b></div><div class="eq-row eq-total"><span>Neto estimado</span><b>${money(job.net)}</b></div></section><section class="result-facts"><div><span>Tiempo total</span><b>${job.totalMinutes} min</b><small>estimado</small></div><div><span>Espera en local</span><b>${job.waitMin} min</b><small>${job.waitSource||'estimada'}</small></div><div><span>Distancia total</span><b>${job.totalKm.toLocaleString('es-CL',{maximumFractionDigits:1})} km</b><small>estimada</small></div></section>`:`<section class="card result-rejected"><h2>No se registró ganancia</h2><p>La oferta se rechazó. Habría dejado ${money(job.projectedNet)} netos estimados (${money(job.projectedHourly)}/h), según los costos configurados al decidir.</p><p class="note">Rechazar no garantiza que llegue otra oferta mejor.</p></section>`}<section class="card"><h2>${escapeHtml(job.platform)} en tu historial</h2><div class="eq-row"><span>Entregas registradas</span><b>${platformJobs.length}</b></div><div class="eq-row"><span>Neto acumulado</span><b>${money(platformTotals.net)}</b></div><div class="eq-row"><span>Promedio por entrega</span><b>${platformJobs.length?money(platformTotals.net/platformJobs.length):'—'}</b></div><p class="note">Solo incluye las entregas guardadas en este navegador. No hay sincronización con ${escapeHtml(job.platform)}.</p></section><div class="result-actions"><button class="btn primary block" data-screen="resumen">Ver resumen completo</button><button class="btn outline block" data-action="simulate">Probar otra oferta</button></div>`;
  }
  function routeMap() {
    if(!routeData)return '<div class="route-empty"><b>↗</b><strong>El mapa aparecerá aquí</strong><span>Usa tu GPS o prueba con un origen de ejemplo.</span></div>';
    const view=UltimaMillaMap.layout(routeData.coordinates,routeZoom);
    const path=view.points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const [first,last]=[view.points[0],view.points.at(-1)];
    const tiles=view.tiles.map(t=>`<image href="https://tile.openstreetmap.org/${t.zoom}/${t.x}/${t.y}.png" x="${t.left.toFixed(1)}" y="${t.top.toFixed(1)}" width="256" height="256"/>`).join('');
    return `<div class="route-map-wrap"><svg class="route-map" viewBox="0 0 350 330" role="img" aria-label="Ruta por calles hacia ${escapeHtml(routeData.stop.address)}"><rect width="350" height="330" fill="#e9eee8"/>${tiles}<path d="${path}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#176b45" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${first.x.toFixed(1)}" cy="${first.y.toFixed(1)}" r="10" fill="#2563a6" stroke="#fff" stroke-width="4"/><circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="10" fill="#10251e" stroke="#fff" stroke-width="4"/></svg><div class="route-map-controls"><button data-action="route-zoom-in" aria-label="Acercar mapa">+</button><button data-action="route-zoom-out" aria-label="Alejar mapa">−</button><button data-action="route-fit" aria-label="Ajustar ruta">⌖</button></div><span class="map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></span></div>`;
  }
  function fuelCard() {
    const zones=fuelPrices?.zones||[],entry=zones.find(z=>z.name===priceZone)?.prices?.[state.settings.fuelGrade];
    const date=fuelPrices?.fetchedAt?new Date(fuelPrices.fetchedAt):null,validDate=date&&!Number.isNaN(date.getTime());
    return `<section class="card"><h2>Bencina para tu vehículo</h2><p class="note">${validDate?`Copia oficial: ${date.toLocaleString('es-CL')} · Bencina en Línea`:'Aún no hay una copia de precios válida.'} ${validDate&&Date.now()-date.getTime()>172800000?'Datos de más de 48 h. Verifica antes de cargar.':''}</p><div class="picker-controls"><label>Octanaje<select data-fuel-grade aria-label="Octanaje">${['93','95','97'].map(g=>`<option value="${g}" ${g===state.settings.fuelGrade?'selected':''}>${g}</option>`).join('')}</select></label><label>Macrozona<select data-price-zone aria-label="Macrozona de precios">${zones.map(z=>`<option value="${escapeHtml(z.name)}" ${z.name===priceZone?'selected':''}>${escapeHtml(z.name)}</option>`).join('')}</select></label></div><div class="price-highlight"><b>${entry?money(entry.average):'—'}/L</b><span>Promedio de la macrozona; no es el precio de la bomba.</span></div><p class="note">Tu cálculo usa ${money(state.settings.fuelPrice)}/L${state.settings.fuelPriceManual?' (precio ingresado por ti)':entry?' (promedio de zona)':' (valor de ejemplo; sin precio zonal)'}. Si cargas a otro precio, escríbelo en Ajustes. El GPS de esta demo solo sirve para rutas en Santiago; no detecta la estación.</p><button class="btn outline block" data-action="apply-price" ${!entry?'disabled':''}>Usar promedio de ${state.settings.fuelGrade} en mis costos</button><a class="btn outline block" href="https://www.bencinaenlinea.cl/" target="_blank" rel="noopener noreferrer">Consultar estación y precio exacto</a></section>`;
  }
  function chargeCard() {
    const s=state.settings,delta=(Number(s.chargeEnd)-Number(s.chargeStart))/100;
    const energy=Number(s.batteryKwh)*delta/0.9;
    const hours=energy/Number(s.chargeKw);
    return `<section class="card"><h2>Tu próxima carga</h2>${s.batteryKwh>0&&delta>0&&s.chargeKw>0?`<div class="charge-summary"><div><b>${money(energy*s.kwhPrice)}</b><span>Costo estimado</span></div><div><b>${hours.toLocaleString('es-CL',{maximumFractionDigits:1})} h</b><span>Tiempo ideal</span></div></div>`:'<p class="note">Indica batería, potencia y porcentajes de carga para calcular costo y tiempo.</p>'}<p class="note">Estimación con 90 % de eficiencia. La carga rápida puede disminuir de velocidad al final; no sustituye el dato del cargador.</p></section>`;
  }
  function routePage() {
    const eta=routeData?Math.max(1,Math.ceil(routeData.duration/60)):0,stop=routeData?.stop;
    const navUrl=routeData?(state.settings.navApp==='waze'
      ?`https://waze.com/ul?ll=${stop.lat}%2C${stop.lon}&navigate=yes`
      :`https://www.google.com/maps/dir/?api=1&origin=${routeData.origin.lat}%2C${routeData.origin.lon}&destination=${stop.lat}%2C${stop.lon}&travelmode=${vehicleGroup(vehicle())==='Bicicleta'?'bicycling':'driving'}`):'';
    return `<div><p class="kicker">Tu trayecto</p><h1 class="title" id="page-title" tabindex="-1">Ruta a un retiro</h1><p class="lead">Una ruta de prueba por calles. El pedido y el retiro son ejemplos.</p></div><section class="card route-card"><div class="route-card-head"><span class="route-badge">RUTA DE PRUEBA</span><span>${online?'Con conexión':'Sin conexión'}</span></div><h2>${stop?escapeHtml(stop.name):'¿Desde dónde partimos?'}</h2><p class="route-address">${stop?escapeHtml(stop.address)+', Providencia':'El punto de retiro se elegirá al crear la ruta.'}</p>${!routeData?`<div class="route-actions"><button class="btn primary" data-action="route-gps" ${routeLoading||!online?'disabled':''}>${routeLoading?'Creando ruta…':'Crear ruta con mi GPS'}</button><button class="btn outline" data-action="route-demo" ${routeLoading||!online?'disabled':''}>Probar sin GPS</button></div>`:''}<p class="route-status" role="status">${escapeHtml(routeStatus)}</p>${routeMap()}${routeData?`<div class="route-metrics"><div><b>${eta} min</b><span>ETA base, sin tráfico</span></div><div><b>${(routeData.distance/1000).toLocaleString('es-CL',{maximumFractionDigits:1})} km</b><span>Por calles</span></div></div><label class="route-wait">Espera que tú observes <small>Opcional, no en vivo</small><select data-route-wait aria-label="Espera observada en el local">${[0,5,10,15,20].map(n=>`<option value="${n}" ${routeWait===n?'selected':''}>${n} min</option>`).join('')}</select></label><p class="route-total">Llegada + espera indicada <b>${eta+routeWait} min</b></p><label class="zone-label">Abrir navegación con<select data-nav-app aria-label="Aplicación de navegación"><option value="waze" ${state.settings.navApp==='waze'?'selected':''}>Waze</option><option value="google" ${state.settings.navApp==='google'?'selected':''}>Google Maps</option></select></label><div class="route-actions"><button class="btn outline" data-action="route-another">Otro retiro</button><a class="btn primary" href="${navUrl}" target="_blank" rel="noopener noreferrer">Abrir navegación</a></div><p class="note">Waze abre el destino y calcula desde la ubicación actual. Google Maps recibe origen y destino. Ninguno incluye una espera real del local. La ruta de vista previa es vial para auto.</p>`:`<p class="note">Al crear la ruta se consulta un servicio externo con origen y destino. El mapa usa OpenStreetMap. Tu ubicación no se guarda en el perfil.</p>`}</section>${vehicle().type==='fuel'?fuelCard():vehicle().type==='electric'?chargeCard():''}`;
  }
  function kmBetween(a,b) {
    const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
    return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function updateRefuelFeedback() {
    const status=app.querySelector('[data-refuel-status]');
    const button=app.querySelector('[data-action="refuel-gps"]');
    if(status) status.textContent=refuelStatus;
    if(button) { button.disabled=refuelLoading;button.textContent=refuelLoading?'Buscando estación…':'Buscar con mi GPS';button.setAttribute('aria-busy',String(refuelLoading)); }
  }
  async function lookupRefuelStation() {
    if(refuelLoading)return;
    if(!navigator.geolocation || !online){refuelStatus='Sin GPS o conexión. Puedes escribir la estación y registrar la carga.';updateRefuelFeedback();return;}
    const input=app.querySelector('#refuel-station');
    if(refuelSuggestedStation && input?.value===refuelSuggestedStation){input.value='';refuelStation='';}
    refuelSuggestedStation='';
    refuelLoading=true;refuelStatus='Ubicándote. Esta búsqueda se hace solo ahora.';updateRefuelFeedback();
    try {
      const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000,maximumAge:30000}));
      const {latitude:lat,longitude:lon,accuracy}=pos.coords;
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||accuracy>250){refuelStatus='El GPS no tiene precisión suficiente. Escribe el nombre de la estación.';return;}
      refuelStatus='Buscando bencineras cercanas en OpenStreetMap…';updateRefuelFeedback();
      const query=`[out:json][timeout:12];(node["amenity"="fuel"](around:350,${lat},${lon});way["amenity"="fuel"](around:350,${lat},${lon}););out center;`;
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
      let response;
      try {response=await fetch(`https://overpass.private.coffee/api/interpreter?data=${encodeURIComponent(query)}`,{signal:controller.signal});}
      finally {clearTimeout(timer);}
      if(!response.ok)throw new Error('La búsqueda no está disponible. Escribe la estación.');
      const data=await response.json();
      const stations=(data.elements||[]).map(item=>{
        const point=item.center||item,name=(item.tags?.name||item.tags?.brand||item.tags?.operator||'').trim();
        return {name,distance:kmBetween({lat,lon},{lat:point.lat,lon:point.lon})*1000};
      }).filter(item=>item.name&&Number.isFinite(item.distance)).sort((a,b)=>a.distance-b.distance);
      const closest=stations[0],limit=Math.min(250,Math.max(120,accuracy+80));
      if(!closest || closest.distance>limit){refuelStatus='No pude confirmar una bencinera en tu ubicación. Escribe su nombre.';return;}
      refuelStation=closest.name.slice(0,80);
      refuelSuggestedStation=refuelStation;
      if(input)input.value=refuelStation;
      refuelStatus=`Sugerencia: ${refuelStation}, a unos ${Math.round(closest.distance)} m. Confirma que sea la estación correcta.`;
    } catch(error) {
      refuelStatus=error?.code===1?'No diste permiso al GPS. Puedes escribir la estación.':'No se pudo buscar la estación. Escríbela para continuar.';
    } finally {refuelLoading=false;updateRefuelFeedback();}
  }
  async function createRoute(demo=false,keepOrigin=false) {
    if(routeLoading)return;
    if(!navigator.onLine){routeStatus='Sin conexión. Reconéctate e inténtalo de nuevo.';render();return;}
    const previousRoute=routeData;
    routeLoading=true;routeStatus=demo?'Preparando origen de ejemplo…':'Solicitando ubicación al teléfono…';render();
    try {
      let origin;
      if(keepOrigin&&routeData)origin=routeData.origin;
      else if(demo)origin={lat:-33.4372,lon:-70.6343};
      else {
        if(!navigator.geolocation)throw new Error('Este navegador no ofrece GPS. Usa un origen de ejemplo.');
        const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000,maximumAge:60000}));
        origin={lat:pos.coords.latitude,lon:pos.coords.longitude};
        if(!Number.isFinite(origin.lat)||!Number.isFinite(origin.lon))throw new Error('El GPS devolvió una ubicación inválida.');
      }
      if(kmBetween(origin,{lat:-33.425,lon:-70.61})>35)throw new Error('La demostración está en Santiago. Usa “Probar sin GPS” si estás lejos.');
      if(!demo&&!keepOrigin&&vehicle().type==='fuel'){priceZone='Metropolitana';state.settings.priceZone=priceZone;if(!state.settings.fuelPriceManual)syncFuelPrice();save();}
      const index=keepOrigin?(routeCursor+1)%ROUTE_STOPS.length:crypto.getRandomValues(new Uint32Array(1))[0]%ROUTE_STOPS.length;
      routeCursor=index;const stop=ROUTE_STOPS[index];
      routeStatus='Calculando el trayecto por calles…';render();
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      let response;
      try {response=await fetch(`https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${stop.lon},${stop.lat}?overview=full&geometries=geojson&steps=false`,{signal:controller.signal});}
      finally {clearTimeout(timer);}
      if(!response.ok)throw new Error('El servicio de rutas no respondió. Inténtalo de nuevo.');
      const data=await response.json(),result=data.routes?.[0];
      if(data.code!=='Ok'||!result||!Number.isFinite(result.duration)||!Number.isFinite(result.distance)||!result.geometry?.coordinates?.length)throw new Error('No se encontró una ruta por calles. Prueba otro retiro.');
      UltimaMillaMap.layout(result.geometry.coordinates);
      routeData={origin,stop,demo:demo||Boolean(keepOrigin&&routeData?.demo),duration:result.duration,distance:result.distance,coordinates:result.geometry.coordinates};
      routeZoom=null;routeWait=0;routeStatus=routeData.demo?'Ruta desde origen de ejemplo.':'Ruta desde tu GPS. Ubicación no guardada.';
    } catch(error) {
      routeData=keepOrigin?previousRoute:null;
      const reason=error?.code===1?'Permiso denegado. Actívalo en el navegador o prueba sin GPS.':error?.code===3?'El GPS tardó demasiado. Vuelve a intentar o prueba sin GPS.':error?.name==='AbortError'?'La ruta tardó demasiado. Revisa tu conexión.':error?.message||'No se pudo crear la ruta.';
      routeStatus=routeData?`${reason} Se conserva la ruta anterior.`:reason;
    } finally {routeLoading=false;render();}
  }
  function vehiclePage() {
    const v=vehicle(),{investment,net,remaining,progress}=recovery();
    const energyFields=v.type==='fuel'?[['fuelPrice',`Precio de gasolina ${state.settings.fuelGrade}`,'por litro',0,3000,1]]:v.type==='electric'?[['kwhPrice','Precio de electricidad','por kWh',0,3000,1],['batteryKwh','Capacidad de batería','kWh',0,200,0.1],['chargeKw','Potencia real del cargador','kW',0.1,350,0.1],['chargeStart','Carga actual','%',0,100,1],['chargeEnd','Carga deseada','%',0,100,1]]:[];
    const fields=[...energyFields,['dataMonthly','Datos móviles','al mes',0,100000,100],['hoursMonthly','Horas de trabajo','al mes',1,400,1],['goal','Meta neta','por hora',1,100000,100],['investment','Invertido en el vehículo','total',0,100000000,1000]];
    return `<div><p class="kicker">Tus costos reales</p><h1 class="title" id="page-title" tabindex="-1">Tu vehículo, tus números</h1><p class="lead">Partimos con valores de ejemplo. Ajústalos cuando quieras.</p></div><section class="card"><h2>Vehículo</h2>${vehiclePicker()}<p class="note">Modelos orientativos disponibles en Chile; no representan un ranking de repartidores.</p><p class="note" style="margin-top:10px">${v.type==='human'?'Sin combustible':`${v.consumption} ${v.unit}`} · ${money(v.maintenance)}/km en mantención estimada.</p></section>${v.type==='fuel'?fuelCard():''}<section class="card"><h2>Valores para calcular</h2><div class="fields" style="margin-top:12px">${fields.map(([key,label,suffix,min,max,step])=>`<div class="field"><label for="setting-${key}">${label}</label><div class="input-wrap"><span class="pre" aria-hidden="true">${['hoursMonthly','batteryKwh','chargeKw','chargeStart','chargeEnd'].includes(key)?'':'$'}</span><input id="setting-${key}" type="text" inputmode="${step===0.1?'decimal':'numeric'}" min="${min}" max="${max}" step="${step}" data-setting="${key}" value="${Number(state.settings[key]).toLocaleString('es-CL')}" aria-describedby="hint-${key}"><span class="suf" aria-hidden="true">${suffix}</span></div><p class="hint" id="hint-${key}">Valor editable; se guarda solo aquí.</p></div>`).join('')}</div><p class="note" style="margin-top:14px">Semáforo: verde si llega a tu meta; amarillo entre 90 % y 99 %; rojo bajo 90 %.</p></section>${v.type==='electric'?chargeCard():''}<section class="card"><h2>Inversión</h2><dl class="inv-grid"><div><dt>Invertido</dt><dd>${money(investment)}</dd></div><div><dt>Neto acumulado</dt><dd>${money(net)}</dd></div><div><dt>Por recuperar*</dt><dd>${money(remaining)}</dd></div></dl><div class="progress grow"><span style="width:${progress}%"></span></div><p class="note" style="margin-top:10px">* Comparación ilustrativa, no amortización contable.</p></section><section class="card"><h2>Demostración y seguridad</h2><p class="note">Velocidad simulada: ${state.speed} km/h.</p><div class="btn-col" style="margin-top:12px"><button class="btn outline block" data-action="speed">Probar bloqueo a 15 km/h</button><button class="btn danger block" data-action="reset">Borrar mis datos locales</button></div></section><p class="note center">Sin cuentas en línea. El GPS se usa solo cuando creas una ruta. Los cambios se guardan en este navegador.</p>`;
  }
  function refuelPage() {
    if (vehicle().type!=='fuel') return `<div><h1 class="title" id="page-title" tabindex="-1">No necesitas bencina</h1><p class="lead">Tu vehículo usa ${vehicle().type==='electric'?'electricidad':'energía humana'}.</p></div><button class="btn outline block" data-screen="inicio">Volver al inicio</button>`;
    return `<div><p class="kicker">Gasto real · ${escapeHtml(vehicle().name)}</p><h1 class="title" id="page-title" tabindex="-1">Registrar carga</h1><p class="lead">Anota cuánto cargaste y pagaste. El precio por litro se calculará solo.</p></div><section class="card"><h2>¿Dónde cargaste?</h2><p class="note" style="margin:8px 0 12px" role="status" data-refuel-status>${escapeHtml(refuelStatus)}</p><button class="btn outline block" data-action="refuel-gps" ${refuelLoading?'disabled aria-busy="true"':''}>${refuelLoading?'Buscando estación…':'Buscar con mi GPS'}</button><p class="note" style="margin-top:9px">Solo al tocar este botón se consulta OpenStreetMap con tu ubicación. La sugerencia se puede cambiar.</p><form id="refuel-form" class="signup-form" style="margin-top:16px"><label for="refuel-station">Estación <span class="note">(confirma la sugerencia)</span></label><input id="refuel-station" name="station" autocomplete="off" maxlength="80" placeholder="Ej.: Copec, Providencia" value="${escapeHtml(refuelStation)}" required><label for="refuel-grade">Octanaje cargado</label><select id="refuel-grade" name="grade" required>${['93','95','97'].map(g=>`<option value="${g}" ${state.settings.fuelGrade===g?'selected':''}>${g} octanos</option>`).join('')}</select><label for="refuel-liters">Litros cargados</label><input id="refuel-liters" name="liters" inputmode="decimal" type="number" min="0.1" max="200" step="0.01" placeholder="Ej.: 8,5" required><label for="refuel-amount">Total pagado ($)</label><input id="refuel-amount" name="amount" inputmode="numeric" type="number" min="100" max="1000000" step="1" placeholder="Ej.: 11000" required><p class="note">Se guardará como gasto real. En el análisis de pedidos el combustible sigue siendo estimado por km; no se descuenta 2 veces.</p><button class="btn primary block" type="button" data-action="refuel-save">Guardar carga</button></form></section><button class="btn outline block" data-screen="inicio">Volver al inicio</button>`;
  }
  function security() { return `<div class="security" role="alertdialog" aria-modal="true" aria-labelledby="security-title" aria-describedby="security-desc"><div class="sec-card"><span class="sec-icon">${icon('shield','lg')}</span><h2 id="security-title">Primero, detente</h2><p id="security-desc">Sobre 10 km/h bloqueamos los botones. Tu seguridad va primero.</p><div class="sec-speed">${state.speed}<small>km/h</small></div><button class="btn lime big block" data-action="stop">Simular detención</button><p>Control simulado: no usa GPS.</p></div></div>`; }
  function render() {
    if (screen==='carga' && vehicle().type!=='fuel') screen='vehiculo';
    const oldScroll=document.getElementById('main')?.scrollTop||0;
    const changed=lastScreen!==screen;
    const markup=!state.onboarded?onboarding():shell(({inicio:home,oferta:offerPage,resultado:resultPage,resumen:summary,mapa:routePage,vehiculo:vehiclePage,carga:refuelPage})[screen]());
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
    currentOffer=offerWithWait(index==null?available[state.offerCursor++%available.length]:OFFERS[index]); screen='oferta'; save();render();
  }
  function scheduleNextOffer() {
    state.nextOfferAt=Date.now()+18000+Math.floor(Math.random()*12000);
  }
  function tickShift() {
    if (!state.shiftActive || !state.onboarded || currentOffer || acceptedOffer || !online || document.visibilityState==='hidden' || screen==='vehiculo' || screen==='carga' || state.speed>10 || Date.now()<state.nextOfferAt) return;
    const available=OFFERS.filter(o=>state.connected.includes(o.platform));
    if (!available.length) return;
    currentOffer=offerWithWait(available[state.offerCursor++%available.length]);
    scheduleNextOffer();save();render();
    if (navigator.vibrate) navigator.vibrate([80,50,80]);
    toast(`Nueva oferta de ejemplo: ${currentOffer.platform}`);
  }
  function finishDelivery() {
    if(!acceptedOffer || deliveryStage!=='picked')return;
    const observed=measuredWaitMin!==null;
    const waitMin=observed?measuredWaitMin:acceptedOffer.waitMin;
    const calc=calculateOffer({...acceptedOffer,waitMin},vehicle(),state.settings);
    const job={id:`live-${Date.now()}`,date:today(),time:new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}),platform:acceptedOffer.platform,restaurant:acceptedOffer.restaurant,from:acceptedOffer.from,to:acceptedOffer.to,status:'completed',waitSource:observed?'medida':'estimada',fuelLabel:vehicle().type==='electric'?'Electricidad':vehicle().type==='human'?'Sin combustible':'Bencina',...calc};
    state.jobs.push(job);state.lastOutcomeId=job.id;
    acceptedOffer=null;acceptedCalc=null;currentOffer=null;waitStart=0;measuredWaitMin=null;deliveryStage='accepted';screen='resultado';scheduleNextOffer();save();render();
  }
  function rejectOffer() {
    if(!currentOffer)return;
    const projected=calculateOffer(currentOffer,vehicle(),state.settings);
    const job={id:`reject-${Date.now()}`,date:today(),time:new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}),platform:currentOffer.platform,restaurant:currentOffer.restaurant,status:'rejected',gross:0,net:0,totalKm:0,returnKm:0,waitMin:0,totalMinutes:0,signal:projected.signal,projectedNet:projected.net,projectedHourly:projected.hourly,fuel:0,maintenance:0,data:0};
    state.jobs.push(job);state.lastOutcomeId=job.id;
    currentOffer=null;screen='resultado';scheduleNextOffer();save();render();
  }
  app.addEventListener('submit', e=>{
    if(e.target.id!=='manual-offer-form')return;
    e.preventDefault();
    if(state.speed>10 || acceptedOffer)return;
    const form=e.target;
    if(!form.reportValidity())return;
    const gross=Number(form.elements.gross.value), km=Number(form.elements.km.value);
    const optional=(name,max)=>{
      const raw=form.elements[name].value.trim();
      if(!raw)return null;
      const value=Number(raw);
      return Number.isFinite(value)&&value>=0&&value<=max?value:NaN;
    };
    const minutes=optional('minutes',360),waitMin=optional('waitMin',180),returnKm=optional('returnKm',200);
    if(!Number.isInteger(gross)||gross<100||gross>1000000||!Number.isFinite(km)||km<.1||km>200||[minutes,waitMin,returnKm].some(n=>Number.isNaN(n))){toast('Revisa el pago, la distancia y los ajustes opcionales.',true);return;}
    const restaurant=form.elements.restaurant.value.trim().replace(/\s+/g,' ').slice(0,60);
    const platform=form.elements.platform.value;
    manualDraft={gross,km,platform,restaurant,minutes:minutes??'',waitMin:waitMin??'',returnKm:returnKm??''};
    const offer={id:`manual-${Date.now()}`,manual:true,platform,gross,km,returnKm:returnKm??0,minutes:minutes??Math.max(5,Math.round(8+km*4.5)),minutesEstimated:minutes===null,waitMin:waitMin??8,waitSource:waitMin===null?'estimada':'manual',from:'Retiro',to:'Entrega',restaurant:restaurant||'Restaurante no indicado'};
    currentOffer=waitMin===null&&restaurant?offerWithWait(offer):offer;
    screen='oferta';save();render();
  });
  app.addEventListener('click',e=>{
    const button=e.target.closest('[data-action],[data-screen],[data-period],[data-vehicle],[data-connect]');
    if(!button)return;
    const action=button.dataset.action;
    if(state.speed>10 && action!=='stop')return;
    if(button.dataset.screen){screen=button.dataset.screen;render();return;}
    if(button.dataset.period){period=button.dataset.period;render();return;}
    if(button.dataset.vehicle){state.vehicleId=button.dataset.vehicle;state.settings.investment=vehicle().investment;save();render();return;}
    if(button.dataset.connect){const p=button.dataset.connect;if(state.connected.includes(p))state.connected=state.connected.filter(x=>x!==p);else state.connected.push(p);save();render();return;}
    if(action==='save-profile-first'){
      const form=document.getElementById('signup-form');
      if(!form.reportValidity())return;
      const name=form.elements.name.value.trim().replace(/\s+/g,' '),email=form.elements.email.value.trim();
      if(name.length<2 || name.length>40 || email.length>120){toast('Revisa tu nombre y correo.',true);return;}
      state.profile={name,email};save();
      introStep=1;render();
      return;
    }
    if(action==='onboard-back'){introStep=Math.max(0,introStep-1);render();return;}
    if(action==='intro-next'){if(!state.connected.length){toast('Activa al menos una plataforma de ejemplo.',true);return;}introStep=2;save();render();return;}
    if(action==='finish-onboarding'){state.onboarded=true;save();screen='inicio';render();return;}
    if(action==='save-custom-vehicle'){
      const form=document.getElementById('custom-vehicle-form');if(!form.reportValidity())return;
      const group=form.elements.group.value,type=form.elements.type.value,name=form.elements.model.value.trim(),brand=form.elements.brand.value.trim(),motorW=Number(form.elements.motorW.value)||0;
      if((group==='Scooter' && type!=='electric') || (group==='Bicicleta' && type==='fuel') || ((group==='Auto'||group==='Moto') && type==='human')){toast('Esa combinación de vehículo y propulsión no es válida.',true);return;}
      if(!brand || (type==='electric' ? !name && !motorW : !name)){toast('Indica marca y modelo; en eléctricos también puedes indicar el motor.',true);return;}
      const consumption=Number(form.elements.consumption.value),maintenance=Number(form.elements.maintenance.value),investment=Number(form.elements.investment.value);
      if(!Number.isFinite(consumption)||consumption<.1||consumption>500||!Number.isFinite(maintenance)||maintenance<0||maintenance>1000||!Number.isFinite(investment)||investment<0||investment>100000000){toast('Revisa los valores del vehículo.',true);return;}
      const fallbackName=type==='electric'?`${group} ${['Moto','Bicicleta'].includes(group)?'eléctrica':'eléctrico'}`:`${group} personalizado`;
      state.customVehicle={id:'custom',group,name:`${brand} ${name||fallbackName}`,brand,model:name,motorW,type,consumption:type==='human'?1:consumption,maintenance,investment,unit:type==='fuel'?'km/l':type==='electric'?'km/kWh':'sin combustible'};
      state.vehicleId='custom';state.settings.investment=investment;save();render();toast('Vehículo personalizado activo.');return;
    }
    if(action==='shift-start') { if(!state.connected.length){screen='vehiculo';render();toast('Activa una plataforma de ejemplo.',true);return;}state.shiftActive=true;state.nextOfferAt=Date.now()+6000;save();render();toast('Turno de demostración iniciado.');return; }
    if(action==='shift-pause') { state.shiftActive=false;save();render();toast('Turno en pausa.');return; }
    if(action==='refuel-gps') { lookupRefuelStation();return; }
    if(action==='refuel-save') {
      if(vehicle().type!=='fuel')return;
      const form=document.getElementById('refuel-form');if(!form?.reportValidity())return;
      const station=form.elements.station.value.trim().replace(/\s+/g,' ');
      const liters=Number(form.elements.liters.value),amount=Number(form.elements.amount.value),grade=form.elements.grade.value;
      const unitPrice=Math.round(amount/liters);
      if(station.length<2||station.length>80||!Number.isFinite(liters)||liters<0.1||liters>200||!Number.isInteger(amount)||amount<100||amount>1000000||unitPrice<100||unitPrice>5000||!['93','95','97'].includes(grade)){toast('Revisa la estación, los litros y el total pagado.',true);return;}
      state.refuels.push({id:`fuel-${Date.now()}`,at:new Date().toISOString(),station,liters,amount,unitPrice,grade,vehicle:vehicle().name});
      state.settings.fuelGrade=grade;state.settings.fuelPrice=unitPrice;state.settings.fuelPriceManual=true;refuelStation='';refuelSuggestedStation='';refuelStatus='Busca una estación cercana con tu GPS o escribe su nombre.';screen='inicio';save();render();toast(`Carga guardada: ${money(amount)} · ${money(unitPrice)}/l.`);return;
    }
    if(action==='simulate'){simulate();return;}
    if(action==='edit-manual'){if(!currentOffer?.manual)return;currentOffer=null;save();render();document.getElementById('manual-gross')?.focus();return;}
    if(action==='accept'){if(!currentOffer)return;acceptedOffer=currentOffer;acceptedCalc=calculateOffer(currentOffer,vehicle(),state.settings);currentOffer=null;waitStart=0;measuredWaitMin=null;deliveryStage='accepted';save();render();toast('Pedido aceptado. Avanza al local.');return;}
    if(action==='start-wait'){if(!acceptedOffer||deliveryStage!=='accepted')return;waitStart=Date.now();deliveryStage='arrived';save();render();toast('Llegada registrada.');return;}
    if(action==='pickup-order'){if(!acceptedOffer||deliveryStage!=='arrived')return;measuredWaitMin=waitStart>0?Math.max(0,Math.round((Date.now()-waitStart)/60000)):null;waitStart=0;deliveryStage='picked';save();render();toast('Retiro registrado.');return;}
    if(action==='reject'){rejectOffer();return;}
    if(action==='finish-delivery'){finishDelivery();return;}
    if(action==='speed'){state.speed=15;render();return;}
    if(action==='stop'){state.speed=0;render();toast('Interacción desbloqueada.');return;}
    if(action==='apply-price'){
      const entry=fuelPrices?.zones?.find(z=>z.name===priceZone)?.prices?.[state.settings.fuelGrade];
      if(!entry)return;
      state.settings.fuelPriceManual=false;syncFuelPrice();render();toast(`Promedio ${state.settings.fuelGrade} guardado. No es el precio de una estación.`);return;
    }
    if(action==='route-gps'){createRoute(false);return;}
    if(action==='route-demo'){createRoute(true);return;}
    if(action==='route-another'){createRoute(routeData?.demo||false,true);return;}
    if(action==='route-zoom-in'||action==='route-zoom-out'||action==='route-fit'){
      if(!routeData)return;
      const fitted=UltimaMillaMap.layout(routeData.coordinates).zoom;
      routeZoom=action==='route-fit'?null:Math.max(10,Math.min(18,(routeZoom??fitted)+(action==='route-zoom-in'?1:-1)));
      render();return;
    }
    if(action==='reset'){if(confirm('¿Borrar tus cambios y el historial guardados en este navegador? Volverás al perfil de demostración de Luis.')){try{localStorage.removeItem(KEY)}catch(_){}state=defaults();introStep=0;currentOffer=null;acceptedOffer=null;acceptedCalc=null;waitStart=0;measuredWaitMin=null;deliveryStage='accepted';screen='inicio';render();}return;}
  });
  app.addEventListener('change',e=>{
    if(state.speed>10)return;
    const t=e.target;
    if(t.matches('[data-route-wait]')){routeWait=Number(t.value)||0;render();return;}
    if(t.dataset.picker==='group'){
      pickerGroup=t.value;
      const first=[...VEHICLES,...(state.customVehicle?[state.customVehicle]:[])].find(v=>vehicleGroup(v)===pickerGroup);
      pickerBrand=vehicleBrand(first);
      if(!state.onboarded){state.vehicleId=first.id;state.settings.investment=first.investment;save();}
      render();return;
    }
    if(t.dataset.picker==='brand'){
      pickerBrand=t.value;
      if(!state.onboarded){const first=VEHICLES.find(v=>vehicleGroup(v)===pickerGroup&&vehicleBrand(v)===pickerBrand);state.vehicleId=first.id;state.settings.investment=first.investment;save();}
      render();return;
    }
    if(t.hasAttribute('data-price-zone')){priceZone=t.value;state.settings.priceZone=priceZone;state.settings.fuelPriceManual=false;syncFuelPrice();save();render();return;}
    if(t.hasAttribute('data-fuel-grade')){state.settings.fuelGrade=t.value;state.settings.fuelPriceManual=false;syncFuelPrice();save();render();return;}
    if(t.hasAttribute('data-nav-app')){state.settings.navApp=t.value;save();render();return;}
    if(t.id==='custom-group' || t.id==='custom-type'){syncCustomVehicleForm(t.form);return;}
    if(t.dataset.field==='vehicleId'){state.vehicleId=t.value;state.settings.investment=vehicle().investment;save();render();return;}
    if(t.dataset.setting){const key=t.dataset.setting,raw=t.value.trim()===''?NaN:Number(t.value.replace(/\./g,'').replace(',','.')),lo=Number(t.min),hi=Number(t.max),decimal=['batteryKwh','chargeKw'].includes(key);if(!Number.isFinite(raw)||(!decimal&&!Number.isInteger(raw))||raw<lo||raw>hi){t.setAttribute('aria-invalid','true');t.closest('.field')?.classList.add('invalid');toast(`Ingresa un valor entre ${lo} y ${hi}.`,true);return;}state.settings[key]=raw;if(key==='fuelPrice')state.settings.fuelPriceManual=true;save();render();toast('Valor actualizado.');}
  });
  app.addEventListener('input',e=>{if(e.target.id==='refuel-station')refuelStation=e.target.value;if(e.target.dataset.setting){e.target.removeAttribute('aria-invalid');e.target.closest('.field')?.classList.remove('invalid');}});
  app.addEventListener('focusin',e=>{if(e.target.dataset.setting)e.target.value=e.target.value.replace(/\./g,'');});
  window.addEventListener('message',e=>{
    if (e.source!==window.parent || !e.data || e.data.tipo!=='simular') return;
    demoTimers.forEach(clearTimeout); demoTimers=[];
    if (!state.onboarded) { state.onboarded=true; state.connected=['Uber Eats','PedidosYa','Rappi']; }
    simulate();
  });
  setInterval(()=>{updateTimer();tickShift();},1000);
  window.addEventListener('online',()=>{online=true;document.querySelectorAll('.network-label').forEach(el=>el.textContent='EN LÍNEA');if(screen==='mapa'&&!routeData)render();loadPrices();});
  window.addEventListener('offline',()=>{online=false;document.querySelectorAll('.network-label').forEach(el=>el.textContent='SIN INTERNET');if(screen==='mapa'&&!routeData)render();});
  loadPrices();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(registration => registration.update()).catch(() => {}));
  }
  if(DEMO && !DIRECT){
    function loop() {
      demoTimers.forEach(clearTimeout);demoTimers=[];
      state={...defaults(),jobs:seedHistory()};state.onboarded=true;state.connected=['Uber Eats','PedidosYa','Rappi'];introStep=0;currentOffer=null;acceptedOffer=null;acceptedCalc=null;waitStart=0;measuredWaitMin=null;deliveryStage='accepted';screen='inicio';render();
      const later=(ms,fn)=>demoTimers.push(setTimeout(fn,ms));
      later(1600,()=>simulate(0));
      later(4300,()=>{acceptedOffer=currentOffer;acceptedCalc=calculateOffer(currentOffer,vehicle(),state.settings);currentOffer=null;waitStart=Date.now();deliveryStage='arrived';render();});
      later(6800,()=>{screen='oferta';render();});
      later(8500,()=>{deliveryStage='picked';waitStart=0;render();});
      later(9200,finishDelivery);
      later(11500,()=>simulate(1));
      later(14400,()=>{rejectOffer();toast('No conviene: está por debajo de tu meta por hora.');});
      later(16400,()=>{screen='resumen';period='día';render();});
      later(21500,loop);
    }
    loop();
  } else render();
})();
