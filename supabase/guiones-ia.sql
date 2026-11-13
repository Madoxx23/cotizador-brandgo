-- «Etiquetar con Claude» en Guiones de rodaje.
-- Correr una vez en Supabase → SQL Editor (después de guiones.sql).
--
-- Quién puede usar Claude: las personas de «miembros» (Finanzas) y las que estén en «guion_editores».
-- Estar en guion_editores NO da acceso a Finanzas.
-- Cada persona además necesita un usuario en Authentication → Users (correo y contraseña).

create table if not exists public.guion_editores (
  email       text primary key check (email = lower(trim(email)) and position('@' in email) > 1),
  nombre      text check (length(nombre) <= 80),
  created_at  timestamptz not null default now()
);
alter table public.guion_editores enable row level security;
revoke all on public.guion_editores from anon, authenticated;
-- Los miembros de Finanzas pueden ver la lista (para administrarla desde el SQL Editor no hace falta)
drop policy if exists "miembros ven editores" on public.guion_editores;
create policy "miembros ven editores" on public.guion_editores for select to authenticated using (public.es_miembro());
grant select on public.guion_editores to authenticated;

create or replace function public.puede_usar_ia()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.es_miembro()
    or exists (select 1 from public.guion_editores e where e.email = lower(auth.jwt() ->> 'email'))
  );
$$;
revoke all on function public.puede_usar_ia() from public, anon;
grant execute on function public.puede_usar_ia() to authenticated;

-- Registro de uso: cuántos caracteres y tokens gasta cada guion (para calcular el costo real)
create table if not exists public.guion_ia_uso (
  id              bigint generated always as identity primary key,
  email           text not null default lower(auth.jwt() ->> 'email'),
  caracteres      integer not null default 0,
  tokens_entrada  integer not null default 0,
  tokens_salida   integer not null default 0,
  modelo          text,
  created_at      timestamptz not null default now()
);
alter table public.guion_ia_uso enable row level security;
revoke all on public.guion_ia_uso from anon, authenticated;
drop policy if exists "miembros ven uso" on public.guion_ia_uso;
create policy "miembros ven uso" on public.guion_ia_uso for select to authenticated using (public.es_miembro());
grant select on public.guion_ia_uso to authenticated;

create or replace function public.registrar_uso_ia(caracteres integer, tokens_entrada integer, tokens_salida integer, modelo text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.guion_ia_uso (email, caracteres, tokens_entrada, tokens_salida, modelo)
  select lower(auth.jwt() ->> 'email'), greatest(caracteres, 0), greatest(tokens_entrada, 0), greatest(tokens_salida, 0), left(modelo, 40)
  where public.puede_usar_ia();
$$;
revoke all on function public.registrar_uso_ia(integer, integer, integer, text) from public, anon;
grant execute on function public.registrar_uso_ia(integer, integer, integer, text) to authenticated;

-- Para ver el gasto aproximado (Sonnet 5.5: US$2 por millón de tokens de entrada, US$10 por millón de salida):
-- select date_trunc('month', created_at) as mes, count(*) as guiones,
--        round(sum(tokens_entrada) * 2 / 1e6 + sum(tokens_salida) * 10 / 1e6, 2) as dolares
-- from public.guion_ia_uso group by 1 order by 1 desc;
