-- ACCSTORE support tickets.
-- Safe migration: no DROP, TRUNCATE or DELETE. Uses conditional blocks for policies/triggers.

create extension if not exists "pgcrypto";

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  subject text not null,
  category text not null check (category in ('payment', 'account_access', 'warranty', 'proposal', 'order', 'other')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  related_order_id uuid references public.orders(id),
  related_proposal_id uuid references public.sell_proposals(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_ticket_messages to authenticated;

create index if not exists support_tickets_customer_id_idx on public.support_tickets (customer_id);
create index if not exists support_tickets_assigned_to_idx on public.support_tickets (assigned_to);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);
create index if not exists support_ticket_messages_ticket_id_idx on public.support_ticket_messages (ticket_id, created_at);

create or replace function public.is_seller_or_admin()
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
      and role in ('seller', 'admin')
  );
$$;

create or replace function public.can_create_support_ticket(
  p_customer_id uuid,
  p_related_order_id uuid default null,
  p_related_proposal_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p_customer_id = auth.uid()
    and (
      p_related_order_id is null
      or exists (
        select 1
        from public.orders o
        where o.id = p_related_order_id
          and o.buyer_id = p_customer_id
      )
    )
    and (
      p_related_proposal_id is null
      or exists (
        select 1
        from public.sell_proposals p
        where p.id = p_related_proposal_id
          and p.customer_id = p_customer_id
      )
    );
$$;

create or replace function public.can_access_ticket(p_ticket_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.support_tickets t
    where t.id = p_ticket_id
      and (t.customer_id = auth.uid() or public.is_seller_or_admin())
  );
$$;

create or replace function public.protect_support_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_seller_or_admin() then
    if new.id <> old.id
      or new.customer_id <> old.customer_id
      or new.subject is distinct from old.subject
      or new.category is distinct from old.category
      or new.related_order_id is distinct from old.related_order_id
      or new.related_proposal_id is distinct from old.related_proposal_id
      or new.created_at <> old.created_at then
      raise exception 'A equipe pode atualizar apenas status, prioridade e responsavel do ticket.';
    end if;

    if new.assigned_to is not null and not exists (
      select 1
      from public.profiles p
      where p.id = new.assigned_to
        and p.role in ('seller', 'admin')
    ) then
      raise exception 'O responsavel precisa fazer parte da equipe de suporte.';
    end if;

    if new.status = 'closed' and old.status is distinct from 'closed' and new.closed_at is null then
      new.closed_at = now();
    elsif new.status <> 'closed' then
      new.closed_at = null;
    end if;

    return new;
  end if;

  if old.customer_id = auth.uid() then
    if new.id <> old.id
      or new.customer_id <> old.customer_id
      or new.assigned_to is distinct from old.assigned_to
      or new.subject is distinct from old.subject
      or new.category is distinct from old.category
      or new.priority is distinct from old.priority
      or new.related_order_id is distinct from old.related_order_id
      or new.related_proposal_id is distinct from old.related_proposal_id
      or new.created_at <> old.created_at then
      raise exception 'Clientes podem apenas fechar os proprios tickets.';
    end if;

    if new.status is distinct from old.status and new.status <> 'closed' then
      raise exception 'Clientes podem apenas fechar os proprios tickets.';
    end if;

    if new.status = 'closed' and new.closed_at is null then
      new.closed_at = now();
    end if;

    return new;
  end if;

  raise exception 'Voce nao tem permissao para atualizar este ticket.';
end;
$$;

create or replace function public.touch_support_ticket_after_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets
  set updated_at = now()
  where id = new.ticket_id;

  return new;
end;
$$;

create or replace function public.open_support_ticket(
  p_subject text,
  p_category text,
  p_message text,
  p_related_order_id uuid default null,
  p_related_proposal_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ticket_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if nullif(trim(p_subject), '') is null then
    raise exception 'Informe o assunto do ticket.';
  end if;

  if nullif(trim(p_message), '') is null then
    raise exception 'Informe a mensagem inicial do ticket.';
  end if;

  insert into public.support_tickets (
    customer_id,
    subject,
    category,
    related_order_id,
    related_proposal_id
  )
  values (
    auth.uid(),
    trim(p_subject),
    p_category,
    p_related_order_id,
    p_related_proposal_id
  )
  returning id into v_ticket_id;

  insert into public.support_ticket_messages (
    ticket_id,
    sender_id,
    message,
    is_internal
  )
  values (
    v_ticket_id,
    auth.uid(),
    trim(p_message),
    false
  );

  return v_ticket_id;
end;
$$;

grant execute on function public.open_support_ticket(text, text, text, uuid, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'support_tickets_set_updated_at'
      and tgrelid = 'public.support_tickets'::regclass
  ) then
    create trigger support_tickets_set_updated_at
    before update on public.support_tickets
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'support_tickets_protect_update'
      and tgrelid = 'public.support_tickets'::regclass
  ) then
    create trigger support_tickets_protect_update
    before update on public.support_tickets
    for each row execute function public.protect_support_ticket_update();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'support_ticket_messages_touch_ticket'
      and tgrelid = 'public.support_ticket_messages'::regclass
  ) then
    create trigger support_ticket_messages_touch_ticket
    after insert on public.support_ticket_messages
    for each row execute function public.touch_support_ticket_after_message();
  end if;
end;
$$;

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'support_tickets'
      and policyname = 'support_tickets_select_customer_or_support'
  ) then
    create policy "support_tickets_select_customer_or_support"
    on public.support_tickets for select
    to authenticated
    using (customer_id = auth.uid() or public.is_seller_or_admin());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'support_tickets'
      and policyname = 'support_tickets_insert_own_customer'
  ) then
    create policy "support_tickets_insert_own_customer"
    on public.support_tickets for insert
    to authenticated
    with check (
      public.can_create_support_ticket(customer_id, related_order_id, related_proposal_id)
      and status = 'open'
      and priority = 'normal'
      and assigned_to is null
      and closed_at is null
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'support_tickets'
      and policyname = 'support_tickets_update_customer_or_support'
  ) then
    create policy "support_tickets_update_customer_or_support"
    on public.support_tickets for update
    to authenticated
    using (customer_id = auth.uid() or public.is_seller_or_admin())
    with check (customer_id = auth.uid() or public.is_seller_or_admin());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'support_ticket_messages'
      and policyname = 'support_ticket_messages_select_visible'
  ) then
    create policy "support_ticket_messages_select_visible"
    on public.support_ticket_messages for select
    to authenticated
    using (
      public.is_seller_or_admin()
      or (
        is_internal = false
        and exists (
          select 1
          from public.support_tickets t
          where t.id = ticket_id
            and t.customer_id = auth.uid()
        )
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'support_ticket_messages'
      and policyname = 'support_ticket_messages_insert_sender'
  ) then
    create policy "support_ticket_messages_insert_sender"
    on public.support_ticket_messages for insert
    to authenticated
    with check (
      sender_id = auth.uid()
      and public.can_access_ticket(ticket_id)
      and (is_internal = false or public.is_seller_or_admin())
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_support_ticket_customers'
  ) then
    create policy "profiles_select_support_ticket_customers"
    on public.profiles for select
    to authenticated
    using (
      public.is_seller_or_admin()
      and exists (
        select 1
        from public.support_tickets t
        where t.customer_id = profiles.id
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_select_support_ticket_staff'
  ) then
    create policy "orders_select_support_ticket_staff"
    on public.orders for select
    to authenticated
    using (
      public.is_seller_or_admin()
      and exists (
        select 1
        from public.support_tickets t
        where t.related_order_id = orders.id
      )
    );
  end if;
end;
$$;
