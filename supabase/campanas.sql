-- =====================================================================
-- Brandgo · Finanzas · Saldos de campañas
-- `vence`: fecha desde la que se cobra el saldo de un cobro.
--   * Campañas: vacía mientras la campaña está en curso (el saldo no se cuenta como vencido);
--     el botón "Finalizar campaña" la fija en la fecha de ese día.
--   * Demás cobros: opcional; si está vacía se usa el día de pago del cliente.
-- Pegar en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.
-- =====================================================================
alter table public.pagos add column if not exists vence date;
