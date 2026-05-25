import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type OrderRow = {
  id: string
  buyer_id: string
  seller_id: string
  account_id: string
  order_code: string
  amount: number
  payment_status: string
  payment_provider?: string | null
  payment_provider_id?: string | null
  payment_url?: string | null
  pix_qr_code?: string | null
  pix_copy_paste?: string | null
  expires_at?: string | null
}

type AsaasPayment = {
  id: string
  invoiceUrl?: string
  bankSlipUrl?: string
}

type AsaasPixQrCode = {
  encodedImage?: string
  payload?: string
  expirationDate?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`${name} nao configurado.`)
  }
  return value
}

function dueDate(days = 1) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function normalizeAmount(amount: number) {
  return Math.round(Number(amount) * 100) / 100
}

function normalizeAsaasBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

function stripDataImagePrefix(encodedImage?: string | null) {
  if (!encodedImage) return undefined
  const dataImageMatch = encodedImage.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/)
  return dataImageMatch?.[1] ?? encodedImage
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Metodo nao permitido.' }, 405)
  }

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return json({ error: 'Login necessario para gerar pagamento.' }, 401)
    }

    const { orderId } = await req.json()
    if (!orderId || typeof orderId !== 'string') {
      return json({ error: 'Pedido invalido.' }, 400)
    }

    const supabaseUrl = requireEnv('SUPABASE_URL')
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const asaasApiKey = requireEnv('ASAAS_API_KEY')
    const asaasBaseUrl = normalizeAsaasBaseUrl(requireEnv('ASAAS_BASE_URL'))

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData.user) {
      return json({ error: 'Login necessario para gerar pagamento.' }, 401)
    }

    const { data: currentProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle<{ role: string | null }>()

    if (profileError) {
      throw profileError
    }

    const isAdmin = currentProfile?.role === 'admin'

    const { data: order, error: orderError } = await userClient
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        account_id,
        order_code,
        amount,
        payment_status,
        payment_provider,
        payment_provider_id,
        payment_url,
        pix_qr_code,
        pix_copy_paste,
        expires_at
      `)
      .eq('id', orderId)
      .single<OrderRow>()

    if (orderError || !order) {
      return json({ error: 'Pedido nao encontrado.' }, 404)
    }

    if (order.buyer_id !== authData.user.id && !isAdmin) {
      return json({ error: 'Somente o comprador ou um administrador autorizado pode gerar o pagamento deste pedido.' }, 403)
    }

    const existingPixQrCode = stripDataImagePrefix(order.pix_qr_code)

    if (order.payment_status === 'paid') {
      return json({
        orderId: order.id,
        paymentStatus: order.payment_status,
        paymentUrl: order.payment_url,
        pixQrCode: existingPixQrCode,
        pixCopyPaste: order.pix_copy_paste,
        expiresAt: order.expires_at,
      })
    }

    if (order.payment_status !== 'pending') {
      return json({ error: 'Este pedido nao esta pendente para pagamento.' }, 409)
    }

    if (order.payment_provider === 'asaas' && order.payment_provider_id && existingPixQrCode && order.pix_copy_paste) {
      return json({
        orderId: order.id,
        paymentStatus: order.payment_status,
        paymentUrl: order.payment_url,
        pixQrCode: existingPixQrCode,
        pixCopyPaste: order.pix_copy_paste,
        expiresAt: order.expires_at,
      })
    }

    const asaasHeaders = {
      'Content-Type': 'application/json',
      access_token: asaasApiKey,
    }

    async function asaasRequest<T>(path: string, init: RequestInit) {
      const response = await fetch(`${asaasBaseUrl}${path}`, {
        ...init,
        headers: { ...asaasHeaders, ...(init.headers ?? {}) },
      })
      const text = await response.text()
      const data = text ? JSON.parse(text) : {}

      if (!response.ok) {
        const firstError = Array.isArray(data.errors) ? data.errors[0]?.description : null
        throw new Error(firstError || 'Erro ao comunicar com o Asaas.')
      }

      return data as T
    }

    if (order.payment_provider === 'asaas' && order.payment_provider_id) {
      const pix = await asaasRequest<AsaasPixQrCode>(`/payments/${order.payment_provider_id}/pixQrCode`, {
        method: 'GET',
      })

      const payload = {
        payment_provider: 'asaas',
        payment_provider_id: order.payment_provider_id,
        payment_status: 'pending',
        payment_url: order.payment_url ?? null,
        pix_qr_code: stripDataImagePrefix(pix.encodedImage) ?? existingPixQrCode ?? null,
        pix_copy_paste: pix.payload ?? order.pix_copy_paste ?? null,
        expires_at: pix.expirationDate ?? order.expires_at ?? null,
      }

      const { error: updateError } = await serviceClient
        .from('orders')
        .update(payload)
        .eq('id', order.id)

      if (updateError) {
        throw updateError
      }

      return json({
        orderId: order.id,
        paymentStatus: payload.payment_status,
        paymentUrl: payload.payment_url,
        pixQrCode: payload.pix_qr_code,
        pixCopyPaste: payload.pix_copy_paste,
        expiresAt: payload.expires_at,
      })
    }

    const { data: account } = await serviceClient
      .from('accounts')
      .select('title')
      .eq('id', order.account_id)
      .maybeSingle<{ title: string | null }>()

    // TODO: incluir CPF/CNPJ quando o cadastro de clientes da ACCSTORE passar a coletar esse dado.
    const customer = await asaasRequest<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: authData.user.user_metadata?.full_name || authData.user.email || 'Cliente ACCSTORE',
        email: authData.user.email,
      }),
    })

    const payment = await asaasRequest<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'PIX',
        value: normalizeAmount(order.amount),
        dueDate: dueDate(),
        description: `Compra ACCSTORE ${order.order_code} - ${account?.title ?? 'Conta'}`,
        externalReference: order.id,
      }),
    })

    const pix = await asaasRequest<AsaasPixQrCode>(`/payments/${payment.id}/pixQrCode`, {
      method: 'GET',
    })

    const payload = {
      payment_provider: 'asaas',
      payment_provider_id: payment.id,
      payment_status: 'pending',
      payment_url: payment.invoiceUrl || payment.bankSlipUrl || null,
      pix_qr_code: stripDataImagePrefix(pix.encodedImage) ?? null,
      pix_copy_paste: pix.payload ?? null,
      expires_at: pix.expirationDate ?? null,
    }

    const { error: updateError } = await serviceClient
      .from('orders')
      .update(payload)
      .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    return json({
      orderId: order.id,
      paymentStatus: payload.payment_status,
      paymentUrl: payload.payment_url,
      pixQrCode: payload.pix_qr_code,
      pixCopyPaste: payload.pix_copy_paste,
      expiresAt: payload.expires_at,
    })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Nao foi possivel gerar o pagamento agora.' }, 500)
  }
})
