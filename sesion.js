/* Sesión única de Brandgo (Finanzas, Cuentas de cobro, Guiones y el CRM en /crm).
   Todas las herramientas usan el mismo proyecto de Supabase y guardan la sesión en UNA cookie del dominio,
   con el mismo formato que usa el CRM (@supabase/ssr): nombre sb-<proyecto>-auth-token, valor «base64-…»
   y trozos .0, .1… si pasa de 3180 caracteres. Así, entrar en cualquiera sirve para todas.
   Es una cookie de sesión: dura hasta cerrar el navegador.
   Requiere supabase-js (UMD) y finanzas-config.js cargados antes. */
(function () {
  'use strict';
  const PREFIX = 'base64-';
  const CHUNK = 3180;
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function toB64url(str) {
    const bytes = new TextEncoder().encode(str);
    let out = '', q = 0, bits = 0;
    for (const b of bytes) { q = (q << 8) | b; bits += 8; while (bits >= 6) { out += B64[(q >> (bits - 6)) & 63]; bits -= 6; } q &= 0xff; }
    if (bits > 0) out += B64[(q << (6 - bits)) & 63];
    return out;
  }
  function fromB64url(s) {
    const bytes = []; let q = 0, bits = 0;
    for (const ch of s) { const v = B64.indexOf(ch === '+' ? '-' : ch === '/' ? '_' : ch); if (v < 0) continue; q = (q << 6) | v; bits += 6; if (bits >= 8) { bytes.push((q >> (bits - 8)) & 0xff); bits -= 8; q &= 0xff; } }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  function all() {
    const out = {};
    document.cookie.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) { const k = p.slice(0, i).trim(); try { out[k] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { out[k] = p.slice(i + 1).trim(); } } });
    return out;
  }
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  const write = (name, value) => { document.cookie = `${name}=${value}; Path=/; SameSite=Lax${secure}`; };
  const erase = name => { document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`; };
  const parts = (c, key) => Object.keys(c).filter(n => n === key || new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+$`).test(n));

  const storage = {
    getItem(key) {
      const c = all();
      let raw = c[key];
      if (!raw) { const ch = []; for (let i = 0; c[`${key}.${i}`]; i++) ch.push(c[`${key}.${i}`]); raw = ch.join(''); }
      if (!raw) return null;
      return raw.startsWith(PREFIX) ? fromB64url(raw.slice(PREFIX.length)) : raw;
    },
    setItem(key, value) {
      const enc = PREFIX + toB64url(value);
      const chunks = enc.length <= CHUNK ? [[key, enc]] : Array.from({ length: Math.ceil(enc.length / CHUNK) }, (_, i) => [`${key}.${i}`, enc.slice(i * CHUNK, (i + 1) * CHUNK)]);
      const keep = new Set(chunks.map(([n]) => n));
      parts(all(), key).forEach(n => { if (!keep.has(n)) erase(n); });
      chunks.forEach(([n, v]) => write(n, v));
    },
    removeItem(key) { parts(all(), key).forEach(erase); }
  };

  let client = null;
  window.BGSesion = {
    /** Cliente de Supabase con la sesión compartida (una sola instancia por página). */
    cliente() {
      const cfg = window.FINANZAS_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl) return null;
      if (!client) {
        client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        });
        // La barra lateral muestra la cuenta: se actualiza al entrar o salir desde cualquier herramienta
        client.auth.onAuthStateChange(() => setTimeout(() => window.BGBarra && window.BGBarra.cuenta(), 0));
      }
      return client;
    }
  };
})();
