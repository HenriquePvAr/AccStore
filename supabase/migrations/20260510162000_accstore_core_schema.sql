-- ACCSTORE core schema for Supabase/PostgreSQL.
-- Safe to apply on a new Supabase project. It does not drop tables or delete data.
-- Never expose a service_role key in the frontend.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'customer' check (role in ('customer', 'seller', 'admin')),
  avatar_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, verified)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1),
      'Usuario'
    ),
    coalesce(new.email, ''),
    'customer',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  game_name text not null,
  title text not null,
  category text not null check (category in ('Basica', 'Básica', 'Intermediaria', 'Intermediária', 'Avancada', 'Avançada', 'Premium', 'Completa', 'Rara')),
  price numeric(12, 2) not null check (price > 0),
  public_description text not null,
  login text,
  password text,
  linked_email text,
  email_password text,
  has_2fa text check (has_2fa in ('Sim', 'Nao', 'Não', 'Nao sei informar', 'Não sei informar')),
  platform text,
  region text,
  internal_notes text,
  cover_media_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'sold', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_account_requires_media check (status <> 'published' or cover_media_url is not null)
);

create table if not exists public.account_media (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  url text not null,
  type text not null check (type in ('image', 'video')),
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  order_code text not null unique default ('PED-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  amount numeric(12, 2) not null check (amount > 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'analysis', 'refunded', 'cancelled')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'in_progress', 'delivered', 'disputed', 'cancelled')),
  status text not null default 'pending' check (status in ('pending', 'payment_review', 'delivery', 'completed', 'dispute', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'open',
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  media_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sell_proposals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  proposal_code text not null unique default ('PROP-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  game_name text not null,
  proposal_title text not null,
  category text not null check (category in ('Basica', 'Básica', 'Intermediaria', 'Intermediária', 'Avancada', 'Avançada', 'Premium', 'Completa', 'Rara')),
  desired_price numeric(12, 2) not null check (desired_price > 0),
  description text not null,
  login text,
  password text,
  linked_email text,
  email_password text,
  has_2fa text check (has_2fa in ('Sim', 'Nao', 'Não', 'Nao sei informar', 'Não sei informar')),
  send_credentials_later boolean not null default false,
  platform text,
  region text,
  additional_info text,
  status text not null default 'pending_analysis' check (
    status in (
      'draft',
      'pending_analysis',
      'under_review',
      'negotiating',
      'counter_offer_sent',
      'approved_for_purchase',
      'purchased',
      'rejected'
    )
  ),
  admin_offer_price numeric(12, 2),
  internal_notes text,
  assigned_admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sell_proposal_media (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.sell_proposals(id) on delete cascade,
  url text not null,
  type text not null check (type in ('image', 'video')),
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.proposal_history (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.sell_proposals(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create or replace view public.accounts_public as
select
  id,
  seller_id,
  game_name,
  title,
  category,
  price,
  public_description,
  null::text as login,
  null::text as password,
  null::text as linked_email,
  null::text as email_password,
  null::text as has_2fa,
  platform,
  region,
  null::text as internal_notes,
  cover_media_url,
  status,
  created_at,
  updated_at
from public.accounts
where status = 'published';

grant usage on schema public to anon, authenticated;
grant select on public.accounts_public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.accounts to authenticated;
grant insert, update, delete on public.accounts to authenticated;
grant select on public.account_media to anon, authenticated;
grant insert, update, delete on public.account_media to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert, update on public.sell_proposals to authenticated;
grant select, insert, update, delete on public.sell_proposal_media to authenticated;
grant select, insert on public.proposal_history to authenticated;

create unique index if not exists account_media_one_cover_idx on public.account_media (account_id) where is_cover;
create unique index if not exists sell_proposal_media_one_cover_idx on public.sell_proposal_media (proposal_id) where is_cover;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists accounts_seller_id_idx on public.accounts (seller_id);
create index if not exists accounts_status_created_at_idx on public.accounts (status, created_at desc);
create index if not exists account_media_account_id_idx on public.account_media (account_id);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);
create index if not exists orders_account_id_idx on public.orders (account_id);
create index if not exists conversations_buyer_id_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations (seller_id);
create index if not exists messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);
create index if not exists sell_proposals_customer_id_idx on public.sell_proposals (customer_id);
create index if not exists sell_proposals_status_created_at_idx on public.sell_proposals (status, created_at desc);
create index if not exists sell_proposal_media_proposal_id_idx on public.sell_proposal_media (proposal_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists sell_proposals_set_updated_at on public.sell_proposals;
create trigger sell_proposals_set_updated_at
before update on public.sell_proposals
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_user_verified()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select verified
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id <> old.id
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.verified is distinct from old.verified then
    raise exception 'Somente administradores podem alterar campos administrativos do perfil.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_fields on public.profiles;
create trigger profiles_protect_admin_fields
before update on public.profiles
for each row execute function public.protect_profile_admin_fields();

create or replace function public.can_order_account(p_account_id uuid, p_seller_id uuid, p_amount numeric)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = p_account_id
      and a.seller_id = p_seller_id
      and a.price = p_amount
      and a.status = 'published'
  );
$$;

create or replace function public.protect_order_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id <> old.id
    or new.buyer_id <> old.buyer_id
    or new.seller_id <> old.seller_id
    or new.account_id <> old.account_id
    or new.order_code <> old.order_code
    or new.amount <> old.amount
    or new.payment_status is distinct from old.payment_status then
    raise exception 'Somente administradores podem alterar dados sensiveis do pedido.';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_protect_immutable_fields on public.orders;
create trigger orders_protect_immutable_fields
before update on public.orders
for each row execute function public.protect_order_immutable_fields();

create or replace function public.can_create_conversation(
  p_account_id uuid,
  p_buyer_id uuid,
  p_seller_id uuid,
  p_order_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    (p_buyer_id = auth.uid() or p_seller_id = auth.uid() or public.is_admin())
    and (
      p_account_id is null
      or exists (
        select 1
        from public.accounts a
        where a.id = p_account_id
          and a.seller_id = p_seller_id
      )
    )
    and (
      p_order_id is null
      or exists (
        select 1
        from public.orders o
        where o.id = p_order_id
          and o.buyer_id = p_buyer_id
          and o.seller_id = p_seller_id
          and (p_account_id is null or o.account_id = p_account_id)
      )
    );
$$;

create or replace function public.protect_conversation_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id <> old.id
    or new.account_id is distinct from old.account_id
    or new.buyer_id <> old.buyer_id
    or new.seller_id <> old.seller_id
    or new.order_id is distinct from old.order_id then
    raise exception 'Somente administradores podem alterar participantes da conversa.';
  end if;

  return new;
end;
$$;

drop trigger if exists conversations_protect_immutable_fields on public.conversations;
create trigger conversations_protect_immutable_fields
before update on public.conversations
for each row execute function public.protect_conversation_immutable_fields();

create or replace function public.protect_message_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id <> old.id
    or new.conversation_id <> old.conversation_id
    or new.sender_id <> old.sender_id
    or new.body is distinct from old.body
    or new.media_url is distinct from old.media_url
    or new.created_at <> old.created_at then
    raise exception 'Somente administradores podem editar mensagens.';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_protect_update on public.messages;
create trigger messages_protect_update
before update on public.messages
for each row execute function public.protect_message_update();

create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message = new.body,
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_update_conversation_last_message on public.messages;
create trigger messages_update_conversation_last_message
after insert on public.messages
for each row execute function public.update_conversation_last_message();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_media enable row level security;
alter table public.orders enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sell_proposals enable row level security;
alter table public.sell_proposal_media enable row level security;
alter table public.proposal_history enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own_allowed_fields_or_admin" on public.profiles;
create policy "profiles_update_own_allowed_fields_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = public.current_user_role()
    and verified = public.current_user_verified()
  )
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;

drop policy if exists "accounts_select_owner_admin" on public.accounts;
create policy "accounts_select_owner_admin"
on public.accounts for select
to authenticated
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "accounts_select_published_owner_admin" on public.accounts;

drop policy if exists "accounts_insert_seller_admin" on public.accounts;
create policy "accounts_insert_seller_admin"
on public.accounts for insert
to authenticated
with check (
  seller_id = auth.uid()
  and public.current_user_role() in ('seller', 'admin')
);

drop policy if exists "accounts_update_owner_admin" on public.accounts;
create policy "accounts_update_owner_admin"
on public.accounts for update
to authenticated
using (seller_id = auth.uid() or public.is_admin())
with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "accounts_delete_owner_admin" on public.accounts;
create policy "accounts_delete_owner_admin"
on public.accounts for delete
to authenticated
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "account_media_select_visible" on public.account_media;
create policy "account_media_select_visible"
on public.account_media for select
to authenticated, anon
using (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and (a.status = 'published' or a.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "account_media_insert_owner_admin" on public.account_media;
create policy "account_media_insert_owner_admin"
on public.account_media for insert
to authenticated
with check (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and (a.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "account_media_update_owner_admin" on public.account_media;
create policy "account_media_update_owner_admin"
on public.account_media for update
to authenticated
using (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and (a.seller_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and (a.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "account_media_delete_owner_admin" on public.account_media;
create policy "account_media_delete_owner_admin"
on public.account_media for delete
to authenticated
using (
  exists (
    select 1
    from public.accounts a
    where a.id = account_id
      and (a.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "account_media_write_owner_admin" on public.account_media;

drop policy if exists "orders_select_participants_admin" on public.orders;
create policy "orders_select_participants_admin"
on public.orders for select
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer"
on public.orders for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and public.can_order_account(account_id, seller_id, amount)
);

drop policy if exists "orders_update_seller_admin" on public.orders;
create policy "orders_update_seller_admin"
on public.orders for update
to authenticated
using (seller_id = auth.uid() or public.is_admin())
with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "conversations_select_participants_admin" on public.conversations;
create policy "conversations_select_participants_admin"
on public.conversations for select
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "conversations_insert_participants" on public.conversations;
create policy "conversations_insert_participants"
on public.conversations for insert
to authenticated
with check (public.can_create_conversation(account_id, buyer_id, seller_id, order_id));

drop policy if exists "conversations_update_participants_admin" on public.conversations;
create policy "conversations_update_participants_admin"
on public.conversations for update
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin())
with check (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "messages_select_participants_admin" on public.messages;
create policy "messages_select_participants_admin"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "messages_insert_participant_sender" on public.messages;
create policy "messages_insert_participant_sender"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "messages_update_participants_admin" on public.messages;
create policy "messages_update_participants_admin"
on public.messages for update
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "sell_proposals_select_owner_admin" on public.sell_proposals;
create policy "sell_proposals_select_owner_admin"
on public.sell_proposals for select
to authenticated
using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "sell_proposals_insert_customer" on public.sell_proposals;
create policy "sell_proposals_insert_customer"
on public.sell_proposals for insert
to authenticated
with check (customer_id = auth.uid());

drop policy if exists "sell_proposals_update_admin" on public.sell_proposals;
create policy "sell_proposals_update_admin"
on public.sell_proposals for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sell_proposal_media_select_owner_admin" on public.sell_proposal_media;
create policy "sell_proposal_media_select_owner_admin"
on public.sell_proposal_media for select
to authenticated
using (
  exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and (p.customer_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "sell_proposal_media_insert_owner_admin" on public.sell_proposal_media;
create policy "sell_proposal_media_insert_owner_admin"
on public.sell_proposal_media for insert
to authenticated
with check (
  exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and (p.customer_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "sell_proposal_media_update_owner_admin" on public.sell_proposal_media;
create policy "sell_proposal_media_update_owner_admin"
on public.sell_proposal_media for update
to authenticated
using (
  exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and (p.customer_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and (p.customer_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "sell_proposal_media_delete_owner_admin" on public.sell_proposal_media;
create policy "sell_proposal_media_delete_owner_admin"
on public.sell_proposal_media for delete
to authenticated
using (
  exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and (p.customer_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "sell_proposal_media_write_owner_admin" on public.sell_proposal_media;

drop policy if exists "proposal_history_select_owner_admin" on public.proposal_history;
create policy "proposal_history_select_owner_admin"
on public.proposal_history for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and p.customer_id = auth.uid()
  )
);

drop policy if exists "proposal_history_insert_admin" on public.proposal_history;
create policy "proposal_history_insert_admin"
on public.proposal_history for insert
to authenticated
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('account-media', 'account-media', true),
  ('proposal-media', 'proposal-media', true),
  ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "storage_read_account_media" on storage.objects;
create policy "storage_read_account_media"
on storage.objects for select
to authenticated, anon
using (bucket_id = 'account-media');

drop policy if exists "storage_read_proposal_media" on storage.objects;
create policy "storage_read_proposal_media"
on storage.objects for select
to authenticated
using (bucket_id = 'proposal-media');

drop policy if exists "storage_read_avatars" on storage.objects;
create policy "storage_read_avatars"
on storage.objects for select
to authenticated, anon
using (bucket_id = 'avatars');

drop policy if exists "storage_upload_own_folder" on storage.objects;
create policy "storage_upload_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('account-media', 'proposal-media', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_update_own_folder" on storage.objects;
create policy "storage_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id in ('account-media', 'proposal-media', 'avatars')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
)
with check (
  bucket_id in ('account-media', 'proposal-media', 'avatars')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "storage_delete_own_folder" on storage.objects;
create policy "storage_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('account-media', 'proposal-media', 'avatars')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
