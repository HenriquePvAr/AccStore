-- Optional safe seed for local development.
-- This file does not create auth.users and does not store real credentials.
-- To use it, first create test users through Supabase Auth with these emails:
-- seller@example.com, customer@example.com, admin@example.com.
-- Then run it manually in a local database or enable seeds in supabase/config.toml.

update public.profiles
set role = 'seller', verified = true
where email = 'seller@example.com';

update public.profiles
set role = 'admin', verified = true
where email = 'admin@example.com';

with seller as (
  select id
  from public.profiles
  where email = 'seller@example.com'
  limit 1
),
sample_account as (
  insert into public.accounts (
    seller_id,
    game_name,
    title,
    category,
    price,
    public_description,
    login,
    password,
    linked_email,
    email_password,
    has_2fa,
    platform,
    region,
    cover_media_url,
    status
  )
  select
    seller.id,
    'Free Fire',
    'Conta teste segura sem credenciais reais',
    'Premium',
    199.90,
    'Conta de exemplo para validar listagem, compra e midias no ambiente local.',
    null,
    null,
    null,
    null,
    'Não sei informar',
    'Android',
    'Brasil',
    'https://placehold.co/1280x720/0b1222/38bdf8?text=ACCSTORE',
    'published'
  from seller
  where not exists (
    select 1
    from public.accounts
    where title = 'Conta teste segura sem credenciais reais'
  )
  returning id
)
insert into public.account_media (account_id, url, type, is_cover)
select
  sample_account.id,
  'https://placehold.co/1280x720/0b1222/38bdf8?text=ACCSTORE',
  'image',
  true
from sample_account
on conflict do nothing;

with customer as (
  select id
  from public.profiles
  where email = 'customer@example.com'
  limit 1
)
insert into public.sell_proposals (
  customer_id,
  game_name,
  proposal_title,
  category,
  desired_price,
  description,
  send_credentials_later,
  platform,
  region,
  status
)
select
  customer.id,
  'Free Fire',
  'Proposta teste sem credenciais reais',
  'Intermediária',
  120.00,
  'Proposta de exemplo para validar o painel administrativo sem dados sensiveis.',
  true,
  'Android',
  'Brasil',
  'pending_analysis'
from customer
where not exists (
  select 1
  from public.sell_proposals
  where proposal_title = 'Proposta teste sem credenciais reais'
);
