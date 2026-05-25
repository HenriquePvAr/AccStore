export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function normalizeWhatsApp(value: string) {
  const digits = onlyDigits(value)

  if (!digits) {
    return ''
  }

  if (digits.startsWith('55')) {
    return digits
  }

  return `55${digits}`
}

export function isValidWhatsApp(value: string) {
  const digits = onlyDigits(value)
  return digits.length >= 10
}

export function getWhatsAppUrl(value: string) {
  return `https://wa.me/${normalizeWhatsApp(value)}`
}

export function formatWhatsAppDisplay(value?: string) {
  if (!value) {
    return ''
  }

  const digits = onlyDigits(value)
  const withoutCountry = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits

  if (withoutCountry.length === 11) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`
  }

  if (withoutCountry.length === 10) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 6)}-${withoutCountry.slice(6)}`
  }

  return value
}
