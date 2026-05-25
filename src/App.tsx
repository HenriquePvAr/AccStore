import {
  BarChart3,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  UsersRound,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { getPathForView, getRouteAccess, normalizePath } from './auth/routes'
import { roleLabels } from './auth/types'
import { AccountCard } from './components/AccountCard'
import { AccountDetails } from './components/AccountDetails'
import { AccessDeniedPage } from './components/auth/AccessDeniedPage'
import { LoginPage } from './components/auth/LoginPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RegisterPage } from './components/auth/RegisterPage'
import { BottomNav } from './components/BottomNav'
import { GuestOrderTrackingPage } from './components/guest/GuestOrderTrackingPage'
import { GuestProposalTrackingPage } from './components/guest/GuestProposalTrackingPage'
import { Hero } from './components/Hero'
import { HomePage } from './components/home/HomePage'
import { RoleBasedSidebar } from './components/layout/RoleBasedSidebar'
import { MessagesPage } from './components/messages/MessagesPage'
import { OrdersPage } from './components/orders/OrdersPage'
import { ProfileMenu } from './components/ProfileMenu'
import { MyProposalsPage } from './components/proposals/MyProposalsPage'
import { ProposalAnalysisPage } from './components/proposals/ProposalAnalysisPage'
import { ReceivedProposalsPage } from './components/proposals/ReceivedProposalsPage'
import { SellToAccstorePage } from './components/proposals/SellToAccstorePage'
import { PurchaseDetailsPage } from './components/purchases/PurchaseDetailsPage'
import { PurchaseHistoryPage } from './components/purchases/PurchaseHistoryPage'
import { SellAccountPage } from './components/seller/SellAccountPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { SupportPage } from './components/support/SupportPage'
import { TermsPage } from './components/terms/TermsPage'
import { Topbar } from './components/Topbar'
import { formatBRL, formatDateTime } from './lib/format'
import type { AppView } from './lib/navigation'
import { cn } from './lib/utils'
import { deleteAccountListing, getAllAccounts, getPublishedAccounts, getSellerAccounts, updateAccountStatus } from './services/accountsService'
import { getAllOrders } from './services/ordersService'
import { getAdminReceivedProposals } from './services/proposalsService'
import type { Account, Order, Profile, SellProposal } from './services/types'
import { getAllUsers } from './services/usersService'

function App() {
  const location = useLocation()
  const route = getRouteAccess(location.pathname)
  const normalizedPath = normalizePath(location.pathname)

  if (normalizedPath === '/login') {
    return <LoginPage />
  }

  if (normalizedPath === '/cadastro') {
    return <RegisterPage />
  }

  if (normalizedPath === '/acesso-negado') {
    return <AccessDeniedPage />
  }

  if (!route.public && route.roles) {
    return (
      <ProtectedRoute allowedRoles={route.roles}>
        <AppShell activeView={route.view} />
      </ProtectedRoute>
    )
  }

  return <AppShell activeView={route.view} />
}

interface AppShellProps {
  activeView: AppView
}

function AppShell({ activeView }: AppShellProps) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const normalizedPath = normalizePath(location.pathname)
  const routeProposalId =
    normalizedPath.startsWith('/propostas-recebidas/') || normalizedPath.startsWith('/admin/propostas/')
      ? decodeURIComponent(normalizedPath.split('/').filter(Boolean).at(-1) ?? '')
      : null
  const routeOrderId = normalizedPath.startsWith('/minhas-compras/')
    ? decodeURIComponent(normalizedPath.split('/').filter(Boolean).at(-1) ?? '')
    : null
  const routeSupportId = normalizedPath.startsWith('/suporte/') && normalizedPath !== '/suporte/novo'
    ? decodeURIComponent(normalizedPath.split('/').filter(Boolean).at(-1) ?? '')
    : null
  const routeGuestOrderToken = normalizedPath.startsWith('/acompanhar-pedido/')
    ? decodeURIComponent(normalizedPath.split('/').filter(Boolean).at(-1) ?? '')
    : null
  const routeGuestProposalToken = normalizedPath.startsWith('/acompanhar-proposta/')
    ? decodeURIComponent(normalizedPath.split('/').filter(Boolean).at(-1) ?? '')
    : null

  useEffect(() => {
    let active = true

    async function loadAccounts() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await getPublishedAccounts()
        if (active) {
          setAccounts(data)
        }
      } catch (caught) {
        if (active) {
          setLoadError(caught instanceof Error ? caught.message : 'Erro ao carregar contas.')
          setAccounts([])
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadAccounts()

    return () => {
      active = false
    }
  }, [])

  const searchedAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return accounts
    }

    return accounts.filter((account) => {
      const searchable = [
        account.title,
        account.publicDescription,
        account.category,
        account.seller?.fullName,
        account.gameName,
        account.region,
        formatBRL(account.price),
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [accounts, search])

  const handleNavigate = (view: AppView) => {
    if (view === 'profile' && !user) {
      navigate('/login')
      return
    }

    navigate(getPathForView(view, user?.role))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDetails = (account: Account) => {
    setSelectedAccount(account)
    navigate('/detalhes')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageAccounts = activeView === 'explore' ? searchedAccounts : searchedAccounts.slice(0, 8)

  const showMarketplace = activeView === 'explore'
  const emptyTitle = 'Nenhuma conta encontrada para essa busca'

  return (
    <div className="min-h-svh bg-[#05070F] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(0,112,209,0.14),transparent_30rem),linear-gradient(120deg,rgba(159,246,198,0.07),transparent_34rem),linear-gradient(135deg,#05070F_0%,#080D1B_46%,#05070F_100%)]" />
      <RoleBasedSidebar activeView={activeView} onNavigate={handleNavigate} />

      <div className="relative lg:pl-[276px]">
        <Topbar activeView={activeView} cartCount={0} onNavigate={handleNavigate} />

        <main className="mx-auto max-w-[1680px] px-4 pb-28 pt-3 sm:px-6 lg:px-7 lg:pb-10">
          {activeView === 'details' ? (
            selectedAccount ? (
              <AccountDetails
                account={selectedAccount}
                onBack={() => handleNavigate('explore')}
              />
            ) : (
              <EmptyState title="Selecione uma conta real no explorar para ver os detalhes" />
            )
          ) : null}

          {activeView === 'home' ? (
            <HomePage
              featuredAccounts={accounts.slice(0, 4)}
              loading={isLoading}
              onOpenAccount={openDetails}
              onNavigate={handleNavigate}
            />
          ) : null}

          {activeView === 'profile' ? <ProfileMenu onNavigate={handleNavigate} /> : null}

          {activeView === 'terms' ? <TermsPage /> : null}

          {activeView === 'settings' ? <SettingsPage /> : null}

          {activeView === 'purchases' ? <PurchaseHistoryPage /> : null}

          {activeView === 'purchaseDetails' ? <PurchaseDetailsPage orderId={routeOrderId} /> : null}

          {activeView === 'messages' ? <MessagesPage onOpenAccount={openDetails} /> : null}

          {activeView === 'support' ? <SupportPage mode="list" /> : null}

          {activeView === 'supportNew' ? <SupportPage mode="new" /> : null}

          {activeView === 'supportDetails' ? <SupportPage mode="details" ticketId={routeSupportId} /> : null}

          {activeView === 'guestOrderTracking' ? <GuestOrderTrackingPage token={routeGuestOrderToken} /> : null}

          {activeView === 'guestProposalTracking' ? <GuestProposalTrackingPage token={routeGuestProposalToken} /> : null}

          {activeView === 'orders' ? <OrdersPage /> : null}

          {activeView === 'sell' ? <SellToAccstorePage /> : null}

          {activeView === 'myProposals' ? <MyProposalsPage /> : null}

          {activeView === 'adminProposals' ? (
            <ReceivedProposalsPage
              onOpenAnalysis={(proposalId) => {
                setSelectedProposalId(proposalId)
                navigate(`/propostas-recebidas/${proposalId}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          ) : null}

          {activeView === 'receivedProposals' ? (
            <ReceivedProposalsPage
              onOpenAnalysis={(proposalId) => {
                setSelectedProposalId(proposalId)
                navigate(`/propostas-recebidas/${proposalId}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          ) : null}

          {activeView === 'receivedProposalDetails' ? (
            <ProposalAnalysisPage
              key={routeProposalId ?? 'received-proposal'}
              proposalId={routeProposalId}
              onBack={() => handleNavigate('receivedProposals')}
            />
          ) : null}

          {activeView === 'proposalAnalysis' || activeView === 'adminAcquisition' ? (
            <ProposalAnalysisPage proposalId={selectedProposalId} onBack={() => handleNavigate('adminProposals')} />
          ) : null}

          {activeView === 'sellerListings' ? (
            <div className="space-y-5">
              <SellAccountPage />
              <OperationalPage kind="sellerListings" />
            </div>
          ) : null}

          {activeView === 'adminDashboard' ? <OperationalPage kind="adminDashboard" /> : null}

          {activeView === 'adminListings' ? (
            <div className="space-y-5">
              <AdminListingsManager />
              <SellAccountPage />
              <OperationalPage kind="adminListings" />
            </div>
          ) : null}

          {activeView === 'adminUsers' ? <OperationalPage kind="adminUsers" /> : null}

          {activeView === 'adminSellers' ? <OperationalPage kind="adminSellers" /> : null}

          {activeView === 'adminPayments' ? <OperationalPage kind="adminPayments" /> : null}

          {activeView === 'adminReports' ? <OperationalPage kind="adminReports" /> : null}

          {showMarketplace ? (
            <div className="space-y-4">
              <Hero search={search} onSearchChange={setSearch} />
              <MobileSearch value={search} onChange={setSearch} />

              <section>
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-blue-300">
                      {activeView === 'explore' ? 'Explorar contas' : 'Início'}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                      Contas Free Fire disponíveis
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate('explore')}
                    className={cn(
                      'hidden min-h-10 rounded-lg border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:border-blue-400/50 hover:text-white sm:inline-flex sm:items-center',
                      activeView === 'explore' && 'pointer-events-none opacity-0',
                    )}
                  >
                    Ver todas
                  </button>
                </div>

                {isLoading ? (
                  <SkeletonGrid />
                ) : loadError ? (
                  <ErrorState message={loadError} />
                ) : pageAccounts.length > 0 ? (
                  <div
                    className={cn(
                      'grid gap-3',
                      activeView === 'explore'
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                        : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                    )}
                  >
                    {pageAccounts.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        layout={activeView === 'explore' ? 'list' : 'grid'}
                        onSelect={openDetails}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title={emptyTitle} />
                )}
              </section>
            </div>
          ) : null}
        </main>
        <AppFooter />
      </div>

      <BottomNav activeView={activeView} onNavigate={handleNavigate} />
    </div>
  )
}

function AppFooter() {
  return (
    <footer className="relative mx-auto max-w-[1680px] px-4 pb-24 sm:px-6 lg:px-7 lg:pb-8">
      <div className="flex flex-col gap-3 border-t border-[rgba(120,140,255,0.16)] py-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>ACC Story é uma plataforma independente, sem vínculo oficial com desenvolvedoras de jogos.</p>
        <Link to="/termos" className="font-bold text-blue-300 transition hover:text-white">
          Termo de Compra e Responsabilidade
        </Link>
      </div>
    </footer>
  )
}

interface MobileSearchProps {
  value: string
  onChange: (value: string) => void
}

function MobileSearch({ value, onChange }: MobileSearchProps) {
  return (
    <label className="flex items-center rounded-lg border border-[rgba(120,140,255,0.16)] bg-[#0B1222]/86 p-1 md:hidden">
      <span className="sr-only">Buscar conta</span>
      <Search aria-hidden="true" className="ml-3 size-5 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por jogo, conta, preço ou características..."
        className="min-h-10 flex-1 border-0 bg-transparent px-3 text-[13px] text-white outline-none placeholder:text-slate-500"
      />
    </label>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#0B1222]">
          <div className="aspect-[16/9] animate-pulse bg-[#101827]" />
          <div className="space-y-3 p-3">
            <div className="h-4 animate-pulse rounded bg-white/[0.08]" />
            <div className="h-10 animate-pulse rounded bg-white/[0.06]" />
            <div className="flex items-center justify-between gap-3">
              <div className="h-7 w-24 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-9 w-24 animate-pulse rounded bg-white/[0.08]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  title: string
}

function EmptyState({ title }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/92 p-8 text-center">
      <Search aria-hidden="true" className="mb-4 size-10 text-slate-500" />
      <h3 className="text-xl font-black text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        Tente buscar pelo nome, preço, itens ou características da conta.
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 p-8 text-center">
      <Search aria-hidden="true" className="mb-4 size-10 text-rose-300" />
      <h3 className="text-xl font-black text-white">Erro ao carregar dados</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-rose-100">{message}</p>
    </div>
  )
}

function AdminListingsManager() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionAccountId, setActionAccountId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadAccounts = async () => {
    setLoading(true)
    setError(null)

    try {
      setAccounts(await getAllAccounts())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os anúncios.')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getAllAccounts()
        if (active) {
          setAccounts(data)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os anúncios.')
          setAccounts([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return accounts
    }

    return accounts.filter((account) =>
      [
        account.title,
        account.gameName,
        account.category,
        account.status,
        account.seller?.fullName,
        formatBRL(account.price),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [accounts, search])

  const pauseListing = async (account: Account) => {
    setActionAccountId(account.id)
    setNotice(null)

    try {
      await updateAccountStatus(account.id, 'paused')
      await loadAccounts()
      setNotice({ type: 'success', message: 'Anúncio removido da vitrine.' })
    } catch {
      setNotice({ type: 'error', message: 'Não foi possível remover este anúncio da vitrine.' })
    } finally {
      setActionAccountId(null)
    }
  }

  const publishListing = async (account: Account) => {
    setActionAccountId(account.id)
    setNotice(null)

    try {
      await updateAccountStatus(account.id, 'published')
      await loadAccounts()
      setNotice({ type: 'success', message: 'Anúncio publicado novamente.' })
    } catch {
      setNotice({ type: 'error', message: 'Não foi possível publicar este anúncio. Verifique se ele tem mídia de capa.' })
    } finally {
      setActionAccountId(null)
    }
  }

  const deleteListing = async (account: Account) => {
    const confirmed = window.confirm(`Excluir definitivamente o anúncio "${account.title}"?`)

    if (!confirmed) {
      return
    }

    setActionAccountId(account.id)
    setNotice(null)

    try {
      await deleteAccountListing(account.id)
      await loadAccounts()
      setNotice({ type: 'success', message: 'Anúncio excluído com sucesso.' })
    } catch {
      setNotice({
        type: 'error',
        message: 'Não foi possível excluir. Se já existe pedido vinculado, use "Remover da vitrine".',
      })
    } finally {
      setActionAccountId(null)
    }
  }

  return (
    <section className="acc-surface space-y-4 p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
            <Store aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Gerenciar anúncios</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Remova anúncios da vitrine ou exclua cadastros que não devem continuar na plataforma.
            </p>
          </div>
        </div>

        <label className="flex min-h-11 items-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/64 px-3 transition focus-within:border-blue-400/55">
          <Search aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          <span className="sr-only">Buscar anúncio</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar anúncio..."
            className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>
      </div>

      {notice ? (
        <p
          className={cn(
            'rounded-lg border px-4 py-3 text-sm font-bold',
            notice.type === 'success'
              ? 'border-emerald-400/22 bg-emerald-500/12 text-emerald-100'
              : 'border-rose-400/22 bg-rose-500/12 text-rose-100',
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {loading ? <OperationalSkeleton /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && visibleAccounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/12 bg-[#101827]/45 p-6 text-center text-sm font-semibold text-slate-400">
          Nenhum anúncio encontrado.
        </p>
      ) : null}

      {!loading && !error && visibleAccounts.length > 0 ? (
        <div className="grid gap-3">
          {visibleAccounts.map((account) => {
            const busy = actionAccountId === account.id
            const thumbnail = account.coverMediaUrl || account.media.find((item) => item.isCover)?.url || account.media[0]?.url

            return (
              <article
                key={account.id}
                className="grid gap-4 rounded-lg border border-[rgba(120,140,255,0.14)] bg-[#070B16]/45 p-3 md:grid-cols-[80px_minmax(0,1fr)_auto] md:items-center"
              >
                {thumbnail ? (
                  <img src={thumbnail} alt={`Capa de ${account.title}`} className="h-20 w-full rounded-lg border border-white/10 object-cover md:w-20" />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded-lg border border-white/10 bg-[#101827] text-slate-600 md:w-20">
                    <Store aria-hidden="true" className="size-7" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-black text-white">{account.title}</h2>
                    <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-xs font-black text-blue-200">
                      {accountStatusLabel(account.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    {account.gameName} · {account.category} · {formatBRL(account.price)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Vendedor: {account.seller?.fullName || 'ACCSTORE'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
                  {account.status === 'published' ? (
                    <button
                      type="button"
                      onClick={() => void pauseListing(account)}
                      disabled={busy}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-400/24 bg-amber-500/10 px-3 text-sm font-black text-amber-100 transition hover:border-amber-300 disabled:opacity-60"
                    >
                      {busy ? 'Removendo...' : 'Remover da vitrine'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void publishListing(account)}
                      disabled={busy}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-400/24 bg-emerald-500/10 px-3 text-sm font-black text-emerald-100 transition hover:border-emerald-300 disabled:opacity-60"
                    >
                      {busy ? 'Publicando...' : 'Publicar'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void deleteListing(account)}
                    disabled={busy}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-400/24 bg-rose-500/10 px-3 text-sm font-black text-rose-100 transition hover:border-rose-300 disabled:opacity-60"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    {busy ? 'Aguarde...' : 'Excluir'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

type OperationalKind =
  | 'sellerListings'
  | 'adminDashboard'
  | 'adminListings'
  | 'adminUsers'
  | 'adminSellers'
  | 'adminPayments'
  | 'adminReports'

interface OperationalMetric {
  label: string
  value: string
}

interface OperationalRow {
  id: string
  title: string
  subtitle: string
  meta: string
  status?: string
}

interface OperationalData {
  metrics: OperationalMetric[]
  rows: OperationalRow[]
  empty: string
}

const operationalContent = {
  sellerListings: {
    icon: Store,
    title: 'Anúncios cadastrados',
    description: 'Acompanhe as contas reais publicadas ou salvas como rascunho pelo seu perfil vendedor.',
  },
  adminDashboard: {
    icon: BarChart3,
    title: 'Dashboard administrativo',
    description: 'Visão geral da operação, propostas, pedidos, pagamentos e usuários da ACCSTORE.',
  },
  adminListings: {
    icon: Store,
    title: 'Contas publicadas',
    description: 'Controle anúncios, estoque e contas aprovadas para revenda pela plataforma.',
  },
  adminUsers: {
    icon: UsersRound,
    title: 'Usuários',
    description: 'Gerencie clientes, acessos e bloqueios de segurança.',
  },
  adminSellers: {
    icon: ShieldCheck,
    title: 'Vendedores',
    description: 'Acompanhe vendedores verificados e cadastros em avaliação.',
  },
  adminPayments: {
    icon: Wallet,
    title: 'Pagamentos',
    description: 'Acompanhe pedidos, valores e status operacionais de pagamento.',
  },
  adminReports: {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Indicadores reais de vendas, propostas e operação da plataforma.',
  },
} satisfies Record<OperationalKind, { icon: LucideIcon; title: string; description: string }>

interface OperationalPageProps {
  kind: OperationalKind
}

function OperationalPage({ kind }: OperationalPageProps) {
  const { user } = useAuth()
  const content = operationalContent[kind]
  const Icon = content.icon
  const [data, setData] = useState<OperationalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null)
  const [deleteNotice, setDeleteNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const nextData = await loadOperationalData(kind, user?.id)
        if (active) {
          setData(nextData)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Erro ao carregar dados. Tente novamente.')
          setData(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [kind, user?.id])

  const canDeleteListings = kind === 'adminListings' && user?.role === 'admin'

  const handleDeleteListing = async (row: OperationalRow) => {
    const confirmed = window.confirm(`Excluir o anúncio "${row.title}"? Essa ação remove o anúncio da plataforma.`)

    if (!confirmed) {
      return
    }

    setDeletingRowId(row.id)
    setDeleteNotice(null)

    try {
      await deleteAccountListing(row.id)
      setData(await loadOperationalData(kind, user?.id))
      setDeleteNotice({ type: 'success', message: 'Anúncio excluído com sucesso.' })
    } catch {
      setDeleteNotice({
        type: 'error',
        message: 'Não foi possível excluir este anúncio. Se ele já tiver pedidos vinculados, remova-o de publicação em vez de excluir.',
      })
    } finally {
      setDeletingRowId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="acc-surface p-5">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
            <Icon aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">{content.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{content.description}</p>
          </div>
        </div>
      </div>

      {loading ? <OperationalSkeleton /> : null}

      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && data ? (
        <>
          {deleteNotice ? (
            <p
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-bold',
                deleteNotice.type === 'success'
                  ? 'border-emerald-400/22 bg-emerald-500/12 text-emerald-100'
                  : 'border-rose-400/22 bg-rose-500/12 text-rose-100',
              )}
            >
              {deleteNotice.message}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {data.metrics.map((metric) => (
              <article key={metric.label} className="acc-surface-soft p-5">
                <p className="text-2xl font-black text-white">{metric.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-400">{metric.label}</p>
              </article>
            ))}
          </div>

          <div className="acc-surface p-4">
            <h2 className="mb-3 text-base font-black text-white">Registros reais</h2>
            {data.rows.length > 0 ? (
              <div className="divide-y divide-white/10">
                {data.rows.map((row) => (
                  <div key={row.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{row.title}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{row.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                      <span>{row.meta}</span>
                      {row.status ? (
                        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-blue-200">
                          {row.status}
                        </span>
                      ) : null}
                      {canDeleteListings ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteListing(row)}
                          disabled={deletingRowId === row.id}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-rose-400/24 bg-rose-500/10 px-2.5 text-xs font-black text-rose-100 transition hover:border-rose-300 disabled:opacity-60"
                          title="Excluir anúncio"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                          {deletingRowId === row.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-white/12 bg-[#101827]/45 p-6 text-center text-sm font-semibold text-slate-400">
                {data.empty}
              </p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

function OperationalSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
          <div className="h-7 w-24 animate-pulse rounded bg-white/[0.08]" />
          <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  )
}

async function loadOperationalData(kind: OperationalKind, userId?: string): Promise<OperationalData> {
  if (kind === 'sellerListings') {
    if (!userId) {
      return {
        metrics: zeroMetrics(['Publicadas', 'Rascunhos', 'Vendidas']),
        rows: [],
        empty: 'Você ainda não publicou nenhuma conta.',
      }
    }

    const accounts = await getSellerAccounts(userId)
    return {
      metrics: [
        { value: String(accounts.filter((account) => account.status === 'published').length), label: 'Publicadas' },
        { value: String(accounts.filter((account) => account.status === 'draft').length), label: 'Rascunhos' },
        { value: String(accounts.filter((account) => account.status === 'sold').length), label: 'Vendidas' },
      ],
      rows: accountRows(accounts),
      empty: 'Você ainda não publicou nenhuma conta.',
    }
  }

  if (kind === 'adminDashboard') {
    const [accounts, orders, proposals, users] = await Promise.all([
      getAllAccounts(),
      getAllOrders(),
      getAdminReceivedProposals(),
      getAllUsers(),
    ])

    return {
      metrics: [
        { value: String(accounts.filter((account) => account.status === 'published').length), label: 'Contas publicadas' },
        { value: String(orders.length), label: 'Pedidos totais' },
        { value: String(proposals.filter((proposal) => proposal.status !== 'rejected').length), label: 'Propostas em fluxo' },
        { value: String(users.length), label: 'Usuários cadastrados' },
      ],
      rows: proposalRows(proposals),
      empty: 'Nenhuma proposta recebida.',
    }
  }

  if (kind === 'adminListings') {
    const accounts = await getAllAccounts()
    return {
      metrics: [
        { value: String(accounts.filter((account) => account.status === 'published').length), label: 'Publicadas' },
        { value: String(accounts.filter((account) => account.status === 'draft' || account.status === 'paused').length), label: 'Em revisão ou pausadas' },
        { value: String(accounts.filter((account) => account.status === 'sold').length), label: 'Vendidas' },
        { value: String(accounts.filter((account) => account.status === 'rejected').length), label: 'Recusadas' },
      ],
      rows: accountRows(accounts),
      empty: 'Nenhuma conta cadastrada.',
    }
  }

  if (kind === 'adminUsers' || kind === 'adminSellers') {
    const users = await getAllUsers()
    const filteredUsers = kind === 'adminSellers' ? users.filter((profile) => profile.role === 'seller') : users

    return {
      metrics: [
        { value: String(filteredUsers.length), label: kind === 'adminSellers' ? 'Vendedores' : 'Usuários' },
        { value: String(filteredUsers.filter((profile) => profile.verified).length), label: 'Verificados' },
        { value: String(filteredUsers.filter((profile) => profile.role === 'admin').length), label: 'Administradores' },
      ],
      rows: profileRows(filteredUsers),
      empty: kind === 'adminSellers' ? 'Nenhum vendedor encontrado.' : 'Nenhum usuário encontrado.',
    }
  }

  if (kind === 'adminPayments') {
    const orders = await getAllOrders()
    return {
      metrics: [
        { value: formatBRL(orders.reduce((total, order) => total + order.amount, 0)), label: 'Valor em pedidos' },
        { value: String(orders.filter((order) => order.status === 'pending' || order.status === 'payment_review').length), label: 'Aguardando pagamento/análise' },
        { value: String(orders.filter((order) => order.status === 'completed').length), label: 'Concluídos' },
      ],
      rows: orderRows(orders),
      empty: 'Nenhum pedido encontrado.',
    }
  }

  const [accounts, orders, proposals, users] = await Promise.all([
    getAllAccounts(),
    getAllOrders(),
    getAdminReceivedProposals(),
    getAllUsers(),
  ])

  return {
    metrics: [
      { value: formatBRL(orders.reduce((total, order) => total + order.amount, 0)), label: 'GMV em pedidos' },
      { value: String(accounts.length), label: 'Contas cadastradas' },
      { value: String(proposals.length), label: 'Propostas recebidas' },
      { value: String(users.length), label: 'Usuários cadastrados' },
    ],
    rows: orderRows(orders),
    empty: 'Nenhum dado operacional encontrado.',
  }
}

function zeroMetrics(labels: string[]): OperationalMetric[] {
  return labels.map((label) => ({ value: '0', label }))
}

function accountRows(accounts: Account[]): OperationalRow[] {
  return accounts.slice(0, 10).map((account) => ({
    id: account.id,
    title: account.title,
    subtitle: `${formatBRL(account.price)} - ${account.category} - ${account.gameName}`,
    meta: account.seller?.fullName ?? formatDateTime(account.createdAt),
    status: accountStatusLabel(account.status),
  }))
}

function orderRows(orders: Order[]): OperationalRow[] {
  return orders.slice(0, 10).map((order) => ({
    id: order.id,
    title: order.orderCode,
    subtitle: `${formatBRL(order.amount)} - ${order.account?.title ?? 'Conta não carregada'}`,
    meta: order.buyer?.fullName ?? order.guestName ?? formatDateTime(order.createdAt),
    status: orderStatusLabel(order.status),
  }))
}

function proposalRows(proposals: SellProposal[]): OperationalRow[] {
  return proposals.slice(0, 10).map((proposal) => ({
    id: proposal.id,
    title: proposal.proposalTitle,
    subtitle: `${formatBRL(proposal.desiredPrice)} - ${proposal.gameName}`,
    meta: proposal.customer?.fullName ?? proposal.guestName ?? formatDateTime(proposal.createdAt),
    status: proposal.status.replaceAll('_', ' '),
  }))
}

function profileRows(profiles: Profile[]): OperationalRow[] {
  return profiles.slice(0, 10).map((profile) => ({
    id: profile.id,
    title: profile.fullName || profile.email,
    subtitle: profile.email,
    meta: formatDateTime(profile.createdAt),
    status: roleLabels[profile.role],
  }))
}

function accountStatusLabel(status: Account['status']) {
  const labels: Record<Account['status'], string> = {
    draft: 'rascunho',
    published: 'publicada',
    paused: 'pausada',
    sold: 'vendida',
    rejected: 'recusada',
  }

  return labels[status]
}

function orderStatusLabel(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending: 'aguardando pagamento',
    processing: 'em preparação',
    payment_review: 'pagamento em análise',
    delivery: 'aguardando entrega',
    completed: 'entregue',
    dispute: 'em disputa',
    cancelled: 'cancelado',
  }

  return labels[status]
}

export default App
