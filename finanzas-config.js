/* Conexión del módulo de Finanzas con Supabase.
   Estos dos valores son públicos por diseño: la seguridad la dan el inicio de sesión
   y las reglas de acceso (Row Level Security) de supabase/finanzas.sql.
   Nunca pongas aquí la "service_role key". */
window.FINANZAS_CONFIG = {
  supabaseUrl: '',      // Ej. https://abcdxyz.supabase.co
  supabaseAnonKey: ''   // Project Settings → API → "anon public"
};
