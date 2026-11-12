-- =====================================================================
-- Brandgo · Finanzas · Metas de facturación por mes
-- Pegar en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.
-- (Ya viene incluido en finanzas.sql para proyectos nuevos.)
-- =====================================================================
create table if not exists public.metas (
  mes         date primary key check (extract(day from mes) = 1),
  meta        numeric(14, 0) not null check (meta >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null
);

drop trigger if exists metas_updated on public.metas;
create trigger metas_updated before update on public.metas for each row execute function public.tocar_updated_at();

alter table public.metas enable row level security;
drop policy if exists "miembros gestionan metas" on public.metas;
create policy "miembros gestionan metas" on public.metas for all to authenticated using (public.es_miembro()) with check (public.es_miembro());

revoke all on public.metas from anon;
grant select, insert, update, delete on public.metas to authenticated;
