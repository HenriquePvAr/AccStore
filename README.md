# ContaVault MVP

Marketplace independente para compra e venda de contas de Free Fire, criado como MVP visual e funcional com React, Vite, TypeScript, Tailwind CSS e Zustand.

> Plataforma independente, sem vínculo com Garena ou Free Fire. Os dados do projeto são mockados e não devem ser tratados como dados reais.

## Rotas

- `/` landing page
- `/marketplace` listagem com filtros e ordenação
- `/listings/:id` detalhe do anúncio, galeria, player e checkout MVP
- `/anunciar` criação de anúncio com preview local de mídia
- `/dashboard` área do usuário com abas
- `/admin` painel administrativo visual

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Pix com Asaas

O frontend nunca usa a chave do Asaas. A cobrança Pix é criada pela Supabase Edge Function `create-asaas-payment`, que lê `ASAAS_API_KEY` e `ASAAS_BASE_URL` dos Supabase secrets, valida o usuário autenticado e salva o QR Code Pix no pedido. A confirmação de pagamento é feita pelo webhook `asaas-webhook`.

Sandbox:

```bash
supabase secrets set ASAAS_API_KEY=SUA_CHAVE_SANDBOX
supabase secrets set ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
supabase secrets set ASAAS_WEBHOOK_SECRET=UM_SEGREDO_FORTE
```

Produção:

```bash
supabase secrets set ASAAS_API_KEY=SUA_CHAVE_REAL
supabase secrets set ASAAS_BASE_URL=https://api.asaas.com/v3
supabase secrets set ASAAS_WEBHOOK_SECRET=UM_SEGREDO_FORTE
```

Deploy das funções:

```bash
supabase functions deploy create-asaas-payment
supabase functions deploy asaas-webhook --no-verify-jwt
```

O webhook fica sem verificação JWT do Supabase porque a chamada vem do Asaas, mas continua protegido pelo header secreto validado contra `ASAAS_WEBHOOK_SECRET`.

## Estrutura importante

- `src/lib/types.ts` interfaces principais do domínio
- `src/data/mockData.ts` usuários, anúncios, pedidos e denúncias mockados
- `src/store/useMarketplaceStore.ts` estado em memória e ações do MVP
- `supabase/schema.sql` modelagem inicial para PostgreSQL/Supabase

## Próximos passos naturais

- Trocar mocks por Supabase Auth, Database e Storage
- Implementar chat mediado comprador, vendedor e admin
- Integrar gateway de pagamento com retenção e disputa
- Criar autenticação real para rotas de vendedor e admin
