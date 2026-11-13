/* Guiones de rodaje — Brandgo
   Cuentas (clientes) → guiones → checklist técnico por ubicación y en orden del video.
   El guion se escribe con etiquetas (UBICACIÓN:, ENTREVISTA:, TOMA:…) y se arma en el navegador, sin costo.
   Acceso abierto para el equipo (sin cuenta); en la base no se puede borrar, solo archivar. */
(function () {
  'use strict';
  const { A, PALETTES, TEAM, h, toast } = window.BG;
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const CFG = window.FINANZAS_CONFIG || {};
  const MAX_CHARS = 30000;

  const TIPOS = {
    entrevista: { label: 'Entrevista', color: 'rosa' },
    apoyo:      { label: 'Toma de apoyo', color: 'azul' },
    montaje:    { label: 'Montaje', color: 'verde' },
    cierre:     { label: 'Cierre', color: 'violeta' }
  };
  const COLORES = ['azul', 'rosa', 'naranja', 'verde', 'violeta', 'amarillo', 'turquesa'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fecha = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
  const pal = c => PALETTES[c] || PALETTES.azul;
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const pv = p => ({ '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd });

  /* =====================================================================
     DATOS: Supabase (abierto para el equipo) o memoria local (solo localhost con ?demo)
     ===================================================================== */
  const isDemo = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('demo');

  function supabaseStore() {
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { storage: window.sessionStorage, storageKey: 'brandgo-guiones-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const ok = r => { if (r.error) throw r.error; return r.data; };
    return {
      async cuentas() { return ok(await sb.from('guion_cuentas').select('*').eq('archivada', false).order('nombre')); },
      async cuenta(id) { return ok(await sb.from('guion_cuentas').select('*').eq('id', id).maybeSingle()); },
      async resumenGuiones() { return ok(await sb.from('guiones').select('id,cuenta_id,titulo,autor,updated_at,checks,estructura').eq('archivado', false).order('updated_at', { ascending: false })); },
      async guiones(cuentaId) { return ok(await sb.from('guiones').select('id,cuenta_id,titulo,autor,created_at,updated_at,checks,estructura').eq('cuenta_id', cuentaId).eq('archivado', false).order('updated_at', { ascending: false })); },
      async guion(id) { return ok(await sb.from('guiones').select('*').eq('id', id).maybeSingle()); },
      async insert(t, row) { return ok(await sb.from(t).insert(row).select().single()); },
      async update(t, id, patch) { return ok(await sb.from(t).update(patch).eq('id', id).select().single()); },
      async check(gid, item, valor) { return ok(await sb.rpc('marcar_check', { gid, item, valor })); },
      // Sesión solo para «Etiquetar con Claude»
      async sesion() { const { data } = await sb.auth.getSession(); return data.session; },
      async entrar(email, password) { return ok(await sb.auth.signInWithPassword({ email, password })).session; },
      async salir() { await sb.auth.signOut(); },
      async puedeIA() { return ok(await sb.rpc('puede_usar_ia')) === true; },
      async etiquetarIA(payload) {
        const ses = await this.sesion();
        const r = await fetch('/api/guion', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (ses ? ses.access_token : '') }, body: JSON.stringify(payload) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { const e = new Error(data.error || 'No se pudo etiquetar el guion.'); e.status = r.status; throw e; }
        return data.texto;
      },
      escuchar(gid, fn) {
        const ch = sb.channel('guion-' + gid).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'guiones', filter: 'id=eq.' + gid }, p => fn(p.new)).subscribe();
        return () => sb.removeChannel(ch);
      }
    };
  }

  function demoStore() {
    const id = () => 'd' + Math.random().toString(36).slice(2, 10);
    const now = () => new Date().toISOString();
    let db = { guion_cuentas: [], guiones: [] };
    const ready = fetch('/__scratch/demo-guion.json').then(r => r.ok ? r.json() : null).then(e => {
      const c = { id: 'c-demo', nombre: 'Cliente de prueba', color: 'rosa', notas: '', archivada: false, created_at: now(), updated_at: now() };
      db.guion_cuentas.push(c, { id: 'c-demo2', nombre: 'Otra cuenta', color: 'azul', archivada: false, created_at: now(), updated_at: now() });
      if (e) db.guiones.push({ id: 'g-demo', cuenta_id: c.id, titulo: e.titulo, autor: 'Mauro', texto: '(texto del guion)', estructura: e, checks: { v1: true, v8: true }, archivado: false, created_at: now(), updated_at: now() });
    }).catch(() => {});
    const listeners = {}; let demoSes = null;
    return {
      async cuentas() { await ready; return db.guion_cuentas.filter(c => !c.archivada); },
      async cuenta(cid) { await ready; return db.guion_cuentas.find(c => c.id === cid) || null; },
      async resumenGuiones() { await ready; return db.guiones.filter(g => !g.archivado); },
      async guiones(cid) { await ready; return db.guiones.filter(g => g.cuenta_id === cid && !g.archivado); },
      async guion(gid) { await ready; return db.guiones.find(g => g.id === gid) || null; },
      async insert(t, row) { const r = Object.assign({ id: id(), created_at: now(), updated_at: now(), checks: {}, archivado: false, archivada: false }, row); db[t].push(r); return r; },
      async update(t, rid, patch) { const r = db[t].find(x => x.id === rid); Object.assign(r, patch, { updated_at: now() }); return r; },
      async check(gid, item, valor) { const g = db.guiones.find(x => x.id === gid); g.checks = Object.assign({}, g.checks); if (valor) g.checks[item] = true; else delete g.checks[item]; (listeners[gid] || []).forEach(f => f(g)); return g.checks; },
      async sesion() { return demoSes; },
      async entrar(email) { demoSes = { user: { email } }; return demoSes; },
      async salir() { demoSes = null; },
      async puedeIA() { return true; },
      async etiquetarIA() { await new Promise(r => setTimeout(r, 1500)); return PLANTILLA; },
      escuchar(gid, fn) { (listeners[gid] = listeners[gid] || []).push(fn); return () => { listeners[gid] = (listeners[gid] || []).filter(f => f !== fn); }; }
    };
  }

  const configured = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  const db = isDemo ? demoStore() : (configured ? supabaseStore() : null);

  /* =====================================================================
     NAVEGACIÓN (parámetros en la dirección: ?cuenta=…, ?g=…, ?g=…&rodaje=1, ?nuevo=…)
     ===================================================================== */
  const Q = () => new URLSearchParams(location.search);
  function go(params) {
    const q = new URLSearchParams(params || {});
    if (isDemo) q.set('demo', '');
    history.pushState(null, '', location.pathname + (q.toString() ? '?' + q.toString().replace(/=(&|$)/g, '$1') : ''));
    route();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('popstate', route);
  let stopLive = null;

  async function route() {
    if (stopLive) { stopLive(); stopLive = null; }
    closeSheet(); app.classList.remove("wide"); document.body.classList.remove("gui-rodaje"); const hl = $("#homeLink"); if (hl) hl.hidden = false;
    const q = Q();
    if (!db) return viewSetup();
    try {
      if (q.get('g') && q.get('editar') !== null && q.has('editar')) return await viewEditor(null, q.get('g'));
      if (q.get('g')) return await viewGuion(q.get('g'), q.has('rodaje'));
      if (q.get('nuevo')) return await viewEditor(q.get('nuevo'), null);
      if (q.get('cuenta')) return await viewCuenta(q.get('cuenta'));
      return await viewCuentas();
    } catch (e) {
      console.error(e);
      app.innerHTML = '';
      app.append(h('div', { class: 'block gui-empty' }, h('h3', null, 'No se pudo cargar'),
        h('p', { class: 'help' }, /relation|does not exist|schema cache/i.test(e.message || '') ? 'Falta crear las tablas de guiones: corre supabase/guiones.sql en Supabase.' : 'Revisa tu conexión e intenta de nuevo.'),
        h('button', { type: 'button', class: 'btn', onclick: route }, 'Reintentar')));
    }
  }

  function setTop(title, sub, backFn) {
    $('#topTitle').textContent = title;
    $('#topSub').textContent = sub || '';
    const link = $('#brandLink');
    link.onclick = backFn ? (e => { e.preventDefault(); backFn(); }) : null;
    link.title = backFn ? 'Volver' : 'Volver al inicio';
  }

  /* ---------------- Utilidades de interfaz ---------------- */
  let sheetEl = null;
  function openSheet(title, sub, content, actions, color) {
    closeSheet();
    const p = pal(color);
    const card = h('div', { class: 'fin-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, style: pv(p) },
      h('div', { class: 'fin-sheet-h' }, h('div', null, h('h2', null, title), sub ? h('p', { class: 'help' }, sub) : null),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cerrar', onclick: closeSheet }, '✕')),
      h('div', { class: 'fin-sheet-b' }, content),
      h('div', { class: 'fin-sheet-f' }, actions));
    sheetEl = h('div', { class: 'fin-overlay', onclick: e => { if (e.target === sheetEl) closeSheet(); } }, card);
    document.body.append(sheetEl); document.body.style.overflow = 'hidden';
    const f = card.querySelector('input, textarea, select'); if (f) setTimeout(() => f.focus(), 40);
  }
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; document.body.style.overflow = ''; } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  const lbl = (text, id, el, opt) => h('div', null, h('label', { class: 'label', for: id }, text, opt ? h('span', { class: 'gui-muted' }, ' · opcional') : null), el);
  function busy(btn, t) { btn.disabled = true; btn.dataset.l = btn.textContent; btn.textContent = t; }
  function unbusy(btn) { btn.disabled = false; btn.textContent = btn.dataset.l; }
  function icon(name) {
    const P = {
      plus: '<path d="M12 5.5v13M5.5 12h13"/>',
      link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4L11.6 6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0L4.8 12.8a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
      edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
      archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5"/><path d="M5.5 9v8.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9M10 13h4"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'
    };
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'fin-ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = P[name] || '';
    return s;
  }

  /* ---------------- Métricas de un guion ---------------- */
  function metricas(g) {
    const e = g.estructura || {}, m = e.momentos || [], checks = g.checks || {};
    const hechos = m.filter(x => checks[x.id]).length;
    const entrevistados = new Set(m.filter(x => x.tipo === 'entrevista').map(x => x.titulo.trim().toLowerCase()));
    return {
      total: m.length, hechos, pct: m.length ? Math.round(hechos / m.length * 100) : 0,
      escenas: m.filter(x => x.tipo === 'apoyo' && x.en_video).length,
      entrevistas: entrevistados.size,
      locaciones: (e.locaciones || []).length || new Set(m.map(x => x.locacion).filter(Boolean)).size,
      protagonistas: (e.protagonistas || []).length
    };
  }

  /* =====================================================================
     PANTALLAS
     ===================================================================== */
  function viewSetup() {
    setTop('Guiones de rodaje', 'Sin conexión');
    app.innerHTML = '';
    app.append(h('div', { class: 'block gui-empty' }, h('h3', null, 'Falta conectar la base de datos'), h('p', { class: 'help' }, 'Este módulo usa el mismo proyecto de Supabase que Finanzas. Revisa finanzas-config.js.')));
  }

  /* ---------- Cuentas ---------- */
  async function viewCuentas() {
    setTop('Guiones de rodaje', 'Por cuenta');
    const [cuentas, guiones] = await Promise.all([db.cuentas(), db.resumenGuiones()]);
    app.innerHTML = '';
    let filtro = '';
    const grid = h('div', { class: 'gui-accounts' });
    const draw = () => {
      grid.innerHTML = '';
      const list = cuentas.filter(c => c.nombre.toLowerCase().includes(filtro.toLowerCase()));
      if (!list.length) { grid.append(h('div', { class: 'block gui-empty' }, h('h3', null, cuentas.length ? 'Ninguna cuenta coincide' : 'Crea la primera cuenta'), h('p', { class: 'help' }, cuentas.length ? 'Prueba con otro nombre.' : 'Cada cuenta es un cliente o empresa. Adentro guardas sus guiones.'))); return; }
      list.forEach((c, i) => {
        const gs = guiones.filter(g => g.cuenta_id === c.id);
        const ult = gs[0];
        const p = pal(c.color);
        grid.append(h('button', { type: 'button', class: 'gui-account gui-rise', style: Object.assign(pv(p), { '--i': i }), onclick: () => go({ cuenta: c.id }) },
          h('span', { class: 'gui-account-ini' }, c.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()),
          h('span', { class: 'gui-account-t' }, h('b', null, c.nombre), h('small', null, gs.length ? `${gs.length} ${gs.length === 1 ? 'guion' : 'guiones'} · actualizado ${fecha(ult.updated_at)}` : 'Sin guiones todavía')),
          ult ? h('span', { class: 'gui-mini' }, h('i', { style: { width: metricas(ult).pct + '%' } })) : null));
      });
    };
    const search = h('input', { class: 'field gui-search', type: 'search', placeholder: 'Buscar cuenta', 'aria-label': 'Buscar cuenta', oninput: e => { filtro = e.target.value; draw(); } });
    app.append(
      h('div', { class: 'gui-head' },
        h('div', null, h('p', { class: 'eyebrow' }, 'Guiones de rodaje'), h('h1', { class: 'q' }, '¿En qué cuenta vas a trabajar?'),
          h('p', { class: 'help' }, 'Cada cuenta es un cliente. Adentro creas sus guiones: escribes el guion con etiquetas y se convierte en un checklist de rodaje.')),
        h('button', { type: 'button', class: 'btn primary', onclick: () => openCuenta() }, icon('plus'), 'Nueva cuenta')),
      h('div', { class: 'gui-tools' }, search),
      grid);
    draw();
  }

  function openCuenta(c) {
    const edit = !!c;
    const f = { nombre: c ? c.nombre : '', color: c ? c.color : COLORES[Math.floor(Math.random() * COLORES.length)] };
    const err = h('div', { class: 'fin-err', role: 'alert' });
    const nom = h('input', { class: 'field big', id: 'gc-nombre', placeholder: 'Ej. ISDIN', value: f.nombre, oninput: e => { f.nombre = e.target.value; } });
    const sw = h('div', { class: 'swatches' }, COLORES.map(k => h('button', { type: 'button', class: 'sw', 'aria-label': 'Color ' + pal(k).name, 'aria-pressed': f.color === k ? 'true' : 'false', style: { '--s': pal(k).ac },
      onclick: e => { f.color = k; sw.querySelectorAll('.sw').forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); } })));
    const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
      if (!f.nombre.trim()) { err.textContent = 'Escribe el nombre de la cuenta.'; return; }
      busy(save, 'Guardando…');
      try {
        if (edit) { await db.update('guion_cuentas', c.id, { nombre: f.nombre.trim(), color: f.color }); closeSheet(); toast('Cuenta actualizada'); route(); }
        else { const r = await db.insert('guion_cuentas', { nombre: f.nombre.trim(), color: f.color }); closeSheet(); toast('Cuenta creada'); go({ cuenta: r.id }); }
      } catch (e) { console.error(e); err.textContent = 'No se pudo guardar.'; unbusy(save); }
    } }, edit ? 'Guardar cambios' : 'Crear cuenta');
    const actions = [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save];
    if (edit) actions.unshift(h('button', { type: 'button', class: 'btn ghost danger', style: { marginRight: 'auto' }, onclick: async () => {
      try { await db.update('guion_cuentas', c.id, { archivada: true }); closeSheet(); toast('Cuenta archivada'); go({}); } catch (e) { toast('No se pudo archivar'); }
    } }, 'Archivar'));
    openSheet(edit ? 'Editar cuenta' : 'Nueva cuenta', 'El cliente o la empresa para la que hacen los guiones.', h('div', { class: 'stack' }, lbl('Nombre', 'gc-nombre', nom), h('div', null, h('span', { class: 'label' }, 'Color'), sw), err), actions, f.color);
  }

  /* ---------- Una cuenta y sus guiones ---------- */
  async function viewCuenta(cid) {
    const [c, gs] = await Promise.all([db.cuenta(cid), db.guiones(cid)]);
    if (!c) { app.innerHTML = ''; app.append(h('div', { class: 'block gui-empty' }, h('h3', null, 'Esta cuenta no existe o está archivada'), h('button', { type: 'button', class: 'btn', onclick: () => go({}) }, 'Ver cuentas'))); return; }
    setTop(c.nombre, 'Guiones', () => go({}));
    const p = pal(c.color);
    app.innerHTML = '';
    app.append(
      h('div', { class: 'gui-head', style: pv(p) },
        h('div', null, h('button', { type: 'button', class: 'gui-back', onclick: () => go({}) }, '‹ Cuentas'),
          h('h1', { class: 'q' }, c.nombre), h('p', { class: 'help' }, gs.length ? `${gs.length} ${gs.length === 1 ? 'guion' : 'guiones'}` : 'Aún no hay guiones en esta cuenta.')),
        h('div', { class: 'gui-row' },
          h('button', { type: 'button', class: 'btn', onclick: () => openCuenta(c) }, icon('edit'), 'Editar'),
          h('button', { type: 'button', class: 'btn primary', onclick: () => go({ nuevo: c.id }) }, icon('plus'), 'Nuevo guion'))));
    if (!gs.length) {
      app.append(h('button', { type: 'button', class: 'gui-new gui-rise', style: pv(p), onclick: () => go({ nuevo: c.id }) },
        h('img', { src: A.icons.hoja, alt: '' }), h('b', null, 'Crea el primer guion'), h('span', null, 'Escribe el guion con etiquetas y se arma el checklist de rodaje.')));
      return;
    }
    app.append(h('div', { class: 'gui-scripts' }, gs.map((g, i) => {
      const m = metricas(g);
      return h('button', { type: 'button', class: 'gui-script gui-rise', style: Object.assign(pv(p), { '--i': i }), onclick: () => go({ g: g.id }) },
        h('div', { class: 'gui-script-h' }, h('b', null, g.titulo), h('span', { class: 'gui-pct' + (m.pct === 100 ? ' done' : '') }, m.pct + '%')),
        h('small', null, [g.autor ? 'Por ' + g.autor : null, 'actualizado ' + fecha(g.updated_at)].filter(Boolean).join(' · ')),
        h('span', { class: 'gui-bar' }, h('i', { style: { width: m.pct + '%' } })),
        h('span', { class: 'gui-chips' }, h('span', null, `${m.hechos} de ${m.total} tomas`), h('span', null, `${m.entrevistas} entrevistas`), h('span', null, `${m.locaciones} locaciones`)));
    })));
  }

  /* =====================================================================
     ETIQUETAS: el guion se escribe con etiquetas al inicio de la línea
     (UBICACIÓN: …, ENTREVISTA: …, TOMA: …). Todo se arma en el navegador, gratis.
     ===================================================================== */
  const ETIQUETAS = [
    { k: 'ubicacion',  label: 'Ubicación',  color: 'verde',    g: 'Dónde y qué', alias: ['ubicacion', 'locacion', 'lugar', 'spot', 'set'], help: 'Dónde se graba. Todo lo que sigue queda en esa ubicación.' },
    { k: 'entrevista', label: 'Entrevista', color: 'rosa',     g: 'Dónde y qué', alias: ['entrevista', 'entrevistado', 'testimonio'], help: 'Quién habla a cámara. Cada FRASE debajo es una toma.' },
    { k: 'toma',       label: 'Toma',       color: 'azul',     g: 'Dónde y qué', alias: ['toma', 'escena', 'apoyo', 'toma de apoyo'], help: 'Toma de apoyo que va en el video. Se numera sola.' },
    { k: 'montaje',    label: 'Montaje',    color: 'verde',    g: 'Dónde y qué', alias: ['montaje', 'b-roll', 'broll', 'secuencia'], help: 'Secuencia o montaje de varias tomas.' },
    { k: 'cierre',     label: 'Cierre',     color: 'violeta',  g: 'Dónde y qué', alias: ['cierre', 'final', 'end card'], help: 'Final del video: logo, lema, llamado.' },
    { k: 'extra',      label: 'Extra',      color: 'amarillo', g: 'Dónde y qué', alias: ['extra', 'toma extra', 'adicional', 'respaldo'], help: 'Toma de respaldo. No entra en el orden del video.' },
    { k: 'plano',      label: 'Plano',      color: 'turquesa', g: 'Detalle de la toma', alias: ['plano', 'camara', 'encuadre'], help: 'Encuadre o movimiento de cámara de la toma de arriba.' },
    { k: 'frase',      label: 'Frase',      color: 'rosa',     g: 'Detalle de la toma', alias: ['frase', 'cita', 'dice', 'dialogo'], help: 'Lo que dice la persona entrevistada.' },
    { k: 'nota',       label: 'Nota',       color: 'naranja',  g: 'Detalle de la toma', alias: ['nota', 'produccion', 'ojo', 'importante'], help: 'Nota de producción: utilería, luz, vestuario.' },
    { k: 'titulo',     label: 'Título',     color: 'azul',     g: 'Datos del guion', alias: ['titulo'], help: 'Título del guion (opcional si ya lo escribiste arriba).' },
    { k: 'lema',       label: 'Lema',       color: 'rosa',     g: 'Datos del guion', alias: ['lema', 'concepto', 'claim'], help: 'Frase del concepto. La *palabra* entre asteriscos se resalta.' },
    { k: 'protagonistas', label: 'Protagonistas', color: 'violeta', g: 'Datos del guion', alias: ['protagonistas', 'talento', 'personajes', 'reparto'], help: 'Nombres separados por coma.' },
    { k: 'regla',      label: 'Regla',      color: 'verde',    g: 'Datos del guion', alias: ['regla', 'indicacion'], help: 'Indicación general de rodaje: «Título — explicación».' },
    { k: 'evitar',     label: 'Evitar',     color: 'rosa',     g: 'Datos del guion', alias: ['evitar', 'no hacer', 'prohibido'], help: 'Algo que no debe pasar en el rodaje.' }
  ];
  const ETQ = Object.fromEntries(ETIQUETAS.map(t => [t.k, t]));
  const sinTilde = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const ALIAS = {}; ETIQUETAS.forEach(t => t.alias.forEach(a => { ALIAS[a] = t.k; }));
  const RE_TAG = /^\s*(?:\[\s*([^\]]{2,24}?)\s*\]\s*:?|([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ \-]{1,22}?)\s*:)\s*(.*)$/;
  function leerEtiqueta(linea) {
    const m = linea.match(RE_TAG); if (!m) return null;
    const k = ALIAS[sinTilde(m[1] || m[2])];
    return k ? { k, valor: m[3].trim() } : null;
  }
  const TIPO_DE = { entrevista: 'entrevista', toma: 'apoyo', montaje: 'montaje', cierre: 'cierre', extra: 'apoyo' };

  function parseGuion(texto, opts) {
    const lineas = texto.split(/\r?\n/), filas = [], momentos = [], reglas = [], prota = [];
    const e = { titulo: '', cliente: '', lema: '', lema_resaltado: '' };
    let loc = '', cur = null;
    const nuevo = (k, titulo) => { cur = { id: '', tipo: TIPO_DE[k], numero: '', titulo, plano: '', locacion: loc, cita: '', texto: '', nota: '', en_video: k !== 'extra' }; momentos.push(cur); return cur; };
    lineas.forEach((raw, n) => {
      const t = raw.trim(); if (!t) return;
      const tag = leerEtiqueta(t);
      if (!tag) {
        if (cur) { cur.texto = cur.texto ? cur.texto + ' ' + t : t; filas.push({ n, rol: 'desc', texto: t }); }
        else filas.push({ n, rol: 'libre', texto: t, aviso: 'Sin etiqueta: esta línea no se usa' });
        return;
      }
      const { k, valor } = tag, fila = { n, k, texto: valor };
      filas.push(fila);
      if (k === 'ubicacion') { loc = valor; cur = null; if (!valor) fila.aviso = 'Escribe el nombre del lugar'; }
      else if (TIPO_DE[k]) {
        nuevo(k, valor || (k === 'entrevista' ? 'Entrevista' : ETQ[k].label));
        if (!loc) fila.aviso = 'Sin ubicación: agrega UBICACIÓN antes';
        if (k === 'entrevista' && !valor) fila.aviso = 'Escribe quién habla';
      } else if (k === 'plano' || k === 'frase' || k === 'nota') {
        if (!cur) { fila.aviso = 'Va debajo de una toma o entrevista'; return; }
        if (k === 'plano') cur.plano = valor;
        if (k === 'nota') cur.nota = cur.nota ? cur.nota + ' ' + valor : valor;
        if (k === 'frase') {
          const limpia = valor.replace(/^["“«]+|["”»]+$/g, '');
          if (cur.tipo === 'entrevista' && cur.cita) { const prev = cur; nuevo('entrevista', prev.titulo); cur.plano = prev.plano; cur.locacion = prev.locacion; }
          cur.cita = cur.cita ? cur.cita + ' ' + limpia : limpia;
        }
      } else if (k === 'titulo' || k === 'cliente') e[k] = valor;
      else if (k === 'lema') { const hl = valor.match(/\*([^*]+)\*/); e.lema = valor.replace(/\*/g, ''); e.lema_resaltado = hl ? hl[1] : ''; }
      else if (k === 'protagonistas') valor.split(/\s*(?:,|;|\sy\s)\s*/).filter(Boolean).forEach(x => prota.push(x));
      else if (k === 'regla' || k === 'evitar') {
        const [a, ...b] = valor.split(/\s+[—–-]\s+|:\s+/);
        reglas.push({ titulo: b.length ? a : (k === 'evitar' ? 'Evitar' : 'Indicación'), texto: b.length ? b.join(' — ') : a, evitar: k === 'evitar' });
      }
    });
    // Numeración como en el piloto: E entrevistas, 01… tomas del video, B montaje, F cierre, + extras
    let nTomas = 0;
    momentos.forEach((m, i) => {
      m.id = 'm' + (i + 1);
      m.numero = m.tipo === 'entrevista' ? 'E' : m.tipo === 'montaje' ? 'B' : m.tipo === 'cierre' ? 'F' : m.en_video ? String(++nTomas).padStart(2, '0') : '+';
    });
    // Plan por ubicación: primero cada entrevista completa, luego las tomas de cada lugar
    const bloques = [], vistos = {};
    momentos.filter(m => m.tipo === 'entrevista').forEach(m => {
      const key = m.titulo + '|' + m.locacion;
      if (!vistos[key]) { vistos[key] = { nombre: `Entrevista de ${m.titulo}${m.locacion ? ' · ' + m.locacion : ''}`, descripcion: 'Toda la entrevista en el mismo spot.', ids: [] }; bloques.push(vistos[key]); }
      vistos[key].ids.push(m.id);
    });
    const locs = [...new Set(momentos.map(m => m.locacion))];
    locs.forEach(l => {
      const ids = momentos.filter(m => m.tipo !== 'entrevista' && m.locacion === l).map(m => m.id);
      if (ids.length) bloques.push({ nombre: (l || 'Sin ubicación') + ' · tomas', descripcion: '', ids });
    });
    bloques.forEach((b, i) => { b.nombre = `${i + 1} · ${b.nombre}`; });
    const personas = prota.length ? prota : [...new Set(momentos.filter(m => m.tipo === 'entrevista').map(m => m.titulo))];
    return {
      filas,
      estructura: { titulo: e.titulo || opts.titulo || '', cliente: e.cliente || opts.cliente || '', lema: e.lema, lema_resaltado: e.lema_resaltado, protagonistas: personas, locaciones: locs.filter(Boolean), reglas, momentos, bloques }
    };
  }

  // Asistente: propone etiquetas para las líneas que no tienen
  function sugerirEtiqueta(t) {
    const s = sinTilde(t);
    let m;
    if ((m = t.match(/^(?:ubicaci[oó]n|locaci[oó]n|lugar|spot|set)\b[\s.:\-–—]*(.*)$/i))) return ['ubicacion', m[1]];
    if ((m = t.match(/^(?:int|ext|int\/ext)\.\s*(.*)$/i))) return ['ubicacion', m[1]];
    if ((m = t.match(/entrevista(?:\s+(?:a|de|con))?\s*[:\-–—]?\s*(.+)$/i))) return ['entrevista', m[1]];
    if (/^["“«]/.test(t)) return ['frase', t];
    if ((m = t.match(/^(?:escena|toma)\s*\d*\s*[.:\-–—)]*\s*(.*)$/i))) return ['toma', m[1]];
    if ((m = t.match(/^(?:montaje|b-?roll|secuencia)\s*[.:\-–—]*\s*(.*)$/i))) return ['montaje', m[1]];
    if ((m = t.match(/^(?:cierre|final|end ?card)\s*[.:\-–—]*\s*(.*)$/i))) return ['cierre', m[1] || t];
    if ((m = t.match(/^(?:nota|ojo|importante)\s*[.:\-–—]*\s*(.*)$/i))) return ['nota', m[1]];
    if (t.length < 90 && /\b(plano|primer plano|close ?up|cenital|dron|drone|gimbal|travelling|paneo|camara (?:fija|en mano|lenta)|slow ?motion)\b/.test(s)) return ['plano', t];
    if ((m = t.match(/^\d{1,2}\s*[.)\-–—]\s*(.+)$/))) return ['toma', m[1]];
    return null;
  }

  const PLANTILLA = [
    'TÍTULO: Disciplina, el lujo de cuidarte',
    'LEMA: La *disciplina* también es un lujo',
    'PROTAGONISTAS: Valentina, Sara',
    'REGLA: Plano medio — Entrevistas a la altura de los ojos, mirando al entrevistador.',
    'EVITAR: Logos de otras marcas — Nada de ropa o empaques con marcas visibles.',
    '',
    'UBICACIÓN: Edificio San Juan',
    'ENTREVISTA: Valentina',
    'PLANO: Medio, de lado',
    'FRASE: Para mí, la disciplina es un regalo que me hago.',
    'FRASE: Nadie me obliga; lo elijo cada mañana.',
    '',
    'TOMA: Valentina se amarra los tenis',
    'PLANO: Detalle, cámara baja',
    'Se ve el amanecer por la ventana.',
    'NOTA: Llevar luz cálida de apoyo.',
    '',
    'UBICACIÓN: Parque principal',
    'TOMA: Trota hacia la cámara',
    'MONTAJE: Secuencia de entrenamiento, cortes rápidos',
    'CIERRE: Logo y lema final',
    'EXTRA: Fachada del edificio desde el dron'
  ].join('\n');

  /* ---------- Crear o editar un guion con el asistente de etiquetas ---------- */
  async function viewEditor(cid, gid) {
    const existente = gid ? await db.guion(gid) : null;
    const cuentaId = existente ? existente.cuenta_id : cid;
    const c = await db.cuenta(cuentaId);
    if (!c) { go({}); return; }
    setTop(existente ? 'Editar guion' : 'Nuevo guion', c.nombre, () => (existente ? go({ g: gid }) : go({ cuenta: c.id })));
    app.classList.add('wide');
    const p = pal(c.color);
    const f = { titulo: existente ? existente.titulo : '', autor: existente ? (existente.autor || '') : '', texto: existente ? (existente.texto || '') : '', estructura: null };
    let lectura = parseGuion(f.texto, { titulo: f.titulo, cliente: c.nombre });
    app.innerHTML = '';
    const err = h('div', { class: 'fin-err', role: 'alert' });
    const count = h('small', { class: 'gui-count' });
    const ta = h('textarea', { class: 'area gui-text', id: 'gs-texto', spellcheck: 'true', placeholder: 'Escribe o pega el guion. Empieza cada línea con una etiqueta:\n\nUBICACIÓN: Edificio San Juan\nENTREVISTA: Valentina\nFRASE: Para mí, la disciplina es un regalo.\nTOMA: Se amarra los tenis\nPLANO: Detalle, cámara baja' });
    ta.value = f.texto;
    const titulo = h('input', { class: 'field big', id: 'gs-titulo', placeholder: 'Ej. Disciplina, el lujo de cuidarte', value: f.titulo, oninput: e => { f.titulo = e.target.value; } });
    const otros = h('input', { class: 'field', id: 'gs-autor', placeholder: 'Otro nombre', value: TEAM.some(t => t.nombre === f.autor) ? '' : f.autor, oninput: e => { f.autor = e.target.value; chips.querySelectorAll('.fin-cat').forEach(b => b.setAttribute('aria-checked', 'false')); } });
    const chips = h('div', { class: 'fin-cats', role: 'radiogroup', 'aria-label': 'Quién lo escribió' }, TEAM.map(t => h('button', { type: 'button', role: 'radio', class: 'fin-cat', 'aria-checked': f.autor === t.nombre ? 'true' : 'false',
      onclick: e => { f.autor = t.nombre; otros.value = ''; chips.querySelectorAll('.fin-cat').forEach(b => b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false')); } },
      h('img', { src: A.equipo[t.id], alt: '', class: 'gui-av' }), t.nombre)));
    const preview = h('div');
    const panel = h('div', { class: 'gui-read-list' });
    const resumen = h('div', { class: 'gui-read-sum' });
    const autoBtn = h('button', { type: 'button', class: 'btn small', onclick: autoEtiquetar, title: 'Gratis: reconoce patrones simples (Escena 1, INT., Entrevista a…)' }, icon('edit'), 'Etiquetar por mí');
    const iaBtn = h('button', { type: 'button', class: 'btn small gui-ia', onclick: etiquetarConClaude, title: 'Claude lee el guion escrito libremente y le pone todas las etiquetas' });
    const iaLabel = t => { iaBtn.innerHTML = ''; iaBtn.append(icon('sparkle'), t); };
    iaLabel('Etiquetar con Claude');
    const sesBox = h('div', { class: 'gui-ses' });

    // ----- Etiquetar con Claude (requiere sesión de alguien autorizado)
    async function drawSes() {
      const ses = await db.sesion().catch(() => null);
      sesBox.innerHTML = '';
      if (ses && ses.user) sesBox.append(h('span', null, 'Claude activo para ' + ses.user.email), h('button', { type: 'button', class: 'gui-link', onclick: async () => { await db.salir(); drawSes(); toast('Sesión cerrada'); } }, 'Salir'));
    }
    function pedirLogin(despues) {
      const em = h('input', { class: 'field', id: 'ia-email', type: 'email', autocomplete: 'username', placeholder: 'tu@correo.com' });
      const pw = h('input', { class: 'field', id: 'ia-pass', type: 'password', autocomplete: 'current-password' });
      const e2 = h('div', { class: 'fin-err', role: 'alert' });
      const go2 = h('button', { type: 'submit', class: 'btn primary huge' }, 'Entrar');
      const form = h('form', { class: 'stack', onsubmit: async ev => {
        ev.preventDefault(); e2.textContent = '';
        if (!em.value.trim() || !pw.value) { e2.textContent = 'Escribe tu correo y contraseña.'; return; }
        busy(go2, 'Entrando…');
        try { await db.entrar(em.value.trim(), pw.value); closeSheet(); drawSes(); despues(); }
        catch (x) { console.error(x); e2.textContent = /invalid|credentials/i.test(x.message || '') ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Revisa tu conexión.'; unbusy(go2); }
      } }, lbl('Correo', 'ia-email', em), lbl('Contraseña', 'ia-pass', pw), e2, h('button', { type: 'submit', hidden: true }));
      openSheet('Inicia sesión para usar Claude', 'Con tu cuenta de Brandgo. Solo se pide para etiquetar con Claude; el resto de guiones sigue abierto.', form,
        [h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), h('button', { type: 'button', class: 'btn primary huge', onclick: () => form.requestSubmit() }, 'Entrar')], 'violeta');
    }
    let iaOcupado = false;
    async function etiquetarConClaude() {
      if (iaOcupado) return;
      err.textContent = '';
      if (f.texto.trim().length < 40) { err.textContent = 'Pega el guion completo antes de etiquetarlo con Claude.'; ta.focus(); return; }
      if (f.texto.length > MAX_CHARS) { err.textContent = 'El guion es muy largo. Divídelo en partes.'; return; }
      const ses = await db.sesion().catch(() => null);
      if (!ses) { pedirLogin(etiquetarConClaude); return; }
      try { if (!(await db.puedeIA())) { err.textContent = 'Tu cuenta no tiene permiso para usar Claude. Pídele acceso a Mauro.'; return; } }
      catch (x) { console.error(x); err.textContent = /puede_usar_ia|function|schema/i.test(x.message || '') ? 'Falta activar Claude en la base de datos: corre supabase/guiones-ia.sql.' : 'No se pudo verificar tu acceso. Revisa tu conexión.'; return; }
      iaOcupado = true; iaBtn.disabled = true; ta.readOnly = true; writeBlock.classList.add('gui-busy');
      const pasos = ['Claude está leyendo…', 'Buscando ubicaciones…', 'Separando entrevistas y tomas…', 'Poniendo las etiquetas…'];
      let k = 0; iaLabel(pasos[0]); const t = setInterval(() => { k = (k + 1) % pasos.length; iaLabel(pasos[k]); }, 4000);
      try {
        const out = await db.etiquetarIA({ texto: f.texto, titulo: f.titulo, cliente: c.nombre });
        ta.readOnly = false; setTexto(out, 0); ta.scrollTop = 0;
        toast('Listo. Revisa «Así se lee» y corrige lo que haga falta. Ctrl+Z deshace.');
      } catch (x) {
        console.error(x);
        if (x.status === 401) await db.salir().catch(() => {});
        err.textContent = x.message || 'No se pudo etiquetar el guion.';
      } finally {
        clearInterval(t); iaOcupado = false; iaBtn.disabled = false; ta.readOnly = false; writeBlock.classList.remove('gui-busy'); iaLabel('Etiquetar con Claude'); drawSes();
      }
    }
    const genBtn = h('button', { type: 'button', class: 'btn primary huge gui-gen', onclick: armar }, icon('check'), 'Armar checklist');
    const saveBtn = h('button', { type: 'button', class: 'btn primary huge', onclick: guardar }, existente ? 'Guardar cambios' : 'Guardar guion');

    // ----- Escribir en el textarea sin perder el deshacer del navegador cuando se puede
    function setTexto(v, cursor) {
      ta.focus(); ta.select();
      const ok = document.execCommand && document.execCommand('insertText', false, v);
      if (!ok || ta.value !== v) ta.value = v;
      if (cursor != null) ta.setSelectionRange(cursor, cursor);
      onTexto();
    }
    function lineaActual() {
      const v = ta.value, pos = ta.selectionStart;
      const ini = v.lastIndexOf('\n', pos - 1) + 1, finIdx = v.indexOf('\n', pos), fin = finIdx < 0 ? v.length : finIdx;
      return { v, ini, fin, linea: v.slice(ini, fin) };
    }
    function ponerEtiqueta(k) {
      const { v, ini, fin, linea } = lineaActual();
      const actual = leerEtiqueta(linea.trim());
      const resto = actual ? actual.valor : linea.trim();
      const nueva = ETQ[k].label.toUpperCase() + ': ' + resto;
      // Si la línea tiene texto se reemplaza su etiqueta; si el cursor está en una línea con etiqueta distinta y vacía, igual
      const v2 = v.slice(0, ini) + nueva + v.slice(fin);
      setTexto(v2, ini + nueva.length);
    }
    function irALinea(n) {
      const ls = ta.value.split('\n'); let pos = 0;
      for (let i = 0; i < n; i++) pos += ls[i].length + 1;
      ta.focus(); ta.setSelectionRange(pos, pos + (ls[n] || '').length);
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22; ta.scrollTop = Math.max(0, n * lh - ta.clientHeight / 3);
      if (window.matchMedia('(max-width: 900px)').matches) ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function autoEtiquetar() {
      let cambios = 0;
      const out = ta.value.split('\n').map(l => {
        const t = l.trim(); if (!t || leerEtiqueta(t)) return l;
        const s = sugerirEtiqueta(t); if (!s) return l;
        cambios++; return ETQ[s[0]].label.toUpperCase() + ': ' + s[1].trim();
      }).join('\n');
      if (!cambios) { toast('No encontré líneas para etiquetar. Usa los botones de etiqueta.'); return; }
      setTexto(out, 0); toast(`${cambios} ${cambios === 1 ? 'línea etiquetada' : 'líneas etiquetadas'}. Revisa la lectura.`);
    }

    // ----- Lectura en vivo: cómo entiende el asistente cada línea
    function drawLectura() {
      const fl = lectura.filas, est = lectura.estructura, m = metricas({ estructura: est, checks: {} });
      const avisos = fl.filter(x => x.aviso).length;
      resumen.innerHTML = '';
      resumen.append(
        h('span', { class: 'gui-pill', style: pv(pal('rosa')) }, plural(m.entrevistas, 'entrevista', 'entrevistas')),
        h('span', { class: 'gui-pill', style: pv(pal('azul')) }, plural(m.total, 'toma', 'tomas')),
        h('span', { class: 'gui-pill', style: pv(pal('verde')) }, plural(m.locaciones, 'ubicación', 'ubicaciones')),
        avisos ? h('span', { class: 'gui-pill warn' }, `${avisos} por revisar`) : (m.total ? h('span', { class: 'gui-pill ok' }, 'Todo en orden') : null));
      panel.innerHTML = '';
      if (!fl.length) {
        panel.append(h('div', { class: 'gui-read-empty' }, h('b', null, 'Aquí verás cómo se lee tu guion'), h('span', null, 'Cada línea con su etiqueta. Si algo queda sin etiqueta te avisamos.'),
          h('button', { type: 'button', class: 'btn small', onclick: () => setTexto(PLANTILLA, 0) }, 'Usar un ejemplo')));
        return;
      }
      fl.forEach(x => {
        const t = x.k ? ETQ[x.k] : null;
        panel.append(h('button', { type: 'button', class: 'gui-read' + (x.aviso ? ' warn' : '') + (x.rol === 'desc' ? ' desc' : '') + (t && TIPO_DE[x.k] ? ' item' : ''), onclick: () => irALinea(x.n), title: 'Ir a la línea' },
          h('span', { class: 'gui-read-tag', style: t ? pv(pal(t.color)) : null }, t ? t.label : (x.rol === 'desc' ? 'Descripción' : 'Sin etiqueta')),
          h('span', { class: 'gui-read-txt' }, x.texto || '—', x.aviso ? h('small', null, x.aviso) : null)));
      });
    }
    let tmr = null;
    function onTexto() {
      f.texto = ta.value;
      count.textContent = `${f.texto.length.toLocaleString('es-CO')} / ${MAX_CHARS.toLocaleString('es-CO')} caracteres`;
      count.classList.toggle('over', f.texto.length > MAX_CHARS);
      clearTimeout(tmr);
      tmr = setTimeout(() => { lectura = parseGuion(f.texto, { titulo: f.titulo, cliente: c.nombre }); drawLectura(); if (f.estructura) armar(true); }, 140);
    }
    ta.addEventListener('input', onTexto);

    function drawPreview() {
      preview.innerHTML = '';
      if (!f.estructura) return;
      const e = f.estructura, m = metricas({ estructura: e, checks: {} });
      preview.append(h('div', { class: 'block gui-preview', style: pv(p) },
        h('div', { class: 'gui-preview-h' }, h('span', { class: 'gui-ok' }, icon('check')), h('div', null, h('b', null, 'Checklist listo'), h('small', null, 'Así queda el plan de rodaje. Guárdalo y después puedes editar cada toma.'))),
        h('div', { class: 'gui-stats' }, [[m.escenas, 'escenas', 'azul'], [m.entrevistas, 'entrevistas', 'rosa'], [m.locaciones, 'locaciones', 'verde'], [m.protagonistas, 'protagonistas', 'violeta']].map(([n, l, col]) => h('div', { class: 'gui-stat', style: pv(pal(col)) }, h('b', null, n), h('span', null, l)))),
        h('div', { class: 'gui-plan' }, (e.bloques || []).map(b => h('div', null, h('b', null, b.nombre), h('span', null, `${b.ids.length} ${b.ids.length === 1 ? 'toma' : 'tomas'}`)))),
        h('div', { class: 'gui-row end' }, saveBtn)));
    }

    function armar(silencioso) {
      err.textContent = '';
      lectura = parseGuion(f.texto, { titulo: f.titulo, cliente: c.nombre });
      const est = lectura.estructura;
      if (!est.momentos.length) { f.estructura = null; drawPreview(); if (silencioso !== true) err.textContent = 'No hay tomas todavía. Usa ENTREVISTA, TOMA, MONTAJE o CIERRE al inicio de cada línea, o toca «Etiquetar por mí».'; return; }
      if (f.texto.length > MAX_CHARS) { err.textContent = 'El guion es muy largo. Divídelo en partes.'; return; }
      f.estructura = est;
      if (!f.titulo.trim() && est.titulo) { f.titulo = est.titulo; titulo.value = f.titulo; }
      drawPreview();
      if (silencioso !== true) preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function guardar() {
      err.textContent = '';
      armar(true);
      if (!f.titulo.trim()) { err.textContent = 'Escribe el título del guion.'; titulo.focus(); return; }
      if (!f.estructura) { err.textContent = 'Primero arma el checklist.'; return; }
      busy(saveBtn, 'Guardando…');
      const row = { titulo: f.titulo.trim().slice(0, 160), autor: (f.autor || '').trim().slice(0, 80) || null, texto: f.texto.slice(0, 60000), estructura: f.estructura };
      try {
        if (existente) {
          // Las marcas se conservan si la toma sigue igual (mismo título y tipo)
          const prev = Object.fromEntries((existente.estructura.momentos || []).map(x => [x.id, x]));
          const firma = x => x.tipo + '|' + x.titulo + '|' + x.cita;
          const marcadas = new Set(Object.keys(existente.checks || {}).filter(k => prev[k]).map(k => firma(prev[k])));
          const checks = {}; f.estructura.momentos.forEach(x => { if (marcadas.has(firma(x))) checks[x.id] = true; });
          await db.update('guiones', existente.id, Object.assign(row, { checks })); toast('Guion actualizado'); go({ g: existente.id });
        } else { const r = await db.insert('guiones', Object.assign(row, { cuenta_id: c.id })); toast('Guion guardado'); go({ g: r.id }); }
      } catch (e) { console.error(e); err.textContent = 'No se pudo guardar. Revisa tu conexión.'; unbusy(saveBtn); }
    }

    const writeBlock = h('div', { class: 'block gui-write' },
      h('div', { class: 'gui-text-h' }, h('label', { class: 'label', for: 'gs-texto' }, 'Guion'), count),
      h('div', { class: 'gui-ia-row' }, iaBtn, autoBtn, sesBox),
      null, null, null);

    // Barra de etiquetas: tocar una pone esa etiqueta en la línea donde está el cursor
    const grupos = [...new Set(ETIQUETAS.map(t => t.g))];
    const barra = h('div', { class: 'gui-tagbar', role: 'toolbar', 'aria-label': 'Etiquetas' },
      ETIQUETAS.filter(t => t.g !== 'Datos del guion').map(t => h('button', { type: 'button', class: 'gui-tagbtn', style: pv(pal(t.color)), title: t.help,
        onmousedown: ev => ev.preventDefault(), onclick: () => ponerEtiqueta(t.k) }, t.label)),
      h('details', { class: 'gui-tagmore' }, h('summary', null, 'Más'),
        h('div', null, ETIQUETAS.filter(t => t.g === 'Datos del guion').map(t => h('button', { type: 'button', class: 'gui-tagbtn', style: pv(pal(t.color)), title: t.help,
          onmousedown: ev => ev.preventDefault(), onclick: ev => { ponerEtiqueta(t.k); ev.currentTarget.closest('details').open = false; } }, t.label)))));
    const guia = h('details', { class: 'gui-guide' }, h('summary', null, '¿Cómo funcionan las etiquetas?'),
      h('p', { class: 'help' }, 'Cada línea empieza con una etiqueta y dos puntos. Las líneas sin etiqueta debajo de una toma se vuelven su descripción. Pon el cursor en una línea y toca una etiqueta para ponérsela.'),
      grupos.map(g => h('div', { class: 'gui-guide-g' }, h('b', null, g), ETIQUETAS.filter(t => t.g === g).map(t => h('div', { class: 'gui-guide-r' }, h('span', { class: 'gui-read-tag', style: pv(pal(t.color)) }, t.label.toUpperCase() + ':'), h('span', null, t.help))))));

    app.append(
      h('div', { class: 'gui-head', style: pv(p) }, h('div', null,
        h('button', { type: 'button', class: 'gui-back', onclick: () => (existente ? go({ g: gid }) : go({ cuenta: c.id })) }, '‹ ' + (existente ? 'Volver al guion' : c.nombre)),
        h('h1', { class: 'q' }, existente ? 'Editar guion' : 'Nuevo guion'),
        h('p', { class: 'help' }, 'Pega el guion y toca «Etiquetar con Claude», o escríbelo tú con etiquetas (UBICACIÓN, ENTREVISTA, TOMA…). El asistente lo lee en vivo y arma el plan de rodaje por ubicación.'))),
      h('div', { class: 'stack gui-form', style: pv(p) },
        h('div', { class: 'block' }, lbl('Título del guion', 'gs-titulo', titulo),
          h('div', null, h('span', { class: 'label' }, '¿Quién lo escribió?'), chips, h('div', { style: { marginTop: '8px' } }, otros))),
        h('div', { class: 'gui-compose' },
          writeBlock,
          h('aside', { class: 'block gui-reader' },
            h('div', { class: 'gui-text-h' }, h('span', { class: 'label' }, 'Así se lee'), resumen), panel)),
        h('div', { class: 'gui-actions' }, err, genBtn),
        preview));
    writeBlock.append(barra, ta, guia);
    onTexto(); clearTimeout(tmr); drawLectura(); drawSes();
    if (existente) armar(true);
  }

  /* ---------- El guion: checklist de rodaje ---------- */
  async function viewGuion(gid, rodaje) {
    let g = await db.guion(gid);
    if (!g || g.archivado) { setTop('Guion', ''); app.innerHTML = ''; app.append(h('div', { class: 'block gui-empty' }, h('h3', null, 'Este guion no existe o está archivado'), rodaje ? null : h('button', { type: 'button', class: 'btn', onclick: () => go({}) }, 'Ver cuentas'))); return; }
    const c = await db.cuenta(g.cuenta_id);
    document.body.classList.toggle('gui-rodaje', !!rodaje);
    setTop(g.titulo, c ? c.nombre : '', rodaje ? null : () => go({ cuenta: g.cuenta_id }));
    if (rodaje) { $('#brandLink').onclick = e => e.preventDefault(); $('#homeLink').hidden = true; }
    const e = g.estructura || {};
    const items = {}; (e.momentos || []).forEach(m => { items[m.id] = m; });
    let tab = 'loc';
    app.innerHTML = '';

    const bar = h('i'), countEl = h('b'), resetArea = h('div', { class: 'gui-reset' });
    const checksOf = () => g.checks || {};
    function updProgress() {
      const m = metricas(g);
      bar.style.width = m.pct + '%';
      countEl.textContent = `${m.hechos} de ${m.total} tomas`;
    }
    function drawReset() {
      resetArea.innerHTML = '';
      resetArea.append(h('button', { type: 'button', class: 'btn small ghost', onclick: () => {
        resetArea.innerHTML = '';
        resetArea.append(h('span', null, '¿Desmarcar todo?'),
          h('button', { type: 'button', class: 'btn small danger', onclick: async () => {
            const ids = Object.keys(checksOf());
            for (const id of ids) { try { g.checks = await db.check(g.id, id, false); } catch (x) { /* sigue */ } }
            g.checks = {}; syncCards(); updProgress(); drawReset(); toast('Checklist reiniciado');
          } }, 'Sí'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: drawReset }, 'No'));
      } }, 'Reiniciar'));
    }

    function card(m) {
      const t = TIPOS[m.tipo] || TIPOS.apoyo, p = pal(t.color), done = !!checksOf()[m.id];
      const el = h('article', { class: 'gui-card' + (done ? ' done' : ''), 'data-id': m.id, style: { '--ac': p.ac, '--bg-c': p.bg, '--bd-c': p.bd } },
        h('div', { class: 'gui-num' }, m.numero || '—'),
        h('div', { class: 'gui-body' },
          h('div', { class: 'gui-ttl' }, m.titulo),
          h('div', { class: 'gui-tag' }, [t.label, m.plano].filter(Boolean).join(' · ')),
          m.locacion ? h('div', { class: 'gui-meta' }, m.locacion) : null,
          m.cita ? h('div', { class: 'gui-quote' }, '“' + m.cita + '”') : null,
          m.texto ? h('div', { class: 'gui-txt' }, m.texto) : null,
          m.nota ? h('div', { class: 'gui-note' }, m.nota) : null,
          rodaje ? null : h('button', { type: 'button', class: 'gui-edit', 'aria-label': 'Editar toma', onclick: ev => { ev.stopPropagation(); editarToma(m); } }, icon('edit'))),
        h('label', { class: 'gui-check', onclick: ev => ev.stopPropagation() },
          h('input', { type: 'checkbox', checked: done, 'aria-label': 'Marcar ' + m.titulo, onchange: ev => marcar(m.id, ev.target.checked) }),
          h('span', null, icon('check'))));
      el.addEventListener('click', () => { const cb = el.querySelector('input'); cb.checked = !cb.checked; marcar(m.id, cb.checked); });
      return el;
    }
    async function marcar(id, valor) {
      g.checks = Object.assign({}, checksOf()); if (valor) g.checks[id] = true; else delete g.checks[id];
      syncCards(); updProgress();
      if (valor && navigator.vibrate) navigator.vibrate(8);
      try { const r = await db.check(g.id, id, valor); if (r) g.checks = r; }
      catch (x) { console.error(x); toast('No se guardó la marca. Revisa la conexión.'); }
    }
    function syncCards() {
      app.querySelectorAll('.gui-card').forEach(el => {
        const d = !!checksOf()[el.dataset.id];
        el.classList.toggle('done', d); el.querySelector('input').checked = d;
      });
      app.querySelectorAll('.gui-sec').forEach(sec => {
        const ids = sec.dataset.ids.split(','), n = ids.filter(id => checksOf()[id]).length;
        sec.querySelector('.gui-sec-n').textContent = `${n}/${ids.length}`;
        sec.classList.toggle('complete', n === ids.length);
      });
    }

    function editarToma(m) {
      const f = Object.assign({}, m);
      const fld = (k, label, area) => { const el = h(area ? 'textarea' : 'input', { class: area ? 'area' : 'field', id: 'gt-' + k, rows: area ? 2 : null, oninput: ev => { f[k] = ev.target.value; } }); el.value = f[k] || ''; return lbl(label, 'gt-' + k, el, true); };
      const tipos = h('div', { class: 'fin-cats' }, Object.entries(TIPOS).map(([k, t]) => h('button', { type: 'button', class: 'fin-cat', 'aria-checked': f.tipo === k ? 'true' : 'false', style: pv(pal(t.color)),
        onclick: ev => { f.tipo = k; tipos.querySelectorAll('.fin-cat').forEach(b => b.setAttribute('aria-checked', b === ev.currentTarget ? 'true' : 'false')); } }, t.label)));
      const save = h('button', { type: 'button', class: 'btn primary huge', onclick: async () => {
        busy(save, 'Guardando…');
        const est = JSON.parse(JSON.stringify(g.estructura));
        const i = est.momentos.findIndex(x => x.id === m.id); est.momentos[i] = f;
        try { g = await db.update('guiones', g.id, { estructura: est }); closeSheet(); toast('Toma actualizada'); viewGuion(g.id, false); }
        catch (x) { console.error(x); toast('No se pudo guardar'); unbusy(save); }
      } }, 'Guardar');
      const quitar = h('button', { type: 'button', class: 'btn ghost danger', style: { marginRight: 'auto' }, onclick: async () => {
        const est = JSON.parse(JSON.stringify(g.estructura));
        est.momentos = est.momentos.filter(x => x.id !== m.id);
        est.bloques = (est.bloques || []).map(b => Object.assign(b, { ids: b.ids.filter(x => x !== m.id) })).filter(b => b.ids.length);
        try { g = await db.update('guiones', g.id, { estructura: est }); if (checksOf()[m.id]) await db.check(g.id, m.id, false); closeSheet(); toast('Toma quitada'); viewGuion(g.id, false); }
        catch (x) { toast('No se pudo quitar'); }
      } }, 'Quitar toma');
      openSheet('Editar toma', null, h('div', { class: 'stack' }, h('div', null, h('span', { class: 'label' }, 'Tipo'), tipos),
        h('div', { class: 'grid2' }, fld('numero', 'Número'), fld('titulo', 'Título')), fld('plano', 'Plano'), fld('locacion', 'Locación'),
        fld('cita', 'Frase (entrevistas)', true), fld('texto', 'Qué pasa', true), fld('nota', 'Nota de producción', true)),
        [quitar, h('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Cancelar'), save], TIPOS[f.tipo] ? TIPOS[f.tipo].color : 'azul');
    }

    const m0 = metricas(g);
    const lemaEl = e.lema ? h('p', { class: 'gui-lema' }) : null;
    if (lemaEl) {
      const hl = (e.lema_resaltado || '').trim(), i = hl ? e.lema.indexOf(hl) : -1;
      if (i >= 0) lemaEl.append(e.lema.slice(0, i), h('mark', null, hl), e.lema.slice(i + hl.length)); else lemaEl.textContent = e.lema;
    }
    const enlace = location.origin + location.pathname + '?g=' + g.id + '&rodaje';
    const content = h('div', { class: 'gui-sheetlist' });
    function drawTab() {
      content.innerHTML = '';
      const enBloque = new Set((e.bloques || []).flatMap(b => b.ids));
      const sueltas = (e.momentos || []).filter(m => !enBloque.has(m.id)).map(m => m.id);
      const bloques = (e.bloques || []).concat(sueltas.length ? [{ nombre: 'Otras tomas', descripcion: 'Sin ubicación asignada.', ids: sueltas }] : []);
      if (tab === 'loc') bloques.forEach(b => {
        const ids = b.ids.filter(id => items[id]);
        content.append(h('section', { class: 'gui-sec', 'data-ids': ids.join(',') },
          h('div', { class: 'gui-sec-h' }, h('div', null, h('h3', null, b.nombre), b.descripcion ? h('p', null, b.descripcion) : null), h('span', { class: 'gui-sec-n' })),
          ids.map(id => card(items[id]))));
      });
      else content.append(h('section', { class: 'gui-sec', 'data-ids': (e.momentos || []).filter(m => m.en_video).map(m => m.id).join(',') },
        h('div', { class: 'gui-sec-h' }, h('div', null, h('h3', null, 'Orden del video'), h('p', null, 'Como queda en el corte final.')), h('span', { class: 'gui-sec-n' })),
        (e.momentos || []).filter(m => m.en_video).map(card)));
      syncCards();
    }
    const tabs = h('div', { class: 'seg gui-tabs', role: 'tablist' }, [['loc', 'Por ubicación'], ['video', 'Orden del video']].map(([k, l]) =>
      h('button', { type: 'button', role: 'tab', 'aria-pressed': tab === k ? 'true' : 'false', onclick: ev => { tab = k; tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === ev.currentTarget ? 'true' : 'false')); drawTab(); } }, l)));

    app.append(
      h('header', { class: 'gui-hero' },
        rodaje ? null : h('button', { type: 'button', class: 'gui-back', onclick: () => go({ cuenta: g.cuenta_id }) }, '‹ ' + (c ? c.nombre : 'Cuenta')),
        h('p', { class: 'gui-kicker' }, ['Guion de rodaje', e.cliente || (c && c.nombre)].filter(Boolean).join(' · ')),
        h('h1', null, g.titulo),
        lemaEl,
        rodaje ? null : h('div', { class: 'gui-row' },
          h('button', { type: 'button', class: 'btn primary', onclick: async () => { try { await navigator.clipboard.writeText(enlace); toast('Enlace de rodaje copiado'); } catch (x) { toast('Copia el enlace: ' + enlace); } } }, icon('link'), 'Copiar enlace de rodaje'),
          h('button', { type: 'button', class: 'btn', onclick: () => go({ g: g.id, editar: '' }) }, icon('edit'), 'Editar guion'),
          h('button', { type: 'button', class: 'btn ghost', onclick: async () => { try { await db.update('guiones', g.id, { archivado: true }); toast('Guion archivado'); go({ cuenta: g.cuenta_id }); } catch (x) { toast('No se pudo archivar'); } } }, icon('archive'), 'Archivar'))),
      h('div', { class: 'gui-stats' }, [[m0.escenas, 'escenas', 'azul'], [m0.entrevistas, 'entrevistas', 'rosa'], [m0.locaciones, 'locaciones', 'verde'], [m0.protagonistas, 'protagonistas', 'violeta']].map(([n, l, col]) => h('div', { class: 'gui-stat', style: pv(pal(col)) }, h('b', null, n), h('span', null, l)))),
      (e.reglas || []).length ? h('section', { class: 'gui-rules' }, h('h2', null, 'Indicaciones de rodaje'), (e.reglas || []).map(r => h('div', { class: 'gui-rule' + (r.evitar ? ' avoid' : '') }, h('b', null, r.titulo), h('span', null, r.texto)))) : null,
      h('div', { class: 'gui-sticky' }, h('div', { class: 'gui-progress' }, h('span', { class: 'gui-bar big' }, bar), countEl, resetArea), tabs),
      content,
      h('footer', { class: 'gui-foot' }, h('span', { class: 'brg-mark' }, 'BRANDGO™'), h('span', null, ['Guion de rodaje', e.cliente].filter(Boolean).join(' · '))));
    drawReset(); drawTab(); updProgress();

    // Avance en vivo: si otra persona marca una casilla, se ve aquí al instante
    stopLive = db.escuchar(g.id, nuevo => { if (nuevo && nuevo.checks) { g.checks = nuevo.checks; syncCards(); updProgress(); } });
  }

  /* ---------------- Inicio ---------------- */
  $('#brandLogo').src = A.logo;
  route();
})();
