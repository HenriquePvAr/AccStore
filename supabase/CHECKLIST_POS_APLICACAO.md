# Checklist pos-aplicacao do Supabase

Use este checklist depois de rodar `supabase db push` ou aplicar a migration pelo SQL Editor.

## 1. Tabelas criadas

No SQL Editor, rode:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'accounts',
    'account_media',
    'orders',
    'conversations',
    'messages',
    'sell_proposals',
    'sell_proposal_media',
    'proposal_history'
  )
order by table_name;
```

Resultado esperado: 9 linhas.

## 2. RLS ativo

```sql
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'profiles',
    'accounts',
    'account_media',
    'orders',
    'conversations',
    'messages',
    'sell_proposals',
    'sell_proposal_media',
    'proposal_history'
  )
order by relname;
```

Resultado esperado: todas as linhas com `rls_enabled = true`.

## 3. Policies criadas

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'accounts',
    'account_media',
    'orders',
    'conversations',
    'messages',
    'sell_proposals',
    'sell_proposal_media',
    'proposal_history'
  )
order by tablename, policyname;
```

Resultado esperado: policies para leitura/escrita segura por perfil, seller, customer, participantes de conversas e admin.

## 4. Buckets criados

```sql
select id, name, public
from storage.buckets
where id in ('account-media', 'proposal-media', 'avatars')
order by id;
```

Resultado esperado: 3 buckets.

## 4.1. Views publicas seguras

```sql
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in ('accounts_public', 'profiles_public')
order by table_name;
```

Resultado esperado: 2 views. `accounts_public` nao deve expor `login`, `password`, `linked_email` ou `email_password`.

## 5. Trigger de profile automatico

```sql
select trigger_name, event_object_schema, event_object_table
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_auth_user_created';
```

Resultado esperado: 1 linha.

## 6. Cadastro criando linha em profiles

1. Cadastre um usuario pela tela `/cadastro`.
2. No SQL Editor, rode:

```sql
select id, full_name, email, role, verified, created_at
from public.profiles
order by created_at desc
limit 5;
```

Resultado esperado: o usuario recem-cadastrado aparece com:

- `role = 'customer'`
- `verified = false`

## 7. Testes de permissao

- Usuario sem login nao acessa rotas protegidas.
- Customer nao acessa `/admin`.
- Seller acessa `/meus-anuncios`.
- Admin acessa `/admin`.
- Seller cria apenas anuncios proprios.
- Customer cria apenas pedidos/propostas proprios.
- Mensagens aparecem apenas para participantes da conversa.
- Customer/seller nao conseguem alterar `role` ou `verified`.

## 8. Dados sensiveis

Confirme que telas publicas usam `accounts_public` para listagem/detalhe publico.

Campos sensiveis devem continuar restritos na tabela `accounts`:

- `login`
- `password`
- `linked_email`
- `email_password`

Antes de producao, prefira mover acesso a credenciais para Edge Functions com criptografia e auditoria.
