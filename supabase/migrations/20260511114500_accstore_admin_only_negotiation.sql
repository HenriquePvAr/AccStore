-- Only admins can move a received proposal into negotiation.
-- Sellers may still update permitted analysis fields, but not start negotiation.

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
    if new.status = 'negotiating' and old.status is distinct from new.status then
      raise exception 'Apenas administradores podem iniciar negociação de propostas.';
    end if;

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
