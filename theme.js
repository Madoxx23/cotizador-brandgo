/* Apariencia: claro, oscuro o automático (sigue al sistema). Se carga en el <head> para evitar parpadeos.
   La elección se guarda en este navegador. Los PDF siempre salen en claro. */
(function () {
  'use strict';
  const KEY = 'brandgo-tema';
  const root = document.documentElement;
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let mode = 'auto';
  try { mode = localStorage.getItem(KEY) || 'auto'; } catch (e) { /* sin almacenamiento */ }

  function resolved() { return mode === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : mode; }
  function apply() { root.dataset.theme = resolved(); root.dataset.themeMode = mode; document.querySelectorAll('.theme-switch').forEach(sync); }
  apply();
  if (mq) (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));

  // Trama de puntos de la web en ambos temas
  function dotTile(color) {
    const c = document.createElement('canvas'); c.width = c.height = 44;
    const x = c.getContext('2d'); x.fillStyle = color; x.beginPath(); x.arc(22, 22, 1.6, 0, Math.PI * 2); x.fill();
    return `url(${c.toDataURL('image/png')})`;
  }
  root.style.setProperty('--dots-dark', dotTile('#25272e'));

  const ICONS = {
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
    dark: '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"/>',
    auto: '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M9 20h6M12 16.5V20"/>'
  };
  const LABELS = { light: 'Modo claro', dark: 'Modo oscuro', auto: 'Automático (según el equipo)' };
  const ORDER = ['light', 'dark', 'auto'];

  function sync(el) {
    const i = ORDER.indexOf(mode);
    const th = el.querySelector('.ts-thumb'); if (th) th.style.transform = `translateX(${i * 100}%)`;
    el.querySelectorAll('button').forEach(b => { const on = b.dataset.mode === mode; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
  }
  function set(m) { mode = m; try { localStorage.setItem(KEY, m); } catch (e) { /* noop */ } apply(); }

  function build(el) {
    el.setAttribute('role', 'radiogroup'); el.setAttribute('aria-label', 'Apariencia');
    el.innerHTML = '<span class="ts-thumb" aria-hidden="true"></span>' + ORDER.map(m =>
      `<button type="button" role="radio" data-mode="${m}" aria-label="${LABELS[m]}" title="${LABELS[m]}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[m]}</svg></button>`).join('');
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => set(b.dataset.mode)));
    el.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const i = (ORDER.indexOf(mode) + (e.key === 'ArrowRight' ? 1 : 2)) % 3; set(ORDER[i]);
      el.querySelector(`button[data-mode="${ORDER[i]}"]`).focus();
    });
    sync(el);
  }
  function init() { document.querySelectorAll('.theme-switch').forEach(el => { if (!el.dataset.ready) { el.dataset.ready = '1'; build(el); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.BGTheme = { get mode() { return mode; }, get theme() { return resolved(); }, set };
})();
