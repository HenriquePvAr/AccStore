import { cn } from '../../lib/utils'
import type { AccountCategory } from '../../services/types'

interface CategoryBadgeProps {
  category: AccountCategory
}

const categoryStyles: Record<AccountCategory, string> = {
  Básica: 'border-slate-400/16 bg-slate-400/10 text-slate-300',
  Intermediária: 'border-cyan-300/18 bg-cyan-300/10 text-cyan-200',
  Avançada: 'border-blue-300/20 bg-blue-300/12 text-blue-200',
  Premium: 'border-sky-300/20 bg-sky-300/12 text-sky-200',
  Completa: 'border-sky-300/20 bg-sky-300/12 text-sky-200',
  Rara: 'border-indigo-300/20 bg-indigo-300/12 text-indigo-200',
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span className={cn('inline-flex min-h-6 items-center rounded-md border px-2 text-[11px] font-bold', categoryStyles[category])}>
      {category}
    </span>
  )
}
