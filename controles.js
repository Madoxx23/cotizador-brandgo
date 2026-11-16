/* Controles propios con la línea gráfica de Brandgo (computador con mouse).
   Reemplaza las ventanas nativas del navegador por menús del mismo estilo:
   - <select>: lista desplegable.
   - <input type="date">: calendario.
   - <input type="month">: selector de mes.
   No cambia el HTML: el control original sigue guardando el valor y recibe los eventos
   «input» y «change» de siempre, así que el resto del código no se entera.
   En pantallas táctiles se deja el control nativo del teléfono. */
(function () {
  'use strict';
  const fine = () => window.matchMedia('(pointer: fine)').matches;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];
  const DOTS = { pagado: '#22C55E', pendiente: '#EF4444', proceso: '#EAB308' };
  const ICO = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>'
  };
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  let pop = null, anchor = null, onKey = null;
  function close() {
    if (!pop) return;
    pop.remove(); pop = null;
    if (anchor) anchor.classList.remove('ctl-open');
    anchor = null; onKey = null;
  }
  function place() {
    if (!pop || !anchor) return;
    const r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
    let top = r.bottom + 6, left = r.left;
    if (top + h > vh - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
    left = Math.max(8, Math.min(left, vw - w - 8));
    pop.style.top = Math.max(8, top) + 'px'; pop.style.left = left + 'px';
  }
  function open(target, node, keys) {
    close();
    anchor = target; anchor.classList.add('ctl-open');
    pop = el('div', 'pop'); pop.setAttribute('role', 'dialog');
    pop.append(node);
    document.body.append(pop);
    pop.style.minWidth = Math.max(target.getBoundingClientRect().width, 0) + 'px';
    place();
    onKey = keys || null;
  }
  function fire(input) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------- Lista desplegable ---------- */
  function openSelect(sel) {
    const opts = [...sel.options].filter(o => !o.hidden);
    const list = el('div', 'pop-list'); list.setAttribute('role', 'listbox');
    const dots = !!sel.closest('.st-sel');
    let idx = Math.max(0, opts.findIndex(o => o.selected));
    const items = opts.map((o, i) => {
      const it = el('button', 'pop-item' + (o.selected ? ' on' : '') + (o.disabled ? ' off' : ''));
      it.type = 'button'; it.setAttribute('role', 'option'); it.setAttribute('aria-selected', o.selected ? 'true' : 'false');
      if (dots && DOTS[o.value]) { const d = el('i', 'pop-dot'); d.style.background = DOTS[o.value]; it.append(d); }
      it.append(el('span', 'pop-txt', '')); it.lastChild.textContent = o.textContent;
      it.append(el('span', 'pop-check', o.selected ? ICO.check : ''));
      if (!o.disabled) it.addEventListener('click', () => choose(i));
      it.addEventListener('mousemove', () => hi(i));
      list.append(it);
      return it;
    });
    function hi(i) { idx = i; items.forEach((it, k) => it.classList.toggle('hi', k === i)); items[i] && items[i].scrollIntoView({ block: 'nearest' }); }
    function choose(i) {
      const o = opts[i]; if (!o || o.disabled) return;
      const changed = sel.value !== o.value;
      sel.value = o.value; close(); sel.focus();
      if (changed) fire(sel);
    }
    open(sel.closest('.st-sel') || sel, list, e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); hi(Math.min(items.length - 1, idx + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hi(Math.max(0, idx - 1)); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(idx); }
    });
    hi(idx);
  }

  /* ---------- Calendario ---------- */
  function openDate(input) {
    const today = new Date();
    const val = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : '';
    const sel = val ? new Date(val + 'T12:00:00') : null;
    let y = (sel || today).getFullYear(), m = (sel || today).getMonth();
    const min = input.min || '', max = input.max || '';
    const box = el('div', 'cal');
    function set(v) { input.value = v; close(); input.focus(); fire(input); }
    function draw() {
      box.innerHTML = '';
      const head = el('div', 'cal-h');
      const title = el('b', null); title.textContent = `${MESES[m]} ${y}`;
      const nav = el('div', 'cal-nav');
      const bp = el('button', 'cal-btn', ICO.prev); bp.type = 'button'; bp.setAttribute('aria-label', 'Mes anterior');
      const bn = el('button', 'cal-btn', ICO.next); bn.type = 'button'; bn.setAttribute('aria-label', 'Mes siguiente');
      bp.onclick = () => { m--; if (m < 0) { m = 11; y--; } draw(); };
      bn.onclick = () => { m++; if (m > 11) { m = 0; y++; } draw(); };
      nav.append(bp, bn); head.append(title, nav); box.append(head);
      const grid = el('div', 'cal-g');
      DIAS.forEach(d => grid.append(el('span', 'cal-w', d)));
      const first = new Date(y, m, 1), start = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      const prevDays = new Date(y, m, 0).getDate();
      const cells = Math.ceil((start + days) / 7) * 7;
      for (let i = 0; i < cells; i++) {
        let d = i - start + 1, mm = m, yy = y, out = false;
        if (d < 1) { d = prevDays + d; mm = m - 1; out = true; } else if (d > days) { d = d - days; mm = m + 1; out = true; }
        if (mm < 0) { mm = 11; yy--; } if (mm > 11) { mm = 0; yy++; }
        const v = iso(yy, mm, d);
        const b = el('button', 'cal-d' + (out ? ' out' : '') + (v === val ? ' on' : '') + (v === iso(today.getFullYear(), today.getMonth(), today.getDate()) ? ' today' : ''));
        b.type = 'button'; b.textContent = d;
        if ((min && v < min) || (max && v > max)) b.disabled = true;
        b.onclick = () => set(v);
        grid.append(b);
      }
      box.append(grid);
      const foot = el('div', 'cal-f');
      const clear = el('button', 'cal-link'); clear.type = 'button'; clear.textContent = 'Borrar';
      clear.onclick = () => set('');
      const now = el('button', 'cal-link'); now.type = 'button'; now.textContent = 'Hoy';
      now.onclick = () => set(iso(today.getFullYear(), today.getMonth(), today.getDate()));
      if (input.required) clear.hidden = true;
      foot.append(clear, now); box.append(foot);
      place();
    }
    draw();
    open(input, box);
  }

  /* ---------- Selector de mes ---------- */
  function openMonth(input) {
    const today = new Date();
    const val = /^\d{4}-\d{2}$/.test(input.value) ? input.value : '';
    let y = val ? Number(val.slice(0, 4)) : today.getFullYear();
    const box = el('div', 'cal cal-m');
    function set(v) { input.value = v; close(); input.focus(); fire(input); }
    function draw() {
      box.innerHTML = '';
      const head = el('div', 'cal-h');
      const title = el('b', null); title.textContent = String(y);
      const nav = el('div', 'cal-nav');
      const bp = el('button', 'cal-btn', ICO.prev); bp.type = 'button'; bp.setAttribute('aria-label', 'Año anterior');
      const bn = el('button', 'cal-btn', ICO.next); bn.type = 'button'; bn.setAttribute('aria-label', 'Año siguiente');
      bp.onclick = () => { y--; draw(); }; bn.onclick = () => { y++; draw(); };
      nav.append(bp, bn); head.append(title, nav); box.append(head);
      const grid = el('div', 'cal-mg');
      MES_C.forEach((n, i) => {
        const v = `${y}-${pad(i + 1)}`;
        const b = el('button', 'cal-d' + (v === val ? ' on' : '') + (v === `${today.getFullYear()}-${pad(today.getMonth() + 1)}` ? ' today' : ''));
        b.type = 'button'; b.textContent = n; b.onclick = () => set(v);
        grid.append(b);
      });
      box.append(grid);
      const foot = el('div', 'cal-f');
      const now = el('button', 'cal-link'); now.type = 'button'; now.textContent = 'Este mes';
      now.onclick = () => set(`${today.getFullYear()}-${pad(today.getMonth() + 1)}`);
      foot.append(el('span'), now); box.append(foot);
      place();
    }
    draw();
    open(input, box);
  }

  /* ---------- Conexión con la página ---------- */
  document.addEventListener('mousedown', e => {
    if (pop && pop.contains(e.target)) return;
    const t = e.target;
    let ctl = null;
    if (t.closest && t.closest('.st-sel')) ctl = t.closest('.st-sel').querySelector('select');
    else if (t.tagName === 'SELECT') ctl = t;
    else if (t.tagName === 'INPUT' && (t.type === 'date' || t.type === 'month')) ctl = t;
    if (!ctl || !fine() || ctl.disabled || ctl.multiple || ctl.readOnly) { if (pop && t !== anchor) close(); return; }
    if (pop && (anchor === ctl || anchor === ctl.closest('.st-sel'))) { e.preventDefault(); close(); return; }
    e.preventDefault();
    ctl.focus({ preventScroll: true });
    if (ctl.tagName === 'SELECT') openSelect(ctl);
    else if (ctl.type === 'date') openDate(ctl);
    else openMonth(ctl);
  }, true);
  // Teclado: Enter o espacio abren el menú; Escape lo cierra sin cerrar la hoja de atrás
  document.addEventListener('keydown', e => {
    if (pop) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const a = anchor; close(); if (a && a.focus) (a.querySelector && a.querySelector('select') || a).focus(); return; }
      if (onKey) { onKey(e); if (e.defaultPrevented) e.stopPropagation(); }
      return;
    }
    const t = e.target;
    if (!fine() || !t || !(e.key === 'Enter' || (e.key === ' ' && t.tagName === 'SELECT') || (e.altKey && e.key === 'ArrowDown'))) return;
    if (t.tagName === 'SELECT' && !t.multiple) { e.preventDefault(); openSelect(t); }
    else if (t.tagName === 'INPUT' && t.type === 'date' && e.key !== ' ') { e.preventDefault(); openDate(t); }
    else if (t.tagName === 'INPUT' && t.type === 'month' && e.key !== ' ') { e.preventDefault(); openMonth(t); }
  }, true);
  // Algunos navegadores abren su calendario con el clic: se evita
  document.addEventListener('click', e => {
    const t = e.target;
    if (fine() && t && t.tagName === 'INPUT' && (t.type === 'date' || t.type === 'month')) e.preventDefault();
  }, true);
  window.addEventListener('resize', close);
  document.addEventListener('scroll', e => { if (pop && !pop.contains(e.target)) place(); }, true);
})();
