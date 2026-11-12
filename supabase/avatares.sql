-- =====================================================================
-- Brandgo · Finanzas · Avatares de Paula y Mariale
-- Correr DESPUÉS de nomina.sql. Pegar en Supabase → SQL Editor → New query → Run.
-- =====================================================================
alter table public.equipo drop constraint if exists equipo_avatar_check;
alter table public.equipo add constraint equipo_avatar_check
  check (avatar in ('camilo', 'juca', 'laura', 'malu', 'mauro', 'paula', 'mariale'));

update public.equipo set avatar = 'paula'   where nombre ilike 'paula%'   and avatar is null;
update public.equipo set avatar = 'mariale' where nombre ilike 'mariale%' and avatar is null;

select nombre, avatar from public.equipo order by nombre;
