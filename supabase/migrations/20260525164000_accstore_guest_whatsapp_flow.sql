-- ACCSTORE guest checkout/proposal flow using WhatsApp as the primary contact.
-- Keeps RLS enabled and exposes guest records only through token-scoped RPCs.

create extension if not exists "pgcrypto";

alter table public.orders
  add column if not exists is_guest boolean not null default false,
  add column if not exists guest_name text,
  add column if not exists guest_whatsapp text,
  add column if not exists guest_email text,
  add column if not exists guest_token text,
  add column if not exists guest_token_expires_at timestamptz;

alter table public.sell_proposals
  add column if not exists is_guest boolean not null default false,
  add column if not exists guest_name text,
  add column if not exists guest_whatsapp text,
  add column if not exists guest_email text,
  add column if not exists guest_token text,
  add column if not exists guest_token_expires_at timestamptz;

alter table public.orders alter column buyer_id drop not null;
alter table public.sell_proposals alter column customer_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_guest_contact_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_guest_contact_check
      check (
        (
          is_guest = false
          and buyer_id is not null
          and guest_name is null
          and guest_whatsapp is null
        )
        or (
          is_guest = true
          and buyer_id is null
          and nullif(trim(guest_name), '') is not null
          and nullif(trim(guest_whatsapp), '') is not null
          and guest_token is not null
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sell_proposals_guest_contact_check'
      and conrelid = 'public.sell_proposals'::regclass
  ) then
    alter table public.sell_proposals
      add constraint sell_proposals_guest_contact_check
      check (
        (
          is_guest = false
          and customer_id is not null
          and guest_name is null
          and guest_whatsapp is null
        )
        or (
          is_guest = true
          and customer_id is null
          and nullif(trim(guest_name), '') is not null
          and nullif(trim(guest_whatsapp), '') is not null
          and guest_token is not null
        )
      ) not valid;
  end if;
end $$;

create unique index if not exists orders_guest_token_unique_idx
  on public.orders (guest_token)
  where guest_token is not null;

create unique index if not exists sell_proposals_guest_token_unique_idx
  on public.sell_proposals (guest_token)
  where guest_token is not null;

create index if not exists orders_guest_whatsapp_idx
  on public.orders (guest_whatsapp)
  where is_guest = true;

create index if not exists sell_proposals_guest_whatsapp_idx
  on public.sell_proposals (guest_whatsapp)
  where is_guest = true;

create or replace function public.generate_guest_token()
returns text
language sql
volatile
as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

create or replace function public.normalize_guest_whatsapp(p_value text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_value, ''), '\D', '', 'g');
$$;

create or replace function public.prepare_guest_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_guest then
    new.buyer_id = null;
    new.guest_name = nullif(trim(new.guest_name), '');
    new.guest_whatsapp = public.normalize_guest_whatsapp(new.guest_whatsapp);
    new.guest_email = nullif(trim(new.guest_email), '');

    if new.guest_token is null or length(new.guest_token) < 32 then
      new.guest_token = public.generate_guest_token();
    end if;

    if new.guest_token_expires_at is null then
      new.guest_token_expires_at = now() + interval '30 days';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prepare_guest_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_guest then
    new.customer_id = null;
    new.guest_name = nullif(trim(new.guest_name), '');
    new.guest_whatsapp = public.normalize_guest_whatsapp(new.guest_whatsapp);
    new.guest_email = nullif(trim(new.guest_email), '');

    if new.guest_token is null or length(new.guest_token) < 32 then
      new.guest_token = public.generate_guest_token();
    end if;

    if new.guest_token_expires_at is null then
      new.guest_token_expires_at = now() + interval '30 days';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'orders_prepare_guest'
      and tgrelid = 'public.orders'::regclass
  ) then
    create trigger orders_prepare_guest
    before insert on public.orders
    for each row execute function public.prepare_guest_order();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'sell_proposals_prepare_guest'
      and tgrelid = 'public.sell_proposals'::regclass
  ) then
    create trigger sell_proposals_prepare_guest
    before insert on public.sell_proposals
    for each row execute function public.prepare_guest_proposal();
  end if;
end $$;

