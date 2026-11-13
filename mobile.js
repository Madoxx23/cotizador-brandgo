/* Ajustes de interacción para celular (el diseño vive en styles.css, sección CELULAR).
   - Vista previa plegable en el cotizador y en cuentas de cobro: en el celular el formulario es lo principal. */
(function () {
  'use strict';
  const aside = document.getElementById('aside');
  if (!aside || aside.querySelector('.pv-toggle')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pv-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'asideIn');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="12" rx="2.5"/><path d="M9 20h6"/></svg><span>Ver vista previa</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>';
  btn.addEventListener('click', () => {
    const open = !aside.classList.contains('open');
    aside.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('span').textContent = open ? 'Ocultar vista previa' : 'Ver vista previa';
  });
  aside.insertBefore(btn, aside.firstChild);
})();
