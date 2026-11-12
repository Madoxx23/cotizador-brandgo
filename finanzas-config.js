/* Conexión del módulo de Finanzas con Supabase.
   Estos dos valores son públicos por diseño: la seguridad la dan el inicio de sesión
   y las reglas de acceso (Row Level Security) de supabase/finanzas.sql.
   Nunca pongas aquí la "service_role key". */
window.FINANZAS_CONFIG = {
  supabaseUrl: 'https://diwpxgrouvjyadtqjhpq.supabase.co',
  supabaseAnonKey: 'sb_publishable_NMU6EiiUY_N4yimPNM8I1g_eVCq_qb6'   // Project Settings → API Keys → "Publishable key"
};
