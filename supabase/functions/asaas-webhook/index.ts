import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type AsaasWebhookPayload = {
  event?: string
  payment?: {
    id?: string
    status?: string
    externalReference?: string
    confirmedDate?: string
    clientPaymentDate?: string
    paymentDate?: string
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`${name} nao configurado.`)
  }
  return value
}

function readWebhookToken(req: Request) {
  return req.headers.get('asaas-access-token') || req.headers.get('asaas_access_token')
}

function mapPaymentUpdate(eventType: string, payment?: AsaasWebhookPayload['payment']) {
  const status = payment?.status
  const paidEvents = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])
  const refundedEvents = new Set(['PAYMENT_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS'])
  const cancelledEvents = new Set(['PAYMENT_DELETED', 'PAYMENT_BANK_SLIP_CANCELLED'])

  if (paidEvents.has(eventType) || status === 'RECEIVED' || status === 'CONFIRMED') {
    return {
      payment_status: 'paid',
      status: 'delivery',
      paid_at: new Date().toISOString(),
    }
  }

  if (refundedEvents.has(eventType) || status === 'REFUNDED') {
    return {
      payment_status: 'refunded',
      status: 'cancelled',
    }
  }

  if (cancelledEvents.has(eventType) || status === 'DELETED') {
    return {
      payment_status: 'cancelled',
      status: 'cancelled',
    }
  }

  return null
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Metodo nao permitido.' }, 405)
  }

  try {
    const webhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET')
    if (webhookSecret && readWebhookToken(req) !== webhookSecret) {
      return json({ error: 'Webhook nao autorizado.' }, 401)
    }

    const payload = await req.json() as AsaasWebhookPayload
    const eventType = payload.event ?? 'UNKNOWN'
    const paymentId = payload.payment?.id ?? null

    const supabaseUrl = requireEnv('SUPABASE_URL')
    const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    let orderId: string | null = null

    if (paymentId) {
      const { data: orderByPayment } = await serviceClient
        .from('orders')
        .select('id')
        .eq('payment_provider', 'asaas')
        .eq('payment_provider_id', paymentId)
        .maybeSingle<{ id: string }>()

      orderId = orderByPayment?.id ?? null
    }

    if (!orderId && payload.payment?.externalReference) {
      const { data: orderByReference } = await serviceClient
        .from('orders')
        .select('id')
        .eq('id', payload.payment.externalReference)
        .maybeSingle<{ id: string }>()

      orderId = orderByReference?.id ?? null
    }

    const { error: eventError } = await serviceClient.from('payment_events').insert({
      provider: 'asaas',
      event_type: eventType,
      payment_id: paymentId,
      order_id: orderId,
      payload,
    })

    if (eventError) {
      throw eventError
    }

    const updatePayload = mapPaymentUpdate(eventType, payload.payment)
    if (orderId && updatePayload) {
      const { error: updateError } = await serviceClient
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)

      if (updateError) {
        throw updateError
      }
    }

    return json({ received: true })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Nao foi possivel processar o webhook.' }, 500)
  }
})
