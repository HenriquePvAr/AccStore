alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists payment_provider_id text,
  add column if not exists payment_url text,
  add column if not exists pix_qr_code text,
  add column if not exists pix_copy_paste text,
  add column if not exists paid_at timestamptz,
  add column if not exists expires_at timestamptz;

create index if not exists orders_payment_provider_id_idx
  on public.orders (payment_provider, payment_provider_id)
  where payment_provider_id is not null;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  payment_id text,
  order_id uuid references public.orders(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_order_id_idx
  on public.payment_events (order_id);

create index if not exists payment_events_payment_id_idx
  on public.payment_events (provider, payment_id)
  where payment_id is not null;

alter table public.payment_events enable row level security;

grant select on public.payment_events to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_events'
      and policyname = 'payment_events_select_admin'
  ) then
    create policy "payment_events_select_admin"
    on public.payment_events
    for select
    to authenticated
    using (public.is_admin());
  end if;
end $$;

create or replace function public.protect_order_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if new.id <> old.id
    or new.buyer_id <> old.buyer_id
    or new.seller_id <> old.seller_id
    or new.account_id <> old.account_id
    or new.order_code <> old.order_code
    or new.amount <> old.amount
    or new.payment_status is distinct from old.payment_status
    or new.payment_provider is distinct from old.payment_provider
    or new.payment_provider_id is distinct from old.payment_provider_id
    or new.payment_url is distinct from old.payment_url
    or new.pix_qr_code is distinct from old.pix_qr_code
    or new.pix_copy_paste is distinct from old.pix_copy_paste
    or new.paid_at is distinct from old.paid_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'Somente administradores podem alterar dados sensiveis do pedido.';
  end if;

  return new;
end;
$$;
