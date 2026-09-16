drop policy if exists "members manage appointments" on public.appointments;
drop trigger if exists appointments_set_updated_at on public.appointments;
drop table if exists public.appointments cascade;
