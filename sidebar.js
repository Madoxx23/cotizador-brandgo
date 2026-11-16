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
    // Glifos blancos dentro de los cuadritos de color
    cotizar: '<path d="M7 4.5h7l4 4V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"/><path d="M9 12.5h6M9 16h4"/>',
    cobro: '<rect x="3.5" y="6.5" width="17" height="11" rx="2"/><circle cx="12" cy="12" r="2.4"/>',
    finanzas: '<path d="M5 19.5V11M10 19.5V6M15 19.5v-6M20 19.5V9"/>',
    guiones: '<rect x="3.5" y="7" width="12" height="10.5" rx="2"/><path d="M15.5 11l5-3v9l-5-3"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17h.01"/>'
  };
  const TOOLS = [
    ['cotizador.html', 'Cotizar una campaña', 'cotizar', '#F2752B'],
    ['cuenta-de-cobro.html', 'Cuentas de cobro', 'cobro', '#2F6BDE'],
    ['finanzas.html', 'Finanzas', 'finanzas', '#7C5CE6', true],
    ['guiones.html', 'Guiones de rodaje', 'guiones', '#1FA463']
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
            ${TOOLS.map(([href, label, ic, color, lock]) => `<a class="sb-item${here === href ? ' on' : ''}" href="${href}"${here === href ? ' aria-current="page"' : ''}>
              <span class="sb-sq" style="background:${color}">${svg(I[ic], 'sb-gl')}</span><span>${label}</span>${lock ? svg(I.lock, 'sb-lock') : ''}</a>`).join('')}
          </div>
        </div>
      </nav>
      <div class="sb-foot">
        <div class="theme-switch"></div>
        <span class="sb-soon" title="Perfiles y configuración llegarán pronto">${svg(I.help)}Perfil y ajustes <i>Pronto</i></span>
      </div>`;
    document.body.prepend(aside);
    const scrim = document.createElement('div'); scrim.className = 'sb-scrim'; scrim.addEventListener('click', () => openMobile(false));
    document.body.prepend(scrim);

    const logo = aside.querySelector('#sbLogo');
    const setLogo = () => { if (window.BG && window.BG.A) logo.src = window.BG.A.logo; };
    setLogo(); if (!logo.src) window.addEventListener('load', setLogo);

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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
