-- Estado de cada gasto: pendiente o pagado.
-- Correr una vez en Supabase → SQL Editor. Los gastos que ya existen quedan como "pagado".
alter table public.gastos
  add column if not exists estado text not null default 'pagado'
  check (estado in ('pendiente', 'pagado'));
