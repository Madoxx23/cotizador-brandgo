-- =====================================================================
-- Brandgo · Finanzas · Nómina con abonos y equipo
-- Pegar completo en Supabase → SQL Editor → New query → Run.
-- 1) Crea las tablas `equipo` (personas y su salario) y `nomina` (un pago por persona y mes, con abonos).
-- 2) Pasa la nómina que estaba registrada como gasto (octubre) a la tabla nueva, marcada como pagada,
--    y la quita de gastos. Se puede volver a correr: lo que ya se pasó no se duplica.
-- =====================================================================

create table if not exists public.equipo (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) between 1 and 120),
  rol         text check (length(rol) <= 80),
  avatar      text check (avatar in ('camilo', 'juca', 'laura', 'malu', 'mauro', 'paula', 'mariale')),
  tipo        text not null default 'nomina' check (tipo in ('nomina', 'extra')),
  salario     numeric(14, 0) not null default 0 check (salario >= 0),
  dia_pago    smallint default 15 check (dia_pago between 1 and 31),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null
);

create table if not exists public.nomina (
  id          uuid primary key default gen_random_uuid(),
  persona_id  uuid not null references public.equipo (id) on delete restrict,
  mes         date not null check (extract(day from mes) = 1),
  tipo        text not null default 'nomina' check (tipo in ('nomina', 'extra')),
  valor       numeric(14, 0) not null check (valor >= 0),
  abonos      jsonb not null default '[]'::jsonb check (jsonb_typeof(abonos) = 'array'),
  notas       text check (length(notas) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  unique (persona_id, mes)
);
create index if not exists nomina_mes_idx on public.nomina (mes);

drop trigger if exists equipo_updated on public.equipo;
create trigger equipo_updated before update on public.equipo for each row execute function public.tocar_updated_at();
drop trigger if exists nomina_updated on public.nomina;
create trigger nomina_updated before update on public.nomina for each row execute function public.tocar_updated_at();

alter table public.equipo enable row level security;
alter table public.nomina enable row level security;
drop policy if exists "miembros gestionan equipo" on public.equipo;
create policy "miembros gestionan equipo" on public.equipo for all to authenticated using (public.es_miembro()) with check (public.es_miembro());
drop policy if exists "miembros gestionan nomina" on public.nomina;
create policy "miembros gestionan nomina" on public.nomina for all to authenticated using (public.es_miembro()) with check (public.es_miembro());
revoke all on public.equipo, public.nomina from anon;
grant select, insert, update, delete on public.equipo, public.nomina to authenticated;

-- ---------- Pasar la nómina registrada como gasto ----------
begin;

insert into public.equipo (nombre, rol, avatar, tipo, salario, dia_pago)
select distinct on (lower(trim(g.concepto)))
  trim(g.concepto),
  case
    when g.concepto ilike 'camilo%' or g.concepto ilike 'laura%' or g.concepto ilike 'mar_a luc_a%' then 'Estrategia'
    when g.concepto ilike 'juan camilo%' then 'Diseño gráfico'
    when g.concepto ilike 'mauro%' then 'Dirección creativa, video y fotografía'
    when g.concepto ilike 'paula%' then 'Edición'
    else null end,
  case
    when g.concepto ilike 'camilo%' then 'camilo'
    when g.concepto ilike 'juan camilo%' then 'juca'
    when g.concepto ilike 'laura%' then 'laura'
    when g.concepto ilike 'mar_a luc_a%' then 'malu'
    when g.concepto ilike 'mauro%' then 'mauro'
    when g.concepto ilike 'paula%' then 'paula'
    when g.concepto ilike 'mariale%' then 'mariale'
    else null end,
  g.categoria, g.valor, 15
from public.gastos g
where g.categoria in ('nomina', 'extra')
  and not exists (select 1 from public.equipo e where lower(e.nombre) = lower(trim(g.concepto)))
order by lower(trim(g.concepto)), g.mes desc;

insert into public.nomina (persona_id, mes, tipo, valor, abonos)
select e.id, g.mes, g.categoria, g.valor, jsonb_build_array(jsonb_build_object('fecha', g.fecha, 'valor', g.valor))
from public.gastos g
join public.equipo e on lower(e.nombre) = lower(trim(g.concepto))
where g.categoria in ('nomina', 'extra')
on conflict (persona_id, mes) do nothing;

delete from public.gastos g
using public.equipo e
where g.categoria in ('nomina', 'extra')
  and lower(e.nombre) = lower(trim(g.concepto))
  and exists (select 1 from public.nomina n where n.persona_id = e.id and n.mes = g.mes);

commit;

-- Verificación: debe mostrar a cada persona con su valor de octubre.
select e.nombre, e.avatar, n.mes, n.valor, n.abonos from public.nomina n join public.equipo e on e.id = n.persona_id order by n.mes desc, e.nombre;
