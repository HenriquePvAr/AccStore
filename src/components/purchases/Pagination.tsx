import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  start: number
  end: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  start,
  end,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <div className="flex flex-col gap-4 border-t border-[rgba(80,130,255,0.12)] pt-4 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm font-medium text-slate-400">
        Mostrando {start} a {end} de {total} compras
      </p>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-[rgba(80,130,255,0.13)] bg-[#070B16]/45 text-slate-400 transition hover:border-[#1495FF]/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          title="Página anterior"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-lg border text-sm font-bold transition',
              page === currentPage
                ? 'border-[#1495FF]/70 bg-[#1463FF]/18 text-white shadow-[0_0_18px_rgba(20,99,255,0.16)]'
                : 'border-[rgba(80,130,255,0.13)] bg-[#070B16]/45 text-slate-400 hover:border-[#1495FF]/45 hover:text-white',
            )}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-[rgba(80,130,255,0.13)] bg-[#070B16]/45 text-slate-400 transition hover:border-[#1495FF]/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          title="Próxima página"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>

      <label className="relative w-full lg:w-[150px]">
        <span className="sr-only">Compras por página</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="min-h-11 w-full appearance-none rounded-lg border border-[rgba(80,130,255,0.16)] bg-[#070B16]/45 px-4 pr-9 text-sm font-semibold text-slate-100 outline-none transition hover:border-[#1495FF]/45"
        >
          <option value={5} className="bg-[#0B1222]">
            5 por página
          </option>
          <option value={10} className="bg-[#0B1222]">
            10 por página
          </option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      </label>
    </div>
  )
}
