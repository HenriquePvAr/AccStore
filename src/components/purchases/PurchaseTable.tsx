import type { Order } from '../../services/types'
import { PurchaseRow } from './PurchaseRow'
import { Pagination } from './Pagination'

interface PurchaseTableProps {
  purchases: Order[]
  currentPage: number
  totalPages: number
  start: number
  end: number
  total: number
  pageSize: number
  conversationOrderId?: string | null
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onOpenDetails: (orderId: string) => void
  onStartConversation: (orderId: string) => void
}

export function PurchaseTable({
  purchases,
  currentPage,
  totalPages,
  start,
  end,
  total,
  pageSize,
  conversationOrderId,
  onPageChange,
  onPageSizeChange,
  onOpenDetails,
  onStartConversation,
}: PurchaseTableProps) {
  return (
    <section className="rounded-2xl border border-[rgba(80,130,255,0.16)] bg-[#0B1222]/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.18)]">
      <div className="space-y-2.5">
        {purchases.map((purchase) => (
          <PurchaseRow
            key={purchase.id}
            purchase={purchase}
            conversationLoading={conversationOrderId === purchase.id}
            onOpenDetails={onOpenDetails}
            onStartConversation={onStartConversation}
          />
        ))}
      </div>

      <div className="mt-5">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          start={start}
          end={end}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </section>
  )
}
