/* Utilidades compartidas entre el inicio y las cuentas de cobro (el cotizador conserva las suyas en app.js). */
(function () {
  'use strict';
  const A = window.ASSETS || { equipo: {}, icons: {} };

  const PALETTES = {
    rosa:     { name: 'Rosa',     ac: '#d41bbf', bg: '#fcf0fb', bd: '#f0bfe9', ln: '#f1d9ee' },
    naranja:  { name: 'Naranja',  ac: '#f05a0a', bg: '#fdf4ee', bd: '#f7cfb6', ln: '#f3e1d6' },
    amarillo: { name: 'Amarillo', ac: '#d69a00', bg: '#fdf9ec', bd: '#eedfa8', ln: '#efe8d2' },
    verde:    { name: 'Verde',    ac: '#16a34a', bg: '#eff9f2', bd: '#bfe5cb', ln: '#d9ecdf' },
    azul:     { name: 'Azul',     ac: '#2236e6', bg: '#eff1fe', bd: '#bfc5f6', ln: '#dcdff5' },
    violeta:  { name: 'Violeta',  ac: '#7c3aed', bg: '#f5f0fe', bd: '#d8c7fb', ln: '#e6dcf7' },
    turquesa: { name: 'Turquesa', ac: '#0891b2', bg: '#ecf8fb', bd: '#b5e2ec', ln: '#d6ecf1' }
  };

  const TEAM = [
    { id: 'mauro',  nombre: 'Mauro',  rol: 'Dirección creativa, video y fotografía', area: 'direccion' },
    { id: 'juca',   nombre: 'Juca',   rol: 'Diseño gráfico', area: 'diseno' },
    { id: 'camilo', nombre: 'Camilo', rol: 'Estrategia', area: 'estrategia' },
    { id: 'laura',  nombre: 'Laura',  rol: 'Estrategia', area: 'estrategia' },
    { id: 'malu',   nombre: 'Malu',   rol: 'Estrategia', area: 'estrategia' }
  ];

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
  const fmtMoney = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const marks = t => esc(t).replace(/\[([^\]]+)\]/g, '<mark>$1</mark>');
  const palVars = p => ({ '--c': p.ac, '--c-bg': p.bg, '--c-bd': p.bd });
  const clean = arr => (arr || []).map(x => String(x).trim()).filter(Boolean);
  function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } }
  };

  function toast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function dotTile(size, r, color) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.fillStyle = color; x.beginPath(); x.arc(size / 2, size / 2, r, 0, Math.PI * 2); x.fill();
    return `url(${c.toDataURL('image/png')})`;
  }
  document.documentElement.style.setProperty('--dots', dotTile(44, 1.6, '#e3e4ea'));
  document.documentElement.style.setProperty('--dots-slide', dotTile(80, 2.2, '#ececf1'));
  document.documentElement.style.setProperty('--dots-doc', dotTile(36, 1.1, '#efeff3'));

  /* Entrega del PDF: dentro de Claude usa la capacidad de descargas; en Vercel o local, descarga directa. */
  async function deliver(pdf, name) {
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

  /* Número a letras en español (pesos colombianos). */
  const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  function cientos(n) {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100), r = n % 100;
    let out = c ? C[c] : '';
    if (r) {
      const t = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : '');
      out += (out ? ' ' : '') + t;
    }
    return out;
  }
  const apocope = s => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
  function numeroALetras(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return 'cero';
    const parts = [];
    const millones = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
    if (millones) {
      if (millones === 1) parts.push('un millón');
      else {
        const mm = Math.floor(millones / 1000), mr = millones % 1000;
        let t = '';
        if (mm) t = (mm === 1 ? 'mil' : apocope(cientos(mm)) + ' mil');
        if (mr) t += (t ? ' ' : '') + apocope(cientos(mr));
        parts.push(t + ' millones');
      }
    }
    if (miles) parts.push(miles === 1 ? 'mil' : apocope(cientos(miles)) + ' mil');
    if (resto) parts.push(cientos(resto));
    return parts.join(' ');
  }
  function valorEnLetras(n, moneda) {
    n = Math.floor(Number(n) || 0);
    let w = numeroALetras(n);
    const exactMillions = n >= 1e6 && n % 1e6 === 0;
    const names = { COP: ['peso', 'pesos', ' m/cte'], USD: ['dólar', 'dólares', ''], EUR: ['euro', 'euros', ''], MXN: ['peso mexicano', 'pesos mexicanos', ''] };
    const [one, many, suf] = names[moneda] || names.COP;
    w = apocope(w);
    const txt = n === 1 ? 'un ' + one : w + (exactMillions ? ' de ' : ' ') + many;
    return txt.charAt(0).toUpperCase() + txt.slice(1) + suf + '.';
  }

  window.BG = { A, PALETTES, TEAM, h, esc, fmtMoney, marks, palVars, clean, autosize, store, toast, dotTile, deliver, numeroALetras, valorEnLetras };
})();
