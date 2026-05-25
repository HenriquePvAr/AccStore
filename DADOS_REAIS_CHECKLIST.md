# ACCSTORE - Checklist para usar dados reais

Este documento aponta o que ainda falta para o projeto deixar de ser apenas frontend preparado e funcionar com dados reais no Supabase/backend.

## Status atual

- Frontend ja usa services em `src/services/`.
- AuthProvider ja depende da sessao real do Supabase.
- Marketplace, detalhes, venda, propostas, pedidos, compras, mensagens e paineis operacionais ja chamam services.
- Arquivos antigos de mock foram removidos de `src/data/`.
- Schema base esta em `supabase/schema.sql`.
- Build e lint passaram apos a refatoracao.

## Falta para funcionar com dados reais

### 1. Criar/configurar o projeto Supabase

- Criar um projeto no Supabase.
- Copiar a URL publica do projeto.
- Copiar apenas a anon public key.
- Nunca usar `service_role_key` no frontend.
- Criar `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY_DO_SUPABASE
```

Sem esse arquivo, o app vai mostrar o erro esperado: Supabase nao configurado.

### 2. Aplicar o schema do banco

- Abrir o SQL Editor do Supabase.
- Executar o conteudo de `supabase/schema.sql`.
- Confirmar que as tabelas foram criadas:
  - `profiles`
  - `accounts`
  - `account_media`
  - `orders`
  - `conversations`
  - `messages`
  - `sell_proposals`
  - `sell_proposal_media`
  - `proposal_history`
- Confirmar que RLS esta ativo em todas as tabelas.
- Confirmar que as policies foram criadas sem erro.

### 3. Configurar Auth

- Ativar login por e-mail/senha no Supabase Auth.
- Definir URLs de redirecionamento do projeto:
  - local: `http://127.0.0.1:5173`
  - producao: dominio final quando existir
- Testar cadastro real pela tela `/cadastro`.
- Confirmar se o cadastro criou uma linha em `profiles`.
- Se a confirmacao por e-mail estiver ativa, validar o fluxo de e-mail antes de testar login.

### 4. Criar usuarios reais e roles

O cadastro cria usuario como `customer`. Para testar todos os fluxos, precisa promover usuarios no banco:

```sql
update public.profiles
set role = 'admin', verified = true
where email = 'admin@email.com';

update public.profiles
set role = 'seller', verified = true
where email = 'seller@email.com';
```

Perfis minimos para teste:

- 1 admin
- 1 seller verificado
- 1 customer

### 5. Validar buckets de Storage

O schema cria os buckets:

- `account-media`
- `proposal-media`
- `avatars`

Ainda falta validar no painel do Supabase:

- Buckets existem.
- Upload funciona com usuario autenticado.
- Arquivos entram no caminho `userId/timestamp-fileName`.
- JPG, PNG, WEBP e MP4 sobem corretamente.
- URLs gravadas aparecem em `account_media` e `sell_proposal_media`.

Ponto de seguranca: hoje `proposal-media` esta preparado para funcionar de forma simples. Para producao, o ideal e deixar midias de proposta privadas e trocar `getPublicUrl` por signed URLs.

### 6. Testar RLS por perfil

Executar testes reais com usuarios diferentes:

- Customer ve contas publicadas em `/explorar`.
- Customer cria proposta em `/vender-conta`.
- Customer ve apenas as proprias compras.
- Seller cria conta real pelo formulario.
- Seller ve apenas os proprios anuncios em `/meus-anuncios`.
- Seller ve pedidos dos proprios anuncios.
- Admin ve propostas recebidas.
- Admin ve usuarios.
- Admin atualiza status/observacoes de propostas.
- Usuario nao participante nao consegue ler conversas de outros usuarios.

### 7. Fluxos que precisam de dados reais iniciais

Para validar ponta a ponta:

- Cadastrar seller real.
- Promover seller no banco.
- Login como seller.
- Publicar uma conta com imagem ou video.
- Login como customer.
- Abrir `/explorar`.
- Ver a conta publicada.
- Abrir detalhes.
- Criar pedido real.
- Conferir pedido em `orders`.
- Criar conversa manualmente ou pelo fluxo futuro.
- Enviar mensagem real.
- Login como admin.
- Ver propostas reais e atualizar status.

### 8. Ajustes de seguranca antes de producao

O MVP grava dados sensiveis de conta/proposta em tabelas do Supabase:

- login
- password
- linked_email
- email_password

Antes de producao, falta decidir uma estrategia segura:

- Criptografar dados sensiveis no backend.
- Usar Edge Functions para gravar/ler credenciais.
- Restringir leitura de credenciais somente para admin/autorizados.
- Evitar expor credenciais diretamente em queries do frontend.
- Criar auditoria de acesso a credenciais.

### 9. Regras de negocio que ainda precisam endurecer

O frontend ja valida muita coisa, mas producao precisa reforcar no banco/backend:

- Conta publicada precisa ter midia real.
- Apenas seller/admin pode criar conta.
- Apenas admin deve aprovar/recusar proposta.
- Customer nao pode aprovar, recusar ou editar status administrativo.
- Seller nao deve alterar pedido que nao pertence aos seus anuncios.
- Mensagens precisam validar participante da conversa.
- Upload deve limitar tamanho de arquivo.
- Upload deve limitar quantidade de arquivos por anuncio/proposta.

### 10. Telas ainda parcialmente operacionais

Estas areas ja nao usam mocks, mas ainda precisam de features completas:

- `Saldo`: ainda e tela preparada; falta integrar carteira, gateway e extrato real.
- `Configuracoes`: ainda e tela preparada; falta formulario real para preferencias, senha, notificacoes e seguranca.
- `Usuarios`: busca usuarios reais, mas falta UI completa para alterar role/bloquear usuario.
- `Vendedores`: lista vendedores reais, mas falta fluxo completo de aprovacao/revisao.
- `Pagamentos`: mostra pedidos reais, mas falta gateway e reconciliacao.
- `Relatorios`: calcula dados basicos reais, mas falta dashboard analitico completo.

### 11. Mensagens e conversas

Services reais existem, mas ainda falta decidir o gatilho de criacao de conversa:

- Criar conversa automaticamente ao clicar em "Tenho interesse".
- Criar conversa automaticamente apos criar pedido.
- Atualizar `last_message` e `last_message_at` de forma transacional.
- Opcional: adicionar Realtime do Supabase para mensagens em tempo real.

### 12. Pagamento

O pedido real ja pode ser criado, mas pagamento ainda e manual:

- Definir gateway.
- Criar tabela/eventos de pagamento se necessario.
- Criar webhook seguro no backend/Edge Function.
- Atualizar `payment_status`, `delivery_status` e `status` a partir do webhook.
- Criar tela/admin para conciliacao manual.

### 13. Checklist final de aceite

O projeto pode ser considerado usando dados reais quando todos estes itens passarem:

- `.env.local` configurado.
- `supabase/schema.sql` aplicado sem erro.
- Cadastro cria `auth.users` e `profiles`.
- Admin/seller/customer reais existem.
- Seller cria conta real com midia.
- Conta publicada aparece em `/explorar`.
- Customer cria pedido real.
- Pedido aparece em compras/pedidos.
- Customer cria proposta real.
- Admin ve proposta real.
- Admin atualiza status real.
- Mensagem real e gravada em `messages`.
- Nenhuma tela principal depende de array mockado no frontend.

