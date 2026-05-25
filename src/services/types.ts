import type { UserRole } from '../auth/types'

export type AccountStatus = 'draft' | 'published' | 'paused' | 'sold' | 'rejected'
export type AccountCategory = 'Básica' | 'Intermediária' | 'Avançada' | 'Premium' | 'Completa' | 'Rara'
export type MediaType = 'image' | 'video'
export type Has2FA = 'Sim' | 'Não' | 'Não sei informar'

export interface Profile {
  id: string
  fullName: string
  email: string
  role: UserRole
  avatarUrl?: string
  verified: boolean
  createdAt: string
  updatedAt?: string
}

export interface AccountMedia {
  id: string
  accountId: string
  url: string
  type: MediaType
  isCover: boolean
  createdAt: string
}

export interface Account {
  id: string
  sellerId: string
  seller?: Profile
  gameName: string
  title: string
  category: AccountCategory
  price: number
  publicDescription: string
  login?: string
  password?: string
  linkedEmail?: string
  emailPassword?: string
  has2FA?: Has2FA
  platform?: string
  region?: string
  internalNotes?: string
  coverMediaUrl?: string
  status: AccountStatus
  media: AccountMedia[]
  createdAt: string
  updatedAt?: string
}

export interface AccountPayload {
  sellerId: string
  gameName: string
  title: string
  category: AccountCategory
  price: number
  publicDescription: string
  region?: string
  internalNotes?: string
  coverMediaUrl?: string
  status: AccountStatus
}

export interface AccountMediaPayload {
  accountId: string
  url: string
  type: MediaType
  isCover?: boolean
}

export type PaymentStatus = 'pending' | 'paid' | 'analysis' | 'failed' | 'expired' | 'refunded' | 'cancelled'
export type DeliveryStatus = 'pending' | 'in_progress' | 'delivered' | 'disputed' | 'cancelled'
export type OrderStatus = 'pending' | 'processing' | 'payment_review' | 'delivery' | 'completed' | 'dispute' | 'cancelled'

export interface Order {
  id: string
  buyerId: string
  sellerId: string
  accountId: string
  account?: Account
  buyer?: Profile
  seller?: Profile
  orderCode: string
  amount: number
  paymentProvider?: string
  paymentProviderId?: string
  paymentStatus: PaymentStatus
  paymentUrl?: string
  pixQrCode?: string
  pixCopyPaste?: string
  deliveryStatus: DeliveryStatus
  status: OrderStatus
  paidAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt?: string
}

export interface OrderPayload {
  buyerId: string
  sellerId: string
  accountId: string
  amount: number
}

export interface Conversation {
  id: string
  accountId?: string
  buyerId: string
  sellerId: string
  orderId?: string
  proposalId?: string
  account?: Account
  order?: Order
  proposal?: SellProposal
  buyer?: Profile
  seller?: Profile
  status: string
  lastMessage?: string
  lastMessageAt?: string
  createdAt: string
  updatedAt?: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  sender?: Profile
  body: string
  mediaUrl?: string
  readAt?: string
  createdAt: string
}

export interface MessagePayload {
  conversationId: string
  senderId: string
  body: string
  mediaUrl?: string
}

export type ProposalStatus =
  | 'draft'
  | 'pending_analysis'
  | 'under_review'
  | 'negotiating'
  | 'counter_offer_sent'
  | 'approved_for_purchase'
  | 'purchased'
  | 'rejected'

export interface SellProposalMedia {
  id: string
  proposalId: string
  url: string
  type: MediaType
  isCover: boolean
  createdAt: string
}

export interface SellProposal {
  id: string
  customerId: string
  customer?: Profile
  proposalCode: string
  gameName: string
  proposalTitle: string
  category: AccountCategory
  desiredPrice: number
  description: string
  login?: string
  password?: string
  linkedEmail?: string
  emailPassword?: string
  has2FA?: Has2FA
  sendCredentialsLater: boolean
  platform?: string
  region?: string
  additionalInfo?: string
  status: ProposalStatus
  adminOfferPrice?: number
  internalNotes?: string
  assignedAdminId?: string
  media: SellProposalMedia[]
  createdAt: string
  updatedAt?: string
}

export interface SellProposalPayload {
  customerId: string
  gameName: string
  proposalTitle: string
  category?: AccountCategory
  desiredPrice: number
  description: string
  region?: string
  additionalInfo?: string
  status?: ProposalStatus
}

export interface CounterOfferPayload {
  adminOfferPrice: number
  internalNotes?: string
  actorId?: string
  note?: string
}

export interface UploadedMedia {
  path: string
  url: string
  type: MediaType
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SupportTicketCategory = 'payment' | 'account_access' | 'warranty' | 'proposal' | 'order' | 'other'

export interface SupportTicket {
  id: string
  customerId: string
  customer?: Profile
  assignedToId?: string
  assignedTo?: Profile
  subject: string
  category: SupportTicketCategory
  status: SupportTicketStatus
  priority: SupportTicketPriority
  relatedOrderId?: string
  relatedOrder?: Order
  relatedProposalId?: string
  relatedProposal?: SellProposal
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface SupportTicketMessage {
  id: string
  ticketId: string
  senderId: string
  sender?: Profile
  message: string
  isInternal: boolean
  createdAt: string
}

export interface SupportTicketDetails {
  ticket: SupportTicket
  messages: SupportTicketMessage[]
}

export interface CreateSupportTicketPayload {
  subject: string
  category: SupportTicketCategory
  initialMessage: string
  relatedOrderId?: string
  relatedProposalId?: string
}

export interface SupportTicketFilters {
  status?: SupportTicketStatus | 'all'
  priority?: SupportTicketPriority | 'all'
  category?: SupportTicketCategory | 'all'
  search?: string
  assignedTo?: string
}
