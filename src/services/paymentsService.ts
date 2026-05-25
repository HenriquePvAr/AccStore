import { requireSupabase } from '../lib/supabaseClient'
import { getOrderById } from './ordersService'
import type { PaymentStatus } from './types'

export interface AsaasPaymentResult {
  orderId: string
  paymentStatus: PaymentStatus
  paymentUrl?: string
  pixQrCode?: string
  pixCopyPaste?: string
  expiresAt?: string
}

const PAYMENT_ERROR_MESSAGE = 'Não foi possível gerar o pagamento agora.'

async function getFunctionErrorMessage(error: unknown) {
  const context = error && typeof error === 'object' && 'context' in error ? error.context : null

  if (context instanceof Response) {
    const body = await context
      .clone()
      .json()
      .catch(() => null)

    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  }

  return PAYMENT_ERROR_MESSAGE
}

export async function createAsaasPayment(orderId: string) {
  const supabase = requireSupabase()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Entre na plataforma para gerar o pagamento.')
  }

  const { data, error } = await supabase.functions.invoke<AsaasPaymentResult>('create-asaas-payment', {
    body: { orderId },
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
  })

  if (error) {
    throw new Error(await getFunctionErrorMessage(error))
  }

  if (!data) {
    throw new Error(PAYMENT_ERROR_MESSAGE)
  }

  return data
}

export async function copyPixCode(pixCode: string) {
  await navigator.clipboard.writeText(pixCode)
}

export async function getOrderPaymentStatus(orderId: string) {
  const order = await getOrderById(orderId)
  return {
    orderId: order.id,
    paymentStatus: order.paymentStatus,
    paymentUrl: order.paymentUrl,
    pixQrCode: order.pixQrCode,
    pixCopyPaste: order.pixCopyPaste,
    expiresAt: order.expiresAt,
  } satisfies AsaasPaymentResult
}
