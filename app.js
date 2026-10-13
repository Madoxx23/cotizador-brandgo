/* Cotizador de campañas — Brandgo
   Wizard de preguntas → diapositivas 16:9 (estilo del PDF de referencia) → PDF descargable. */
(function () {
  'use strict';

  const A = window.ASSETS || { equipo: {}, icons: {} };
  const STORE_KEY = 'brandgo-cotizador-v1';

  /* ---------------- Paletas por servicio ---------------- */
  const PALETTES = {
    rosa:     { name: 'Rosa',     ac: '#d41bbf', bg: '#fcf0fb', bd: '#f0bfe9', ln: '#f1d9ee' },
    naranja:  { name: 'Naranja',  ac: '#f05a0a', bg: '#fdf4ee', bd: '#f7cfb6', ln: '#f3e1d6' },
    amarillo: { name: 'Amarillo', ac: '#d69a00', bg: '#fdf9ec', bd: '#eedfa8', ln: '#efe8d2' },
    verde:    { name: 'Verde',    ac: '#16a34a', bg: '#eff9f2', bd: '#bfe5cb', ln: '#d9ecdf' },
    azul:     { name: 'Azul',     ac: '#2236e6', bg: '#eff1fe', bd: '#bfc5f6', ln: '#dcdff5' },
    violeta:  { name: 'Violeta',  ac: '#7c3aed', bg: '#f5f0fe', bd: '#d8c7fb', ln: '#e6dcf7' },
    turquesa: { name: 'Turquesa', ac: '#0891b2', bg: '#ecf8fb', bd: '#b5e2ec', ln: '#d6ecf1' }
  };
  const PAL_ORDER = Object.keys(PALETTES);

  /* ---------------- Equipo ---------------- */
  const TEAM = [
    { id: 'mauro',  nombre: 'Mauro',  rol: 'Dirección creativa, video y fotografía', area: 'direccion' },
    { id: 'juca',   nombre: 'Juca',   rol: 'Diseño gráfico', area: 'diseno' },
    { id: 'camilo', nombre: 'Camilo', rol: 'Estrategia', area: 'estrategia' },
    { id: 'laura',  nombre: 'Laura',  rol: 'Estrategia', area: 'estrategia' },
    { id: 'malu',   nombre: 'Malu',   rol: 'Estrategia', area: 'estrategia' }
  ];
  const STRATEGISTS = ['camilo', 'laura', 'malu'];
  const AREA_WORDS = {
    direccion: ['direcci', 'creativ', 'video', 'fotograf', 'audiovisual', 'grabaci', 'reel', 'producci', 'edici', 'postproducci', 'pantalla', 'televisor', 'arte', 'storytelling'],
    diseno: ['diseñ', 'disen', 'gráfic', 'grafic', 'línea gráfica', 'carrusel', 'pieza', 'menú', 'menu', 'ilustr', 'identidad', 'logo', 'impresi'],
    estrategia: ['estrateg', 'insight', 'concepto', 'cronograma', 'contenidos', 'copy', 'pauta', 'meta ads', 'publicaci', 'seguimiento', 'gesti', 'experiencia', 'activaci', 'planeaci', 'campaña']
  };

  /* ---------------- Plantillas de servicios ---------------- */
  let _id = Date.now() % 100000;
  const uid = () => 'x' + (++_id).toString(36);
  const deliv = (cantidad, nombre, descripcion, incluye) => ({ id: uid(), cantidad, nombre, descripcion: descripcion || '', incluye: incluye || [] });

  const CATALOG = {
    estrategia: () => ({
      titulo: 'Estrategia y concepto de campaña',
      pregunta: '¿Cuáles son los puntos de la [estrategia]?',
      puntos: ['Insight de campaña.', 'Concepto creativo y desarrollo de campaña.', 'Dirección creativa y dirección de arte.', 'Estrategia de contenidos.', 'Cronograma de publicaciones.']
    }),
    contenido: () => ({
      titulo: 'Creación de contenido',
      pregunta: '¿Qué [contenido] vamos a producir?',
      descripcion: 'La campaña incluye:',
      entregables: [
        deliv(4, 'Reels profesionales', '', ['Desarrollo de ideas y guiones. (Storytelling)', 'Producción audiovisual.', 'Dirección de arte.', 'Grabación.', 'Edición y postproducción.', 'Copy para publicación.']),
        deliv(3, 'Carruseles', 'Piezas gráficas desarrolladas estratégicamente para complementar la narrativa de los reels.', ['Conceptualización.', 'Fotografía, video y/o diseño gráfico.'])
      ]
    }),
    pantallas: () => ({
      titulo: 'Creación de pantallas digitales',
      pregunta: '¿Qué [pantallas] incluye la propuesta?',
      descripcion: 'Con contenido audiovisual de alta calidad y comunicación estratégica, despertamos antojos, destacamos productos e impulsamos decisiones de compra.',
      entregables: [deliv(2, 'Pantallas para televisor', 'En formato video.'), deliv(1, 'Menú digital', 'Diseño estático para pantalla.')]
    }),
    diseno: () => ({
      titulo: 'Diseño gráfico adicional',
      pregunta: '¿Qué [diseño gráfico] adicional incluye?',
      puntos: ['Línea gráfica exclusiva para la campaña, para desarrollo en redes sociales.']
    }),
    gestion: () => ({
      titulo: 'Gestión y publicación del contenido',
      pregunta: '¿Cómo vamos a [gestionar] y publicar?',
      puntos: ['Organización del cronograma.', 'Publicación de las piezas desarrolladas.', 'Copywriting.', 'Seguimiento de la ejecución de campaña.', 'En caso de requerirse, configuración y gestión de una campaña de pauta en Meta Ads durante el periodo de ejecución.'],
      nota: 'La inversión destinada directamente a Meta Ads no está incluida dentro del valor de la propuesta.'
    }),
    experiencia: () => ({
      titulo: 'Experiencia de marca',
      pregunta: '¿Cómo será la [experiencia de marca]?',
      descripcion: 'Como parte de la campaña se desarrollará una experiencia o activación de marca, diseñada para trasladar el concepto creativo al punto físico y generar interacción con el público.',
      puntos: ['Conceptualización de la experiencia.', 'Desarrollo creativo.', 'Diseño gráfico de la pieza principal necesaria para su implementación.', 'Adaptación visual al concepto general de campaña.'],
      nota: 'Los costos de impresión, producción o instalación física no están incluidos.'
    }),
    fotografia: () => ({
      titulo: 'Sesión fotográfica',
      pregunta: '¿Qué incluye la [sesión de fotos]?',
      entregables: [deliv(20, 'Fotografías editadas', 'Producto y ambiente, listas para redes y web.', ['Dirección de arte.', 'Producción y estilismo.', 'Edición y retoque.'])]
    }),
    pauta: () => ({
      titulo: 'Pauta digital',
      pregunta: '¿Cómo manejaremos la [pauta]?',
      puntos: ['Definición de públicos y objetivos.', 'Configuración de campañas en Meta Ads.', 'Optimización durante la ejecución.', 'Informe de resultados.'],
      nota: 'La inversión destinada directamente a Meta Ads no está incluida dentro del valor de la propuesta.'
    }),
    blanco: () => ({ titulo: 'Nuevo servicio', pregunta: '', puntos: [''] })
  };
  const CATALOG_LABELS = {
    estrategia: 'Estrategia y concepto', contenido: 'Creación de contenido', pantallas: 'Pantallas digitales', diseno: 'Diseño gráfico',
    gestion: 'Gestión y publicación', experiencia: 'Experiencia de marca', fotografia: 'Sesión fotográfica', pauta: 'Pauta digital', blanco: 'Servicio en blanco'
  };

  function makeSection(kind, color) {
    const t = CATALOG[kind]();
    return {
      id: uid(), tipo: kind, activa: true, color,
      titulo: t.titulo, pregunta: t.pregunta || '',
      descripcion: t.descripcion || '', puntos: t.puntos || [], entregables: t.entregables || [], nota: t.nota || '',
      equipo: null // null = automático
    };
  }

  function defaultState() {
    return {
      v: 1,
      cliente: 'Florentino',
      etiqueta: 'Propuesta comercial',
      intro: {
        mostrar: true,
        titulo: 'Queremos crear algo que la gente quiera mirar, [vivir] y [recordar.]',
        texto: 'Detrás de esta campaña habrá un equipo de **estrategia**, **dirección creativa**, **dirección de arte**, **producción audiovisual**, **fotografía**, **diseño gráfico**, **copywriting** y **pauta**, trabajando bajo una misma visión.',
        equipo: TEAM.map(t => t.id)
      },
      secciones: [
        makeSection('estrategia', 'rosa'), makeSection('contenido', 'naranja'), makeSection('pantallas', 'amarillo'),
        makeSection('diseno', 'verde'), makeSection('gestion', 'azul')
      ],
      inversion: { valor: 3000000, moneda: 'COP', resumen: true, notas: [] },
      archivo: '',
      paso: 'cliente'
    };
  }

  /* ---------------- Estado + guardado ---------------- */
  let S;
  try { S = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = defaultState();

  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* almacenamiento no disponible */ } }, 250);
    schedulePreview();
    $('#topClient').textContent = (S.etiqueta || 'Propuesta') + ' · ' + (S.cliente || 'Sin cliente');
  }

  /* ---------------- Utilidades DOM ---------------- */
  const $ = s => document.querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'style' && typeof v === 'object') { for (const p in v) if (v[p] != null) { if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; } }
      else if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && k !== 'form' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');
  const fmtMoney = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const pal = s => PALETTES[s.color] || PALETTES.azul;
  const palVars = p => ({ '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd });
  const active = () => S.secciones.filter(s => s.activa);
  const clean = arr => (arr || []).map(x => String(x).trim()).filter(Boolean);
  const marks = (t, cls) => { let i = 0; return esc(t).replace(/\[([^\]]+)\]/g, (_, w) => `<mark class="${cls ? cls + (i++ % 3) : ''}">${w}</mark>`); };
  const bolds = t => esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* Fondo de puntos generado en canvas (sirve para la web y para el PDF) */
  function dotTile(size, r, color) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.fillStyle = color; x.beginPath(); x.arc(size / 2, size / 2, r, 0, Math.PI * 2); x.fill();
    return `url(${c.toDataURL('image/png')})`;
  }
  document.documentElement.style.setProperty('--dots', dotTile(44, 1.6, '#e3e4ea'));
  document.documentElement.style.setProperty('--dots-slide', dotTile(80, 2.2, '#ececf1'));

  /* Trazo a mano (subrayado) dibujado en canvas para que también salga en el PDF */
  function underline() {
    const c = document.createElement('canvas'); c.width = 428; c.height = 32; const x = c.getContext('2d');
    x.strokeStyle = '#8f95ef'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(6, 24); x.bezierCurveTo(120, 12, 280, 8, 422, 10); x.stroke();
    return c.toDataURL('image/png');
  }

  /* ---------------- Asignación automática de equipo ---------------- */
  function sectionText(s) {
    return [s.titulo, s.descripcion, s.nota, ...(s.puntos || []), ...(s.entregables || []).flatMap(d => [d.nombre, d.descripcion, ...(d.incluye || [])])].join(' ').toLowerCase();
  }
  function teamFor(sections) {
    const map = {}; let rot = 0;
    for (const s of sections) {
      if (Array.isArray(s.equipo)) { map[s.id] = s.equipo.slice(0, 2); continue; }
      const txt = sectionText(s);
      const scores = Object.entries(AREA_WORDS).map(([area, ws]) => [area, ws.reduce((n, w) => n + (txt.split(w).length - 1), 0)]);
      scores.sort((a, b) => b[1] - a[1]);
      // Segunda persona solo si su área tiene presencia clara en el contenido
      const areas = scores.filter((x, i) => x[1] > 0 && (i === 0 || x[1] >= 2)).slice(0, 2).map(x => x[0]);
      if (!areas.length) areas.push('estrategia');
      map[s.id] = areas.map(a => a === 'direccion' ? 'mauro' : a === 'diseno' ? 'juca' : STRATEGISTS[rot++ % STRATEGISTS.length]);
    }
    return map;
  }
  function decoFor(s) {
    const t = sectionText(s);
    if (/reel|instagram|carrusel/.test(t)) return ['instagram', 'camara'];
    if (/fotograf/.test(t) && !/estrateg/.test(t)) return ['camara'];
    if (/pantalla|televisor/.test(t)) return ['cohete'];
    if (/experiencia|activaci/.test(t)) return ['paleta'];
    if (/gesti|publicaci|cronograma/.test(t) && !/insight/.test(t)) return ['calendario', 'chat'];
    if (/diseñ|gráfic/.test(t) && !/insight/.test(t)) return ['lapiz'];
    if (/pauta|ads/.test(t)) return ['cohete'];
    if (/experiencia|activaci/.test(t)) return ['paleta'];
    return ['estrella'];
  }

  /* =====================================================================
     DIAPOSITIVAS
     ===================================================================== */
  const stage = $('#stage');
  const UNIT = 296, GAP = 14, MAX_UNITS = 4, AREA_H = 640;

  const foot = () => [h('div', { class: 's-foot-mark', html: 'BRANDGO<sup>™</sup>' }), h('div', { class: 's-foot-seal' }, 'Creatividad Sin Permiso')];
  const img = (src, style, cls) => h('img', { src, alt: '', class: cls || 'deco', style });

  function slideCover() {
    const name = S.cliente || 'Cliente';
    const fs = Math.max(48, Math.min(98, 1250 / (name.length * 0.56)));
    const el = h('div', { class: 'slide' },
      img(A.logo, null, 'cover-logo'),
      h('div', { class: 'cover-kicker' }, S.etiqueta || 'Propuesta comercial'),
      h('div', { class: 'cover-name', style: { fontSize: fs + 'px' } }, h('span', null, name, img(A.icons.cursor, null, ' '))),
      foot());
    const secs = active().slice(0, 4);
    const fan = h('div', { class: 'fan' });
    const n = secs.length;
    secs.forEach((s, i) => {
      const p = pal(s);
      const x = -205 + i * 50 + (4 - n) * 22, y = 2 + i * 26, rot = -9 + i * (n > 1 ? 13 / (n - 1) : 0);
      const items = clean(s.puntos).length ? clean(s.puntos) : (s.entregables || []).flatMap(d => [((d.cantidad || '') + ' ' + d.nombre).trim(), ...clean(d.incluye)]);
      const mini = h('div', { class: 'mini', style: { '--ac': p.ac, '--bg': p.bg, '--bd': p.bd, left: x + 'px', top: y + 'px', transform: `rotate(${rot}deg)`, zIndex: i + 1 } },
        h('div', { class: 'n' }, pad2(S.secciones.filter(z => z.activa).indexOf(s) + 1)),
        h('h4', null, s.titulo),
        h('ul', null, items.slice(0, 6).map(t => h('li', null, t))));
      fan.append(mini);
    });
    if (n) {
      fan.append(img(A.icons.estrella, { left: '-68px', top: '-12px', width: '50px', zIndex: 9, transform: 'rotate(-8deg)' }));
      fan.append(img(A.icons.paleta, { left: '-212px', top: '206px', width: '60px', zIndex: 9 }));
      fan.append(img(A.icons.cohete, { left: '150px', top: '282px', width: '58px', zIndex: 9 }));
    }
    el.append(fan);
    return el;
  }

  function slideTeam() {
    const sel = TEAM.filter(t => S.intro.equipo.includes(t.id));
    const order = ['malu', 'camilo', 'laura', 'juca', 'mauro'];
    sel.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const POS = [[240, 110, 200], [1200, 190, 140], [262, 615, 156], [1180, 596, 152], [1330, 384, 134]];
    const el = h('div', { class: 'slide' });
    sel.slice(0, 5).forEach((t, i) => el.append(img(A.equipo[t.id], { left: POS[i][0] + 'px', top: POS[i][1] + 'px', width: POS[i][2] + 'px', height: POS[i][2] + 'px' }, 'team-av')));
    const under = underline();
    const copy = h('div', { class: 'team-copy' },
      h('h2', { html: marks(S.intro.titulo, 'm') }),
      h('p', { html: bolds(S.intro.texto) }),
      h('div', { style: { position: 'relative' } }, h('img', { class: 'under', src: under, alt: '' }), img(A.icons.cursor, { left: '470px', top: '6px', width: '42px' })));
    el.append(copy, ...foot());
    return el;
  }

  function columnsOf(s) {
    const ds = (s.entregables || []).filter(d => (d.nombre || '').trim() || String(d.cantidad || '').trim());
    const rich = ds.filter(d => clean(d.incluye).length || (d.descripcion || '').length > 70);
    const simple = ds.filter(d => !rich.includes(d));
    const cols = rich.map(d => ({ kind: 'rich', items: [d] }));
    if (simple.length) cols.push({ kind: 'simple', items: simple });
    return cols;
  }
  const unitsOf = (s, wide) => Math.min(3, Math.max(wide ? 2 : 1, columnsOf(s).length));

  function card(s, num, members, opts) {
    const p = pal(s);
    const wide = opts.wide;
    const units = unitsOf(s, wide);
    const deco = decoFor(s);
    const el = h('div', {
      class: 'card' + (members.length ? ' has-team' : ''),
      style: { '--ac': p.ac, '--bg': p.bg, '--bd': p.bd, '--ln': p.ln, '--fs': opts.fs + 'px', '--pr': '2.4em', width: (units * UNIT + (units - 1) * GAP) + 'px' }
    },
      h('div', { class: 'n' }, pad2(num)),
      h('h3', null, s.titulo));
    if ((s.descripcion || '').trim()) el.append(h('p', { class: 'intro' }, s.descripcion.trim()));
    const pts = clean(s.puntos);
    if (pts.length) {
      if (wide && pts.length > 3) {
        const half = Math.ceil(pts.length / 2);
        el.append(h('div', { class: 'cols' }, [pts.slice(0, half), pts.slice(half)].map(part => h('div', { class: 'col' }, h('ul', { style: { marginTop: 0 } }, part.map(t => h('li', null, t)))))));
      } else el.append(h('ul', null, pts.map(t => h('li', null, t))));
    }
    const cols = columnsOf(s);
    if (cols.length) {
      el.append(h('div', { class: 'cols' }, cols.map(c => h('div', { class: 'col' },
        c.kind === 'rich'
          ? c.items.map(d => [
            String(d.cantidad || '').trim() ? h('div', { class: 'big' }, d.cantidad) : null,
            h('div', { class: 'dname' }, d.nombre),
            (d.descripcion || '').trim() ? h('div', { class: 'ddesc' }, d.descripcion) : null,
            clean(d.incluye).length ? [h('div', { class: 'inc' }, 'Incluye:'), h('ul', null, clean(d.incluye).map(t => h('li', null, t)))] : null])
          : c.items.map(d => h('div', { class: 'simple' },
            String(d.cantidad || '').trim() ? h('div', { class: 'big' }, d.cantidad) : null,
            h('div', null, h('div', { class: 'dname' }, d.nombre), (d.descripcion || '').trim() ? h('div', { class: 'ddesc' }, d.descripcion) : null)))
      ))));
    }
    if ((s.nota || '').trim()) el.append(h('div', { class: 'note' }, s.nota.trim()));
    if (members.length) el.append(h('div', { class: 'c-team' }, members.map(id => h('img', { src: A.equipo[id], alt: '' }))));
    // Decoración (emoji 3D) en la esquina superior derecha y, si la tarjeta abre la fila, en el borde izquierdo
    el.append(img(A.icons[deco[0]], { top: '-40px', right: '-22px', width: '88px', transform: 'rotate(9deg)' }, 'c-deco'));
    if (deco[1] && opts.first) el.append(img(A.icons[deco[1]], { bottom: '30%', left: '-40px', width: '70px', transform: 'rotate(-10deg)' }, 'c-deco'));
    else if (deco[1] && units >= 2) el.append(img(A.icons[deco[1]], { top: '62px', right: '78px', width: '86px', transform: 'rotate(-10deg)' }, 'c-deco'));
    else if (deco[1]) el.append(img(A.icons[deco[1]], { bottom: '-34px', left: '50%', marginLeft: '-30px', width: '60px', transform: 'rotate(-6deg)' }, 'c-deco'));
    return el;
  }

  function slideCards(group, nums, team) {
    const el = h('div', { class: 'slide' });
    const row = h('div', { class: 'cards-row', style: { display: 'flex', gap: GAP + 'px', alignItems: 'stretch' } });
    el.append(h('div', { class: 'cards' }, row), ...foot());
    const render = fs => {
      row.innerHTML = '';
      group.forEach((g, i) => row.append(card(g.s, nums[g.s.id], team[g.s.id] || [], { fs, wide: g.wide, first: i === 0 })));
    };
    return { el, row, render };
  }

  function slideInvestment() {
    const v = '$' + fmtMoney(S.inversion.valor);
    const fs = Math.min(190, 1080 / (v.length * 0.6));
    const notes = [...active().map(s => (s.nota || '').trim()).filter(Boolean), ...clean(S.inversion.notas)];
    const uniq = [...new Set(notes)];
    return h('div', { class: 'slide' },
      h('div', { class: 'inv' },
        h('div', { class: 'k' }, 'Inversión'),
        h('div', { class: 'amt' }, h('b', { style: { fontSize: fs + 'px' } }, v), h('span', { style: { fontSize: Math.round(fs * 0.36) + 'px' } }, S.inversion.moneda)),
        S.inversion.resumen && active().length ? h('div', { class: 'sum' }, active().map(s => s.titulo).join(' · ')) : null,
        uniq.length ? h('div', { class: 'pills' }, uniq.map(t => h('span', null, t))) : null),
      foot());
  }

  /* Construye todas las diapositivas en el escenario oculto y ajusta tipografía para que nada se desborde */
  let SLIDES = [];
  function buildSlides() {
    stage.innerHTML = '';
    const out = [];
    const add = (el, label, key) => { stage.append(el); out.push({ el, label, key }); };
    add(slideCover(), 'Portada', 'cliente');
    if (S.intro.mostrar) add(slideTeam(), 'Equipo', 'equipo');

    const secs = active();
    const nums = {}; secs.forEach((s, i) => nums[s.id] = i + 1);
    const team = teamFor(secs);
    // Empaque voraz: hasta 4 unidades de ancho por diapositiva
    const groups = []; let cur = [], used = 0;
    for (const s of secs) {
      const u = unitsOf(s);
      if (cur.length && used + u > MAX_UNITS) { groups.push(cur); cur = []; used = 0; }
      cur.push({ s, wide: false }); used += u;
    }
    if (cur.length) groups.push(cur);

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const sl = slideCards(g, nums, team);
      stage.append(sl.el);
      let fs = 16, ok = false;
      for (; fs >= 12; fs -= 0.5) { sl.render(fs); if (sl.row.offsetHeight <= AREA_H) { ok = true; break; } }
      if (!ok && g.length > 1) {
        // No cabe: pasar la última tarjeta a la siguiente diapositiva
        const moved = g.pop();
        if (groups[gi + 1]) groups[gi + 1].unshift(moved); else groups.push([moved]);
        sl.el.remove(); gi--; continue;
      }
      if (!ok && g.length === 1 && !g[0].wide) { g[0].wide = true; sl.el.remove(); gi--; continue; }
      if (!ok) sl.render(12);
      sl.el.remove();
      add(sl.el, g.map(x => pad2(nums[x.s.id])).join(' · '), g.map(x => 'sec:' + x.s.id).join('|'));
    }
    add(slideInvestment(), 'Inversión', 'inversion');
    SLIDES = out;
    return out;
  }

  /* ---------------- Vista previa ---------------- */
  let pvIndex = 0, pvT;
  function schedulePreview() { clearTimeout(pvT); pvT = setTimeout(renderAside, 140); }

  function slideIndexForStep(key) {
    if (key === 'equipo') { const i = SLIDES.findIndex(s => s.key === 'equipo'); return i < 0 ? 0 : i; }
    if (key === 'inversion' || key === 'descargar') return SLIDES.length - 1;
    if (key.startsWith('sec:')) { const i = SLIDES.findIndex(s => s.key.split('|').includes(key)); return i < 0 ? 0 : i; }
    if (key === 'servicios') return Math.min(SLIDES.length - 1, S.intro.mostrar ? 2 : 1);
    return 0;
  }

  function mountScaled(box, slideEl) {
    const clone = slideEl.cloneNode(true);
    box.innerHTML = ''; box.append(clone);
    const fit = () => { clone.style.transform = `scale(${box.clientWidth / 1600})`; };
    fit();
    if (window.ResizeObserver) { const ro = new ResizeObserver(fit); ro.observe(box); }
  }

  function renderAside(keepIndex) {
    buildSlides();
    const step = S.paso;
    const host = $('#asideIn'); host.innerHTML = '';
    if (step === 'descargar') {
      host.append(h('div', { class: 'pv-head' }, h('b', null, SLIDES.length + ' diapositivas en el PDF')));
      const grid = h('div', { class: 'thumbs' });
      SLIDES.forEach((s, i) => {
        const box = h('div', { class: 'pv' });
        grid.append(h('figure', null, box, h('figcaption', null, (i + 1) + '. ' + s.label)));
        requestAnimationFrame(() => mountScaled(box, s.el));
      });
      host.append(grid);
      return;
    }
    if (!keepIndex) pvIndex = slideIndexForStep(step);
    pvIndex = Math.max(0, Math.min(SLIDES.length - 1, pvIndex));
    const box = h('div', { class: 'pv' });
    host.append(
      h('div', { class: 'pv-head' },
        h('b', null, `Vista previa · ${pvIndex + 1} de ${SLIDES.length} · ${SLIDES[pvIndex].label}`),
        h('div', { class: 'pv-switch' },
          h('button', { type: 'button', 'aria-label': 'Diapositiva anterior', onclick: () => { pvIndex--; renderAside(true); } }, '‹'),
          h('button', { type: 'button', 'aria-label': 'Diapositiva siguiente', onclick: () => { pvIndex++; renderAside(true); } }, '›'))),
      box,
      h('div', { class: 'pv-dots' }, SLIDES.map((_, i) => h('span', { class: i === pvIndex ? 'on' : '' }))));
    requestAnimationFrame(() => mountScaled(box, SLIDES[pvIndex].el));
  }

  /* =====================================================================
     WIZARD
     ===================================================================== */
  function steps() {
    return [
      { key: 'cliente', label: 'Cliente' },
      { key: 'servicios', label: 'Servicios' },
      ...active().map((s, i) => ({ key: 'sec:' + s.id, label: s.titulo, num: pad2(i + 1), sec: s })),
      { key: 'equipo', label: 'Equipo' },
      { key: 'inversion', label: 'Inversión' },
      { key: 'descargar', label: 'Descargar' }
    ];
  }
  function currentIndex() { const st = steps(); const i = st.findIndex(x => x.key === S.paso); return i < 0 ? 0 : i; }

  function go(key) {
    S.paso = key; save();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderSteps() {
    const st = steps(), ci = currentIndex();
    const nav = $('#steps'); nav.innerHTML = '';
    st.forEach((x, i) => {
      const p = x.sec ? pal(x.sec) : null;
      const b = h('button', {
        type: 'button', class: 'step-pill' + (i === ci ? ' active' : '') + (i < ci ? ' done' : ''),
        style: p ? palVars(p) : null, onclick: () => go(x.key), 'aria-current': i === ci ? 'step' : null
      }, h('i', null, x.num || (i < ci ? '✓' : i + 1 - (i > 1 ? 0 : 0))), x.sec ? shorten(x.label) : x.label);
      nav.append(b);
    });
    const a = nav.querySelector('.active'); if (a) a.scrollIntoView({ block: 'nearest', inline: 'center' });
    $('#stepCount').textContent = `Paso ${ci + 1} de ${st.length}`;
    $('#progressBar').style.width = ((ci + 1) / st.length * 100) + '%';
    $('#prevBtn').disabled = ci === 0;
    const last = ci === st.length - 1;
    $('#nextBtn').hidden = last;
    $('#nextBtn').textContent = ci === st.length - 2 ? 'Revisar y descargar →' : 'Siguiente →';
  }
  const shorten = t => { const w = t.split(' '); return w.length > 3 ? w.slice(0, 3).join(' ') + '…' : t; };

  /* ---------- Editor de listas (un punto por línea) ---------- */
  let focusAfter = null;
  function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
  function bulletEditor(arr, key, placeholder, addLabel) {
    if (!arr.length) arr.push('');
    const wrap = h('div', { class: 'bullets' });
    arr.forEach((val, i) => {
      const ta = h('textarea', {
        rows: 1, 'data-k': key + ':' + i, placeholder, 'aria-label': (placeholder || 'Punto') + ' ' + (i + 1),
        oninput: e => { arr[i] = e.target.value; autosize(e.target); save(); },
        onkeydown: e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const pos = e.target.selectionStart; const v = arr[i]; arr[i] = v.slice(0, pos); arr.splice(i + 1, 0, v.slice(pos)); focusAfter = key + ':' + (i + 1); save(); renderPanel(); }
          if (e.key === 'Backspace' && !e.target.value && arr.length > 1) { e.preventDefault(); arr.splice(i, 1); focusAfter = key + ':' + Math.max(0, i - 1) + ':end'; save(); renderPanel(); }
        },
        onpaste: e => {
          const txt = (e.clipboardData || window.clipboardData).getData('text');
          if (!/\n/.test(txt)) return;
          e.preventDefault();
          const lines = txt.split(/\r?\n/).map(l => l.replace(/^\s*([*\-•·▪◦]|\d+[.)])\s*/, '').trim()).filter(Boolean);
          const cur = arr[i].trim();
          if (cur) arr.splice(i + 1, 0, ...lines); else arr.splice(i, 1, ...lines);
          focusAfter = key + ':' + (i + lines.length - (cur ? 0 : 1)) + ':end'; save(); renderPanel();
        }
      });
      ta.value = val;
      wrap.append(h('div', { class: 'bl' }, h('span', { class: 'dot' }), ta,
        h('button', { type: 'button', class: 'x', 'aria-label': 'Quitar punto', title: 'Quitar', onclick: () => { arr.splice(i, 1); if (!arr.length) arr.push(''); save(); renderPanel(); } }, '×')));
    });
    return h('div', { class: 'stack', style: { gap: '8px' } }, wrap,
      h('button', { type: 'button', class: 'add-line', onclick: () => { arr.push(''); focusAfter = key + ':' + (arr.length - 1); save(); renderPanel(); } }, '+ ' + (addLabel || 'Agregar punto')));
  }

  function field(label, value, onInput, opts) {
    opts = opts || {};
    const id = 'f-' + (opts.id || label.replace(/\W+/g, '-').toLowerCase());
    const el = opts.area ? h('textarea', { class: 'area', id, rows: opts.rows || 3, placeholder: opts.placeholder || '' }) : h('input', { class: 'field' + (opts.big ? ' big' : ''), id, type: 'text', placeholder: opts.placeholder || '' });
    el.value = value || '';
    el.addEventListener('input', e => { onInput(e.target.value); save(); if (opts.area) autosize(e.target); });
    return h('div', null, h('label', { class: 'label', for: id }, label), el, opts.hint ? h('div', { class: 'label', style: { marginTop: '6px', fontWeight: 500, color: 'var(--ink-3)' } }, opts.hint) : null);
  }

  function block(title, hint, ...content) {
    return h('div', { class: 'block' }, h('div', { class: 'block-h' }, h('h3', null, title), hint ? h('span', { class: 'hint' }, hint) : null), ...content);
  }

  function question(eyebrow, q, help, vars) {
    return [h('div', { class: 'eyebrow', style: vars }, eyebrow), h('h1', { class: 'q', style: vars, html: marks(q) }), help ? h('p', { class: 'help' }, help) : null];
  }

  /* ---------- Pasos ---------- */
  function stepCliente() {
    return [
      h('div', { class: 'hello' }, TEAM.map(t => h('img', { src: A.equipo[t.id], alt: t.nombre, title: t.nombre + ' · ' + t.rol }))),
      ...question('Nueva cotización', '¿Para quién es esta [propuesta]?', 'Responde cada paso con los servicios de la campaña. A la derecha ves cómo va quedando el documento, y al final lo descargas en PDF listo para enviar al cliente. Todo se guarda solo en este navegador.'),
      h('div', { class: 'stack' },
        block('Cliente', null,
          field('Nombre del cliente o marca', S.cliente, v => S.cliente = v, { big: true, id: 'cliente', placeholder: 'Ej. Florentino' }),
          field('Encabezado de la portada', S.etiqueta, v => S.etiqueta = v, { id: 'etiqueta', placeholder: 'Propuesta comercial' })))
    ];
  }

  function stepServicios() {
    const list = h('div', { class: 'stack', style: { gap: '8px' } });
    let n = 0;
    S.secciones.forEach((s, i) => {
      const p = pal(s);
      if (s.activa) n++;
      const count = clean(s.puntos).length + (s.entregables || []).length;
      const row = h('div', { class: 'svc' + (s.activa ? '' : ' off'), style: palVars(p) },
        h('div', { class: 'n', style: { '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd, background: p.bg, color: p.ac, borderColor: p.bd } }, s.activa ? pad2(n) : '—'),
        h('div', { class: 't' }, h('b', null, s.titulo || 'Sin título'), h('small', null, s.activa ? `${count} ${count === 1 ? 'elemento' : 'elementos'}` : 'No se incluye')),
        h('div', { class: 'tools' },
          h('button', { type: 'button', class: 'icon-btn', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { S.secciones.splice(i - 1, 0, S.secciones.splice(i, 1)[0]); save(); renderPanel(); } }, '↑'),
          h('button', { type: 'button', class: 'icon-btn', title: 'Bajar', 'aria-label': 'Bajar', disabled: i === S.secciones.length - 1, onclick: () => { S.secciones.splice(i + 1, 0, S.secciones.splice(i, 1)[0]); save(); renderPanel(); } }, '↓'),
          h('button', { type: 'button', class: 'icon-btn', title: 'Eliminar', 'aria-label': 'Eliminar servicio', onclick: () => {
            row.replaceWith(h('div', { class: 'svc', style: palVars(p) }, h('div', { class: 'confirm-row', style: { flex: 1 } }, `¿Eliminar «${s.titulo}»?`),
              h('button', { type: 'button', class: 'btn small danger', onclick: () => { S.secciones.splice(i, 1); save(); renderPanel(); renderSteps(); } }, 'Eliminar'),
              h('button', { type: 'button', class: 'btn small ghost', onclick: () => renderPanel() }, 'Cancelar')));
          } }, '✕')),
        h('label', { class: 'switch', style: palVars(p), title: s.activa ? 'Incluido' : 'No incluido' },
          h('input', { type: 'checkbox', checked: s.activa, 'aria-label': 'Incluir ' + s.titulo, onchange: e => { s.activa = e.target.checked; save(); renderPanel(); renderSteps(); } })));
      list.append(row);
    });
    const used = new Set(S.secciones.map(s => s.color));
    const nextColor = () => PAL_ORDER.find(c => !used.has(c)) || PAL_ORDER[S.secciones.length % PAL_ORDER.length];
    const cat = h('div', { class: 'catalog' }, Object.keys(CATALOG).map((k, i) => {
      const p = PALETTES[PAL_ORDER[i % PAL_ORDER.length]];
      return h('button', { type: 'button', class: 'cat-item', style: palVars(p), onclick: () => {
        const s = makeSection(k, nextColor()); S.secciones.push(s); save(); renderSteps(); go('sec:' + s.id);
      } }, h('span'), '+ ' + CATALOG_LABELS[k]);
    }));
    return [
      ...question('Servicios', '¿Qué [servicios] incluye la campaña?', 'Activa o desactiva cada servicio, cámbialos de orden o agrega uno nuevo. En los siguientes pasos escribes los puntos de cada uno.'),
      h('div', { class: 'stack' }, list, block('Agregar un servicio', 'Llega con texto de ejemplo que puedes editar', cat))
    ];
  }

  function stepSeccion(s) {
    const p = pal(s), vars = palVars(p);
    const num = pad2(active().indexOf(s) + 1);
    const q = s.pregunta || `¿Qué incluye [${s.titulo || 'este servicio'}]?`;
    const parts = [];

    parts.push(block('Título del servicio', null,
      field('Así aparece en la tarjeta', s.titulo, v => { s.titulo = v; renderStepsSoon(); }, { big: true, id: 'tit-' + s.id }),
      h('div', null, h('span', { class: 'label' }, 'Color de la tarjeta'),
        h('div', { class: 'swatches' }, PAL_ORDER.map(c => h('button', { type: 'button', class: 'sw', title: PALETTES[c].name, 'aria-label': 'Color ' + PALETTES[c].name, 'aria-pressed': s.color === c ? 'true' : 'false', style: { '--s': PALETTES[c].ac }, onclick: () => { s.color = c; save(); render(); } }))))));

    if (s.descripcion !== null && (s.descripcion || s._showDesc)) {
      parts.push(block('Texto de apoyo', 'Aparece debajo del título',
        field('Texto', s.descripcion, v => s.descripcion = v, { area: true, rows: 2, id: 'desc-' + s.id, placeholder: 'Ej. La campaña incluye:' }),
        h('button', { type: 'button', class: 'btn ghost small', style: { alignSelf: 'flex-start' }, onclick: () => { s.descripcion = ''; s._showDesc = false; save(); renderPanel(); } }, 'Quitar texto de apoyo')));
    }

    const hasPts = (s.puntos || []).length > 0;
    if (hasPts) parts.push(block('Puntos', 'Enter = nuevo punto · puedes pegar una lista', bulletEditor(s.puntos, 'p-' + s.id, 'Escribe un punto…')));

    if ((s.entregables || []).length) {
      const dl = h('div', { class: 'stack', style: { gap: '10px' } });
      s.entregables.forEach((d, i) => {
        const qty = h('input', { type: 'text', inputmode: 'numeric', value: d.cantidad, 'aria-label': 'Cantidad', oninput: e => { d.cantidad = e.target.value.replace(/[^\d]/g, '').slice(0, 3); e.target.value = d.cantidad; save(); } });
        const step = dv => { d.cantidad = Math.max(0, (parseInt(d.cantidad, 10) || 0) + dv); qty.value = d.cantidad; save(); };
        const name = h('input', { class: 'field', type: 'text', id: 'dn-' + d.id, placeholder: 'Ej. Reels profesionales', 'aria-label': 'Nombre del entregable', oninput: e => { d.nombre = e.target.value; save(); } }); name.value = d.nombre;
        const desc = h('textarea', { class: 'area', rows: 2, id: 'dd-' + d.id, placeholder: 'Descripción corta (opcional)', 'aria-label': 'Descripción', style: { minHeight: '52px' }, oninput: e => { d.descripcion = e.target.value; autosize(e.target); save(); } }); desc.value = d.descripcion;
        dl.append(h('div', { class: 'deliv', style: vars },
          h('div', { class: 'deliv-top' },
            h('div', { class: 'qty' }, h('button', { type: 'button', 'aria-label': 'Menos', onclick: () => step(-1) }, '−'), qty, h('button', { type: 'button', 'aria-label': 'Más', onclick: () => step(1) }, '+')),
            name,
            h('button', { type: 'button', class: 'icon-btn', title: 'Quitar entregable', 'aria-label': 'Quitar entregable', onclick: () => { s.entregables.splice(i, 1); save(); renderPanel(); } }, '✕')),
          desc,
          d.incluye.length
            ? [h('div', { class: 'sub' }, 'Incluye:'), bulletEditor(d.incluye, 'i-' + d.id, '¿Qué incluye?', 'Agregar a «Incluye»')]
            : h('button', { type: 'button', class: 'add-line', onclick: () => { d.incluye.push(''); focusAfter = 'i-' + d.id + ':0'; save(); renderPanel(); } }, '+ Agregar lista de «Incluye»')));
      });
      parts.push(block('Entregables', 'Cantidad + nombre, ej. 4 Reels', dl,
        h('button', { type: 'button', class: 'add-line', onclick: () => { const d = deliv(1, '', '', []); s.entregables.push(d); save(); renderPanel(); setTimeout(() => { const el = document.getElementById('dn-' + d.id); if (el) el.focus(); }, 30); } }, '+ Agregar entregable')));
    }

    if (s.nota || s._showNota) {
      parts.push(block('Nota al pie', 'Texto pequeño, aparece también en la inversión',
        field('Nota', s.nota, v => s.nota = v, { area: true, rows: 2, id: 'nota-' + s.id, placeholder: 'Ej. La inversión en Meta Ads no está incluida.' }),
        h('button', { type: 'button', class: 'btn ghost small', style: { alignSelf: 'flex-start' }, onclick: () => { s.nota = ''; s._showNota = false; save(); renderPanel(); } }, 'Quitar nota')));
    }

    const adds = [];
    if (!s.descripcion && !s._showDesc) adds.push(['+ Texto de apoyo', () => { s._showDesc = true; focusAfter = '#f-desc-' + s.id; }]);
    if (!hasPts) adds.push(['+ Lista de puntos', () => { s.puntos = ['']; focusAfter = 'p-' + s.id + ':0'; }]);
    if (!(s.entregables || []).length) adds.push(['+ Entregables con cantidad (ej. 4 Reels)', () => { s.entregables = [deliv(1, '', '', [])]; focusAfter = '#dn-' + s.entregables[0].id; }]);
    if (!s.nota && !s._showNota) adds.push(['+ Nota al pie', () => { s._showNota = true; focusAfter = '#f-nota-' + s.id; }]);
    if (adds.length) parts.push(h('div', { class: 'chips' }, adds.map(([t, fn]) => h('button', { type: 'button', class: 'add-chip', onclick: () => { fn(); save(); renderPanel(); } }, t))));

    // Equipo de la tarjeta
    const auto = !Array.isArray(s.equipo);
    const suggested = teamFor(active())[s.id] || [];
    const chosen = auto ? suggested : s.equipo;
    parts.push(block('Quién aparece en esta tarjeta', auto ? 'Automático según el contenido' : 'Máximo 2',
      h('label', { class: 'switch', style: vars },
        h('input', { type: 'checkbox', checked: auto, onchange: e => { s.equipo = e.target.checked ? null : suggested.slice(); save(); renderPanel(); } }), 'Elegir automáticamente'),
      h('div', { class: 'team', style: vars }, TEAM.map(t => h('button', {
        type: 'button', class: 'mate', 'aria-pressed': chosen.includes(t.id) ? 'true' : 'false', disabled: auto,
        onclick: () => {
          if (auto) return;
          const k = s.equipo.indexOf(t.id);
          if (k >= 0) s.equipo.splice(k, 1); else { s.equipo.push(t.id); if (s.equipo.length > 2) s.equipo.shift(); }
          save(); renderPanel();
        }
      }, h('img', { src: A.equipo[t.id], alt: '' }), h('span', null, h('b', null, t.nombre), h('small', null, t.rol)))))));

    return [...question(num + ' · ' + (s.titulo || 'Servicio'), q, 'Edita los textos a la medida de esta cotización. Cada cambio se ve al instante en la vista previa.', vars), h('div', { class: 'stack', style: vars }, parts)];
  }
  let rsT; function renderStepsSoon() { clearTimeout(rsT); rsT = setTimeout(renderSteps, 400); }

  function stepEquipo() {
    return [
      ...question('Equipo', '¿Quién va a [crear] esta campaña?', 'Esta diapositiva presenta al equipo. Usa [corchetes] para resaltar palabras del título y **dobles asteriscos** para poner texto en negrita.'),
      h('div', { class: 'stack' },
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: S.intro.mostrar, onchange: e => { S.intro.mostrar = e.target.checked; save(); renderPanel(); } }), 'Incluir la diapositiva del equipo'),
        S.intro.mostrar ? [
          block('Textos', null,
            field('Título', S.intro.titulo, v => S.intro.titulo = v, { area: true, rows: 2, id: 'intro-tit', hint: 'Ej. …quiera mirar, [vivir] y [recordar].' }),
            field('Párrafo', S.intro.texto, v => S.intro.texto = v, { area: true, rows: 4, id: 'intro-txt' })),
          block('Personas en la diapositiva', null, h('div', { class: 'team' }, TEAM.map(t => h('button', {
            type: 'button', class: 'mate', 'aria-pressed': S.intro.equipo.includes(t.id) ? 'true' : 'false',
            onclick: () => { const k = S.intro.equipo.indexOf(t.id); if (k >= 0) S.intro.equipo.splice(k, 1); else S.intro.equipo.push(t.id); save(); renderPanel(); }
          }, h('img', { src: A.equipo[t.id], alt: '' }), h('span', null, h('b', null, t.nombre), h('small', null, t.rol))))))
        ] : null)
    ];
  }

  function stepInversion() {
    const inp = h('input', { type: 'text', inputmode: 'numeric', id: 'monto', 'aria-label': 'Valor de la inversión', oninput: e => {
      const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 13);
      S.inversion.valor = Number(digits || 0); e.target.value = digits ? fmtMoney(digits) : ''; save();
    } });
    inp.value = S.inversion.valor ? fmtMoney(S.inversion.valor) : '';
    const sel = h('select', { 'aria-label': 'Moneda', onchange: e => { S.inversion.moneda = e.target.value; save(); } }, ['COP', 'USD', 'EUR', 'MXN'].map(m => h('option', { value: m, selected: S.inversion.moneda === m }, m)));
    const auto = active().map(s => (s.nota || '').trim()).filter(Boolean);
    return [
      ...question('Inversión', '¿Cuál es el valor de la [inversión]?', 'Escribe el valor total de la propuesta. Los puntos de mil se ponen solos.'),
      h('div', { class: 'stack' },
        block('Valor', null, h('div', { class: 'money' }, h('span', null, '$'), inp, sel),
          h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: S.inversion.resumen, onchange: e => { S.inversion.resumen = e.target.checked; save(); } }), 'Mostrar la lista de servicios debajo del valor')),
        auto.length ? block('Notas que vienen de los servicios', 'Se editan en cada servicio', h('div', { class: 'auto-notes' }, [...new Set(auto)].map(t => h('div', { class: 'auto-note' }, t)))) : null,
        block('Notas adicionales', 'Ej. forma de pago, vigencia', bulletEditor(S.inversion.notas, 'inv', 'Ej. Precios válidos por 30 días.', 'Agregar nota')))
    ];
  }

  function fileName() {
    const base = (S.archivo || '').trim() || `Propuesta comercial - ${S.cliente || 'Cliente'}`;
    return base.replace(/[\\/:*?"<>|]+/g, '').replace(/\.pdf$/i, '') + '.pdf';
  }

  function stepDescargar() {
    const status = h('div', { class: 'status', id: 'dlStatus' });
    const btn = h('button', { type: 'button', class: 'btn primary huge', id: 'dlBtn', onclick: () => exportPDF(btn, status) }, 'Descargar PDF');
    const empty = clean(active().flatMap(s => [...(s.puntos || []), ...(s.entregables || []).map(d => d.nombre)])).length === 0;
    return [
      ...question('Último paso', 'Todo listo para [' + (S.cliente || 'el cliente') + ']', `Revisa las diapositivas. Si algo no cuadra, toca cualquier paso de arriba para corregirlo. El PDF sale en formato 16:9, igual a la vista previa.`),
      h('div', { class: 'stack' },
        empty ? h('div', { class: 'auto-note' }, 'Ningún servicio tiene puntos todavía. Vuelve a «Servicios» y activa al menos uno.') : null,
        block('Archivo', null,
          field('Nombre del archivo', S.archivo, v => S.archivo = v, { id: 'archivo', placeholder: `Propuesta comercial - ${S.cliente || 'Cliente'}` }),
          h('div', { class: 'download' }, btn, status)))
    ];
  }

  /* ---------- Render ---------- */
  function renderPanel() {
    const st = steps(); const cur = st[currentIndex()];
    S.paso = cur.key;
    const panel = $('#panel'); panel.innerHTML = '';
    let content;
    if (cur.key === 'cliente') content = stepCliente();
    else if (cur.key === 'servicios') content = stepServicios();
    else if (cur.sec) content = stepSeccion(cur.sec);
    else if (cur.key === 'equipo') content = stepEquipo();
    else if (cur.key === 'inversion') content = stepInversion();
    else content = stepDescargar();
    panel.append(...content.flat(Infinity).filter(Boolean));
    panel.querySelectorAll('textarea').forEach(autosize);
    if (focusAfter) {
      const [k, i, end] = focusAfter.split(':');
      const el = k.startsWith('#') ? document.getElementById(k.slice(1)) : panel.querySelector(`[data-k="${k}:${i}"]`);
      if (el) { el.focus(); const L = el.value.length; try { el.setSelectionRange(end || k.startsWith('#') ? L : 0, end || k.startsWith('#') ? L : 0); } catch (e) { /* noop */ } }
      focusAfter = null;
    }
    schedulePreview();
  }
  function render() { renderSteps(); renderPanel(); }

  $('#prevBtn').addEventListener('click', () => { const st = steps(); const i = currentIndex(); if (i > 0) go(st[i - 1].key); });
  $('#nextBtn').addEventListener('click', () => { const st = steps(); const i = currentIndex(); if (i < st.length - 1) go(st[i + 1].key); });
  $('#resetBtn').addEventListener('click', function resetAsk() {
    const area = $('#resetArea');
    const restore = () => { area.innerHTML = ''; const b = h('button', { class: 'btn ghost small', id: 'resetBtn', type: 'button', onclick: resetAsk }, 'Nueva cotización'); area.append(b); };
    area.innerHTML = '';
    area.append(h('div', { class: 'confirm-row' }, h('span', null, '¿Empezar de cero?'),
      h('button', { type: 'button', class: 'btn small danger', onclick: () => { S = defaultState(); save(); restore(); render(); toast('Nueva cotización con la plantilla base'); } }, 'Sí, borrar'),
      h('button', { type: 'button', class: 'btn small ghost', onclick: restore }, 'Cancelar')));
  });

  /* =====================================================================
     EXPORTAR PDF
     ===================================================================== */
  async function exportPDF(btn, status) {
    if (!window.html2canvas || !window.jspdf) { status.textContent = 'No se pudieron cargar las librerías del PDF. Revisa tu conexión a internet y recarga la página.'; return; }
    btn.disabled = true;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const slides = buildSlides();
      stage.style.left = '0px'; stage.style.zIndex = '-1';
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [1200, 675], compress: true });
      const scale = Math.min(2, Math.max(1.4, window.devicePixelRatio || 1.5));
      for (let i = 0; i < slides.length; i++) {
        status.textContent = `Generando diapositiva ${i + 1} de ${slides.length}…`;
        stage.innerHTML = ''; stage.append(slides[i].el);
        await new Promise(r => setTimeout(r, 40));
        const canvas = await window.html2canvas(slides[i].el, { scale, backgroundColor: '#fdfdfd', useCORS: true, logging: false, width: 1600, height: 900, windowWidth: 1600, windowHeight: 900, scrollX: 0, scrollY: -window.scrollY });
        if (i > 0) pdf.addPage([1200, 675], 'landscape');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 1200, 675, undefined, 'FAST');
      }
      pdf.setProperties({ title: `${S.etiqueta} — ${S.cliente}`, author: 'Brandgo', creator: 'Cotizador Brandgo' });
      const name = fileName();
      status.textContent = 'Preparando la descarga…';
      const saved = await deliver(pdf, name);
      status.textContent = saved ? `Listo: ${name}` : 'Descarga cancelada.';
      if (saved) toast('PDF descargado');
    } catch (e) {
      console.error(e);
      status.textContent = 'No se pudo generar el PDF. Intenta de nuevo; si sigue fallando, recarga la página.';
    } finally {
      stage.style.left = ''; stage.style.zIndex = '';
      btn.disabled = false;
      renderAside();
    }
  }

  async function deliver(pdf, name) {
    // Dentro de Claude (artifact) se usa la capacidad de descargas; en cualquier otro hosting, descarga directa.
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads').catch(() => null);
      if (dl) {
        try { await dl.save({ filename: name, data: pdf.output('blob') }); return true; }
        catch (e) { if (e && e.code === 'declined') return false; throw e; }
      }
    }
    pdf.save(name);
    return true;
  }

  /* ---------- Inicio ---------- */
  $('#brandLogo').src = A.logo;
  save();
  render();
})();
