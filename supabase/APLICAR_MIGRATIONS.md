# Como aplicar o banco real da ACCSTORE no Supabase

Este projeto usa migrations SQL em `supabase/migrations/`. Nao coloque chaves secretas no codigo e nunca use `service_role_key` no frontend.

## Arquivos principais

- Schema consolidado: `supabase/schema.sql`
- Migration atual: `supabase/migrations/20260510173500_accstore_secure_schema_sync.sql`
- Seed opcional e seguro: `supabase/seed.sql`
- Variaveis do frontend: `.env.local`

## Antes de aplicar

1. Crie ou abra seu projeto no Supabase.
2. Ative Auth por e-mail/senha em Authentication.
3. Configure as URLs do app em Authentication:
   - Local: `http://127.0.0.1:5173`
   - Producao: o dominio final quando existir
4. No frontend, crie `.env.local` a partir de `.env.local.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_PUBLIC_KEY
```

Use somente a anon public key no frontend.

## Opcao 1: Aplicar via SQL Editor

1. Abra o painel do Supabase.
2. Va em SQL Editor.
3. Copie todo o conteudo de:

```text
supabase/migrations/20260510162000_accstore_core_schema.sql
```

4. Cole no SQL Editor.
5. Execute o script.
6. Confirme no Table Editor se existem:
   - `profiles`
   - `accounts`
   - `account_media`
   - `orders`
   - `conversations`
   - `messages`
   - `sell_proposals`
   - `sell_proposal_media`
   - `proposal_history`
7. Confirme se RLS esta ativo nas tabelas acima.
8. Confirme se os buckets existem em Storage:
   - `account-media`
   - `proposal-media`
   - `avatars`

## Opcao 2: Aplicar via Supabase CLI

O projeto ja possui `supabase/config.toml`, `supabase/schema.sql` e a migration em `supabase/migrations/`.

Instale e autentique a CLI, se ainda nao fez isso:

```bash
supabase login
```

Vincule o projeto remoto:

```bash
supabase link --project-ref SEU_PROJECT_REF
```

Aplicar migrations no projeto remoto:

```bash
supabase db push
```

Para testar localmente com Supabase local:

```bash
supabase start
supabase db reset
```

`supabase db reset` reseta o banco local. Nao use em producao.

Depois de aplicar, siga tambem o checklist em `supabase/CHECKLIST_POS_APLICACAO.md`.

## Seed opcional

O seed nao cria usuarios em `auth.users` e nao inclui credenciais reais. Ele so cria exemplos se ja existirem profiles com:

- `seller@example.com`
- `customer@example.com`
- `admin@example.com`

Para ambiente local, `supabase db reset` aplica migrations e roda `supabase/seed.sql`.

Para projeto remoto, cole o conteudo de `supabase/seed.sql` no SQL Editor somente se quiser os dados de exemplo.

## Criar perfis de teste

Novos cadastros entram como:

- `role = 'customer'`
- `verified = false`

Para promover um usuario de teste a admin ou seller, use o SQL Editor:

```sql
update public.profiles
set role = 'admin', verified = true
where email = 'admin@email.com';

update public.profiles
set role = 'seller', verified = true
where email = 'seller@email.com';
```

## Validacoes obrigatorias

- Cadastro cria registro em `auth.users`.
- Trigger cria registro em `public.profiles`.
- Usuario sem login nao acessa rota protegida.
- Customer nao acessa `/admin`.
- Seller acessa `/meus-anuncios`.
- Admin acessa `/admin`.
- Seller cria apenas anuncios com `seller_id = auth.uid()`.
- Customer cria apenas pedidos e propostas proprios.
- Mensagens aparecem apenas para participantes da conversa.
- Admin consegue atualizar status de propostas.
- Customer/seller nao conseguem alterar `role` ou `verified` do proprio profile.

## Observacoes de seguranca

- O frontend deve usar apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Nao colocar `service_role_key` em `.env.local`, no codigo ou no deploy do frontend.
- A view `accounts_public` expoe apenas dados publicos de contas publicadas.
- Credenciais sensiveis de conta ficam na tabela `accounts`, acessivel apenas ao dono do anuncio ou admin pelas policies.
- Midias de propostas devem ser tratadas como sensiveis antes da producao; hoje o bucket existe para o MVP, mas signed URLs podem ser adotadas depois.
