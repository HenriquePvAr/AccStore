import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyPurchases } from '../../services/ordersService'
import { startOrderConversation } from '../../services/messagesService'
import type { Order, OrderStatus } from '../../services/types'
import { PurchaseFilters } from './PurchaseFilters'
import { PurchaseTable } from './PurchaseTable'

export function PurchaseHistoryPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'Todos os status' | OrderStatus>('Todos os status')
  const [period, setPeriod] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversationOrderId, setConversationOrderId] = useState<string | null>(null)
  const [conversationError, setConversationError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadOrders() {
      try {
        setLoading(true)
        setError(null)
        const data = await getMyPurchases()
        if (active) {
          setOrders(data)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Erro ao carregar compras.')
          setOrders([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadOrders()

    return () => {
      active = false
    }
  }, [])

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase()
    const periodQuery = period.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        [
          order.account?.title,
          order.accountId,
          order.orderCode,
          order.account?.category,
          order.status,
          order.createdAt,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      const matchesStatus = status === 'Todos os status' || order.status === status
      const matchesPeriod = !periodQuery || order.createdAt.toLowerCase().includes(periodQuery)

      return matchesSearch && matchesStatus && matchesPeriod
    })
  }, [orders, period, search, status])

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const pagePurchases = filteredPurchases.slice(startIndex, startIndex + pageSize)
  const start = filteredPurchases.length === 0 ? 0 : startIndex + 1
  const end = Math.min(startIndex + pageSize, filteredPurchases.length)

  const updateSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const updateStatus = (value: 'Todos os status' | OrderStatus) => {
    setStatus(value)
    setCurrentPage(1)
  }

  const updatePeriod = (value: string) => {
    setPeriod(value)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('Todos os status')
    setPeriod('')
    setCurrentPage(1)
  }

  const updatePageSize = (value: number) => {
    setPageSize(value)
    setCurrentPage(1)
  }

  const openDetails = (orderId: string) => {
    navigate(`/minhas-compras/${orderId}`)
  }

  const openConversation = async (orderId: string) => {
    setConversationOrderId(orderId)
    setConversationError(null)

    try {
      const conversation = await startOrderConversation(orderId)
      navigate(`/mensagens?conversationId=${conversation.id}`)
    } catch {
      setConversationError('Não foi possível iniciar a conversa agora.')
    } finally {
      setConversationOrderId(null)
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[rgba(80,130,255,0.16)] bg-[linear-gradient(135deg,rgba(11,18,34,0.96),rgba(7,11,22,0.9))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
        <div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Histórico de compras</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Confira suas compras, status e próximos passos em um só lugar.
            </p>
          </div>
        </div>
      </div>

      <PurchaseFilters
        search={search}
        status={status}
        period={period}
        onSearchChange={updateSearch}
        onStatusChange={updateStatus}
        onPeriodChange={updatePeriod}
        onClear={clearFilters}
      />

      {loading ? <StateCard title="Carregando compras..." /> : null}
      {error ? <StateCard title="Erro ao carregar dados. Tente novamente." description={error} /> : null}
      {conversationError ? <p className="rounded-xl border border-rose-400/22 bg-rose-500/12 p-4 text-sm font-bold text-rose-100">{conversationError}</p> : null}

      {!loading && !error && pagePurchases.length > 0 ? (
        <PurchaseTable
          purchases={pagePurchases}
          currentPage={safePage}
          totalPages={totalPages}
          start={start}
          end={end}
          total={filteredPurchases.length}
          pageSize={pageSize}
          conversationOrderId={conversationOrderId}
          onPageChange={setCurrentPage}
          onPageSizeChange={updatePageSize}
          onOpenDetails={openDetails}
          onStartConversation={(orderId) => void openConversation(orderId)}
        />
      ) : null}

      {!loading && !error && filteredPurchases.length === 0 ? (
        orders.length === 0 ? (
          <StateCard
            title="Nenhuma compra ainda"
            description="Quando você comprar uma conta, ela aparecerá aqui."
            actionLabel="Explorar contas"
            onAction={() => navigate('/explorar')}
          />
        ) : (
          <StateCard title="Nenhuma compra encontrada" description="Ajuste a busca, o status ou o período para localizar uma compra no histórico." />
        )
      ) : null}
    </section>
  )
}

function StateCard({ title, description, actionLabel, onAction }: { title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-[rgba(80,130,255,0.16)] bg-[#0B1222]/70 p-8 text-center">
      <Search aria-hidden="true" className="mb-4 size-10 text-slate-500" />
      <h2 className="text-xl font-black text-white">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1463FF] px-5 text-sm font-black text-white shadow-[0_0_18px_rgba(20,99,255,0.18)] transition hover:bg-[#1D74FF]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
