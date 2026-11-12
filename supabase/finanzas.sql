-- =====================================================================
-- Brandgo · Módulo de Finanzas · Esquema seguro para Supabase
-- Pegar completo en Supabase → SQL Editor → Run. Se puede volver a correr sin romper nada.
--
-- Seguridad:
--   * Row Level Security (RLS) activo en todas las tablas: sin sesión no se lee ni se escribe nada.
--   * Solo las cuentas registradas en la tabla `miembros` pueden ver o editar datos.
--   * La tabla `miembros` solo se edita desde este editor SQL (la web no puede agregarse a sí misma).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Quién tiene acceso ----------
create table if not exists public.miembros (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function public.es_miembro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.miembros where user_id = auth.uid());
$$;

revoke all on function public.es_miembro() from public, anon;
grant execute on function public.es_miembro() to authenticated;

-- ---------- Clientes ----------
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) between 1 and 120),
  categoria   text not null check (categoria in ('mensual', 'campana', 'servicio')),
  valor       numeric(14, 0) not null default 0 check (valor >= 0),
  dia_pago    smallint check (dia_pago between 1 and 31),
  activo      boolean not null default true,
  notas       text check (length(notas) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null
);

-- ---------- Pagos de clientes (un cobro por cliente y mes; los abonos registran el avance) ----------
create table if not exists public.pagos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete restrict,
  mes         date not null check (extract(day from mes) = 1),
  categoria   text not null check (categoria in ('mensual', 'campana', 'servicio')),
  concepto    text check (length(concepto) <= 200),
  valor       numeric(14, 0) not null check (valor >= 0),
  abonos      jsonb not null default '[]'::jsonb check (jsonb_typeof(abonos) = 'array'),
  notas       text check (length(notas) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null
);
create index if not exists pagos_mes_idx on public.pagos (mes);
create index if not exists pagos_cliente_idx on public.pagos (cliente_id);

-- ---------- Gastos (incluye nómina) ----------
create table if not exists public.gastos (
  id          uuid primary key default gen_random_uuid(),
  concepto    text not null check (length(trim(concepto)) between 1 and 160),
  categoria   text not null check (categoria in ('hormiga', 'servicios', 'insumos', 'prestamo', 'alquiler', 'equipos', 'suscripcion', 'nomina', 'extra')),
  movimiento  text not null default 'salida' check (movimiento in ('salida', 'entrada')),
  fecha       date not null,
  mes         date not null check (extract(day from mes) = 1),
  valor       numeric(14, 0) not null check (valor >= 0),
  notas       text check (length(notas) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null
);
create index if not exists gastos_mes_idx on public.gastos (mes);

-- ---------- updated_at automático ----------
create or replace function public.tocar_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists clientes_updated on public.clientes;
create trigger clientes_updated before update on public.clientes for each row execute function public.tocar_updated_at();
drop trigger if exists pagos_updated on public.pagos;
create trigger pagos_updated before update on public.pagos for each row execute function public.tocar_updated_at();
drop trigger if exists gastos_updated on public.gastos;
create trigger gastos_updated before update on public.gastos for each row execute function public.tocar_updated_at();

-- ---------- Row Level Security ----------
alter table public.miembros enable row level security;
alter table public.clientes enable row level security;
alter table public.pagos    enable row level security;
alter table public.gastos   enable row level security;

-- Cada persona solo puede ver su propia fila en `miembros` (para que la web sepa si tiene acceso).
drop policy if exists "miembro ve su fila" on public.miembros;
create policy "miembro ve su fila" on public.miembros for select to authenticated using (user_id = auth.uid());

drop policy if exists "miembros gestionan clientes" on public.clientes;
create policy "miembros gestionan clientes" on public.clientes for all to authenticated using (public.es_miembro()) with check (public.es_miembro());
drop policy if exists "miembros gestionan pagos" on public.pagos;
create policy "miembros gestionan pagos" on public.pagos for all to authenticated using (public.es_miembro()) with check (public.es_miembro());
drop policy if exists "miembros gestionan gastos" on public.gastos;
create policy "miembros gestionan gastos" on public.gastos for all to authenticated using (public.es_miembro()) with check (public.es_miembro());

-- Los visitantes sin sesión no tienen ningún permiso sobre estas tablas.
revoke all on public.miembros, public.clientes, public.pagos, public.gastos from anon;
grant select on public.miembros to authenticated;
grant select, insert, update, delete on public.clientes, public.pagos, public.gastos to authenticated;

-- =====================================================================
-- PASO FINAL (correr aparte, después de crear los usuarios en Authentication → Users):
-- cambia los correos por los de las personas autorizadas.
--
-- insert into public.miembros (user_id, email)
-- select id, email from auth.users where email in ('tu-correo@ejemplo.com')
-- on conflict (user_id) do nothing;
--
-- Para quitarle el acceso a alguien:
-- delete from public.miembros where email = 'correo@ejemplo.com';
-- =====================================================================
