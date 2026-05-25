import type {
  Account,
  AccountMedia,
  AccountMediaPayload,
  AccountPayload,
  Conversation,
  Message,
  Order,
  Profile,
  SellProposal,
  SellProposalMedia,
  SellProposalPayload,
} from './types'
import { inferMediaType } from '../lib/media'

type Row = Record<string, unknown>

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function number(value: unknown, fallback = 0) {
  return typeof value === 'number' ? value : Number(value) || fallback
}

function boolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export function mapProfile(row: Row): Profile {
  return {
    id: text(row.id),
    fullName: text(row.full_name),
    email: text(row.email),
    role: text(row.role, 'customer') as Profile['role'],
    avatarUrl: text(row.avatar_url) || undefined,
    verified: boolean(row.verified),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || undefined,
  }
}

export function mapAccountMedia(row: Row): AccountMedia {
  const url = text(row.url) || text(row.media_url) || text(row.public_url)
  const type = text(row.type) || text(row.media_type)
  const normalizedType = type === 'image' || type === 'video' ? type : inferMediaType(type || url)

  return {
    id: text(row.id),
    accountId: text(row.account_id),
    url,
    type: normalizedType,
    isCover: boolean(row.is_cover),
    createdAt: text(row.created_at),
  }
}

export function mapAccount(row: Row, media: AccountMedia[] = [], seller?: Profile): Account {
  return {
    id: text(row.id),
    sellerId: text(row.seller_id),
    seller,
    gameName: text(row.game_name),
    title: text(row.title),
    category: text(row.category, 'Básica') as Account['category'],
    price: number(row.price),
    publicDescription: text(row.public_description),
    login: text(row.login) || undefined,
    password: text(row.password) || undefined,
    linkedEmail: text(row.linked_email) || undefined,
    emailPassword: text(row.email_password) || undefined,
    has2FA: (text(row.has_2fa) || undefined) as Account['has2FA'],
    platform: text(row.platform) || undefined,
    region: text(row.region) || undefined,
    internalNotes: text(row.internal_notes) || undefined,
    coverMediaUrl: text(row.cover_media_url) || media.find((item) => item.isCover)?.url || media[0]?.url,
    status: text(row.status, 'draft') as Account['status'],
    media,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || undefined,
  }
}

export function toAccountRow(payload: Partial<AccountPayload>) {
  return {
    seller_id: payload.sellerId,
    game_name: payload.gameName,
    title: payload.title,
    category: payload.category,
    price: payload.price,
    public_description: payload.publicDescription,
    region: payload.region,
    internal_notes: payload.internalNotes,
    cover_media_url: payload.coverMediaUrl,
    status: payload.status,
  }
}

export function toAccountMediaRow(payload: AccountMediaPayload) {
  return {
    account_id: payload.accountId,
    url: payload.url,
    type: payload.type,
    is_cover: payload.isCover ?? false,
  }
}

export function mapOrder(row: Row, account?: Account, buyer?: Profile, seller?: Profile): Order {
  return {
    id: text(row.id),
    buyerId: text(row.buyer_id),
    sellerId: text(row.seller_id),
    accountId: text(row.account_id),
    account,
    buyer,
    seller,
    orderCode: text(row.order_code),
    amount: number(row.amount),
    isGuest: boolean(row.is_guest),
    guestName: text(row.guest_name) || undefined,
    guestWhatsapp: text(row.guest_whatsapp) || undefined,
    guestEmail: text(row.guest_email) || undefined,
    guestToken: text(row.guest_token) || undefined,
    guestTokenExpiresAt: text(row.guest_token_expires_at) || undefined,
    paymentProvider: text(row.payment_provider) || undefined,
    paymentProviderId: text(row.payment_provider_id) || undefined,
    paymentStatus: text(row.payment_status, 'pending') as Order['paymentStatus'],
    paymentUrl: text(row.payment_url) || undefined,
    pixQrCode: text(row.pix_qr_code) || undefined,
    pixCopyPaste: text(row.pix_copy_paste) || undefined,
    deliveryStatus: text(row.delivery_status, 'pending') as Order['deliveryStatus'],
    status: text(row.status, 'pending') as Order['status'],
    paidAt: text(row.paid_at) || undefined,
    expiresAt: text(row.expires_at) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || undefined,
  }
}

