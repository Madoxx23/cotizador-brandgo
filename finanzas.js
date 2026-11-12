/* Finanzas — Brandgo
   Acceso con correo y contraseña (Supabase Auth). Los datos viven en Supabase protegidos por
   Row Level Security: solo las cuentas de la tabla `miembros` pueden leerlos o escribirlos. */
(function () {
  'use strict';
  const { A, PALETTES, h, fmtMoney, toast } = window.BG;
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const CFG = window.FINANZAS_CONFIG || {};
  const INACTIVITY_MS = 20 * 60 * 1000;

  /* ---------------- Catálogos ---------------- */
  const CAT_ING = {
    mensual:  { label: 'Marketing mensual', abbr: 'MM', color: 'azul' },
    campana:  { label: 'Campaña', abbr: 'CP', color: 'rosa' },
    servicio: { label: 'Servicio', abbr: 'SV', color: 'naranja' }
  };
  const CAT_GAS = {
    hormiga:     { label: 'Gasto hormiga', abbr: 'GH', color: 'amarillo' },
    servicios:   { label: 'Servicios', abbr: 'SE', color: 'violeta' },
    insumos:     { label: 'Compra de insumos', abbr: 'IN', color: 'naranja' },
    prestamo:    { label: 'Préstamo', abbr: 'PR', color: 'rosa' },
    alquiler:    { label: 'Alquiler', abbr: 'AL', color: 'azul' },
    equipos:     { label: 'Compra de equipos', abbr: 'EQ', color: 'turquesa' },
    suscripcion: { label: 'Suscripción', abbr: 'SU', color: 'verde' },
    nomina:      { label: 'Nómina', abbr: 'NO', color: 'azul' },
    extra:       { label: 'Servicio extra', abbr: 'SX', color: 'violeta' }
  };
  // Nómina y servicio extra ya no se registran como gasto: tienen su propia sección con abonos.
  const CAT_GAS_PICK = Object.fromEntries(Object.entries(CAT_GAS).filter(([k]) => k !== 'nomina' && k !== 'extra'));
  const TIPO_NOM = {
    nomina: { label: 'Nómina', abbr: 'NO', color: 'verde' },
    extra:  { label: 'Servicio extra', abbr: 'SX', color: 'violeta' }
  };
  const AVATARS = { camilo: 'Camilo', juca: 'Juca', laura: 'Laura', malu: 'Malu', mauro: 'Mauro', paula: 'Paula', mariale: 'Mariale' };
  const ESTADOS = { pagado: { label: 'Pagado', cls: 'ok' }, proceso: { label: 'En proceso', cls: 'mid' }, pendiente: { label: 'Pendiente', cls: 'no' } };

  /* ---------------- Fechas y dinero ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const monthOf = iso => iso.slice(0, 7) + '-01';
  const addMonths = (mes, k) => { const [y, m] = mes.split('-').map(Number); const d = new Date(y, m - 1 + k, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; };
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const monthLabel = mes => { const [y, m] = mes.split('-').map(Number); return MESES[m - 1] + ' ' + y; };
  const dateShort = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()} ${y}`; };
  const money = n => '$' + fmtMoney(n);
  const num = v => Number(String(v == null ? '' : v).replace(/[^\d]/g, '')) || 0;

  /* ---------------- Lógica de pagos ---------------- */
  const pagado = p => (p.abonos || []).reduce((s, a) => s + (Number(a.valor) || 0), 0);
  const avance = p => (Number(p.valor) > 0 ? Math.min(100, Math.round(pagado(p) / Number(p.valor) * 100)) : (pagado(p) > 0 ? 100 : 0));
  const estado = p => { const pg = pagado(p); if (pg <= 0) return 'pendiente'; if (pg >= Number(p.valor)) return 'pagado'; return 'proceso'; };
  const ultimoPago = p => (p.abonos || []).map(a => a.fecha).filter(Boolean).sort().pop() || '';

  /* =====================================================================
     DATOS: Supabase (producción) o memoria local (solo localhost con ?demo)
     ===================================================================== */
  const isDemo = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('demo');

  function supabaseStore() {
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    const ok = r => { if (r.error) throw r.error; return r.data; };
    return {
      async session() { return ok(await sb.auth.getSession()).session; },
      async signIn(email, password) { return ok(await sb.auth.signInWithPassword({ email, password })).session; },
      async signOut() { await sb.auth.signOut(); },
      async isMember(uid) { return !!ok(await sb.from('miembros').select('user_id').eq('user_id', uid).maybeSingle()); },
      async clientes() { return ok(await sb.from('clientes').select('*').order('nombre')); },
      async pagos(mes) { return ok(await sb.from('pagos').select('*').eq('mes', mes).order('created_at')); },
      async gastos(mes) { return ok(await sb.from('gastos').select('*').eq('mes', mes).order('fecha')); },
      async allPagos() { return ok(await sb.from('pagos').select('mes,valor,abonos')); },
      async allGastos() { return ok(await sb.from('gastos').select('mes,valor,categoria,movimiento')); },
      async equipo() { return ok(await sb.from('equipo').select('*').order('nombre')); },
      async nomina(mes) { return ok(await sb.from('nomina').select('*').eq('mes', mes)); },
      async allNomina() { return ok(await sb.from('nomina').select('mes,valor,abonos')); },
      async metas() { return ok(await sb.from('metas').select('mes,meta')); },
      async setMeta(mes, meta) { return ok(await sb.from('metas').upsert({ mes, meta }, { onConflict: 'mes' }).select().single()); },
      async delMeta(mes) { ok(await sb.from('metas').delete().eq('mes', mes)); },
      async insert(t, row) { return ok(await sb.from(t).insert(row).select().single()); },
      async insertMany(t, rows) { return ok(await sb.from(t).insert(rows).select()); },
      async update(t, id, patch) { return ok(await sb.from(t).update(patch).eq('id', id).select().single()); },
      async remove(t, id) { ok(await sb.from(t).delete().eq('id', id)); }
    };
  }

  function demoStore() {
    let db = { clientes: [], pagos: [], gastos: [], metas: [], equipo: [], nomina: [] }; let session = null;
    const ready = fetch('/__scratch/demo-data.json').then(r => r.ok ? r.json() : db).then(d => { db = Object.assign({ metas: [], equipo: [], nomina: [] }, d); }).catch(() => {});
    const id = () => 'd' + Math.random().toString(36).slice(2, 10);
    return {
      async session() { await ready; return session; },
      async signIn(email) { await ready; session = { user: { id: 'demo', email } }; return session; },
      async signOut() { session = null; },
      async isMember() { return true; },
      async clientes() { return db.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)); },
      async pagos(mes) { return db.pagos.filter(p => p.mes === mes); },
      async gastos(mes) { return db.gastos.filter(g => g.mes === mes).sort((a, b) => a.fecha.localeCompare(b.fecha)); },
      async allPagos() { return db.pagos; },
      async allGastos() { return db.gastos; },
      async equipo() { return db.equipo.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)); },
      async nomina(mes) { return db.nomina.filter(n => n.mes === mes); },
      async allNomina() { return db.nomina; },
      async metas() { return db.metas; },
      async setMeta(mes, meta) { const r = db.metas.find(m => m.mes === mes); if (r) r.meta = meta; else db.metas.push({ mes, meta }); return { mes, meta }; },
      async delMeta(mes) { db.metas = db.metas.filter(m => m.mes !== mes); },
      async insert(t, row) { const r = Object.assign({ id: id(), created_at: new Date().toISOString() }, row); db[t].push(r); return r; },
      async insertMany(t, rows) { return Promise.all(rows.map(r => this.insert(t, r))); },
      async update(t, rid, patch) { const r = db[t].find(x => x.id === rid); Object.assign(r, patch); return r; },
      async remove(t, rid) { db[t] = db[t].filter(x => x.id !== rid); }
    };
  }

  const configured = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  const store = isDemo ? demoStore() : (configured ? supabaseStore() : null);

  /* ---------------- Estado de la vista ---------------- */
  const S = { user: null, mes: monthOf(todayISO()), tab: 'meses', clientes: [], pagos: [], gastos: [], equipo: [], nomina: [], prev: null, all: { pagos: [], gastos: [], nomina: [] }, metas: [], metasMissing: false, nominaMissing: false, filtroEstado: 'todos', filtroCat: 'todas', buscar: '' };

  async function load() {
    const prevMes = addMonths(S.mes, -1);
    const metasP = store.metas().then(m => { S.metasMissing = false; return m; }).catch(() => { S.metasMissing = true; return []; });
    // Si aún no se ha corrido supabase/nomina.sql, el resto del módulo sigue funcionando.
    const nomP = Promise.all([store.equipo(), store.nomina(S.mes), store.nomina(prevMes), store.allNomina()])
      .then(r => { S.nominaMissing = false; return r; }).catch(() => { S.nominaMissing = true; return [[], [], [], []]; });
    const [clientes, pagos, gastos, pp, pg, ap, ag, metas, [equipo, nomina, pn, an]] = await Promise.all([store.clientes(), store.pagos(S.mes), store.gastos(S.mes), store.pagos(prevMes), store.gastos(prevMes), store.allPagos(), store.allGastos(), metasP, nomP]);
    Object.assign(S, { clientes, pagos, gastos, equipo, nomina, prev: { pagos: pp, gastos: pg, nomina: pn }, all: { pagos: ap, gastos: ag, nomina: an }, metas });
  }
  const metaDe = mes => { const m = S.metas.find(x => x.mes === mes); return m ? Number(m.meta) : 0; };
  const clienteDe = p => S.clientes.find(c => c.id === p.cliente_id) || { nombre: 'Cliente eliminado', categoria: p.categoria };
  const personaDe = n => S.equipo.find(e => e.id === n.persona_id) || { nombre: 'Persona eliminada', tipo: n.tipo };
  const esNominaGasto = g => g.categoria === 'nomina' || g.categoria === 'extra';

  function totals(pagos, gastos, nomina) {
    nomina = nomina || [];
    const facturado = pagos.reduce((s, p) => s + Number(p.valor), 0);
    const recibido = pagos.reduce((s, p) => s + pagado(p), 0);
    const salidas = gastos.filter(g => g.movimiento !== 'entrada');
    // Nómina: la de su propia tabla más la que quedara registrada como gasto (datos anteriores)
    const nominaGasto = salidas.filter(esNominaGasto).reduce((s, g) => s + Number(g.valor), 0);
    const nominaTotal = nomina.reduce((s, n) => s + Number(n.valor), 0) + nominaGasto;
    const nominaPagada = nomina.reduce((s, n) => s + pagado(n), 0) + nominaGasto;
    const gastosRec = salidas.filter(g => !esNominaGasto(g)).reduce((s, g) => s + Number(g.valor), 0);
    const entradas = gastos.filter(g => g.movimiento === 'entrada').reduce((s, g) => s + Number(g.valor), 0);
    return { facturado, recibido, porCobrar: facturado - recibido, nomina: nominaTotal, nominaPagada, gastos: gastosRec, entradas, saldo: facturado - nominaTotal - gastosRec };
  }
  const totMes = () => totals(S.pagos, S.gastos, S.nomina);
  const totPrev = () => S.prev ? totals(S.prev.pagos, S.prev.gastos, S.prev.nomina) : null;

  // Avatar de la persona (o sus iniciales si no tiene ilustración)
  function avatar(p, size) {
    const st = { width: size + 'px', height: size + 'px' };
    if (p.avatar && A.equipo[p.avatar]) return h('img', { class: 'fin-av', src: A.equipo[p.avatar], alt: '', style: st });
    const ini = (p.nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return h('span', { class: 'fin-av ini', style: Object.assign({ fontSize: Math.round(size * 0.34) + 'px' }, st) }, ini);
  }

  /* =====================================================================
     PANTALLAS DE ACCESO
     ===================================================================== */
  function chip(cat, map) { const c = map[cat] || { label: cat, abbr: '?', color: 'violeta' }; const p = PALETTES[c.color]; return h('span', { class: 'fin-chip', title: c.label, style: { '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd } }, h('b', null, c.abbr), c.label); }
  function chipAbbr(cat, map) { const c = map[cat]; const p = PALETTES[c.color]; return h('span', { class: 'fin-chip only', title: c.label, style: { '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd } }, h('b', null, c.abbr)); }
  function estadoChip(e) { return h('span', { class: 'fin-st ' + ESTADOS[e].cls }, h('i'), ESTADOS[e].label); }

  function screenSetup() {
    app.innerHTML = '';
    app.append(h('section', { class: 'fin-lock' },
      h('img', { src: A.logo, alt: '', class: 'fin-lock-logo' }),
      h('p', { class: 'eyebrow' }, 'Finanzas · Acceso restringido'),
      h('h1', { class: 'q' }, 'Falta conectar la base de datos segura'),
      h('p', { class: 'help' }, 'Este módulo guarda los datos en Supabase y solo deja entrar con correo y contraseña. Mientras no esté conectado, no se muestra ni se guarda ningún dato financiero.'),
      h('p', { class: 'help' }, 'Sigue los pasos de FINANZAS-SEGURIDAD.md en el repositorio y llena finanzas-config.js con la URL y la clave pública del proyecto.')));
  }

  function screenLogin(msg) {
    app.innerHTML = '';
    const email = h('input', { class: 'field', type: 'email', id: 'fin-email', autocomplete: 'username', required: true, placeholder: 'correo@brandgo.co' });
    const pass = h('input', { class: 'field', type: 'password', id: 'fin-pass', autocomplete: 'current-password', required: true, minlength: 8 });
    const err = h('div', { class: 'fin-err', role: 'alert' }, msg || '');
    const btn = h('button', { class: 'btn primary huge', type: 'submit' }, 'Entrar');
    const form = h('form', { class: 'block fin-login', onsubmit: async e => {
      e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = 'Verificando…';
      try {
        const s = await store.signIn(email.value.trim(), pass.value);
        pass.value = '';
        await enter(s);
      } catch (x) {
        err.textContent = /invalid|credentials/i.test(x.message || '') ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Revisa tu conexión e intenta de nuevo.';
        btn.disabled = false; btn.textContent = 'Entrar';
      }
    } },
      h('div', null, h('label', { class: 'label', for: 'fin-email' }, 'Correo'), email),
      h('div', null, h('label', { class: 'label', for: 'fin-pass' }, 'Contraseña'), pass),
      err, btn);
    app.append(h('section', { class: 'fin-lock' },
      h('img', { src: A.logo, alt: '', class: 'fin-lock-logo' }),
      h('p', { class: 'eyebrow' }, isDemo ? 'Modo de prueba local · datos de ejemplo' : 'Finanzas · Acceso restringido'),
      h('h1', { class: 'q' }, 'Entra con tu cuenta'),
      h('p', { class: 'help' }, 'Solo las personas autorizadas pueden ver las finanzas de Brandgo. La sesión se cierra sola al cerrar el navegador o tras 20 minutos sin actividad.'),
      form));
    setTimeout(() => email.focus(), 30);
  }

  async function enter(session) {
    if (!session) return screenLogin();
    let member = false;
    try { member = await store.isMember(session.user.id); } catch (e) { member = false; }
    if (!member) { await store.signOut(); return screenLogin('Tu cuenta no tiene acceso a Finanzas. Pide a un administrador que te agregue.'); }
    S.user = session.user;
    $('#topUser').textContent = session.user.email || 'Sesión activa';
    $('#logoutBtn').hidden = false;
    armInactivity();
    await refresh();
  }

  async function logout(msg) {
    try { await store.signOut(); } catch (e) { /* noop */ }
    Object.assign(S, { user: null, clientes: [], pagos: [], gastos: [], prev: null });
    $('#topUser').textContent = 'Acceso restringido';
    $('#logoutBtn').hidden = true;
    closeSheet();
    screenLogin(msg);
  }
  $('#logoutBtn').addEventListener('click', () => logout());

  let idleT;
  function armInactivity() {
    const reset = () => { clearTimeout(idleT); if (S.user) idleT = setTimeout(() => logout('Cerramos tu sesión por inactividad. Vuelve a entrar.'), INACTIVITY_MS); };
    ['pointerdown', 'keydown', 'scroll'].forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
  }

  /* =====================================================================
     ESTRUCTURA PRINCIPAL
     ===================================================================== */
  const TABS = [['meses', 'ME', 'Meses'], ['resumen', 'RS', 'Resumen'], ['pagos', 'PG', 'Pagos'], ['gastos', 'GS', 'Gastos'], ['nomina', 'NO', 'Nómina'], ['clientes', 'CL', 'Clientes']];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function refresh() {
    try { await load(); } catch (e) { console.error(e); toast('No se pudieron cargar los datos'); }
    render();
  }

  function render(anim) {
    if (!S.user) return;
    S.anim = anim !== false && !reduceMotion;
    app.innerHTML = '';
    const monthInput = h('input', { type: 'month', class: 'field', id: 'fin-mes', value: S.mes.slice(0, 7), 'aria-label': 'Mes', onchange: e => { if (e.target.value) { S.mes = e.target.value + '-01'; refresh(); } } });
    app.append(
      h('div', { class: 'fin-head' },
        h('div', null, h('p', { class: 'eyebrow' }, 'Finanzas Brandgo'), h('h1', { class: 'q fin-title' }, '¿Qué vas a registrar hoy?')),
        h('div', { class: 'fin-quick' },
          h('button', { type: 'button', class: 'fin-qa pay', onclick: () => openPago() }, h('b', null, 'PG'), h('span', null, h('strong', null, 'Registrar pago'), h('small', null, 'Un cliente pagó'))),
          h('button', { type: 'button', class: 'fin-qa exp', onclick: () => openGasto() }, h('b', null, 'GS'), h('span', null, h('strong', null, 'Registrar gasto'), h('small', null, 'Salió dinero'))),
          h('button', { type: 'button', class: 'fin-qa nom', onclick: () => openNomina() }, h('b', null, 'NO'), h('span', null, h('strong', null, 'Pagar nómina'), h('small', null, 'Quincena o mes completo'))))),
      h('div', { class: 'fin-bar' },
        h('nav', { class: 'fin-tabs', 'aria-label': 'Secciones' }, TABS.map(([k, ab, lb]) => h('button', { type: 'button', class: S.tab === k ? 'on' : '', 'aria-current': S.tab === k ? 'page' : null, onclick: () => { S.tab = k; render(); } }, h('b', null, ab), lb))),
        h('div', { class: 'fin-month' },
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mes anterior', onclick: () => { S.mes = addMonths(S.mes, -1); refresh(); } }, '‹'),
          monthInput,
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mes siguiente', onclick: () => { S.mes = addMonths(S.mes, 1); refresh(); } }, '›'))));
    const body = h('div', { class: 'fin-body' + (S.anim ? ' animate' : '') });
    app.append(body);
    (({ meses: viewMeses, resumen: viewResumen, pagos: viewPagos, gastos: viewGastos, nomina: viewNomina, clientes: viewClientes })[S.tab] || viewMeses)(body);
    // Escalonar la entrada de cada bloque y animar cifras y medidores
    let i = 0;
    body.querySelectorAll('.fin-rise').forEach(el => el.style.setProperty('--i', i++));
    body.querySelectorAll('[data-count]').forEach(el => countUp(el, Number(el.dataset.count), el.dataset.prefix || ''));
    requestAnimationFrame(() => requestAnimationFrame(() => body.querySelectorAll('[data-to]').forEach(el => { el.style[el.dataset.prop || 'width'] = el.dataset.to; })));
  }

  /* ---------------- Animaciones ---------------- */
  function countUp(el, value, prefix) {
    const fmt = v => prefix + (v < 0 ? '−' : '') + money(Math.abs(Math.round(v)));
    if (!S.anim) { el.textContent = fmt(value); return; }
    const t0 = performance.now(), dur = 1100;
    const ease = t => 1 - Math.pow(1 - t, 4);
    const step = now => { const t = Math.min(1, (now - t0) / dur); el.textContent = fmt(value * ease(t)); if (t < 1) requestAnimationFrame(step); };
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  }
  // Cifra que se anima al aparecer (queda con su valor final si no hay animación)
  const counted = (value, cls) => h('b', { class: cls || null, 'data-count': value }, (value < 0 ? '−' : '') + money(Math.abs(value)));
  // Anillo de progreso hacia la meta
  function ring(pct, size, color) {
    const r = size / 2 - 5, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct / 100));
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${size} ${size}`); svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('class', 'fin-ring'); svg.setAttribute('aria-hidden', 'true');
    const mk = (cls, extra) => { const e = document.createElementNS(ns, 'circle'); e.setAttribute('cx', size / 2); e.setAttribute('cy', size / 2); e.setAttribute('r', r); e.setAttribute('class', cls); Object.entries(extra || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
    svg.append(mk('bg'));
    const fg = mk('fg', { 'stroke-dasharray': c, 'stroke-dashoffset': S.anim ? c : c * (1 - p), transform: `rotate(-90 ${size / 2} ${size / 2})` });
    if (color) fg.style.stroke = color;
    fg.dataset.to = c * (1 - p); fg.dataset.prop = 'strokeDashoffset';
    svg.append(fg);
    return svg;
  }
  // Barra que crece hasta su ancho
  const growBar = (pct, cls) => h('i', { class: cls || null, 'data-to': Math.max(0, Math.min(100, pct)) + '%', style: { width: S.anim ? '0%' : Math.max(0, Math.min(100, pct)) + '%' } });

  /* ---------------- Tooltip de gráficas ---------------- */
  const tip = $('#tip');
  function bindTip(el, text) {
    el.addEventListener('pointermove', e => { tip.hidden = false; tip.textContent = text; tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });
    el.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  /* =====================================================================
     MESES (catálogo de balances con metas)
     ===================================================================== */
  function balances() {
    const by = {};
    const get = mes => by[mes] || (by[mes] = { mes, facturado: 0, nomina: 0, otros: 0, cobros: 0 });
    S.all.pagos.forEach(p => { const b = get(p.mes); b.facturado += Number(p.valor) || 0; b.cobros++; });
    S.all.gastos.forEach(g => {
      if (g.movimiento === 'entrada') return;
      const b = get(g.mes);
      if (g.categoria === 'nomina' || g.categoria === 'extra') b.nomina += Number(g.valor) || 0; else b.otros += Number(g.valor) || 0;
    });
    S.all.nomina.forEach(n => { get(n.mes).nomina += Number(n.valor) || 0; });
    S.metas.forEach(m => get(m.mes));
    get(monthOf(todayISO()));
    return Object.values(by).map(b => Object.assign(b, { neto: b.facturado - b.nomina - b.otros, meta: metaDe(b.mes) })).sort((a, b) => b.mes.localeCompare(a.mes));
  }

  function metaMeter(b, size) {
    const pct = b.meta ? Math.round(b.facturado / b.meta * 100) : 0;
    const done = b.meta && b.facturado >= b.meta;
    return h('div', { class: 'fin-meter' + (done ? ' done' : '') },
      h('div', { class: 'fin-ring-wrap', style: { width: size + 'px', height: size + 'px' } }, ring(pct, size), h('span', null, pct + '%')),
      h('div', { class: 'fin-meter-t' },
        h('span', null, 'Meta de facturación'),
        h('b', null, money(b.meta)),
        h('small', null, done ? `Cumplida · ${money(b.facturado - b.meta)} por encima` : `Faltan ${money(b.meta - b.facturado)}`)));
  }

  function viewMeses(body) {
    const list = balances();
    const actual = monthOf(todayISO());
    body.append(h('div', { class: 'fin-sum-head fin-rise' },
      h('div', null, h('h2', { class: 'fin-h2' }, 'Balance por mes'), h('p', { class: 'help' }, 'Neto = facturado − nómina − otros gastos. Toca un mes para ver el detalle.')),
      h('button', { type: 'button', class: 'btn primary', onclick: () => openMeta(null) }, '+ Nuevo mes con meta')));
    if (S.metasMissing) body.append(h('div', { class: 'block fin-rise fin-notice' }, h('h3', null, 'Falta activar las metas'),
      h('p', { class: 'help' }, 'Corre el archivo supabase/metas.sql en Supabase → SQL Editor para poder guardar metas de facturación. El resto funciona normal.')));
    const years = [...new Set(list.map(b => b.mes.slice(0, 4)))];
    years.forEach(y => {
      const ms = list.filter(b => b.mes.startsWith(y));
      const yf = ms.reduce((s, b) => s + b.facturado, 0), yn = ms.reduce((s, b) => s + b.neto, 0);
      body.append(h('div', { class: 'fin-year fin-rise' }, h('h3', null, y), h('span', null, 'Facturado ', h('b', null, money(yf)), ' · Neto ', h('b', { class: yn < 0 ? 'neg' : '' }, (yn < 0 ? '−' : '') + money(Math.abs(yn))))));
      body.append(h('div', { class: 'fin-months' }, ms.map(b => {
        const empty = !b.facturado && !b.nomina && !b.otros;
        const card = h('article', {
          class: 'fin-mcard fin-rise' + (b.mes === actual ? ' current' : '') + (b.mes === S.mes ? ' selected' : ''), tabindex: 0, role: 'button', 'aria-label': 'Ver ' + monthLabel(b.mes),
          onclick: e => { if (e.target.closest('button')) return; S.mes = b.mes; S.tab = 'resumen'; refresh(); },
          onkeydown: e => { if (e.key === 'Enter' && e.target === card) card.click(); }
        },
          h('div', { class: 'fin-mcard-h' },
            h('div', null, h('h3', null, monthLabel(b.mes).split(' ')[0]), h('small', null, b.mes === actual ? 'Mes en curso' : (b.cobros ? b.cobros + (b.cobros === 1 ? ' cobro' : ' cobros') : 'Sin cobros'))),
            h('button', { type: 'button', class: 'btn small', onclick: () => openMeta(b.mes) }, b.meta ? 'Editar meta' : '+ Meta')),
          h('div', { class: 'fin-mcard-k' }, h('span', null, 'Facturado'), counted(b.facturado)),
          h('div', { class: 'fin-mcard-rows' },
            h('div', null, h('span', null, 'Nómina'), h('b', null, money(b.nomina))),
            h('div', null, h('span', null, 'Otros gastos'), h('b', null, money(b.otros))),
            h('div', { class: 'net ' + (b.neto < 0 ? 'neg' : b.neto > 0 ? 'pos' : 'zero') }, h('span', null, 'Neto'), counted(b.neto))),
          b.meta ? metaMeter(b, 58) : h('div', { class: 'fin-meter empty' }, h('span', null, empty ? 'Mes sin movimientos todavía.' : 'Sin meta de facturación.'), h('button', { type: 'button', class: 'add-line', onclick: () => openMeta(b.mes) }, '+ Definir meta')));
        return card;
      })));
    });
  }

  function openMeta(mes) {
    const nuevo = !mes;
    const f = { mes: mes || addMonths(monthOf(todayISO()), metaDe(monthOf(todayISO())) ? 1 : 0), meta: mes ? metaDe(mes) : 0 };
    const errEl = h('div', { class: 'fin-err', role: 'alert' });
    const mesIn = h('input', { type: 'month', class: 'field', id: 'm-mes', value: f.mes.slice(0, 7), onchange: e => { if (e.target.value) { f.mes = e.target.value + '-01'; const m = metaDe(f.mes); if (m) { f.meta = m; metaBox.replaceWith(metaBox = mkMeta()); } } } });
    const mkMeta = () => lbl('Meta de facturación del mes', 'm-meta', moneyInput('m-meta', f.meta, v => { f.meta = v; }));
    let metaBox = mkMeta();
    const content = h('div', { class: 'stack' },
      nuevo ? lbl('Mes', 'm-mes', mesIn) : h('p', { class: 'help', style: { margin: 0 } }, 'Lo que esperan facturar en ' + monthLabel(f.mes) + '. Solo cuenta ingresos de clientes.'),
      metaBox, errEl);
    const actions = [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar')];
    if (!nuevo && metaDe(mes)) actions.unshift(h('button', { type: 'button', class: 'btn ghost danger', style: { marginRight: 'auto' }, onclick: async () => { try { await store.delMeta(mes); closeSheet(); toast('Meta eliminada'); await refresh(); } catch (e) { toast('No se pudo eliminar'); } } }, 'Quitar meta'));
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      if (!f.meta) { errEl.textContent = 'Escribe el valor de la meta.'; return; }
      busy(save, 'Guardando…');
      try { await store.setMeta(f.mes, f.meta); closeSheet(); toast('Meta guardada para ' + monthLabel(f.mes)); await refresh(); }
      catch (e) { console.error(e); errEl.textContent = S.metasMissing ? 'Primero corre supabase/metas.sql en Supabase.' : 'No se pudo guardar.'; unbusy(save); }
    } }, 'Guardar meta');
    actions.push(save);
    openSheet(nuevo ? 'Nuevo mes con meta' : 'Meta de ' + monthLabel(mes), nuevo ? 'Define cuánto esperan facturar ese mes. El medidor se llena con lo que se registre en Pagos.' : null, content, actions, 'verde');
  }

  /* =====================================================================
     RESUMEN (dashboard)
     ===================================================================== */
  function delta(cur, prev, invert) {
    if (!prev) return h('small', { class: 'fin-delta' }, 'Sin datos del mes anterior');
    const d = cur - prev; const pct = Math.round(d / prev * 100);
    const good = invert ? d <= 0 : d >= 0;
    return h('small', { class: 'fin-delta ' + (d === 0 ? '' : good ? 'up' : 'down') }, (d >= 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '% vs ' + monthLabel(addMonths(S.mes, -1)).split(' ')[0].toLowerCase());
  }

  function barChart(rows, total, opts) {
    // rows: [{label, abbr, value, color, sub}] — barras horizontales con etiqueta directa
    const max = Math.max(1, ...rows.map(r => r.value));
    return h('div', { class: 'fin-bars' }, rows.map(r => {
      const p = PALETTES[r.color] || PALETTES.azul;
      const bar = h('div', { class: 'fin-bar-row' },
        h('div', { class: 'fin-bar-lb' }, r.abbr ? h('b', { style: { color: p.ac } }, r.abbr) : null, r.label),
        h('div', { class: 'fin-bar-track' }, (() => { const b = growBar(Math.max(r.value > 0 ? 2 : 0, r.value / max * 100)); b.style.background = opts && opts.single ? 'var(--brand)' : p.ac; return b; })()),
        h('div', { class: 'fin-bar-v' }, money(r.value)));
      bindTip(bar, `${r.label}: ${money(r.value)}${total ? ' · ' + Math.round(r.value / total * 100) + '%' : ''}${r.sub ? ' · ' + r.sub : ''}`);
      return bar;
    }));
  }

  function viewResumen(body) {
    const t = totMes();
    const tp = totPrev();
    const has = (S.prev && (S.prev.pagos.length || S.prev.gastos.length || S.prev.nomina.length));
    const ml = monthLabel(S.mes);
    if (!S.pagos.length && !S.gastos.length && !S.nomina.length) {
      body.append(h('div', { class: 'block fin-empty fin-rise' }, h('h3', null, `Aún no hay movimientos en ${ml}`),
        h('p', { class: 'help' }, 'Registra el primer pago o gasto con los botones de arriba. También puedes generar los cobros de los clientes de marketing mensual desde Pagos.')));
      return;
    }
    const tiles = [
      ['Facturado', t.facturado, tp && has ? delta(t.facturado, tp.facturado) : null, `${S.pagos.length} cobros del mes`],
      ['Recibido', t.recibido, null, `${t.facturado ? Math.round(t.recibido / t.facturado * 100) : 0}% de lo facturado`],
      ['Por cobrar', t.porCobrar, null, `${S.pagos.filter(p => estado(p) !== 'pagado').length} clientes con saldo`],
      ['Nómina', t.nomina, tp && has ? delta(t.nomina, tp.nomina, true) : null, S.nomina.length ? `${S.nomina.filter(n => estado(n) === 'pagado').length} de ${S.nomina.length} personas pagadas` : 'Incluye servicios extra'],
      ['Gastos en recursos', t.gastos, tp && has ? delta(t.gastos, tp.gastos, true) : null, `${S.gastos.filter(g => !esNominaGasto(g) && g.movimiento !== 'entrada').length} gastos`]
    ];
    body.append(h('div', { class: 'fin-sum-head fin-rise' },
      h('div', null, h('h2', { class: 'fin-h2' }, 'Resumen de ' + ml), h('p', { class: 'help' }, 'Saldo neto = facturado − nómina − gastos en recursos. Los préstamos que entran a Brandgo no cuentan como gasto.')),
      h('button', { type: 'button', class: 'btn primary', id: 'pdfBtn', onclick: e => exportResumen(e.currentTarget) }, 'Exportar PDF')));
    const meta = metaDe(S.mes);
    body.append(h('div', { class: 'fin-hero fin-rise ' + (t.saldo >= 0 ? 'pos' : 'neg') },
      h('div', null, h('span', { class: 'k' }, 'Saldo neto del mes'), h('div', { class: 'v' }, counted(t.saldo), h('span', null, 'COP')),
        tp && has ? delta(t.saldo, tp.saldo) : null),
      meta ? metaMeter({ facturado: t.facturado, meta }, 72)
        : h('button', { type: 'button', class: 'btn', onclick: () => openMeta(S.mes) }, '+ Definir meta de facturación')));
    body.append(h('div', { class: 'fin-tiles' }, tiles.map(([k, v, d, s]) => h('div', { class: 'fin-tile fin-rise' }, h('span', { class: 'k' }, k), counted(v), h('small', null, s), d))));

    // Ingresos por categoría
    const ingRows = Object.entries(CAT_ING).map(([k, c]) => { const ps = S.pagos.filter(p => p.categoria === k); return { label: c.label, abbr: c.abbr, color: c.color, value: ps.reduce((s, p) => s + Number(p.valor), 0), sub: ps.length + (ps.length === 1 ? ' cobro' : ' cobros') }; });
    const gasRows = Object.entries(CAT_GAS).map(([k, c]) => ({ label: c.label, abbr: c.abbr, color: c.color, value: S.gastos.filter(g => g.categoria === k && g.movimiento !== 'entrada').reduce((s, g) => s + Number(g.valor), 0) + S.nomina.filter(n => n.tipo === k).reduce((s, n) => s + Number(n.valor), 0) })).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
    const porEstado = Object.keys(ESTADOS).map(e => { const ps = S.pagos.filter(p => estado(p) === e); return { e, n: ps.length, v: ps.reduce((s, p) => s + Number(p.valor) - pagado(p), 0), tot: ps.reduce((s, p) => s + Number(p.valor), 0) }; });
    const pend = S.pagos.filter(p => estado(p) !== 'pagado').sort((a, b) => (Number(b.valor) - pagado(b)) - (Number(a.valor) - pagado(a)));

    body.append(h('div', { class: 'fin-grid' },
      h('section', { class: 'block fin-rise' }, h('h3', null, 'Ingresos por categoría'), h('p', { class: 'fin-cap' }, 'Valor facturado del mes'), barChart(ingRows, t.facturado)),
      h('section', { class: 'block fin-rise' }, h('h3', null, 'Gastos por categoría'), h('p', { class: 'fin-cap' }, 'Incluye nómina; sin préstamos recibidos'), gasRows.length ? barChart(gasRows, t.gastos + t.nomina, { single: true }) : h('p', { class: 'help' }, 'Sin gastos este mes.')),
      h('section', { class: 'block fin-rise' }, h('h3', null, 'Estado de los cobros'),
        h('div', { class: 'fin-states' }, porEstado.map(x => h('div', { class: 'fin-state' }, estadoChip(x.e), h('b', null, x.n), h('small', null, x.e === 'pagado' ? money(x.tot) + ' cobrados' : money(x.v) + ' por cobrar'))))),
      S.nomina.length ? h('section', { class: 'block fin-rise' }, h('h3', null, 'Estado de la nómina'), h('p', { class: 'fin-cap' }, money(t.nominaPagada) + ' pagados de ' + money(t.nomina)),
        h('div', { class: 'fin-team-mini' }, S.nomina.slice().sort((a, b) => personaDe(a).nombre.localeCompare(personaDe(b).nombre)).map(n => { const e = estado(n); return h('button', { type: 'button', class: 'fin-tm ' + ESTADOS[e].cls, title: personaDe(n).nombre + ' · ' + ESTADOS[e].label, onclick: () => { S.tab = 'nomina'; render(); } }, avatar(personaDe(n), 52), h('b', null, personaDe(n).nombre.split(' ')[0]), h('small', null, avance(n) + '%')); }))) : null,
      h('section', { class: 'block fin-rise' }, h('h3', null, 'Quién falta por pagar'),
        pend.length ? h('div', { class: 'fin-list' }, pend.slice(0, 8).map(p => h('div', { class: 'fin-li' }, chipAbbr(p.categoria, CAT_ING), h('span', { class: 'n' }, clienteDe(p).nombre), h('span', { class: 'a' }, avance(p) + '%'), h('b', null, money(Number(p.valor) - pagado(p))),
          h('button', { type: 'button', class: 'btn small', onclick: () => openPago({ cliente_id: p.cliente_id }) }, 'Abonar'))))
          : h('p', { class: 'help' }, 'Todos los clientes del mes están al día.'))));
  }

  /* =====================================================================
     PAGOS (tabla)
     ===================================================================== */
  function viewPagos(body) {
    const rows = S.pagos.filter(p => (S.filtroEstado === 'todos' || estado(p) === S.filtroEstado) && (S.filtroCat === 'todas' || p.categoria === S.filtroCat) && clienteDe(p).nombre.toLowerCase().includes(S.buscar.toLowerCase()))
      .sort((a, b) => clienteDe(a).nombre.localeCompare(clienteDe(b).nombre));
    const sinCobro = S.clientes.filter(c => c.activo && c.categoria === 'mensual' && !S.pagos.some(p => p.cliente_id === c.id));
    const search = h('input', { class: 'field', type: 'search', id: 'fin-buscar', placeholder: 'Buscar cliente', value: S.buscar, oninput: e => { S.buscar = e.target.value; const pos = e.target.selectionStart; render(false); const el = $('#fin-buscar'); el.focus(); el.setSelectionRange(pos, pos); } });
    body.append(h('div', { class: 'fin-tools fin-rise' },
      h('h2', { class: 'fin-h2' }, 'Pagos de ' + monthLabel(S.mes)),
      h('div', { class: 'fin-filters' },
        segment([['todos', 'Todos'], ['pagado', 'Pagado'], ['proceso', 'En proceso'], ['pendiente', 'Pendiente']], S.filtroEstado, v => { S.filtroEstado = v; render(false); }),
        segment([['todas', 'Todas'], ...Object.entries(CAT_ING).map(([k, c]) => [k, c.abbr])], S.filtroCat, v => { S.filtroCat = v; render(false); }),
        search),
      sinCobro.length ? h('button', { type: 'button', class: 'btn', onclick: () => generarMensuales(sinCobro) }, `+ Generar ${sinCobro.length} ${sinCobro.length === 1 ? 'cobro mensual' : 'cobros mensuales'}`) : null));
    if (!S.pagos.length) { body.append(h('div', { class: 'block fin-empty fin-rise' }, h('h3', null, 'Sin pagos este mes'), h('p', { class: 'help' }, 'Usa "Registrar pago" o genera los cobros de los clientes de marketing mensual.'))); return; }
    const sum = (f) => rows.reduce((s, p) => s + f(p), 0);
    body.append(h('div', { class: 'fin-table-wrap fin-rise' }, h('table', { class: 'fin-table' },
      h('thead', null, h('tr', null, ['Cliente', 'Cat.', 'Valor', 'Avance', 'Recibido', 'Por cobrar', 'Último pago', 'Estado', ''].map((c, i) => h('th', { class: i >= 2 && i <= 5 ? 'num' : '' }, c)))),
      h('tbody', null, rows.map(p => {
        const e = estado(p), av = avance(p);
        return h('tr', null,
          h('td', { class: 'name' }, h('b', null, clienteDe(p).nombre), p.concepto ? h('small', null, p.concepto) : null),
          h('td', null, chipAbbr(p.categoria, CAT_ING)),
          h('td', { class: 'num' }, money(p.valor)),
          h('td', { class: 'num' }, h('div', { class: 'fin-prog' }, growBar(av)), h('small', null, av + '%')),
          h('td', { class: 'num' }, money(pagado(p))),
          h('td', { class: 'num' }, money(Math.max(0, Number(p.valor) - pagado(p)))),
          h('td', null, dateShort(ultimoPago(p))),
          h('td', null, estadoChip(e)),
          h('td', { class: 'acts' }, rowActions('pagos', p, [e !== 'pagado' ? ['Abonar', () => openPago({ cliente_id: p.cliente_id })] : null, ['Editar', () => openCobro(p)]])));
      })),
      h('tfoot', null, h('tr', null, h('td', null, rows.length + ' cobros'), h('td'), h('td', { class: 'num' }, money(sum(p => Number(p.valor)))), h('td'), h('td', { class: 'num' }, money(sum(pagado))), h('td', { class: 'num' }, money(sum(p => Math.max(0, Number(p.valor) - pagado(p))))), h('td'), h('td'), h('td'))))));
  }

  function segment(opts, cur, on) {
    return h('div', { class: 'seg', role: 'group' }, opts.map(([v, l]) => h('button', { type: 'button', 'aria-pressed': cur === v ? 'true' : 'false', onclick: () => on(v) }, l)));
  }

  function rowActions(table, row, extra) {
    const wrap = h('div', { class: 'fin-acts' });
    const draw = () => {
      wrap.innerHTML = '';
      extra.filter(Boolean).forEach(([l, fn]) => wrap.append(h('button', { type: 'button', class: 'btn small', onclick: fn }, l)));
      wrap.append(h('button', { type: 'button', class: 'icon-btn', title: 'Eliminar', 'aria-label': 'Eliminar', onclick: () => {
        wrap.innerHTML = '';
        wrap.append(h('span', { class: 'confirm-row' }, '¿Eliminar?'),
          h('button', { type: 'button', class: 'btn small danger', onclick: async () => {
            try { await store.remove(table, row.id); toast('Eliminado'); await refresh(); }
            catch (e) { toast(/foreign|violates/i.test(e.message || '') ? 'Este cliente tiene pagos registrados; desactívalo en vez de eliminarlo' : 'No se pudo eliminar'); draw(); }
          } }, 'Sí'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: draw }, 'No'));
      } }, '✕'));
    };
    draw();
    return wrap;
  }

  async function generarMensuales(list) {
    try {
      await store.insertMany('pagos', list.map(c => ({ cliente_id: c.id, mes: S.mes, categoria: 'mensual', valor: Number(c.valor) || 0, abonos: [], concepto: 'Marketing mensual · ' + monthLabel(S.mes) })));
      toast(`${list.length} cobros creados como pendientes`); await refresh();
    } catch (e) { console.error(e); toast('No se pudieron crear los cobros'); }
  }

  /* =====================================================================
     GASTOS (tabla)
     ===================================================================== */
  function viewGastos(body) {
    body.append(h('div', { class: 'fin-tools fin-rise' },
      h('h2', { class: 'fin-h2' }, 'Gastos de ' + monthLabel(S.mes)),
      h('button', { type: 'button', class: 'btn', onclick: () => { S.tab = 'nomina'; render(); } }, 'La nómina está en su propia sección →')));
    if (!S.gastos.length) { body.append(h('div', { class: 'block fin-empty fin-rise' }, h('h3', null, 'Sin gastos este mes'), h('p', { class: 'help' }, 'Usa "Registrar gasto" para el primero.'))); return; }
    const groups = [['Gastos en recursos', S.gastos.filter(g => !esNominaGasto(g))], ['Nómina registrada como gasto (formato anterior)', S.gastos.filter(esNominaGasto)]];
    groups.forEach(([title, list]) => {
      if (!list.length) return;
      const tot = list.filter(g => g.movimiento !== 'entrada').reduce((s, g) => s + Number(g.valor), 0);
      body.append(h('h3', { class: 'fin-h3' }, title, h('span', null, money(tot))));
      body.append(h('div', { class: 'fin-table-wrap fin-rise' }, h('table', { class: 'fin-table' },
        h('thead', null, h('tr', null, ['Concepto', 'Categoría', 'Fecha', 'Valor', ''].map((c, i) => h('th', { class: i === 3 ? 'num' : '' }, c)))),
        h('tbody', null, list.map(g => h('tr', null,
          h('td', { class: 'name' }, h('b', null, g.concepto), g.movimiento === 'entrada' ? h('small', null, 'Entra a Brandgo · no suma como gasto') : (g.notas ? h('small', null, g.notas) : null)),
          h('td', null, chip(g.categoria, CAT_GAS)),
          h('td', null, dateShort(g.fecha)),
          h('td', { class: 'num' }, (g.movimiento === 'entrada' ? '+' : '') + money(g.valor)),
          h('td', { class: 'acts' }, rowActions('gastos', g, [['Editar', () => openGasto(g)]]))))))));
    });
  }

  /* =====================================================================
     NÓMINA (equipo y pagos por abonos)
     ===================================================================== */
  const lastDay = mes => { const [y, m] = mes.split('-').map(Number); return `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`; };
  const dayOf = (mes, d) => { const [y, m] = mes.split('-').map(Number); return `${y}-${pad(m)}-${pad(Math.min(d || 15, new Date(y, m, 0).getDate()))}`; };

  function viewNomina(body) {
    if (S.nominaMissing) {
      body.append(h('div', { class: 'block fin-notice fin-rise' }, h('h3', null, 'Falta activar la nómina'),
        h('p', { class: 'help' }, 'Corre el archivo supabase/nomina.sql en Supabase → SQL Editor. Crea el equipo, pasa la nómina de octubre a este nuevo formato y activa el registro por abonos.')));
      return;
    }
    const activos = S.equipo.filter(e => e.activo);
    const faltan = activos.filter(e => !S.nomina.some(n => n.persona_id === e.id));
    const tot = S.nomina.reduce((s, n) => s + Number(n.valor), 0), pag = S.nomina.reduce((s, n) => s + pagado(n), 0);
    const pagadas = S.nomina.filter(n => estado(n) === 'pagado').length;
    body.append(h('div', { class: 'fin-sum-head fin-rise' },
      h('div', null, h('h2', { class: 'fin-h2' }, 'Nómina de ' + monthLabel(S.mes)), h('p', { class: 'help' }, 'Se paga en lo posible el 15 de cada mes, por quincenas: 50% y luego el resto. Toca una persona para registrar su pago.')),
      h('div', { class: 'fin-row-btns' },
        faltan.length ? h('button', { type: 'button', class: 'btn', onclick: () => generarNomina(faltan) }, `+ Agregar ${faltan.length} ${faltan.length === 1 ? 'persona' : 'personas'} a este mes`) : null,
        h('button', { type: 'button', class: 'btn primary', onclick: () => openNomina() }, 'Pagar nómina'))));
    if (S.nomina.length) {
      body.append(h('div', { class: 'fin-nom-sum fin-rise' },
        h('div', null, h('span', null, 'Pagado'), counted(pag)), h('div', null, h('span', null, 'Total del mes'), h('b', null, money(tot))),
        h('div', null, h('span', null, 'Pendiente'), h('b', null, money(Math.max(0, tot - pag)))),
        h('div', { class: 'grow' }, h('span', null, `${pagadas} de ${S.nomina.length} personas al día`), h('div', { class: 'fin-prog big' }, growBar(tot ? pag / tot * 100 : 0)))));
    } else {
      body.append(h('div', { class: 'block fin-empty fin-rise' }, h('h3', null, 'Aún no hay nómina en ' + monthLabel(S.mes)),
        h('p', { class: 'help' }, activos.length ? 'Agrega al equipo a este mes con el botón de arriba, o registra directamente un pago.' : 'Primero agrega a las personas del equipo con su salario, más abajo.')));
    }
    if (S.nomina.length) body.append(h('div', { class: 'fin-people' }, S.nomina.slice().sort((a, b) => personaDe(a).nombre.localeCompare(personaDe(b).nombre)).map(n => {
      const p = personaDe(n), e = estado(n), av = avance(n);
      return h('article', { class: 'fin-person fin-rise ' + ESTADOS[e].cls, tabindex: 0, role: 'button', 'aria-label': 'Pagar a ' + p.nombre,
        onclick: ev => { if (ev.target.closest('button')) return; if (e !== 'pagado') openNomina({ persona_id: n.persona_id }); else openNominaEdit(n); },
        onkeydown: ev => { if (ev.key === 'Enter' && ev.target === ev.currentTarget) ev.currentTarget.click(); } },
        h('div', { class: 'fin-person-h' }, h('div', { class: 'fin-av-wrap' }, avatar(p, 64), h('i', { class: 'dot ' + ESTADOS[e].cls })),
          h('div', null, h('b', null, p.nombre), h('small', null, p.rol || TIPO_NOM[n.tipo].label))),
        h('div', { class: 'fin-person-v' }, h('span', null, money(pagado(n)), h('small', null, ' de ' + money(n.valor))), estadoChip(e)),
        h('div', { class: 'fin-prog big' }, growBar(av)),
        h('div', { class: 'fin-abonos' }, (n.abonos || []).length ? n.abonos.map(a => h('span', null, dateShort(a.fecha) + ' · ' + money(a.valor))) : h('span', { class: 'fin-muted' }, 'Sin pagos todavía')),
        h('div', { class: 'fin-person-f' },
          e !== 'pagado' ? h('button', { type: 'button', class: 'btn small primary', onclick: () => openNomina({ persona_id: n.persona_id }) }, pagado(n) ? 'Pagar lo que falta' : 'Pagar 50%') : null,
          h('button', { type: 'button', class: 'btn small', onclick: () => openNominaEdit(n) }, 'Editar'),
          rowActions('nomina', n, [])));
    })));
    // Equipo
    body.append(h('div', { class: 'fin-tools fin-rise', style: { marginTop: '30px' } }, h('h2', { class: 'fin-h2' }, 'Equipo'),
      h('button', { type: 'button', class: 'btn', onclick: () => openPersona() }, '+ Persona')));
    if (!S.equipo.length) { body.append(h('p', { class: 'help fin-rise' }, 'Agrega a cada persona con su salario mensual.')); return; }
    body.append(h('div', { class: 'fin-team fin-rise' }, S.equipo.map(p => h('button', { type: 'button', class: 'fin-team-p' + (p.activo ? '' : ' off'), onclick: () => openPersona(p) },
      avatar(p, 40), h('span', null, h('b', null, p.nombre), h('small', null, (p.activo ? '' : 'Inactivo · ') + TIPO_NOM[p.tipo].label + ' · ' + money(p.salario) + (p.dia_pago ? ' · día ' + p.dia_pago : '')))))));
  }

  async function generarNomina(list) {
    try {
      await store.insertMany('nomina', list.map(p => ({ persona_id: p.id, mes: S.mes, tipo: p.tipo, valor: Number(p.salario) || 0, abonos: [] })));
      toast(`${list.length} ${list.length === 1 ? 'persona agregada' : 'personas agregadas'} como pendientes`); await refresh();
    } catch (e) { console.error(e); toast('No se pudo agregar la nómina'); }
  }

  function openNomina(pre) {
    if (S.nominaMissing) { toast('Primero corre supabase/nomina.sql en Supabase'); return; }
    if (!S.equipo.length) { openPersona(); toast('Primero agrega a una persona del equipo'); return; }
    pre = pre || {};
    const f = { persona_id: pre.persona_id || '', mes: S.mes, modo: null, abono: 0, fecha: '' };
    const errEl = h('div', { class: 'fin-err', role: 'alert' });
    const info = h('div', { class: 'fin-info' });
    const amountBox = h('div');
    const persona = () => S.equipo.find(p => p.id === f.persona_id);
    const registro = () => S.nomina.find(n => n.persona_id === f.persona_id && n.mes === f.mes) || null;
    const fechaIn = h('input', { type: 'date', class: 'field', id: 'n-fecha', onchange: e => { f.fecha = e.target.value; } });
    function draw() {
      amountBox.innerHTML = ''; info.innerHTML = '';
      const p = persona(); if (!p) { info.append(h('span', null, 'Elige a quién le vas a pagar.')); return; }
      const r = registro();
      const total = r ? Number(r.valor) : Number(p.salario) || 0;
      const ya = r ? pagado(r) : 0, falta = Math.max(0, total - ya);
      // Fecha sugerida: el día de pago (15) para la primera quincena, fin de mes para la segunda
      if (!f.fechaTocada) { f.fecha = ya > 0 ? lastDay(f.mes) : dayOf(f.mes, p.dia_pago || 15); fechaIn.value = f.fecha; }
      const opts = ya > 0 ? [['falta', 'Lo que falta · ' + money(falta)], ['otro', 'Otro valor']] : [['50', '50% · ' + money(Math.round(total / 2))], ['100', '100% · ' + money(total)], ['otro', 'Otro valor']];
      if (!f.modo || !opts.some(o => o[0] === f.modo)) f.modo = opts[0][0];
      const setVal = () => { f.abono = f.modo === 'falta' ? falta : f.modo === '50' ? Math.round(total / 2) : f.modo === '100' ? total : f.abono; drawInfo(); };
      const otro = h('div', { style: { marginTop: '10px' } });
      const drawOtro = () => { otro.innerHTML = ''; if (f.modo === 'otro') otro.append(lbl('Valor pagado', 'n-abono', moneyInput('n-abono', f.abono, v => { f.abono = v; drawInfo(); }))); };
      amountBox.append(h('span', { class: 'label' }, '¿Cuánto se le paga?'),
        h('div', { class: 'fin-cats' }, opts.map(([k, l]) => h('button', { type: 'button', class: 'fin-cat', 'aria-checked': f.modo === k ? 'true' : 'false', onclick: e => { e.currentTarget.parentNode.querySelectorAll('.fin-cat').forEach(b => b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false')); f.modo = k; setVal(); drawOtro(); } }, l))), otro);
      setVal(); drawOtro();
      function drawInfo() {
        info.innerHTML = '';
        const nuevo = ya + (Number(f.abono) || 0);
        const e = nuevo <= 0 ? 'pendiente' : nuevo >= total ? 'pagado' : 'proceso';
        info.append(h('span', null, r ? `${p.nombre} lleva ${money(ya)} de ${money(total)} en ${monthLabel(f.mes)}.` : `Salario de ${p.nombre}: ${money(total)} en ${monthLabel(f.mes)}.`),
          h('span', { class: 'fin-info-st' }, 'Quedará: ', estadoChip(e), ' ', total ? Math.min(100, Math.round(nuevo / total * 100)) + '%' : ''));
      }
    }
    const picker = h('div', { class: 'fin-pick', role: 'radiogroup', 'aria-label': 'Persona' }, S.equipo.filter(p => p.activo || p.id === f.persona_id).map(p => {
      const r = S.nomina.find(n => n.persona_id === p.id && n.mes === f.mes);
      const st = r ? estado(r) : 'pendiente';
      return h('button', { type: 'button', role: 'radio', class: 'fin-pick-p', 'aria-checked': f.persona_id === p.id ? 'true' : 'false', onclick: e => { f.persona_id = p.id; f.modo = null; f.fechaTocada = false; picker.querySelectorAll('.fin-pick-p').forEach(b => b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false')); draw(); } },
        h('div', { class: 'fin-av-wrap' }, avatar(p, 48), h('i', { class: 'dot ' + ESTADOS[st].cls })), h('b', null, p.nombre.split(' ')[0]), h('small', null, ESTADOS[st].label));
    }));
    fechaIn.addEventListener('change', () => { f.fechaTocada = true; });
    const mesIn = h('input', { type: 'month', class: 'field', id: 'n-mes', value: f.mes.slice(0, 7), onchange: async e => { if (!e.target.value) return; f.mes = e.target.value + '-01'; if (f.mes !== S.mes) { S.mes = f.mes; await load(); render(); } f.modo = null; f.fechaTocada = false; draw(); } });
    const content = h('div', { class: 'stack' }, h('div', null, h('span', { class: 'label' }, '¿A quién?'), picker),
      h('div', { class: 'grid2' }, lbl('Mes de la nómina', 'n-mes', mesIn), lbl('Fecha del pago', 'n-fecha', fechaIn)), amountBox, info, errEl);
    draw();
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      errEl.textContent = '';
      const p = persona(); if (!p) { errEl.textContent = 'Elige a quién le vas a pagar.'; return; }
      const abono = Number(f.abono) || 0; if (abono <= 0) { errEl.textContent = 'Escribe cuánto se le paga.'; return; }
      if (!f.fecha) { errEl.textContent = 'Elige la fecha del pago.'; return; }
      busy(save, 'Guardando…');
      try {
        const r = registro(); const ab = [{ fecha: f.fecha, valor: abono }];
        if (r) await store.update('nomina', r.id, { abonos: (r.abonos || []).concat(ab) });
        else await store.insert('nomina', { persona_id: p.id, mes: f.mes, tipo: p.tipo, valor: Number(p.salario) || abono, abonos: ab });
        closeSheet(); toast('Pago de nómina registrado para ' + p.nombre.split(' ')[0]); await refresh();
      } catch (e) { console.error(e); errEl.textContent = 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.'; unbusy(save); }
    } }, 'Guardar pago');
    openSheet('Pagar nómina', 'Por quincenas: el 50% el día 15 y el resto después. Si ya tiene un pago este mes, se suma.', content, [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save], 'verde');
  }

  function openNominaEdit(n) {
    const p = personaDe(n);
    const f = { valor: Number(n.valor), abonos: (n.abonos || []).map(a => Object.assign({}, a)) };
    const list = h('div', { class: 'stack', style: { gap: '8px' } });
    const drawList = () => {
      list.innerHTML = '';
      if (!f.abonos.length) list.append(h('p', { class: 'help' }, 'Sin pagos: queda pendiente.'));
      f.abonos.forEach((a, i) => list.append(h('div', { class: 'fin-abono' }, h('input', { type: 'date', class: 'field', value: a.fecha || '', 'aria-label': 'Fecha del pago', onchange: e => { a.fecha = e.target.value; } }), moneyInput('na-' + i, a.valor, v => { a.valor = v; }), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Quitar pago', onclick: () => { f.abonos.splice(i, 1); drawList(); } }, '✕'))));
    };
    drawList();
    const content = h('div', { class: 'stack' },
      lbl('Valor de la nómina este mes', 'ne-valor', moneyInput('ne-valor', f.valor, v => { f.valor = v; })),
      h('div', null, h('span', { class: 'label' }, 'Pagos'), list, h('button', { type: 'button', class: 'add-line', style: { marginTop: '8px' }, onclick: () => { f.abonos.push({ fecha: todayISO(), valor: 0 }); drawList(); } }, '+ Agregar pago')));
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      busy(save, 'Guardando…');
      try { await store.update('nomina', n.id, { valor: f.valor, abonos: f.abonos.filter(a => Number(a.valor) > 0) }); closeSheet(); toast('Nómina actualizada'); await refresh(); }
      catch (e) { console.error(e); toast('No se pudo guardar'); unbusy(save); }
    } }, 'Guardar cambios');
    openSheet('Nómina · ' + p.nombre, monthLabel(n.mes), content, [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save], 'verde');
  }

  function openPersona(p) {
    if (S.nominaMissing) { toast('Primero corre supabase/nomina.sql en Supabase'); return; }
    const edit = !!p;
    const f = Object.assign({ nombre: '', rol: '', avatar: null, tipo: 'nomina', salario: 0, dia_pago: 15, activo: true }, p || {});
    const errEl = h('div', { class: 'fin-err', role: 'alert' });
    const nom = h('input', { class: 'field big', id: 'pe-nombre', placeholder: 'Nombre completo', oninput: e => { f.nombre = e.target.value; } }); nom.value = f.nombre;
    const rol = h('input', { class: 'field', id: 'pe-rol', placeholder: 'Ej. Estrategia', oninput: e => { f.rol = e.target.value; } }); rol.value = f.rol || '';
    const dia = h('input', { class: 'field', id: 'pe-dia', type: 'number', min: 1, max: 31, oninput: e => { f.dia_pago = e.target.value; } }); dia.value = f.dia_pago || '';
    const avs = h('div', { class: 'fin-pick', role: 'radiogroup', 'aria-label': 'Avatar' }, [['', 'Iniciales'], ...Object.entries(AVATARS)].map(([k, l]) =>
      h('button', { type: 'button', role: 'radio', class: 'fin-pick-p', 'aria-checked': (f.avatar || '') === k ? 'true' : 'false', onclick: e => { f.avatar = k || null; avs.querySelectorAll('.fin-pick-p').forEach(b => b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false')); } },
        avatar({ avatar: k || null, nombre: f.nombre || l }, 44), h('small', null, l))));
    const content = h('div', { class: 'stack' }, lbl('Nombre', 'pe-nombre', nom), h('div', { class: 'grid2' }, lbl('Rol', 'pe-rol', rol, true), lbl('Día de pago', 'pe-dia', dia)),
      h('div', null, h('span', { class: 'label' }, 'Avatar'), avs),
      h('div', null, h('span', { class: 'label' }, 'Tipo'), catPicker(TIPO_NOM, f.tipo, k => { f.tipo = k; })),
      lbl('Salario mensual', 'pe-salario', moneyInput('pe-salario', f.salario, v => { f.salario = v; })),
      h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: f.activo, onchange: e => { f.activo = e.target.checked; } }), 'Activo en la nómina'), errEl);
    const actions = [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar')];
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      if (!f.nombre.trim()) { errEl.textContent = 'Escribe el nombre.'; return; }
      busy(save, 'Guardando…');
      const row = { nombre: f.nombre.trim(), rol: (f.rol || '').trim() || null, avatar: f.avatar || null, tipo: f.tipo, salario: f.salario || 0, dia_pago: f.dia_pago ? Number(f.dia_pago) : null, activo: f.activo };
      try { if (edit) await store.update('equipo', p.id, row); else await store.insert('equipo', row); closeSheet(); toast(edit ? 'Persona actualizada' : 'Persona agregada'); await refresh(); }
      catch (e) { console.error(e); errEl.textContent = 'No se pudo guardar.'; unbusy(save); }
    } }, edit ? 'Guardar cambios' : 'Agregar persona');
    actions.push(save);
    openSheet(edit ? 'Editar persona' : 'Nueva persona', 'Su salario mensual se usa para calcular el 50% y lo que falta.', content, actions, 'verde');
  }

  /* =====================================================================
     CLIENTES
     ===================================================================== */
  function viewClientes(body) {
    body.append(h('div', { class: 'fin-tools fin-rise' }, h('h2', { class: 'fin-h2' }, 'Clientes'),
      h('button', { type: 'button', class: 'btn primary', onclick: () => openCliente() }, '+ Nuevo cliente')));
    if (!S.clientes.length) { body.append(h('div', { class: 'block fin-empty fin-rise' }, h('h3', null, 'Aún no hay clientes'), h('p', { class: 'help' }, 'Crea el perfil de cada cliente con su categoría, el valor que representa y su día de pago.'))); return; }
    body.append(h('div', { class: 'fin-table-wrap fin-rise' }, h('table', { class: 'fin-table' },
      h('thead', null, h('tr', null, ['Cliente', 'Categoría', 'Valor', 'Día de pago', 'Este mes', ''].map((c, i) => h('th', { class: i === 2 ? 'num' : '' }, c)))),
      h('tbody', null, S.clientes.map(c => {
        const p = S.pagos.find(x => x.cliente_id === c.id);
        return h('tr', { class: c.activo ? '' : 'off' },
          h('td', { class: 'name' }, h('b', null, c.nombre), c.activo ? (c.notas ? h('small', null, c.notas) : null) : h('small', null, 'Inactivo')),
          h('td', null, chip(c.categoria, CAT_ING)),
          h('td', { class: 'num' }, money(c.valor)),
          h('td', null, c.dia_pago ? 'Día ' + c.dia_pago : '—'),
          h('td', null, p ? estadoChip(estado(p)) : h('span', { class: 'fin-muted' }, 'Sin cobro')),
          h('td', { class: 'acts' }, rowActions('clientes', c, [['Registrar pago', () => openPago({ cliente_id: c.id })], ['Editar', () => openCliente(c)]])));
      })))));
  }

  /* =====================================================================
     HOJAS (formularios)
     ===================================================================== */
  let sheetEl = null;
  function openSheet(title, sub, content, actions, color) {
    closeSheet();
    const p = PALETTES[color || 'azul'];
    const card = h('div', { class: 'fin-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, style: { '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd } },
      h('div', { class: 'fin-sheet-h' }, h('div', null, h('h2', null, title), sub ? h('p', { class: 'help' }, sub) : null),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cerrar', onclick: closeSheet }, '✕')),
      h('div', { class: 'fin-sheet-b' }, content),
      h('div', { class: 'fin-sheet-f' }, actions));
    sheetEl = h('div', { class: 'fin-overlay', onclick: e => { if (e.target === sheetEl) closeSheet(); } }, card);
    document.body.append(sheetEl);
    document.body.style.overflow = 'hidden';
    const first = card.querySelector('input, select, textarea'); if (first) setTimeout(() => first.focus(), 40);
  }
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; document.body.style.overflow = ''; } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  const lbl = (text, id, el, opt) => h('div', null, h('label', { class: 'label', for: id }, text, opt ? h('span', { class: 'fin-muted' }, ' · opcional') : null), el);
  function moneyInput(id, value, onInput) {
    const inp = h('input', { type: 'text', inputmode: 'numeric', id, autocomplete: 'off', oninput: e => { const d = num(e.target.value); e.target.value = d ? fmtMoney(d) : ''; onInput(d); } });
    inp.value = value ? fmtMoney(value) : '';
    return h('div', { class: 'money small' }, h('span', null, '$'), inp, h('span', { style: { fontSize: '15px', fontWeight: 700 } }, 'COP'));
  }
  function catPicker(map, cur, on) {
    return h('div', { class: 'fin-cats', role: 'radiogroup' }, Object.entries(map).map(([k, c]) => {
      const p = PALETTES[c.color];
      return h('button', { type: 'button', role: 'radio', 'aria-checked': cur === k ? 'true' : 'false', class: 'fin-cat', style: { '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd }, onclick: e => { on(k); e.currentTarget.parentNode.querySelectorAll('.fin-cat').forEach(b => b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false')); } }, h('b', null, c.abbr), c.label);
    }));
  }
  function busy(btn, label) { btn.disabled = true; btn.dataset.l = btn.textContent; btn.textContent = label; }
  function unbusy(btn) { btn.disabled = false; btn.textContent = btn.dataset.l; }

  /* ---------- Registrar pago ---------- */
  function openPago(pre) {
    pre = pre || {};
    const f = { cliente_id: pre.cliente_id || '', nuevo: !S.clientes.length, nombre: '', categoria: 'mensual', valorCliente: 0, dia: '', mes: S.mes, valor: 0, abono: 0, fecha: todayISO(), concepto: '' };
    const info = h('div', { class: 'fin-info' });
    const errEl = h('div', { class: 'fin-err', role: 'alert' });
    const content = h('div', { class: 'stack' });
    const abonoBox = h('div');
    let valorInputBox, abonoInputWrap;

    const cobroExistente = () => S.pagos.find(p => p.cliente_id === f.cliente_id && p.mes === f.mes) || null;

    function drawAbono() {
      const ex = f.nuevo ? null : cobroExistente();
      const total = ex ? Number(ex.valor) : f.valor;
      const ya = ex ? pagado(ex) : 0;
      const falta = Math.max(0, total - ya);
      abonoBox.innerHTML = '';
      const opts = ex ? [['falta', 'Lo que falta · ' + money(falta)], ['otro', 'Otro valor']] : [['50', '50% · ' + money(Math.round(total / 2))], ['100', '100% · ' + money(total)], ['otro', 'Otro valor'], ['0', 'Aún no paga']];
      const setVal = k => { f.modo = k; f.abono = k === 'falta' ? falta : k === '50' ? Math.round(total / 2) : k === '100' ? total : k === '0' ? 0 : f.abono; drawAbonoInput(); updateInfo(); };
      if (!f.modo || (ex && !['falta', 'otro'].includes(f.modo)) || (!ex && f.modo === 'falta')) f.modo = ex ? 'falta' : '100';
      abonoBox.append(h('span', { class: 'label' }, '¿Cuánto pagó?'),
        h('div', { class: 'fin-cats' }, opts.map(([k, l]) => h('button', { type: 'button', class: 'fin-cat', 'aria-checked': f.modo === k ? 'true' : 'false', onclick: e => { e.currentTarget.parentNode.querySelectorAll('.fin-cat').forEach(b => b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false')); setVal(k); } }, l))));
      abonoInputWrap = h('div', { style: { marginTop: '10px' } });
      abonoBox.append(abonoInputWrap);
      setVal(f.modo);
    }
    function drawAbonoInput() {
      abonoInputWrap.innerHTML = '';
      if (f.modo === 'otro') abonoInputWrap.append(lbl('Valor pagado', 'p-abono', moneyInput('p-abono', f.abono, v => { f.abono = v; updateInfo(); })));
    }
    function updateInfo() {
      const ex = f.nuevo ? null : cobroExistente();
      const total = ex ? Number(ex.valor) : f.valor;
      const nuevoPagado = (ex ? pagado(ex) : 0) + (Number(f.abono) || 0);
      const e = nuevoPagado <= 0 ? 'pendiente' : nuevoPagado >= total ? 'pagado' : 'proceso';
      info.innerHTML = '';
      info.append(h('span', null, ex ? `Ya existe el cobro de ${monthLabel(f.mes)}: ${money(total)}, pagado ${avance(ex)}%. Este pago se suma como abono.` : `Nuevo cobro de ${monthLabel(f.mes)} por ${money(total)}.`),
        h('span', { class: 'fin-info-st' }, 'Quedará: ', estadoChip(e), ' ', total ? Math.min(100, Math.round(nuevoPagado / total * 100)) + '%' : ''));
    }
    function drawCobroFields() {
      valorInputBox.innerHTML = '';
      const ex = f.nuevo ? null : cobroExistente();
      if (!ex) {
        valorInputBox.append(h('div', { class: 'grid2' },
          lbl('Valor total del cobro', 'p-valor', moneyInput('p-valor', f.valor, v => { f.valor = v; drawAbono(); })),
          lbl('Concepto', 'p-concepto', (() => { const i = h('input', { class: 'field', id: 'p-concepto', placeholder: 'Ej. Campaña de temporada', oninput: e => { f.concepto = e.target.value; } }); i.value = f.concepto; return i; })(), true)),
          h('div', null, h('span', { class: 'label' }, 'Categoría'), catPicker(CAT_ING, f.categoria, k => { f.categoria = k; })));
      }
      drawAbono();
    }
    function onCliente(id) {
      f.cliente_id = id; f.modo = null;
      const c = S.clientes.find(x => x.id === id);
      if (c) { f.valor = Number(c.valor) || 0; f.categoria = c.categoria; }
      drawCobroFields();
    }

    const clienteSel = h('select', { class: 'select', id: 'p-cliente', onchange: e => onCliente(e.target.value) },
      h('option', { value: '' }, 'Elige un cliente…'), S.clientes.filter(c => c.activo || c.id === f.cliente_id).map(c => h('option', { value: c.id, selected: c.id === f.cliente_id }, c.nombre + ' · ' + CAT_ING[c.categoria].abbr)));
    const nuevoBox = h('div', { class: 'stack' });
    function drawNuevo() {
      nuevoBox.innerHTML = '';
      if (!f.nuevo) { nuevoBox.append(lbl('Cliente', 'p-cliente', clienteSel), h('button', { type: 'button', class: 'add-line', onclick: () => { f.nuevo = true; f.cliente_id = ''; drawNuevo(); drawCobroFields(); } }, '+ Cliente nuevo')); return; }
      const nom = h('input', { class: 'field big', id: 'p-nombre', placeholder: 'Nombre del cliente', oninput: e => { f.nombre = e.target.value; } }); nom.value = f.nombre;
      const dia = h('input', { class: 'field', id: 'p-dia', type: 'number', min: 1, max: 31, placeholder: 'Ej. 15', oninput: e => { f.dia = e.target.value; } }); dia.value = f.dia;
      nuevoBox.append(lbl('Cliente nuevo', 'p-nombre', nom),
        h('div', { class: 'grid2' }, lbl('Valor que representa al mes o por servicio', 'p-vc', moneyInput('p-vc', f.valorCliente, v => { f.valorCliente = v; if (!f.valor || f.valor === f._lastVc) { f.valor = v; f._lastVc = v; drawCobroFields(); } })), lbl('Día de pago', 'p-dia', dia, true)),
        S.clientes.length ? h('button', { type: 'button', class: 'add-line', onclick: () => { f.nuevo = false; drawNuevo(); drawCobroFields(); } }, 'Elegir un cliente existente') : null);
    }
    const mesIn = h('input', { type: 'month', class: 'field', id: 'p-mes', value: f.mes.slice(0, 7), onchange: async e => { if (!e.target.value) return; f.mes = e.target.value + '-01'; if (f.mes !== S.mes) { S.mes = f.mes; await load(); render(); } f.modo = null; drawCobroFields(); } });
    const fechaIn = h('input', { type: 'date', class: 'field', id: 'p-fecha', value: f.fecha, onchange: e => { f.fecha = e.target.value; } });
    valorInputBox = h('div', { class: 'stack' });
    content.append(nuevoBox, h('div', { class: 'grid2' }, lbl('Mes del cobro', 'p-mes', mesIn), lbl('Fecha del pago', 'p-fecha', fechaIn)), valorInputBox, abonoBox, info, errEl);
    drawNuevo();
    if (f.cliente_id) onCliente(f.cliente_id); else drawCobroFields();

    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      errEl.textContent = '';
      try {
        let clienteId = f.cliente_id;
        if (f.nuevo) {
          if (!f.nombre.trim()) { errEl.textContent = 'Escribe el nombre del cliente.'; return; }
          busy(save, 'Guardando…');
          const c = await store.insert('clientes', { nombre: f.nombre.trim(), categoria: f.categoria, valor: f.valorCliente || f.valor || 0, dia_pago: f.dia ? Number(f.dia) : null, activo: true });
          clienteId = c.id;
        } else if (!clienteId) { errEl.textContent = 'Elige el cliente.'; return; }
        const ex = f.nuevo ? null : cobroExistente();
        const abono = Number(f.abono) || 0;
        if (ex && abono <= 0) { errEl.textContent = 'Escribe cuánto pagó.'; if (save.disabled) unbusy(save); return; }
        if (!ex && !f.valor) { errEl.textContent = 'Escribe el valor total del cobro.'; if (save.disabled) unbusy(save); return; }
        if (!save.disabled) busy(save, 'Guardando…');
        const ab = abono > 0 ? [{ fecha: f.fecha || todayISO(), valor: abono }] : [];
        if (ex) await store.update('pagos', ex.id, { abonos: (ex.abonos || []).concat(ab) });
        else await store.insert('pagos', { cliente_id: clienteId, mes: f.mes, categoria: f.categoria, valor: f.valor, concepto: f.concepto.trim() || null, abonos: ab });
        closeSheet(); toast(abono > 0 ? 'Pago registrado' : 'Cobro creado como pendiente'); await refresh();
      } catch (e) { console.error(e); errEl.textContent = 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.'; unbusy(save); }
    } }, 'Guardar pago');
    openSheet('Registrar pago', 'Un cliente pagó todo o una parte. Si ya tiene cobro este mes, se suma como abono.', content, [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save], 'azul');
  }

  /* ---------- Editar cobro (valor, categoría, abonos) ---------- */
  function openCobro(p) {
    const f = { valor: Number(p.valor), categoria: p.categoria, concepto: p.concepto || '', abonos: (p.abonos || []).map(a => Object.assign({}, a)) };
    const list = h('div', { class: 'stack', style: { gap: '8px' } });
    const drawList = () => {
      list.innerHTML = '';
      if (!f.abonos.length) list.append(h('p', { class: 'help' }, 'Sin abonos: el cobro queda pendiente.'));
      f.abonos.forEach((a, i) => {
        const d = h('input', { type: 'date', class: 'field', value: a.fecha || '', 'aria-label': 'Fecha del abono', onchange: e => { a.fecha = e.target.value; } });
        list.append(h('div', { class: 'fin-abono' }, d, moneyInput('ab-' + i, a.valor, v => { a.valor = v; }), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Quitar abono', onclick: () => { f.abonos.splice(i, 1); drawList(); } }, '✕')));
      });
    };
    drawList();
    const con = h('input', { class: 'field', id: 'c-concepto', oninput: e => { f.concepto = e.target.value; } }); con.value = f.concepto;
    const content = h('div', { class: 'stack' },
      h('div', { class: 'grid2' }, lbl('Valor total', 'c-valor', moneyInput('c-valor', f.valor, v => { f.valor = v; })), lbl('Concepto', 'c-concepto', con, true)),
      h('div', null, h('span', { class: 'label' }, 'Categoría'), catPicker(CAT_ING, f.categoria, k => { f.categoria = k; })),
      h('div', null, h('span', { class: 'label' }, 'Abonos'), list, h('button', { type: 'button', class: 'add-line', style: { marginTop: '8px' }, onclick: () => { f.abonos.push({ fecha: todayISO(), valor: 0 }); drawList(); } }, '+ Agregar abono')));
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      busy(save, 'Guardando…');
      try { await store.update('pagos', p.id, { valor: f.valor, categoria: f.categoria, concepto: f.concepto.trim() || null, abonos: f.abonos.filter(a => Number(a.valor) > 0) }); closeSheet(); toast('Cobro actualizado'); await refresh(); }
      catch (e) { console.error(e); toast('No se pudo guardar'); unbusy(save); }
    } }, 'Guardar cambios');
    openSheet('Editar cobro · ' + clienteDe(p).nombre, monthLabel(p.mes), content, [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save], CAT_ING[p.categoria].color);
  }

  /* ---------- Registrar / editar gasto ---------- */
  function openGasto(g) {
    const edit = !!(g && g.id);
    const f = Object.assign({ concepto: '', categoria: 'hormiga', movimiento: 'salida', fecha: todayISO(), valor: 0, notas: '' }, g || {});
    if (!edit) { const t = todayISO(); f.fecha = monthOf(t) === S.mes ? t : S.mes; }
    f.mes = f.mes || monthOf(f.fecha);
    const errEl = h('div', { class: 'fin-err', role: 'alert' });
    const movBox = h('div');
    const drawMov = () => {
      movBox.innerHTML = '';
      if (f.categoria !== 'prestamo') { f.movimiento = 'salida'; return; }
      movBox.append(h('span', { class: 'label' }, 'Dirección del préstamo'),
        segment([['salida', 'Sale de Brandgo'], ['entrada', 'Entra a Brandgo']], f.movimiento, v => { f.movimiento = v; drawMov(); }));
    };
    const con = h('input', { class: 'field big', id: 'g-concepto', placeholder: 'Ej. Compra de insumos Froyo', oninput: e => { f.concepto = e.target.value; } }); con.value = f.concepto;
    const fecha = h('input', { type: 'date', class: 'field', id: 'g-fecha', value: f.fecha, onchange: e => { f.fecha = e.target.value; if (e.target.value) { f.mes = monthOf(e.target.value); mes.value = f.mes.slice(0, 7); } } });
    const mes = h('input', { type: 'month', class: 'field', id: 'g-mes', value: f.mes.slice(0, 7), onchange: e => { if (e.target.value) f.mes = e.target.value + '-01'; } });
    const notas = h('input', { class: 'field', id: 'g-notas', oninput: e => { f.notas = e.target.value; } }); notas.value = f.notas || '';
    const content = h('div', { class: 'stack' },
      lbl('¿En qué se gastó?', 'g-concepto', con),
      h('div', null, h('span', { class: 'label' }, 'Categoría'), catPicker(CAT_GAS_PICK, f.categoria, k => { f.categoria = k; drawMov(); })),
      movBox,
      h('div', { class: 'grid2' }, lbl('Valor', 'g-valor', moneyInput('g-valor', f.valor, v => { f.valor = v; })), lbl('Fecha', 'g-fecha', fecha)),
      h('div', { class: 'grid2' }, lbl('Mes al que se carga', 'g-mes', mes), lbl('Nota', 'g-notas', notas, true)),
      errEl);
    drawMov();
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      errEl.textContent = '';
      if (!f.concepto.trim()) { errEl.textContent = 'Escribe en qué se gastó.'; return; }
      if (!f.valor) { errEl.textContent = 'Escribe el valor.'; return; }
      if (!f.fecha) { errEl.textContent = 'Elige la fecha.'; return; }
      busy(save, 'Guardando…');
      const row = { concepto: f.concepto.trim(), categoria: f.categoria, movimiento: f.movimiento, fecha: f.fecha, mes: f.mes, valor: f.valor, notas: (f.notas || '').trim() || null };
      try {
        if (edit) await store.update('gastos', g.id, row); else await store.insert('gastos', row);
        closeSheet(); toast(edit ? 'Gasto actualizado' : 'Gasto registrado');
        if (f.mes !== S.mes) S.mes = f.mes;
        await refresh();
      } catch (e) { console.error(e); errEl.textContent = 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.'; unbusy(save); }
    } }, edit ? 'Guardar cambios' : 'Guardar gasto');
    openSheet(edit ? 'Editar gasto' : 'Registrar gasto', edit ? null : 'Concepto, categoría, valor y fecha. El mes se toma de la fecha.', content, [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save], 'naranja');
  }

  /* ---------- Cliente ---------- */
  function openCliente(c) {
    const edit = !!c;
    const f = Object.assign({ nombre: '', categoria: 'mensual', valor: 0, dia_pago: '', activo: true, notas: '' }, c || {});
    const errEl = h('div', { class: 'fin-err', role: 'alert' });
    const nom = h('input', { class: 'field big', id: 'cl-nombre', placeholder: 'Nombre del cliente', oninput: e => { f.nombre = e.target.value; } }); nom.value = f.nombre;
    const dia = h('input', { class: 'field', id: 'cl-dia', type: 'number', min: 1, max: 31, placeholder: 'Ej. 15', oninput: e => { f.dia_pago = e.target.value; } }); dia.value = f.dia_pago || '';
    const notas = h('input', { class: 'field', id: 'cl-notas', placeholder: 'Ej. Paga 50% al inicio y 50% a los 15 días', oninput: e => { f.notas = e.target.value; } }); notas.value = f.notas || '';
    const content = h('div', { class: 'stack' },
      lbl('Nombre', 'cl-nombre', nom),
      h('div', null, h('span', { class: 'label' }, 'Tipo de cliente'), catPicker(CAT_ING, f.categoria, k => { f.categoria = k; })),
      h('div', { class: 'grid2' }, lbl('Valor que representa', 'cl-valor', moneyInput('cl-valor', f.valor, v => { f.valor = v; })), lbl('Día de pago', 'cl-dia', dia, true)),
      lbl('Nota', 'cl-notas', notas, true),
      h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: f.activo, onchange: e => { f.activo = e.target.checked; } }), 'Cliente activo'),
      errEl);
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      if (!f.nombre.trim()) { errEl.textContent = 'Escribe el nombre del cliente.'; return; }
      busy(save, 'Guardando…');
      const row = { nombre: f.nombre.trim(), categoria: f.categoria, valor: f.valor || 0, dia_pago: f.dia_pago ? Number(f.dia_pago) : null, activo: f.activo, notas: (f.notas || '').trim() || null };
      try { if (edit) await store.update('clientes', c.id, row); else await store.insert('clientes', row); closeSheet(); toast(edit ? 'Cliente actualizado' : 'Cliente creado'); await refresh(); }
      catch (e) { console.error(e); errEl.textContent = 'No se pudo guardar.'; unbusy(save); }
    } }, edit ? 'Guardar cambios' : 'Crear cliente');
    openSheet(edit ? 'Editar cliente' : 'Nuevo cliente', 'El perfil del cliente: categoría, valor y día en que suele pagar.', content, [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save], 'violeta');
  }

  /* =====================================================================
     EXPORTAR RESUMEN EN PDF (carta)
     ===================================================================== */
  const PAGE = { w: 816, h: 1056 };
  function reportBlocks() {
    const t = totMes();
    const ml = monthLabel(S.mes);
    const out = [];
    const sign = v => (v < 0 ? '−' : '') + money(Math.abs(v));
    out.push(h('div', null,
      h('div', { class: 'd-head' }, h('div', { class: 'd-brand' }, h('img', { src: A.logo, alt: '' }), h('span', null, 'BRANDGO')),
        h('div', { class: 'd-num' }, h('span', { class: 'pill' }, 'Confidencial'), h('small', null, 'Generado el ' + dateShort(todayISO())))),
      h('h1', { class: 'd-title', style: { marginTop: '22px' } }, 'Resumen financiero'),
      h('div', { class: 'd-concept', style: { marginTop: '8px', color: '#6e6e73' } }, ml)));
    out.push(h('div', { class: 'd-sum' }, h('div', { class: 'lb' }, 'Saldo neto del mes'),
      h('div', { class: 'amt' }, h('b', { style: { color: t.saldo < 0 ? '#d92d4a' : '#1d1d1f' } }, sign(t.saldo)), h('span', null, 'COP')),
      h('div', { class: 'words' }, `Facturado ${money(t.facturado)} − nómina ${money(t.nomina)} − gastos en recursos ${money(t.gastos)}.` + (metaDe(S.mes) ? ` Meta de facturación ${money(metaDe(S.mes))}: ${Math.round(t.facturado / metaDe(S.mes) * 100)}% alcanzado.` : ''))));
    out.push(h('div', { class: 'r-kpis' }, [['Facturado', t.facturado], ['Recibido', t.recibido], ['Por cobrar', t.porCobrar], ['Nómina', t.nomina], ['Gastos', t.gastos]].map(([k, v]) => h('div', { class: 'd-card' }, h('div', { class: 'lb' }, k), h('div', { class: 'nm' }, money(v))))));
    const table = (title, cols, rows, foot, color) => {
      const p = PALETTES[color];
      return h('div', { class: 'r-block', style: { '--ac': p.ac, '--bg': p.bg, '--bd': p.bd, '--ln': p.ln } },
        h('div', { class: 'r-title' }, h('span', null, title), h('b', null, foot)),
        h('table', { class: 'r-table' }, h('thead', null, h('tr', null, cols.map((c, i) => h('th', { class: i >= cols.length - 1 || c.num ? 'num' : '' }, c.label || c)))),
          h('tbody', null, rows.map(r => h('tr', null, r.map((v, i) => h('td', { class: cols[i].num ? 'num' : '' }, v)))))));
    };
    const pagos = S.pagos.slice().sort((a, b) => clienteDe(a).nombre.localeCompare(clienteDe(b).nombre));
    if (pagos.length) out.push(table('Ingresos de clientes', ['Cliente', 'Categoría', 'Avance', 'Estado', { label: 'Recibido', num: true }, { label: 'Valor', num: true }],
      pagos.map(p => [clienteDe(p).nombre, CAT_ING[p.categoria].label, avance(p) + '%', ESTADOS[estado(p)].label, money(pagado(p)), money(p.valor)]), money(t.facturado), 'azul'));
    const rec = S.gastos.filter(g => !esNominaGasto(g));
    if (rec.length) out.push(table('Gastos en recursos', ['Concepto', 'Categoría', 'Fecha', { label: 'Valor', num: true }],
      rec.map(g => [g.concepto + (g.movimiento === 'entrada' ? ' (entra)' : ''), CAT_GAS[g.categoria].label, dateShort(g.fecha), (g.movimiento === 'entrada' ? '+' : '') + money(g.valor)]), money(t.gastos), 'naranja'));
    const nomRows = S.nomina.slice().sort((a, b) => personaDe(a).nombre.localeCompare(personaDe(b).nombre))
      .map(n => [personaDe(n).nombre, TIPO_NOM[n.tipo].label, ESTADOS[estado(n)].label, money(pagado(n)), money(n.valor)])
      .concat(S.gastos.filter(esNominaGasto).map(g => [g.concepto, CAT_GAS[g.categoria].label, 'Pagado', money(g.valor), money(g.valor)]));
    if (nomRows.length) out.push(table('Nómina', ['Persona', 'Tipo', 'Estado', { label: 'Pagado', num: true }, { label: 'Valor', num: true }], nomRows, money(t.nomina), 'verde'));
    return out;
  }
  function newPage(n) {
    const page = h('div', { class: 'page', style: { width: PAGE.w + 'px', height: PAGE.h + 'px' } });
    const inner = h('div', { class: 'page-in', style: { gap: '14px' } });
    const ct = h('div', { class: 'ct' }, 'Documento confidencial · uso interno');
    page.append(inner, h('div', { class: 'pfoot' }, h('div', { class: 'mk', html: 'BRANDGO<sup>™</sup>' }), ct, h('div', { class: 'sl' }, 'Creatividad Sin Permiso')));
    $('#stage').append(page);
    return { page, inner, ct, n };
  }
  function paginate() {
    $('#stage').innerHTML = '';
    const pages = [newPage(1)];
    for (const b of reportBlocks()) {
      let cur = pages[pages.length - 1];
      cur.inner.append(b);
      if (cur.inner.scrollHeight > cur.inner.clientHeight + 1 && cur.inner.children.length > 1) {
        b.remove();
        // Una tabla larga se parte por filas
        if (b.classList.contains('r-block')) {
          const rows = [...b.querySelectorAll('tbody tr')];
          const head = b.cloneNode(true); head.querySelector('tbody').innerHTML = '';
          cur.inner.append(head);
          let moved = 0;
          while (rows.length && cur.inner.scrollHeight <= cur.inner.clientHeight + 1) { head.querySelector('tbody').append(rows.shift()); moved++; }
          if (cur.inner.scrollHeight > cur.inner.clientHeight + 1 && moved) { rows.unshift(head.querySelector('tbody').lastChild); head.querySelector('tbody').lastChild.remove(); moved--; }
          if (!moved) head.remove();
          cur = newPage(pages.length + 1); pages.push(cur);
          const rest = b.cloneNode(true); rest.querySelector('tbody').innerHTML = ''; rows.forEach(r => rest.querySelector('tbody').append(r));
          if (moved) rest.querySelector('.r-title span').textContent += ' (continúa)';
          cur.inner.append(rest);
        } else { cur = newPage(pages.length + 1); pages.push(cur); cur.inner.append(b); }
      }
    }
    if (pages.length > 1) pages.forEach(p => { p.ct.textContent += ' · Página ' + p.n + ' de ' + pages.length; });
    return pages.map(p => p.page);
  }

  async function exportResumen(btn) {
    if (!window.html2canvas || !window.jspdf) { toast('No se pudieron cargar las librerías del PDF'); return; }
    busy(btn, 'Generando…');
    const stage = $('#stage');
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const pages = paginate();
      stage.style.left = '0px'; stage.style.zIndex = '-1';
      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true });
      const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < pages.length; i++) {
        stage.innerHTML = ''; stage.append(pages[i]);
        await new Promise(r => setTimeout(r, 40));
        const canvas = await window.html2canvas(pages[i], { scale: 2.5, backgroundColor: '#ffffff', logging: false, width: PAGE.w, height: PAGE.h, windowWidth: PAGE.w, windowHeight: PAGE.h, scrollX: 0, scrollY: -window.scrollY });
        if (i > 0) pdf.addPage('letter', 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, W, H, undefined, 'FAST');
      }
      pdf.setProperties({ title: 'Resumen financiero ' + monthLabel(S.mes), author: 'Brandgo', creator: 'Brandgo Finanzas' });
      const ok = await window.BG.deliver(pdf, `Resumen financiero Brandgo - ${monthLabel(S.mes)}.pdf`);
      if (ok) toast('PDF descargado');
    } catch (e) { console.error(e); toast('No se pudo generar el PDF'); }
    finally { stage.innerHTML = ''; stage.style.left = ''; stage.style.zIndex = ''; unbusy(btn); }
  }

  /* ---------------- Inicio ---------------- */
  $('#brandLogo').src = A.logo;
  (async () => {
    if (!store) return screenSetup();
    try { const s = await store.session(); if (s) await enter(s); else screenLogin(); }
    catch (e) { console.error(e); screenLogin(); }
  })();
})();
