-- =====================================================================
-- Brandgo · Finanzas · Conexión con cotizaciones y cuentas de cobro + "Registrado por"
-- Pegar completo en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.
-- =====================================================================

-- ---------- Clientes: datos para la cuenta de cobro ----------
alter table public.clientes add column if not exists tipo_id   text check (tipo_id in ('NIT', 'C.C.', 'C.E.'));
alter table public.clientes add column if not exists num_id    text check (length(num_id) <= 40);
alter table public.clientes add column if not exists direccion text check (length(direccion) <= 200);
alter table public.clientes add column if not exists plan      text check (length(plan) <= 120);

-- ---------- Pagos: cuentas de cobro emitidas para cada cobro ----------
alter table public.pagos add column if not exists cuentas jsonb not null default '[]'::jsonb;
-- Fecha desde la que se cobra el saldo (campañas: vacía hasta finalizar)
alter table public.pagos add column if not exists vence date;

-- ---------- Quién creó y quién editó por última vez ----------
alter table public.clientes add column if not exists updated_by uuid references auth.users (id) on delete set null;
alter table public.pagos    add column if not exists updated_by uuid references auth.users (id) on delete set null;
alter table public.gastos   add column if not exists updated_by uuid references auth.users (id) on delete set null;
alter table public.equipo   add column if not exists updated_by uuid references auth.users (id) on delete set null;
alter table public.nomina   add column if not exists updated_by uuid references auth.users (id) on delete set null;

create or replace function public.marcar_autor()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  else
    new.created_by := old.created_by;  -- el autor original no se puede cambiar
  end if;
  new.updated_by := auth.uid();
  return new;
end; $$;

drop trigger if exists clientes_autor on public.clientes;
create trigger clientes_autor before insert or update on public.clientes for each row execute function public.marcar_autor();
drop trigger if exists pagos_autor on public.pagos;
create trigger pagos_autor before insert or update on public.pagos for each row execute function public.marcar_autor();
drop trigger if exists gastos_autor on public.gastos;
create trigger gastos_autor before insert or update on public.gastos for each row execute function public.marcar_autor();
drop trigger if exists equipo_autor on public.equipo;
create trigger equipo_autor before insert or update on public.equipo for each row execute function public.marcar_autor();
drop trigger if exists nomina_autor on public.nomina;
create trigger nomina_autor before insert or update on public.nomina for each row execute function public.marcar_autor();

-- ---------- Nombre visible de cada miembro (para "Registrado por") ----------
alter table public.miembros add column if not exists nombre text check (length(nombre) <= 60);
alter table public.miembros add column if not exists avatar text check (avatar in ('camilo', 'juca', 'laura', 'malu', 'mauro', 'paula', 'mariale'));
update public.miembros set nombre = initcap(split_part(email, '@', 1)) where nombre is null;

-- Los miembros pueden ver los nombres de los demás miembros (no cambiarlos).
drop policy if exists "miembros ven miembros" on public.miembros;
create policy "miembros ven miembros" on public.miembros for select to authenticated using (public.es_miembro());

select email, nombre, avatar from public.miembros order by email;
