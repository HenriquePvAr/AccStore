import type { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from '../services/types'

export const supportStatusLabels: Record<SupportTicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_customer: 'Aguardando cliente',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

export const supportPriorityLabels: Record<SupportTicketPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

export const supportCategoryLabels: Record<SupportTicketCategory, string> = {
  payment: 'Pagamento',
  account_access: 'Acesso à conta',
  warranty: 'Garantia',
  proposal: 'Proposta de venda',
  order: 'Pedido',
  other: 'Outro',
}

export const supportStatusOptions = Object.entries(supportStatusLabels).map(([value, label]) => ({
  value: value as SupportTicketStatus,
  label,
}))

export const supportPriorityOptions = Object.entries(supportPriorityLabels).map(([value, label]) => ({
  value: value as SupportTicketPriority,
  label,
}))

export const supportCategoryOptions = Object.entries(supportCategoryLabels).map(([value, label]) => ({
  value: value as SupportTicketCategory,
  label,
}))
