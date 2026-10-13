/* Creador de cuentas de cobro — Brandgo
   Wizard de preguntas → documento tamaño carta o A4 (mismo lenguaje visual del cotizador) → PDF descargable. */
(function () {
  'use strict';
  const { A, PALETTES, TEAM, h, fmtMoney, marks, palVars, clean, autosize, store, toast, deliver, valorEnLetras } = window.BG;
  const $ = s => document.querySelector(s);

  const KEY = 'brandgo-cobro-v1';          // borrador actual
  const KEY_EMISOR = 'brandgo-cobro-emisor'; // cobrador, pago, firma y ciudad (se reutilizan en cada cuenta)
  const KEY_PLANES = 'brandgo-planes';       // planes de marketing guardados
  const KEY_CLIENTES = 'brandgo-clientes';   // clientes guardados
  const KEY_ULTIMO = 'brandgo-cobro-ultimo'; // último consecutivo emitido

  /* ---------------- Tipos de servicio ---------------- */
  const TIPOS = {
    marketing:  { label: 'Marketing mensual', color: 'azul', desc: 'Plan mensual: nombre, qué trae y precio.', team: 'all', q: '¿Qué [plan] tiene el cliente?' },
    diseno:     { label: 'Diseño', color: 'verde', desc: 'Una pieza o proyecto de diseño gráfico.', team: ['juca'], q: '¿Qué [diseño] se cobra?' },
    produccion: { label: 'Producción', color: 'naranja', desc: 'Fotografía, video o producción audiovisual.', team: ['mauro'], q: '¿Qué [producción] se cobra?' },
    campana:    { label: 'Campaña de marketing', color: 'rosa', desc: 'Entregables de la campaña y su precio.', team: 'all', q: '¿Qué incluye la [campaña]?' },
    otro:       { label: 'Otro servicio', color: 'violeta', desc: 'Formulario abierto: tú defines qué trae.', team: 'auto', q: '¿Qué [servicio] se cobra?' }
  };
  const STRATEGISTS = ['camilo', 'laura', 'malu'];
  const ALL = TEAM.map(t => t.id);

  let _id = Date.now() % 100000;
  const uid = () => 'c' + (++_id).toString(36);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const mesActual = () => { const s = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1).replace(' de ', ' '); };

  function newItem(tipo) {
    const base = { id: uid(), tipo, titulo: '', descripcion: '', incluye: [], entregables: [], periodo: '', precio: 0, equipo: null };
    if (tipo === 'marketing') Object.assign(base, { incluye: [''], periodo: mesActual() });
    if (tipo === 'campana') Object.assign(base, { entregables: [{ id: uid(), cantidad: 1, nombre: '' }] });
    if (tipo === 'otro') Object.assign(base, { incluye: [] });
    return base;
  }

  function nextNumber() { const n = (Number(store.get(KEY_ULTIMO, 0)) || 0) + 1; return 'CC-' + String(n).padStart(4, '0'); }

  function defaultEmisor() {
    return {
      ciudad: '',
      emisor: { nombre: '', tipoId: 'C.C.', id: '', direccion: '', telefono: '', correo: '' },
      pago: { banco: '', tipoCuenta: 'Ahorros', numero: '', titular: '', otros: '' },
      firma: { nombre: '', id: '', imagen: '' }
    };
  }

  function freshState(withExample) {
    const em = store.get(KEY_EMISOR, null) || defaultEmisor();
    const item = newItem('marketing');
    if (withExample) Object.assign(item, {
      titulo: 'Plan Crecimiento (ejemplo)',
      incluye: ['Estrategia y cronograma de contenidos.', '8 publicaciones al mes entre reels y carruseles.', 'Copywriting para cada publicación.', 'Gestión y publicación del contenido.', 'Informe mensual de resultados.'],
      precio: 2500000
    });
    return {
      v: 1, titulo: 'Cuenta de cobro', numero: nextNumber(), ciudad: em.ciudad, fecha: today(),
      emisor: em.emisor, pago: em.pago, firma: em.firma,
      cliente: withExample ? { nombre: 'Florentino', tipoId: 'NIT', id: '', direccion: '', contacto: '' } : { nombre: '', tipoId: 'NIT', id: '', direccion: '', contacto: '' },
      concepto: '', items: [item], moneda: 'COP', nota: '', formato: 'carta', paso: 'encabezado'
    };
  }

  let S = store.get(KEY, null);
  if (!S || S.v !== 1) S = freshState(true);

  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      store.set(KEY, S);
      store.set(KEY_EMISOR, { ciudad: S.ciudad, emisor: S.emisor, pago: S.pago, firma: S.firma });
    }, 250);
    schedulePreview();
    $('#topClient').textContent = S.numero + ' · ' + (S.cliente.nombre || 'Sin cliente');
  }

  const total = () => S.items.reduce((n, it) => n + (Number(it.precio) || 0), 0);
  const pal = it => PALETTES[TIPOS[it.tipo].color];
  const fechaLarga = f => { if (!f) return ''; const d = new Date(f + 'T12:00:00'); return isNaN(d) ? f : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }); };

  function teamFor(it) {
    if (Array.isArray(it.equipo)) return it.equipo;
    const t = TIPOS[it.tipo].team;
    if (t === 'all') return ALL;
    if (Array.isArray(t)) return t;
    const txt = [it.titulo, it.descripcion, ...(it.incluye || [])].join(' ').toLowerCase();
    const out = new Set();
    if (/estrateg|gesti|community|redes|copy|pauta|ads|contenido|asesor/.test(txt)) STRATEGISTS.forEach(x => out.add(x));
    if (/diseñ|disen|gráfic|grafic|logo|identidad|ilustr/.test(txt)) out.add('juca');
    if (/foto|video|audiovisual|producci|grabaci|direcci|edici/.test(txt)) out.add('mauro');
    return out.size ? [...out] : ALL;
  }
  const teamLabel = ids => ids.length === ALL.length ? 'Todo el equipo Brandgo' : ids.map(id => TEAM.find(t => t.id === id).nombre).join(' · ');

  /* =====================================================================
     DOCUMENTO
     ===================================================================== */
  const FORMATS = { carta: { w: 816, h: 1056, pdf: 'letter', label: 'Carta' }, a4: { w: 794, h: 1123, pdf: 'a4', label: 'A4' } };
  const stage = $('#stage');
  const v = (txt, ph) => (String(txt || '').trim() ? h('span', null, txt) : h('span', { class: 'ph' }, ph));

  function blocks() {
    const out = [];
    const cur = S.moneda;
    // Encabezado
    out.push(h('div', null,
      h('div', { class: 'd-head' },
        h('div', { class: 'd-brand' }, h('img', { src: A.logo, alt: '' }), h('span', null, 'BRANDGO')),
        h('div', { class: 'd-num' }, h('span', { class: 'pill' }, 'N.º ', v(S.numero, 'CC-0000')),
          h('small', null, v(S.ciudad, 'Ciudad'), ', ', v(fechaLarga(S.fecha), 'fecha')))),
      h('h1', { class: 'd-title', style: { marginTop: '22px' } }, S.titulo || 'Cuenta de cobro')));
    // Partes
    const c = S.cliente, e = S.emisor;
    out.push(h('div', { class: 'd-parties' },
      h('div', { class: 'd-card' }, h('div', { class: 'lb' }, 'Cliente'),
        h('div', { class: 'nm' }, v(c.nombre, 'Nombre o razón social del cliente')),
        h('div', { class: 'ln' }, (c.tipoId || 'NIT') + ' ', v(c.id, '000.000.000-0')),
        c.direccion ? h('div', { class: 'ln' }, c.direccion) : null,
        c.contacto ? h('div', { class: 'ln' }, c.contacto) : null),
      h('div', { class: 'd-card' }, h('div', { class: 'lb' }, 'Debe a'),
        h('div', { class: 'nm' }, v(e.nombre, 'Nombre o razón social de quien cobra')),
        h('div', { class: 'ln' }, (e.tipoId || 'C.C.') + ' ', v(e.id, '0.000.000.000')),
        e.direccion ? h('div', { class: 'ln' }, e.direccion) : null,
        (e.telefono || e.correo) ? h('div', { class: 'ln' }, [e.telefono, e.correo].filter(Boolean).join(' · ')) : null)));
    // La suma de
    out.push(h('div', { class: 'd-sum' },
      h('div', { class: 'lb' }, 'La suma de'),
      h('div', { class: 'amt' }, h('b', null, '$' + fmtMoney(total())), h('span', null, cur)),
      h('div', { class: 'words' }, valorEnLetras(total(), cur))));
    // Por concepto de + servicios
    S.items.forEach((it, i) => {
      const card = itemCard(it);
      if (i === 0) out.push(h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('div', { class: 'd-label' }, 'Por concepto de'),
        S.concepto.trim() ? h('div', { class: 'd-concept', style: { marginTop: 0 } }, S.concepto.trim()) : null, card));
      else out.push(card);
    });
    if (S.items.length > 1) out.push(h('div', { class: 'd-total' }, h('span', null, 'Total a pagar'), h('b', null, '$' + fmtMoney(total()), h('span', { class: 'cur' }, cur))));
    // Pago
    const p = S.pago;
    const payCells = [['Entidad', p.banco, 'Banco'], ['Tipo de cuenta', p.tipoCuenta, 'Ahorros'], ['Número de cuenta', p.numero, '000-000000-00'], ['Titular', p.titular || e.nombre, 'Titular']];
    out.push(h('div', { class: 'd-card', style: { background: '#fff' } },
      h('div', { class: 'lb', style: { marginBottom: '8px' } }, 'Datos de pago'),
      h('div', { class: 'd-pay' }, payCells.map(([lb, val, ph]) => h('div', null, h('div', { class: 'lb' }, lb), h('div', { class: 'vl' }, v(val, ph))))),
      p.otros ? h('div', { class: 'ln', style: { marginTop: '8px' } }, 'Otros medios: ' + p.otros) : null));
    if (S.nota.trim()) out.push(h('div', { class: 'd-note' }, S.nota.trim()));
    // Firma
    const f = S.firma;
    out.push(h('div', { class: 'd-sign', style: { marginTop: '8px' } },
      h('div', { class: 'att' }, 'Atentamente,'),
      h('div', { class: 'img' }, f.imagen ? h('img', { src: f.imagen, alt: 'Firma' }) : null),
      h('div', { class: 'line' }, h('b', null, v(f.nombre || e.nombre, 'Nombre de quien firma')),
        h('small', null, 'C.C. ', v(f.id || (e.tipoId === 'C.C.' ? e.id : ''), '0.000.000.000')))));
    return out;
  }

  function itemCard(it) {
    const p = pal(it), tipo = TIPOS[it.tipo];
    const inc = clean(it.incluye);
    const team = teamFor(it);
    const titlePh = { marketing: 'Nombre del plan', diseno: 'Nombre del trabajo de diseño', produccion: 'Nombre de la producción', campana: 'Nombre de la campaña', otro: 'Nombre del servicio' }[it.tipo];
    let list = null;
    if (inc.length > 5) {
      const half = Math.ceil(inc.length / 2);
      list = h('div', { class: 'ul2' }, [inc.slice(0, half), inc.slice(half)].map(part => h('ul', null, part.map(t => h('li', null, t)))));
    } else if (inc.length) list = h('ul', null, inc.map(t => h('li', null, t)));
    const ents = (it.entregables || []).filter(d => (d.nombre || '').trim());
    return h('div', { class: 'd-item', style: { '--ac': p.ac, '--bg': p.bg, '--bd': p.bd, '--ln': p.ln } },
      h('div', { class: 'top' }, h('span', { class: 'ty' }, tipo.label + (it.tipo === 'marketing' ? ' · Plan' : '')), it.periodo ? h('span', { class: 'pe' }, 'Periodo: ' + it.periodo) : null),
      h('h4', null, v(it.titulo, titlePh)),
      (it.descripcion || '').trim() ? h('div', { class: 'ds' }, it.descripcion.trim()) : null,
      ents.length ? h('div', { class: 'dl' }, ents.map(d => h('div', null, String(d.cantidad || '').trim() ? h('b', null, d.cantidad) : null, d.nombre))) : null,
      list,
      h('div', { class: 'bot' },
        h('div', { class: 'av' }, team.map(id => h('img', { src: A.equipo[id], alt: '' })), h('small', null, teamLabel(team))),
        h('div', { class: 'pr' }, '$' + fmtMoney(it.precio), h('span', { class: 'cur' }, S.moneda))));
  }

  function newPage(fmt, n, compact) {
    const page = h('div', { class: 'page' + (compact ? ' compact' : ''), style: { width: fmt.w + 'px', height: fmt.h + 'px' } });
    const inner = h('div', { class: 'page-in' });
    const contact = [S.emisor.telefono, S.emisor.correo].filter(Boolean).join(' · ');
    const ct = h('div', { class: 'ct' }, contact);
    page.append(inner, h('div', { class: 'pfoot' }, h('div', { class: 'mk', html: 'BRANDGO<sup>™</sup>' }), ct, h('div', { class: 'sl' }, 'Creatividad Sin Permiso')));
    stage.append(page);
    return { page, inner, ct, n };
  }

  let PAGES = [];
  // Intenta primero el diseño normal; si no cabe en una hoja, prueba la versión compacta.
  function buildPages() {
    const a = paginate(false);
    if (a.length > 1) { const b = paginate(true); if (b.length < a.length) return b; return paginate(false); }
    return a;
  }
  function paginate(compact) {
    stage.innerHTML = '';
    const fmt = FORMATS[S.formato] || FORMATS.carta;
    const pages = [newPage(fmt, 1, compact)];
    for (const b of blocks()) {
      let cur = pages[pages.length - 1];
      cur.inner.append(b);
      if (cur.inner.scrollHeight > cur.inner.clientHeight + 1 && cur.inner.children.length > 1) {
        b.remove();
        cur = newPage(fmt, pages.length + 1, compact);
        cur.inner.append(h('div', { class: 'd-head' }, h('div', { class: 'd-brand' }, h('img', { src: A.logo, alt: '', style: { width: '28px', height: '28px' } }), h('span', { style: { fontSize: '15px' } }, 'BRANDGO')),
          h('div', { class: 'd-num' }, h('span', { class: 'pill' }, (S.titulo || 'Cuenta de cobro') + ' · N.º ' + S.numero))));
        cur.inner.append(b);
        pages.push(cur);
      }
    }
    if (pages.length > 1) pages.forEach(p => { p.ct.textContent = (p.ct.textContent ? p.ct.textContent + '   ·   ' : '') + 'Página ' + p.n + ' de ' + pages.length; });
    PAGES = pages.map(p => p.page);
    return PAGES;
  }

  /* ---------------- Vista previa ---------------- */
  let pvT;
  function schedulePreview() { clearTimeout(pvT); pvT = setTimeout(renderAside, 140); }
  function mountScaled(box, el, fmt) {
    const clone = el.cloneNode(true);
    clone.style.position = 'absolute'; clone.style.left = '0'; clone.style.top = '0'; clone.style.transformOrigin = '0 0';
    box.innerHTML = ''; box.append(clone);
    const fit = () => { clone.style.transform = `scale(${box.clientWidth / fmt.w})`; };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
  }
  function renderAside() {
    const pages = buildPages();
    const fmt = FORMATS[S.formato] || FORMATS.carta;
    const host = $('#asideIn'); host.innerHTML = '';
    host.append(h('div', { class: 'pv-head' }, h('b', null, `Vista previa · ${fmt.label} · ${pages.length} ${pages.length === 1 ? 'página' : 'páginas'}`)));
    const grid = h('div', { class: 'stack', style: { gap: '14px' } });
    pages.forEach(pg => {
      const box = h('div', { class: 'pv doc', style: { aspectRatio: fmt.w + ' / ' + fmt.h } });
      grid.append(box);
      setTimeout(() => mountScaled(box, pg, fmt), 0);
    });
    host.append(grid);
  }

  /* =====================================================================
     WIZARD
     ===================================================================== */
  const STEPS = [
    { key: 'encabezado', label: 'Encabezado' }, { key: 'cobrador', label: 'Quién cobra' }, { key: 'cliente', label: 'Cliente' },
    { key: 'servicios', label: 'Servicios' }, { key: 'pago', label: 'Datos de pago' }, { key: 'firma', label: 'Firma' }, { key: 'descargar', label: 'Descargar' }
  ];
  const idx = () => Math.max(0, STEPS.findIndex(s => s.key === S.paso));
  function go(key) { S.paso = key; save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function renderSteps() {
    const ci = idx(), nav = $('#steps'); nav.innerHTML = '';
    STEPS.forEach((s, i) => nav.append(h('button', { type: 'button', class: 'step-pill' + (i === ci ? ' active' : '') + (i < ci ? ' done' : ''), onclick: () => go(s.key), 'aria-current': i === ci ? 'step' : null },
      h('i', null, i < ci ? '✓' : i + 1), s.label)));
    const a = nav.querySelector('.active'); if (a) a.scrollIntoView({ block: 'nearest', inline: 'center' });
    $('#stepCount').textContent = `Paso ${ci + 1} de ${STEPS.length}`;
    $('#progressBar').style.width = ((ci + 1) / STEPS.length * 100) + '%';
    $('#prevBtn').disabled = ci === 0;
    $('#nextBtn').hidden = ci === STEPS.length - 1;
    $('#nextBtn').textContent = ci === STEPS.length - 2 ? 'Revisar y descargar →' : 'Siguiente →';
  }

  /* ---------- Componentes de formulario ---------- */
  let focusAfter = null;
  function field(label, obj, key, opts) {
    opts = opts || {};
    const id = 'f-' + (opts.id || key);
    const el = opts.area ? h('textarea', { class: 'area', id, rows: opts.rows || 3, placeholder: opts.placeholder || '' })
      : h('input', { class: 'field' + (opts.big ? ' big' : ''), id, type: opts.type || 'text', placeholder: opts.placeholder || '', inputmode: opts.inputmode || null, autocomplete: opts.autocomplete || 'off' });
    el.value = obj[key] || '';
    el.addEventListener('input', e => { obj[key] = e.target.value; if (opts.area) autosize(e.target); if (opts.onInput) opts.onInput(e.target.value); save(); });
    return h('div', null, h('label', { class: 'label', for: id }, label, opts.optional ? h('span', { style: { color: 'var(--ink-3)', fontWeight: 500 } }, ' · opcional') : null), el);
  }
  function select(label, obj, key, options, id) {
    const el = h('select', { class: 'select', id: 'f-' + id, onchange: e => { obj[key] = e.target.value; save(); } }, options.map(o => h('option', { value: o, selected: obj[key] === o }, o)));
    return h('div', null, h('label', { class: 'label', for: 'f-' + id }, label), el);
  }
  function block(title, hint, ...content) {
    return h('div', { class: 'block' }, h('div', { class: 'block-h' }, h('h3', null, title), hint ? h('span', { class: 'hint' }, hint) : null), ...content);
  }
  function question(eyebrow, q, help, vars) {
    return [h('div', { class: 'eyebrow', style: vars }, eyebrow), h('h1', { class: 'q', style: vars, html: marks(q) }), help ? h('p', { class: 'help' }, help) : null];
  }
  function priceInput(it) {
    const inp = h('input', { type: 'text', inputmode: 'numeric', id: 'pr-' + it.id, 'aria-label': 'Precio', oninput: e => {
      const d = e.target.value.replace(/[^\d]/g, '').slice(0, 13); it.precio = Number(d || 0); e.target.value = d ? fmtMoney(d) : ''; save(); updateTotalBar();
    } });
    inp.value = it.precio ? fmtMoney(it.precio) : '';
    return h('div', null, h('label', { class: 'label', for: 'pr-' + it.id }, 'Precio'), h('div', { class: 'money small' }, h('span', null, '$'), inp, h('span', { style: { fontSize: '15px', fontWeight: 700 } }, S.moneda)));
  }
  function bulletEditor(arr, key, placeholder, addLabel) {
    if (!arr.length) arr.push('');
    const wrap = h('div', { class: 'bullets' });
    arr.forEach((val, i) => {
      const ta = h('textarea', {
        rows: 1, 'data-k': key + ':' + i, placeholder, 'aria-label': placeholder + ' ' + (i + 1),
        oninput: e => { arr[i] = e.target.value; autosize(e.target); save(); },
        onkeydown: e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const pos = e.target.selectionStart; const val0 = arr[i]; arr[i] = val0.slice(0, pos); arr.splice(i + 1, 0, val0.slice(pos)); focusAfter = key + ':' + (i + 1); save(); renderPanel(); }
          if (e.key === 'Backspace' && !e.target.value && arr.length > 1) { e.preventDefault(); arr.splice(i, 1); focusAfter = key + ':' + Math.max(0, i - 1) + ':end'; save(); renderPanel(); }
        },
        onpaste: e => {
          const txt = (e.clipboardData || window.clipboardData).getData('text');
          if (!/\n/.test(txt)) return;
          e.preventDefault();
          const lines = txt.split(/\r?\n/).map(l => l.replace(/^\s*([*\-•·▪◦]|\d+[.)])\s*/, '').trim()).filter(Boolean);
          const had = arr[i].trim();
          if (had) arr.splice(i + 1, 0, ...lines); else arr.splice(i, 1, ...lines);
          focusAfter = key + ':' + (i + lines.length - (had ? 0 : 1)) + ':end'; save(); renderPanel();
        }
      });
      ta.value = val;
      wrap.append(h('div', { class: 'bl' }, h('span', { class: 'dot' }), ta,
        h('button', { type: 'button', class: 'x', 'aria-label': 'Quitar', title: 'Quitar', onclick: () => { arr.splice(i, 1); if (!arr.length) arr.push(''); save(); renderPanel(); } }, '×')));
    });
    return h('div', { class: 'stack', style: { gap: '8px' } }, wrap,
      h('button', { type: 'button', class: 'add-line', onclick: () => { arr.push(''); focusAfter = key + ':' + (arr.length - 1); save(); renderPanel(); } }, '+ ' + addLabel));
  }

  /* ---------- Pasos ---------- */
  function stepEncabezado() {
    return [
      ...question('Cuenta de cobro', 'Empecemos por el [encabezado]', 'El número es consecutivo: se sugiere solo y avanza cada vez que descargas una cuenta. Puedes cambiarlo si lo necesitas.'),
      h('div', { class: 'stack' },
        block('Documento', null,
          field('Título del documento', S, 'titulo', { big: true, placeholder: 'Cuenta de cobro' }),
          h('div', { class: 'grid2' },
            field('Número de cuenta de cobro', S, 'numero', { placeholder: 'CC-0001' }),
            field('Ciudad de expedición', S, 'ciudad', { placeholder: 'Ej. Medellín' }),
            field('Fecha de expedición', S, 'fecha', { type: 'date' }))))
    ];
  }

  function stepCobrador() {
    const e = S.emisor;
    return [
      ...question('Quién cobra', '¿Quién emite la [cuenta de cobro]?', 'Datos de la persona o empresa que cobra. Se guardan en este navegador para la próxima cuenta.'),
      h('div', { class: 'stack' },
        block('Cobrador', null,
          field('Nombre completo o razón social', e, 'nombre', { big: true, id: 'em-nombre', placeholder: 'Ej. Brandgo S.A.S.', autocomplete: 'organization' }),
          h('div', { class: 'grid2' }, select('Tipo de documento', e, 'tipoId', ['C.C.', 'NIT', 'C.E.'], 'em-tipo'), field('Número de documento', e, 'id', { id: 'em-id', inputmode: 'numeric' }))),
        block('Contacto', null,
          field('Dirección', e, 'direccion', { id: 'em-dir', autocomplete: 'street-address' }),
          h('div', { class: 'grid2' }, field('Teléfono', e, 'telefono', { id: 'em-tel', type: 'tel', autocomplete: 'tel' }), field('Correo electrónico', e, 'correo', { id: 'em-mail', type: 'email', autocomplete: 'email' }))))
    ];
  }

  function stepCliente() {
    const c = S.cliente;
    const saved = store.get(KEY_CLIENTES, []);
    const pick = saved.length ? block('Clientes guardados', saved.length + (saved.length === 1 ? ' cliente' : ' clientes'),
      h('div', { class: 'saved-row' },
        h('select', { class: 'select', id: 'f-cli-saved', 'aria-label': 'Elegir cliente guardado', onchange: e => { const s = saved[Number(e.target.value)]; if (s) { S.cliente = Object.assign({}, s); save(); renderPanel(); toast('Cliente cargado'); } } },
          h('option', { value: '' }, 'Elegir un cliente…'), saved.map((s, i) => h('option', { value: i }, s.nombre))))) : null;
    return [
      ...question('Cliente', '¿A quién le [cobramos]?', 'La persona o empresa que debe pagar. Los clientes se guardan solos cuando descargas el PDF.'),
      h('div', { class: 'stack' }, pick,
        block('Cliente', null,
          field('Nombre completo o razón social', c, 'nombre', { big: true, id: 'cli-nombre', placeholder: 'Ej. Florentino' }),
          h('div', { class: 'grid2' }, select('Tipo de documento', c, 'tipoId', ['NIT', 'C.C.', 'C.E.'], 'cli-tipo'), field('Número de documento', c, 'id', { id: 'cli-id' })),
          field('Dirección', c, 'direccion', { id: 'cli-dir', optional: true }),
          field('Contacto (persona, teléfono o correo)', c, 'contacto', { id: 'cli-contacto', optional: true })))
    ];
  }

  function itemEditor(it, i) {
    const p = pal(it), vars = palVars(p), tipo = TIPOS[it.tipo];
    const parts = [];
    const head = h('div', { class: 'item-h' }, h('span', { class: 'tag' }, tipo.label), h('span', { class: 'sp' }),
      h('button', { type: 'button', class: 'icon-btn', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { S.items.splice(i - 1, 0, S.items.splice(i, 1)[0]); save(); renderPanel(); } }, '↑'),
      h('button', { type: 'button', class: 'icon-btn', title: 'Bajar', 'aria-label': 'Bajar', disabled: i === S.items.length - 1, onclick: () => { S.items.splice(i + 1, 0, S.items.splice(i, 1)[0]); save(); renderPanel(); } }, '↓'),
      h('button', { type: 'button', class: 'icon-btn', title: 'Quitar servicio', 'aria-label': 'Quitar servicio', onclick: () => {
        head.replaceWith(h('div', { class: 'item-h' }, h('span', { class: 'confirm-row', style: { flex: 1 } }, '¿Quitar este servicio?'),
          h('button', { type: 'button', class: 'btn small danger', onclick: () => { S.items.splice(i, 1); save(); renderPanel(); } }, 'Quitar'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: renderPanel }, 'Cancelar')));
      } }, '✕'));
    parts.push(head);

    if (it.tipo === 'marketing') {
      const planes = store.get(KEY_PLANES, []);
      const match = planes.findIndex(pl => pl.titulo.trim().toLowerCase() === (it.titulo || '').trim().toLowerCase());
      parts.push(h('div', { class: 'saved-row' },
        h('select', { class: 'select', id: 'plan-' + it.id, 'aria-label': 'Elegir plan guardado', onchange: e => {
          const pl = planes[Number(e.target.value)]; if (!pl) return;
          Object.assign(it, { titulo: pl.titulo, incluye: pl.incluye.slice(), precio: pl.precio }); save(); renderPanel(); toast('Plan cargado: ' + pl.titulo);
        } }, h('option', { value: '' }, planes.length ? 'Elegir un plan guardado…' : 'Aún no hay planes guardados'), planes.map((pl, k) => h('option', { value: k }, pl.titulo + ' · $' + fmtMoney(pl.precio)))),
        h('button', { type: 'button', class: 'btn small', onclick: () => {
          if (!(it.titulo || '').trim()) { toast('Escribe el nombre del plan antes de guardarlo'); return; }
          const pl = { titulo: it.titulo.trim(), incluye: clean(it.incluye), precio: it.precio };
          if (match >= 0) planes[match] = pl; else planes.push(pl);
          store.set(KEY_PLANES, planes); renderPanel(); toast(match >= 0 ? 'Plan actualizado' : 'Plan guardado para próximas cuentas');
        } }, match >= 0 ? 'Actualizar plan guardado' : 'Guardar como plan'),
        match >= 0 ? h('button', { type: 'button', class: 'btn small ghost danger', onclick: () => { planes.splice(match, 1); store.set(KEY_PLANES, planes); renderPanel(); toast('Plan eliminado de la lista'); } }, 'Borrar de la lista') : null));
      parts.push(field('Título del plan', it, 'titulo', { big: true, id: 'tit-' + it.id, placeholder: 'Ej. Plan Crecimiento' }));
      parts.push(h('div', null, h('span', { class: 'label' }, '¿Qué trae el plan?'), bulletEditor(it.incluye, 'inc-' + it.id, 'Ej. 8 publicaciones al mes', 'Agregar lo que trae')));
    } else if (it.tipo === 'diseno' || it.tipo === 'produccion') {
      parts.push(field(it.tipo === 'diseno' ? 'Nombre del trabajo' : 'Nombre de la producción', it, 'titulo', { big: true, id: 'tit-' + it.id, placeholder: it.tipo === 'diseno' ? 'Ej. Diseño de menú digital' : 'Ej. Sesión de fotografía de producto' }));
      parts.push(field('Detalle del servicio prestado', it, 'descripcion', { area: true, rows: 3, id: 'desc-' + it.id, placeholder: it.tipo === 'diseno' ? 'Ej. Diseño de 1 menú digital estático para pantalla, con 2 rondas de ajustes.' : 'Ej. 20 fotografías editadas de producto y ambiente, en locación del cliente.' }));
    } else if (it.tipo === 'campana') {
      parts.push(field('Nombre de la campaña', it, 'titulo', { big: true, id: 'tit-' + it.id, placeholder: 'Ej. Campaña Temporada Navideña' }));
      const dl = h('div', { class: 'stack', style: { gap: '8px' } });
      it.entregables.forEach((d, k) => {
        const qty = h('input', { type: 'text', inputmode: 'numeric', value: d.cantidad, 'aria-label': 'Cantidad', oninput: e => { d.cantidad = e.target.value.replace(/[^\d]/g, '').slice(0, 3); e.target.value = d.cantidad; save(); } });
        const step = dv => { d.cantidad = Math.max(0, (parseInt(d.cantidad, 10) || 0) + dv); qty.value = d.cantidad; save(); };
        const name = h('input', { class: 'field', type: 'text', id: 'en-' + d.id, placeholder: 'Ej. Reels profesionales', 'aria-label': 'Entregable', oninput: e => { d.nombre = e.target.value; save(); } }); name.value = d.nombre;
        dl.append(h('div', { class: 'deliv-top' },
          h('div', { class: 'qty', style: vars }, h('button', { type: 'button', 'aria-label': 'Menos', onclick: () => step(-1) }, '−'), qty, h('button', { type: 'button', 'aria-label': 'Más', onclick: () => step(1) }, '+')),
          name, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Quitar entregable', title: 'Quitar', onclick: () => { it.entregables.splice(k, 1); save(); renderPanel(); } }, '✕')));
      });
      parts.push(h('div', null, h('span', { class: 'label' }, 'Entregables de la campaña'), dl,
        h('button', { type: 'button', class: 'add-line', style: { marginTop: '8px' }, onclick: () => { const d = { id: uid(), cantidad: 1, nombre: '' }; it.entregables.push(d); save(); renderPanel(); setTimeout(() => { const el = document.getElementById('en-' + d.id); if (el) el.focus(); }, 30); } }, '+ Agregar entregable')));
      parts.push(field('Descripción', it, 'descripcion', { area: true, rows: 2, id: 'desc-' + it.id, optional: true }));
    } else {
      parts.push(field('Nombre del servicio', it, 'titulo', { big: true, id: 'tit-' + it.id, placeholder: 'Ej. Estrategia de contenidos' }));
      parts.push(field('Detalle del servicio', it, 'descripcion', { area: true, rows: 2, id: 'desc-' + it.id, optional: true }));
      parts.push(it.incluye.length
        ? h('div', null, h('span', { class: 'label' }, '¿Qué incluye?'), bulletEditor(it.incluye, 'inc-' + it.id, 'Escribe un punto', 'Agregar punto'))
        : h('button', { type: 'button', class: 'add-line', onclick: () => { it.incluye.push(''); focusAfter = 'inc-' + it.id + ':0'; save(); renderPanel(); } }, '+ Agregar lista de lo que incluye'));
    }
    parts.push(h('div', { class: 'grid2' }, field('Periodo del trabajo', it, 'periodo', { id: 'per-' + it.id, optional: true, placeholder: it.tipo === 'marketing' ? 'Ej. Octubre 2026' : 'Ej. 1 al 15 de octubre' }), priceInput(it)));

    // Responsables (avatares)
    const auto = !Array.isArray(it.equipo);
    const chosen = teamFor(it);
    parts.push(h('div', { class: 'stack', style: { gap: '8px' } },
      h('label', { class: 'switch', style: vars }, h('input', { type: 'checkbox', checked: auto, onchange: e => { it.equipo = e.target.checked ? null : chosen.slice(); save(); renderPanel(); } }),
        'Responsables automáticos', h('span', { style: { color: 'var(--ink-3)', fontWeight: 500, fontSize: '13px' } }, '· ' + teamLabel(chosen))),
      auto ? null : h('div', { class: 'team', style: vars }, TEAM.map(t => h('button', {
        type: 'button', class: 'mate', 'aria-pressed': chosen.includes(t.id) ? 'true' : 'false',
        onclick: () => { const k = it.equipo.indexOf(t.id); if (k >= 0) { if (it.equipo.length > 1) it.equipo.splice(k, 1); } else it.equipo.push(t.id); save(); renderPanel(); }
      }, h('img', { src: A.equipo[t.id], alt: '' }), h('span', null, h('b', null, t.nombre), h('small', null, t.rol)))))));
    return h('div', { class: 'item', style: vars }, parts);
  }

  let totalBar;
  function updateTotalBar() { if (totalBar) totalBar.replaceWith(totalBar = makeTotalBar()); }
  function makeTotalBar() {
    return h('div', { class: 'total-bar' }, h('div', null, h('small', null, 'Total de la cuenta de cobro'), h('b', null, '$' + fmtMoney(total()) + ' ' + S.moneda)),
      h('small', { style: { maxWidth: '36ch' } }, valorEnLetras(total(), S.moneda)));
  }

  function stepServicios() {
    const types = h('div', { class: 'types' }, Object.entries(TIPOS).map(([k, t]) => h('button', {
      type: 'button', class: 'type-btn', style: palVars(PALETTES[t.color]),
      onclick: () => { const it = newItem(k); S.items.push(it); save(); renderPanel(); setTimeout(() => { const el = document.getElementById('f-tit-' + it.id); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }, 40); }
    }, h('b', null, '+ ' + t.label), h('small', null, t.desc))));
    const first = S.items[0];
    const q = S.items.length === 1 ? TIPOS[first.tipo].q : '¿Qué [servicios] se cobran?';
    totalBar = makeTotalBar();
    return [
      ...question('Servicios', q, 'Elige el tipo de servicio y completa sus datos. Si cobras varios, agrégalos: cada uno sale en su propia tarjeta de color.'),
      h('div', { class: 'stack' },
        S.items.map(itemEditor),
        block('Agregar un servicio', null, types),
        block('Concepto general', 'Opcional', field('Texto que va antes de los servicios', S, 'concepto', { area: true, rows: 2, placeholder: 'Ej. Servicios de marketing digital prestados durante octubre de 2026.' }),
          h('div', { class: 'grid2' }, select('Moneda', S, 'moneda', ['COP', 'USD', 'EUR', 'MXN'], 'moneda'))),
        totalBar)
    ];
  }

  function stepPago() {
    const p = S.pago;
    return [
      ...question('Datos de pago', '¿Dónde nos [pagan]?', 'Cuenta bancaria o medio digital. Se guardan en este navegador para las próximas cuentas.'),
      h('div', { class: 'stack' },
        block('Cuenta bancaria', null,
          h('div', { class: 'grid2' }, field('Entidad financiera', p, 'banco', { id: 'pg-banco', placeholder: 'Ej. Bancolombia' }), select('Tipo de cuenta', p, 'tipoCuenta', ['Ahorros', 'Corriente'], 'pg-tipo')),
          h('div', { class: 'grid2' }, field('Número de cuenta', p, 'numero', { id: 'pg-num', inputmode: 'numeric' }), field('Titular de la cuenta', p, 'titular', { id: 'pg-tit', optional: true, placeholder: S.emisor.nombre || 'Igual al cobrador' }))),
        block('Otros medios de pago', 'Opcional', field('Nequi, Daviplata, llave, enlace de pago…', p, 'otros', { id: 'pg-otros', placeholder: 'Ej. Nequi 300 000 0000' })),
        block('Nota al pie', 'Opcional', field('Texto pequeño al final del documento', S, 'nota', { area: true, rows: 2, id: 'nota', placeholder: 'Ej. Favor consignar antes del 30 de octubre.' })))
    ];
  }

  function trimCanvas(c) {
    const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
    let a = c.width, b = c.height, r = 0, t = 0;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 10) { a = Math.min(a, xx); b = Math.min(b, y); r = Math.max(r, xx); t = Math.max(t, y); }
    if (r <= a) return '';
    const o = document.createElement('canvas'); o.width = r - a + 8; o.height = t - b + 8;
    o.getContext('2d').drawImage(c, a - 4, b - 4, o.width, o.height, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }

  function stepFirma() {
    const f = S.firma;
    let pad;
    if (f.imagen) {
      pad = h('div', { class: 'stack', style: { gap: '10px' } },
        h('div', { style: { border: '1px solid var(--line)', borderRadius: '18px', padding: '16px', background: 'var(--paper)', display: 'flex', justifyContent: 'center' } }, h('img', { src: f.imagen, alt: 'Firma guardada', style: { maxHeight: '110px' } })),
        h('div', { class: 'sig-row' }, h('button', { type: 'button', class: 'btn small', onclick: () => { f.imagen = ''; save(); renderPanel(); } }, 'Firmar de nuevo')));
    } else {
      const c = h('canvas', { class: 'sig', 'aria-label': 'Espacio para firmar con el dedo o el mouse' });
      let drawing = false, dirty = false, ctx;
      const setup = () => { const r = c.getBoundingClientRect(); c.width = r.width * 2; c.height = r.height * 2; ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1d2a8a'; };
      const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      c.addEventListener('pointerdown', e => { if (!ctx) setup(); drawing = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); });
      c.addEventListener('pointermove', e => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); dirty = true; });
      c.addEventListener('pointerup', () => { drawing = false; });
      const fileIn = h('input', { type: 'file', accept: 'image/*', 'aria-label': 'Subir imagen de la firma', onchange: e => {
        const file = e.target.files[0]; if (!file) return;
        const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
          const k = Math.min(1, 600 / im.width); const cv = document.createElement('canvas'); cv.width = im.width * k; cv.height = im.height * k;
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); f.imagen = cv.toDataURL('image/png'); save(); renderPanel(); toast('Firma cargada');
        }; im.src = rd.result; }; rd.readAsDataURL(file);
      } });
      pad = h('div', { class: 'stack', style: { gap: '10px' } }, c,
        h('div', { class: 'sig-row' },
          h('button', { type: 'button', class: 'btn small primary', onclick: () => { if (!dirty) { toast('Dibuja tu firma en el recuadro'); return; } f.imagen = trimCanvas(c); save(); renderPanel(); toast('Firma guardada'); } }, 'Usar esta firma'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => { if (ctx) ctx.clearRect(0, 0, c.width, c.height); dirty = false; } }, 'Borrar'),
          h('span', { class: 'btn small file-btn' }, 'Subir imagen de firma', fileIn)));
    }
    return [
      ...question('Cierre', '¿Quién [firma]?', 'Firma con el dedo o el mouse, o sube una imagen de tu firma. Debajo va el nombre y la cédula.'),
      h('div', { class: 'stack' },
        block('Firma', null, pad),
        block('Debajo de la firma', null, h('div', { class: 'grid2' },
          field('Nombre', f, 'nombre', { id: 'fi-nombre', placeholder: S.emisor.nombre || 'Nombre completo' }),
          field('Cédula', f, 'id', { id: 'fi-id', inputmode: 'numeric', placeholder: S.emisor.tipoId === 'C.C.' ? S.emisor.id : '' }))))
    ];
  }

  function missing() {
    const m = [];
    if (!S.emisor.nombre.trim()) m.push(['Nombre de quien cobra', 'cobrador']);
    if (!S.emisor.id.trim()) m.push(['Documento de quien cobra', 'cobrador']);
    if (!S.cliente.nombre.trim()) m.push(['Nombre del cliente', 'cliente']);
    if (!S.cliente.id.trim()) m.push(['Documento del cliente', 'cliente']);
    if (!S.items.length) m.push(['Al menos un servicio', 'servicios']);
    S.items.forEach((it, i) => { if (!(it.titulo || '').trim()) m.push([`Nombre del servicio ${i + 1}`, 'servicios']); if (!it.precio) m.push([`Precio del servicio ${i + 1}`, 'servicios']); });
    if (!S.pago.numero.trim() && !S.pago.otros.trim()) m.push(['Datos de pago', 'pago']);
    if (!S.firma.imagen) m.push(['Firma', 'firma']);
    if (!S.ciudad.trim()) m.push(['Ciudad', 'encabezado']);
    return m;
  }

  function fileName() { return `Cuenta de cobro ${S.numero} - ${S.cliente.nombre || 'Cliente'}`.replace(/[\\/:*?"<>|]+/g, '') + '.pdf'; }

  function stepDescargar() {
    const status = h('div', { class: 'status', id: 'dlStatus' });
    const btn = h('button', { type: 'button', class: 'btn primary huge', id: 'dlBtn', onclick: () => exportPDF(btn, status) }, 'Descargar PDF');
    const m = missing();
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tamaño del papel' }, Object.entries(FORMATS).map(([k, f]) =>
      h('button', { type: 'button', 'aria-pressed': S.formato === k ? 'true' : 'false', onclick: () => { S.formato = k; save(); renderPanel(); } }, f.label)));
    return [
      ...question('Último paso', 'Cuenta [' + S.numero + '] lista', 'Revisa el documento. Si algo no cuadra, toca cualquier paso de arriba para corregirlo.'),
      h('div', { class: 'stack' },
        m.length ? block('Falta completar', m.length + (m.length === 1 ? ' dato' : ' datos'),
          h('div', { class: 'chips' }, m.map(([t, k]) => h('button', { type: 'button', class: 'add-chip', onclick: () => go(k) }, t + ' →')))) : null,
        makeTotalBar(),
        block('Archivo', null, h('div', null, h('span', { class: 'label' }, 'Tamaño del papel'), seg),
          h('div', { class: 'download' }, btn, status)),
        h('button', { type: 'button', class: 'btn', style: { alignSelf: 'flex-start' }, onclick: newCuenta }, '+ Crear la siguiente cuenta de cobro'))
    ];
  }

  /* ---------- Render ---------- */
  function renderPanel() {
    const key = STEPS[idx()].key;
    const panel = $('#panel'); panel.innerHTML = '';
    const map = { encabezado: stepEncabezado, cobrador: stepCobrador, cliente: stepCliente, servicios: stepServicios, pago: stepPago, firma: stepFirma, descargar: stepDescargar };
    panel.append(...map[key]().flat(Infinity).filter(Boolean));
    panel.querySelectorAll('textarea').forEach(autosize);
    if (focusAfter) {
      const [k, i, end] = focusAfter.split(':');
      const el = panel.querySelector(`[data-k="${k}:${i}"]`);
      if (el) { el.focus(); const L = end ? el.value.length : 0; try { el.setSelectionRange(L, L); } catch (e) { /* noop */ } }
      focusAfter = null;
    }
    schedulePreview();
  }
  function render() { renderSteps(); renderPanel(); }

  function newCuenta() {
    const n = parseInt(String(S.numero).replace(/\D/g, ''), 10);
    if (n) store.set(KEY_ULTIMO, Math.max(Number(store.get(KEY_ULTIMO, 0)) || 0, n));
    store.set(KEY_EMISOR, { ciudad: S.ciudad, emisor: S.emisor, pago: S.pago, firma: S.firma });
    S = freshState(false); save(); render(); toast('Nueva cuenta ' + S.numero);
  }

  $('#prevBtn').addEventListener('click', () => { const i = idx(); if (i > 0) go(STEPS[i - 1].key); });
  $('#nextBtn').addEventListener('click', () => { const i = idx(); if (i < STEPS.length - 1) go(STEPS[i + 1].key); });
  $('#resetBtn').addEventListener('click', function ask() {
    const area = $('#resetArea');
    const restore = () => { area.innerHTML = ''; area.append(h('button', { class: 'btn ghost small', id: 'resetBtn', type: 'button', onclick: ask }, 'Nueva cuenta')); };
    area.innerHTML = '';
    area.append(h('div', { class: 'confirm-row' }, h('span', null, '¿Empezar otra cuenta?'),
      h('button', { type: 'button', class: 'btn small primary', onclick: () => { newCuenta(); restore(); } }, 'Sí'),
      h('button', { type: 'button', class: 'btn small ghost', onclick: restore }, 'Cancelar')));
  });

  /* =====================================================================
     EXPORTAR PDF (carta o A4)
     ===================================================================== */
  async function exportPDF(btn, status) {
    if (!window.html2canvas || !window.jspdf) { status.textContent = 'No se pudieron cargar las librerías del PDF. Revisa tu conexión a internet y recarga la página.'; return; }
    btn.disabled = true;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const fmt = FORMATS[S.formato] || FORMATS.carta;
      const pages = buildPages();
      stage.style.left = '0px'; stage.style.zIndex = '-1';
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: fmt.pdf, compress: true });
      const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < pages.length; i++) {
        status.textContent = `Generando página ${i + 1} de ${pages.length}…`;
        stage.innerHTML = ''; stage.append(pages[i]);
        await new Promise(r => setTimeout(r, 40));
        const canvas = await window.html2canvas(pages[i], { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false, width: fmt.w, height: fmt.h, windowWidth: fmt.w, windowHeight: fmt.h, scrollX: 0, scrollY: -window.scrollY });
        if (i > 0) pdf.addPage(fmt.pdf, 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, W, H, undefined, 'FAST');
      }
      pdf.setProperties({ title: `${S.titulo} ${S.numero} — ${S.cliente.nombre}`, author: S.emisor.nombre || 'Brandgo', creator: 'Brandgo Documentos' });
      const name = fileName();
      status.textContent = 'Preparando la descarga…';
      const ok = await deliver(pdf, name);
      if (ok) {
        const n = parseInt(String(S.numero).replace(/\D/g, ''), 10);
        if (n) store.set(KEY_ULTIMO, Math.max(Number(store.get(KEY_ULTIMO, 0)) || 0, n));
        if (S.cliente.nombre.trim()) {
          const list = store.get(KEY_CLIENTES, []); const k = list.findIndex(c => c.nombre.trim().toLowerCase() === S.cliente.nombre.trim().toLowerCase());
          if (k >= 0) list[k] = Object.assign({}, S.cliente); else list.push(Object.assign({}, S.cliente));
          store.set(KEY_CLIENTES, list);
        }
        status.textContent = `Listo: ${name}`; toast('PDF descargado');
      } else status.textContent = 'Descarga cancelada.';
    } catch (e) {
      console.error(e);
      status.textContent = 'No se pudo generar el PDF. Intenta de nuevo; si sigue fallando, recarga la página.';
    } finally {
      stage.style.left = ''; stage.style.zIndex = '';
      btn.disabled = false;
      renderAside();
    }
  }

  /* ---------- Inicio ---------- */
  $('#brandLogo').src = A.logo;
  save();
  render();
})();