create or replace function public.create_guest_order(
  p_account_id uuid,
  p_guest_name text,
  p_guest_whatsapp text,
  p_guest_email text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts%rowtype;
  v_order public.orders%rowtype;
  v_whatsapp text;
begin
  v_whatsapp = public.normalize_guest_whatsapp(p_guest_whatsapp);

  if nullif(trim(p_guest_name), '') is null or length(v_whatsapp) < 10 then
    raise exception 'Informe nome e WhatsApp validos.';
  end if;

  select *
  into v_account
  from public.accounts
  where id = p_account_id
    and status = 'published';

  if not found then
    raise exception 'Conta indisponivel para compra.';
  end if;

  insert into public.orders (
    buyer_id,
    seller_id,
    account_id,
    amount,
    is_guest,
    guest_name,
    guest_whatsapp,
    guest_email
  )
  values (
    null,
    v_account.seller_id,
    v_account.id,
    v_account.price,
    true,
    p_guest_name,
    v_whatsapp,
    p_guest_email
  )
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.get_guest_order_by_token(p_token text)
returns setof public.orders
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.orders
  where is_guest = true
    and guest_token = p_token
    and guest_token_expires_at > now()
  limit 1;
$$;

create or replace function public.create_guest_sell_proposal(
  p_guest_name text,
  p_guest_whatsapp text,
  p_guest_email text,
  p_game_name text,
  p_proposal_title text,
  p_desired_price numeric,
  p_description text,
  p_region text default null,
  p_additional_info text default null
)
returns public.sell_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_whatsapp text;
  v_proposal public.sell_proposals%rowtype;
begin
  v_whatsapp = public.normalize_guest_whatsapp(p_guest_whatsapp);

  if nullif(trim(p_guest_name), '') is null or length(v_whatsapp) < 10 then
    raise exception 'Informe nome e WhatsApp validos.';
  end if;

  if nullif(trim(p_game_name), '') is null
    or nullif(trim(p_proposal_title), '') is null
    or nullif(trim(p_description), '') is null
    or coalesce(p_desired_price, 0) <= 0 then
    raise exception 'Preencha as informacoes principais da proposta.';
  end if;

  insert into public.sell_proposals (
    customer_id,
    proposal_code,
    game_name,
    proposal_title,
    category,
    desired_price,
    description,
    region,
    additional_info,
    status,
    is_guest,
    guest_name,
    guest_whatsapp,
    guest_email
  )
  values (
    null,
    'PROP-' || upper(substr(gen_random_uuid()::text, 1, 8)),
    p_game_name,
    p_proposal_title,
    'Completa',
    p_desired_price,
    p_description,
    nullif(trim(p_region), ''),
    nullif(trim(p_additional_info), ''),
    'pending_analysis',
    true,
    p_guest_name,
    v_whatsapp,
    p_guest_email
  )
  returning * into v_proposal;

  return v_proposal;
end;
$$;

create or replace function public.save_guest_proposal_media(
  p_token text,
  p_media jsonb
)
returns setof public.sell_proposal_media
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_id uuid;
  v_item jsonb;
begin
  select id
  into v_proposal_id
  from public.sell_proposals
  where is_guest = true
    and guest_token = p_token
    and guest_token_expires_at > now();

  if v_proposal_id is null then
    raise exception 'Proposta nao encontrada.';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_media, '[]'::jsonb))
  loop
    insert into public.sell_proposal_media (proposal_id, url, type, is_cover)
    values (
      v_proposal_id,
      v_item ->> 'url',
      coalesce(nullif(v_item ->> 'type', ''), 'image'),
      coalesce((v_item ->> 'isCover')::boolean, false)
    );
  end loop;

  return query
  select *
  from public.sell_proposal_media
  where proposal_id = v_proposal_id
  order by created_at asc;
end;
$$;

create or replace function public.get_guest_sell_proposal_by_token(p_token text)
returns setof public.sell_proposals
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.sell_proposals
  where is_guest = true
    and guest_token = p_token
    and guest_token_expires_at > now()
  limit 1;
$$;

create or replace function public.get_guest_sell_proposal_media_by_token(p_token text)
returns setof public.sell_proposal_media
language sql
security definer
set search_path = public
stable
as $$
  select m.*
  from public.sell_proposal_media m
  join public.sell_proposals p on p.id = m.proposal_id
  where p.is_guest = true
    and p.guest_token = p_token
    and p.guest_token_expires_at > now()
  order by m.created_at asc;
$$;

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

  if new.id is distinct from old.id
    or new.buyer_id is distinct from old.buyer_id
    or new.seller_id is distinct from old.seller_id
    or new.account_id is distinct from old.account_id
    or new.order_code is distinct from old.order_code
    or new.amount is distinct from old.amount
    or new.payment_status is distinct from old.payment_status
    or new.payment_provider is distinct from old.payment_provider
    or new.payment_provider_id is distinct from old.payment_provider_id
    or new.payment_url is distinct from old.payment_url
    or new.pix_qr_code is distinct from old.pix_qr_code
    or new.pix_copy_paste is distinct from old.pix_copy_paste
    or new.paid_at is distinct from old.paid_at
    or new.expires_at is distinct from old.expires_at
    or new.is_guest is distinct from old.is_guest
    or new.guest_name is distinct from old.guest_name
    or new.guest_whatsapp is distinct from old.guest_whatsapp
    or new.guest_email is distinct from old.guest_email
    or new.guest_token is distinct from old.guest_token
    or new.guest_token_expires_at is distinct from old.guest_token_expires_at then
    raise exception 'Somente administradores podem alterar dados sensiveis do pedido.';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_insert_guest_block_direct'
  ) then
    create policy "orders_insert_guest_block_direct"
    on public.orders for insert
    to anon
    with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sell_proposals'
      and policyname = 'sell_proposals_insert_guest_block_direct'
  ) then
    create policy "sell_proposals_insert_guest_block_direct"
    on public.sell_proposals for insert
    to anon
    with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sell_proposals'
      and policyname = 'sell_proposals_select_seller_or_admin'
  ) then
    create policy "sell_proposals_select_seller_or_admin"
    on public.sell_proposals for select
    to authenticated
    using (public.is_seller() or public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sell_proposal_media'
      and policyname = 'sell_proposal_media_select_seller_or_admin'
  ) then
    create policy "sell_proposal_media_select_seller_or_admin"
    on public.sell_proposal_media for select
    to authenticated
    using (public.is_seller() or public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_upload_guest_proposal_media'
  ) then
    create policy "storage_upload_guest_proposal_media"
    on storage.objects for insert
    to anon
    with check (
      bucket_id = 'proposal-media'
      and (storage.foldername(name))[1] = 'guest'
      and length((storage.foldername(name))[2]) >= 32
    );
  end if;
end $$;

grant execute on function public.create_guest_order(uuid, text, text, text) to anon, authenticated;
grant execute on function public.get_guest_order_by_token(text) to anon, authenticated;
grant execute on function public.create_guest_sell_proposal(text, text, text, text, text, numeric, text, text, text) to anon, authenticated;
grant execute on function public.save_guest_proposal_media(text, jsonb) to anon, authenticated;
grant execute on function public.get_guest_sell_proposal_by_token(text) to anon, authenticated;
grant execute on function public.get_guest_sell_proposal_media_by_token(text) to anon, authenticated;
