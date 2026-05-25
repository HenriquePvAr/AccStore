import { ShieldCheck, UserRound } from 'lucide-react'
import { roleLabels, type UserRole } from '../../auth/types'
import { cn } from '../../lib/utils'

interface RoleBadgeProps {
  role: UserRole
  compact?: boolean
}

const roleStyles: Record<UserRole, string> = {
  customer: 'border-blue-400/20 bg-blue-500/10 text-blue-200',
  seller: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
  admin: 'border-violet-400/22 bg-violet-500/12 text-violet-200',
}

export function RoleBadge({ role, compact = false }: RoleBadgeProps) {
  const Icon = role === 'customer' ? UserRound : ShieldCheck

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-black',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        roleStyles[role],
      )}
    >
      <Icon aria-hidden="true" className={compact ? 'size-3' : 'size-3.5'} />
      {roleLabels[role]}
    </span>
  )
}