export function mapConversation(row: Row, account?: Account, buyer?: Profile, seller?: Profile, order?: Order, proposal?: SellProposal): Conversation {
  return {
    id: text(row.id),
    accountId: text(row.account_id) || undefined,
    buyerId: text(row.buyer_id),
    sellerId: text(row.seller_id),
    orderId: text(row.order_id) || undefined,
    proposalId: text(row.proposal_id) || undefined,
    account,
    order,
    proposal,
    buyer,
    seller,
    status: text(row.status, 'open'),
    lastMessage: text(row.last_message) || undefined,
    lastMessageAt: text(row.last_message_at) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || undefined,
  }
}

export function mapMessage(row: Row, sender?: Profile): Message {
  return {
    id: text(row.id),
    conversationId: text(row.conversation_id),
    senderId: text(row.sender_id),
    sender,
    body: text(row.body),
    mediaUrl: text(row.media_url) || undefined,
    readAt: text(row.read_at) || undefined,
    createdAt: text(row.created_at),
  }
}

export function mapSellProposalMedia(row: Row): SellProposalMedia {
  return {
    id: text(row.id),
    proposalId: text(row.proposal_id),
    url: text(row.url),
    type: text(row.type, 'image') as SellProposalMedia['type'],
    isCover: boolean(row.is_cover),
    createdAt: text(row.created_at),
  }
}

export function mapSellProposal(row: Row, media: SellProposalMedia[] = [], customer?: Profile): SellProposal {
  return {
    id: text(row.id),
    customerId: text(row.customer_id),
    customer,
    proposalCode: text(row.proposal_code),
    gameName: text(row.game_name),
    proposalTitle: text(row.proposal_title),
    category: text(row.category, 'Básica') as SellProposal['category'],
    desiredPrice: number(row.desired_price),
    description: text(row.description),
    isGuest: boolean(row.is_guest),
    guestName: text(row.guest_name) || undefined,
    guestWhatsapp: text(row.guest_whatsapp) || undefined,
    guestEmail: text(row.guest_email) || undefined,
    guestToken: text(row.guest_token) || undefined,
    guestTokenExpiresAt: text(row.guest_token_expires_at) || undefined,
    login: text(row.login) || undefined,
    password: text(row.password) || undefined,
    linkedEmail: text(row.linked_email) || undefined,
    emailPassword: text(row.email_password) || undefined,
    has2FA: (text(row.has_2fa) || undefined) as SellProposal['has2FA'],
    sendCredentialsLater: boolean(row.send_credentials_later),
    platform: text(row.platform) || undefined,
    region: text(row.region) || undefined,
    additionalInfo: text(row.additional_info) || undefined,
    status: text(row.status, 'pending_analysis') as SellProposal['status'],
    adminOfferPrice: row.admin_offer_price == null ? undefined : number(row.admin_offer_price),
    internalNotes: text(row.internal_notes) || undefined,
    assignedAdminId: text(row.assigned_admin_id) || undefined,
    media,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || undefined,
  }
}

export function toSellProposalRow(payload: SellProposalPayload) {
  return {
    customer_id: payload.customerId,
    proposal_code: `SOL-${Date.now().toString().slice(-6)}`,
    game_name: payload.gameName,
    proposal_title: payload.proposalTitle,
    // TODO: remover fallback quando category deixar de ser obrigatorio no banco.
    category: payload.category ?? 'Completa',
    desired_price: payload.desiredPrice,
    description: payload.description,
    status: payload.status ?? 'pending_analysis',
    ...(payload.region ? { region: payload.region } : {}),
    ...(payload.additionalInfo ? { additional_info: payload.additionalInfo } : {}),
  }
}
