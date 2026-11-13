-- =====================================================================
-- Brandgo · Guiones de rodaje
-- Pegar completo en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.
--
-- Acceso: este módulo es de uso abierto para el equipo (sin cuenta), como se decidió.
--   * Cualquiera con la web puede ver, crear y editar cuentas y guiones.
--   * Nadie puede BORRAR desde la web: solo archivar. Lo archivado se recupera desde aquí.
--   * Las casillas del checklist se marcan una a una con la función marcar_check,
--     para que dos celulares en el rodaje no se pisen.
-- Finanzas no se ve afectado: sus tablas siguen cerradas.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Cuentas (clientes / empresas) ----------
create table if not exists public.guion_cuentas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) between 1 and 120),
  color       text not null default 'azul' check (color in ('rosa', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'turquesa')),
  notas       text check (length(notas) <= 1000),
  archivada   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Guiones ----------
create table if not exists public.guiones (
  id          uuid primary key default gen_random_uuid(),
  cuenta_id   uuid not null references public.guion_cuentas (id) on delete restrict,
  titulo      text not null check (length(trim(titulo)) between 1 and 160),
  autor       text check (length(autor) <= 80),
  texto       text not null default '' check (length(texto) <= 60000),
  estructura  jsonb not null default '{}'::jsonb check (jsonb_typeof(estructura) = 'object'),
  checks      jsonb not null default '{}'::jsonb check (jsonb_typeof(checks) = 'object'),
  archivado   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists guiones_cuenta_idx on public.guiones (cuenta_id);

-- updated_at automático (la función ya existe si corriste finanzas.sql; se crea si no)
create or replace function public.tocar_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists guion_cuentas_updated on public.guion_cuentas;
create trigger guion_cuentas_updated before update on public.guion_cuentas for each row execute function public.tocar_updated_at();
drop trigger if exists guiones_updated on public.guiones;
create trigger guiones_updated before update on public.guiones for each row execute function public.tocar_updated_at();

-- ---------- Acceso abierto sin borrar ----------
alter table public.guion_cuentas enable row level security;
alter table public.guiones enable row level security;

drop policy if exists "equipo ve cuentas" on public.guion_cuentas;
create policy "equipo ve cuentas" on public.guion_cuentas for select to anon, authenticated using (true);
drop policy if exists "equipo crea cuentas" on public.guion_cuentas;
create policy "equipo crea cuentas" on public.guion_cuentas for insert to anon, authenticated with check (true);
drop policy if exists "equipo edita cuentas" on public.guion_cuentas;
create policy "equipo edita cuentas" on public.guion_cuentas for update to anon, authenticated using (true) with check (true);

drop policy if exists "equipo ve guiones" on public.guiones;
create policy "equipo ve guiones" on public.guiones for select to anon, authenticated using (true);
drop policy if exists "equipo crea guiones" on public.guiones;
create policy "equipo crea guiones" on public.guiones for insert to anon, authenticated with check (true);
drop policy if exists "equipo edita guiones" on public.guiones;
create policy "equipo edita guiones" on public.guiones for update to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.guion_cuentas, public.guiones to anon, authenticated;
revoke delete on public.guion_cuentas, public.guiones from anon, authenticated;

-- ---------- Marcar una casilla sin pisar las demás ----------
create or replace function public.marcar_check(gid uuid, item text, valor boolean)
returns jsonb language sql set search_path = public as $$
  update public.guiones
     set checks = case when valor then coalesce(checks, '{}'::jsonb) || jsonb_build_object(item, true)
                       else coalesce(checks, '{}'::jsonb) - item end
   where id = gid
  returning checks;
$$;
grant execute on function public.marcar_check(uuid, text, boolean) to anon, authenticated;

-- ---------- Avance en vivo entre celulares (Realtime) ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guiones') then
    alter publication supabase_realtime add table public.guiones;
  end if;
end $$;

-- Para recuperar algo archivado:
-- update public.guiones set archivado = false where titulo ilike '%nombre%';
-- update public.guion_cuentas set archivada = false where nombre ilike '%nombre%';
