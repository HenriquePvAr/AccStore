-- Allow ACCSTORE sellers to operate received customer proposals.
-- This migration changes policies only. It does not drop tables or delete data.

create or replace function public.is_seller_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_seller() or public.is_admin();
$$;

create or replace function public.protect_sell_proposal_reviewer_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if public.is_seller() then
    if new.id <> old.id
      or new.customer_id <> old.customer_id
      or new.proposal_code <> old.proposal_code
      or new.game_name <> old.game_name
      or new.proposal_title <> old.proposal_title
      or new.category <> old.category
      or new.desired_price <> old.desired_price
      or new.description <> old.description
      or new.login is distinct from old.login
      or new.password is distinct from old.password
      or new.linked_email is distinct from old.linked_email
      or new.email_password is distinct from old.email_password
      or new.has_2fa is distinct from old.has_2fa
      or new.send_credentials_later <> old.send_credentials_later
      or new.platform is distinct from old.platform
      or new.region is distinct from old.region
      or new.additional_info is distinct from old.additional_info
      or new.created_at <> old.created_at then
      raise exception 'Vendedores podem atualizar apenas status, oferta e observações da proposta.';
    end if;

    return new;
  end if;

  raise exception 'Apenas a equipe autorizada pode atualizar propostas.';
end;
$$;

drop trigger if exists sell_proposals_protect_reviewer_fields on public.sell_proposals;
create trigger sell_proposals_protect_reviewer_fields
before update on public.sell_proposals
for each row execute function public.protect_sell_proposal_reviewer_fields();

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (
    public.is_seller()
    and exists (
      select 1
      from public.sell_proposals p
      where p.customer_id = profiles.id
    )
  )
);

drop policy if exists "sell_proposals_select_owner_admin" on public.sell_proposals;
create policy "sell_proposals_select_owner_admin"
on public.sell_proposals for select
to authenticated
using (customer_id = auth.uid() or public.is_seller_or_admin());

drop policy if exists "sell_proposals_update_admin" on public.sell_proposals;
create policy "sell_proposals_update_admin"
on public.sell_proposals for update
to authenticated
using (public.is_seller_or_admin())
with check (public.is_seller_or_admin());

drop policy if exists "sell_proposal_media_select_owner_admin" on public.sell_proposal_media;
create policy "sell_proposal_media_select_owner_admin"
on public.sell_proposal_media for select
to authenticated
using (
  exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and (p.customer_id = auth.uid() or public.is_seller_or_admin())
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
      and (p.customer_id = auth.uid() or public.is_seller_or_admin())
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
      and (p.customer_id = auth.uid() or public.is_seller_or_admin())
  )
)
with check (
  exists (
    select 1
    from public.sell_proposals p
    where p.id = proposal_id
      and (p.customer_id = auth.uid() or public.is_seller_or_admin())
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
      and (p.customer_id = auth.uid() or public.is_seller_or_admin())
  )
);

drop policy if exists "proposal_history_select_owner_admin" on public.proposal_history;
create policy "proposal_history_select_owner_admin"
on public.proposal_history for select
to authenticated
using (
  public.is_seller_or_admin()
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
with check (public.is_seller_or_admin());
