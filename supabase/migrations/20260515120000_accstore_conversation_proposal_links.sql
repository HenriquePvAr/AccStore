-- Link conversations to sell proposals without opening broader access.
-- This keeps proposal negotiations contextual in messages.

alter table public.conversations
  add column if not exists proposal_id uuid references public.sell_proposals(id) on delete set null;

create index if not exists conversations_proposal_id_idx on public.conversations (proposal_id);

create or replace function public.can_create_conversation(
  p_account_id uuid,
  p_buyer_id uuid,
  p_seller_id uuid,
  p_order_id uuid,
  p_proposal_id uuid default null
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
    )
    and (
      p_proposal_id is null
      or exists (
        select 1
        from public.sell_proposals p
        where p.id = p_proposal_id
          and p.customer_id = p_buyer_id
          and (p.customer_id = auth.uid() or public.is_seller_or_admin())
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
    or new.order_id is distinct from old.order_id
    or new.proposal_id is distinct from old.proposal_id then
    raise exception 'Somente administradores podem alterar participantes da conversa.';
  end if;

  return new;
end;
$$;

alter policy "conversations_insert_participants"
on public.conversations
with check (public.can_create_conversation(account_id, buyer_id, seller_id, order_id, proposal_id));
