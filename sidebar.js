/* Barra lateral de navegación (todas las páginas).
   Se carga en el <head> ANTES de theme.js: marca el documento de inmediato para que no salte
   el diseño, y construye la barra al cargar la página (antes de que theme.js arme sus interruptores).
   En computador se puede ocultar (se recuerda en este navegador); en el celular se abre como cajón. */
(function () {
  'use strict';
  const KEY = 'brandgo-barra';
  const root = document.documentElement;
  let closed = false;
  try { closed = localStorage.getItem(KEY) === 'cerrada'; } catch (e) { /* sin almacenamiento */ }
  root.classList.add('has-sb');
  if (closed) root.classList.add('sb-closed');

  const svg = (d, cls) => `<svg viewBox="0 0 24 24" class="${cls || 'sb-ico'}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    panel: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>',
    chev: '<path d="M7 10l5 5 5-5"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    // Íconos de línea, sin color (como Attio)
    cotizar: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h4"/>',
    cobro: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.4"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
    finanzas: '<path d="M4 20h16"/><path d="M6.5 16.5V12M11 16.5V7.5M15.5 16.5v-6M20 16.5V9.5"/>',
    guiones: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.2"/><path d="M15.5 10.5l5-3v9l-5-3"/>',
    crm: '<circle cx="9" cy="7.5" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.2a6 6 0 0 1 3 5.8"/>',
    logout: '<path d="M15 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16.5 14.5 12 10 7.5M14.5 12H4"/>'
  };
  const TOOLS = [
    ['cotizador.html', 'Cotizar una campaña', 'cotizar'],
    ['cuenta-de-cobro.html', 'Cuentas de cobro', 'cobro'],
    ['finanzas.html', 'Finanzas', 'finanzas', true],
    ['guiones.html', 'Guiones de rodaje', 'guiones'],
    ['crm', 'CRM de clientes', 'crm']
  ];

  function current() {
    const p = location.pathname.split('/').pop();
    return p === '' || p === 'index.html' ? 'inicio' : p;
  }
  function setClosed(v) {
    closed = v; root.classList.toggle('sb-closed', v);
    try { localStorage.setItem(KEY, v ? 'cerrada' : 'abierta'); } catch (e) { /* noop */ }
  }
  const isMobile = () => window.matchMedia('(max-width: 899px)').matches;
  function openMobile(v) { root.classList.toggle('sb-open', v); }

  function build() {
    if (document.getElementById('sb')) return;
    const here = current();
    const aside = document.createElement('aside');
    aside.className = 'sb'; aside.id = 'sb'; aside.setAttribute('aria-label', 'Navegación');
    aside.innerHTML = `
      <div class="sb-head">
        <a class="sb-brand" href="./"><img alt="" id="sbLogo"><b>Brandgo</b></a>
        <button type="button" class="sb-btn sb-hide" aria-label="Ocultar barra lateral" title="Ocultar barra lateral">${svg(I.panel)}</button>
      </div>
      <nav class="sb-nav">
        <a class="sb-item${here === 'inicio' ? ' on' : ''}" href="./"${here === 'inicio' ? ' aria-current="page"' : ''}>${svg(I.home)}<span>Inicio</span></a>
        <div class="sb-sec" id="sbTools">
          <button type="button" class="sb-sec-h" aria-expanded="true">${svg(I.chev, 'sb-chev')}Herramientas</button>
          <div class="sb-sec-b">
            ${TOOLS.map(([href, label, ic, lock]) => `<a class="sb-item${here === href ? ' on' : ''}" href="${href}"${here === href ? ' aria-current="page"' : ''}>
              ${svg(I[ic])}<span>${label}</span>${lock ? svg(I.lock, 'sb-lock') : ''}</a>`).join('')}
          </div>
        </div>
      </nav>
      <div class="sb-foot">
        <div class="theme-switch"></div>
        <div class="sb-user" id="sbUser" hidden></div>
      </div>`;
    document.body.prepend(aside);
    const scrim = document.createElement('div'); scrim.className = 'sb-scrim'; scrim.addEventListener('click', () => openMobile(false));
    document.body.prepend(scrim);

    const logo = aside.querySelector('#sbLogo');
    const setLogo = () => { if (window.BG && window.BG.A) logo.src = window.BG.A.logo; };
    let tries = 0; const t = setInterval(() => { setLogo(); if (logo.getAttribute('src') || ++tries > 40) clearInterval(t); }, 50); setLogo();

    aside.querySelector('.sb-hide').addEventListener('click', () => { if (isMobile()) openMobile(false); else setClosed(true); });
    const sec = aside.querySelector('#sbTools .sb-sec-h');
    sec.addEventListener('click', () => { const open = sec.getAttribute('aria-expanded') !== 'true'; sec.setAttribute('aria-expanded', String(open)); aside.querySelector('#sbTools').classList.toggle('shut', !open); });
    aside.querySelectorAll('a.sb-item').forEach(a => a.addEventListener('click', () => openMobile(false)));

    // Botón para abrir la barra desde la barra superior
    const bar = document.querySelector('.topbar-in');
    if (bar) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sb-btn sb-show'; b.setAttribute('aria-label', 'Mostrar barra lateral'); b.title = 'Mostrar barra lateral';
      b.innerHTML = svg(I.panel);
      b.addEventListener('click', () => { if (isMobile()) openMobile(true); else setClosed(false); });
      bar.prepend(b);
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') openMobile(false); });
  }
  // ---- Cuenta de la sesión única (cookie sb-<proyecto>-auth-token, ver sesion.js). Igual que el pie del CRM.
  const COOKIE = 'sb-diwpxgrouvjyadtqjhpq-auth-token';
  function cookies() {
    const out = {};
    document.cookie.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
    return out;
  }
  function sessionEmail() {
    try {
      const c = cookies();
      let raw = c[COOKIE];
      if (!raw) { const ch = []; for (let i = 0; c[COOKIE + '.' + i]; i++) ch.push(c[COOKIE + '.' + i]); raw = ch.join(''); }
      if (!raw) return null;
      raw = decodeURIComponent(raw);
      if (raw.indexOf('base64-') === 0) {
        const b = raw.slice(7).replace(/-/g, '+').replace(/_/g, '/');
        const bin = atob(b + '==='.slice((b.length + 3) % 4));
        raw = new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
      }
      const s = JSON.parse(raw);
      return (s.user && s.user.email) || null;
    } catch (e) { return null; }
  }
  async function salir() {
    try { if (window.BGSesion && window.BGSesion.cliente()) await window.BGSesion.cliente().auth.signOut(); } catch (e) { /* sigue: se borra la cookie igual */ }
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    Object.keys(cookies()).filter(n => n === COOKIE || n.indexOf(COOKIE + '.') === 0)
      .forEach(n => { document.cookie = n + '=; Path=/; Max-Age=0; SameSite=Lax' + secure; });
    location.reload();
  }
  function renderUser() {
    const box = document.getElementById('sbUser');
    if (!box) return;
    const email = sessionEmail();
    box.hidden = !email;
    if (!email) { box.innerHTML = ''; return; }
    const ini = (email[0] || '?').toUpperCase();   // igual que Initials del CRM
    box.innerHTML = '<span class="sb-ini" aria-hidden="true"></span><span class="sb-mail"></span>' +
      '<button type="button" class="sb-btn sb-out" aria-label="Cerrar sesión" title="Cerrar sesión">' + svg(I.logout) + '</button>';
    box.querySelector('.sb-ini').textContent = ini;
    box.querySelector('.sb-mail').textContent = email;
    box.querySelector('.sb-out').addEventListener('click', salir);
  }
  window.BGBarra = { cuenta: renderUser };   // las herramientas la llaman al entrar o salir

  function start() { build(); renderUser(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('focus', renderUser);
})();
