import { Search } from 'lucide-react'
interface HeroProps {
  search: string
  onSearchChange: (value: string) => void
}

export function Hero({ search, onSearchChange }: HeroProps) {
  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-xl border border-[rgba(80,130,255,0.2)] bg-[#070B16] shadow-[0_22px_80px_rgba(0,0,0,0.32)] sm:min-h-[450px] lg:min-h-[480px]">
      <picture className="absolute inset-0">
        <source media="(min-width: 768px)" srcSet="/assets/accstore/hero-desktop.png" />
        <img
          src="/assets/accstore/hero-mobile.png"
          alt="Arte de destaque ACCSTORE para contas Free Fire"
          className="size-full object-cover object-center lg:object-[70%_center]"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-r from-[#070B16]/96 via-[#070B16]/72 to-[#070B16]/28" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070B16]/88 via-[#070B16]/18 to-black/34" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(20,99,255,0.16),transparent_32%),linear-gradient(115deg,rgba(255,255,255,0.04),transparent_42%)]" />
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[rgba(80,130,255,0.38)] to-transparent" />

      <div className="relative flex min-h-[420px] items-center p-6 sm:min-h-[450px] sm:p-8 lg:min-h-[480px] lg:p-12 xl:p-14">
        <div className="max-w-[780px]">
          <h1 className="font-editorial max-w-[760px] text-[38px] font-semibold leading-[1] tracking-normal text-white sm:text-[58px] lg:text-[68px] xl:text-[76px]">
            <span className="block">Nunca foi tão fácil e seguro</span>
            <span className="block">comprar e vender contas</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[15px] leading-7 text-white/82 sm:text-lg">
            Anúncios selecionados, suporte durante a negociação
            <span className="hidden sm:inline">
              <br />
            </span>{' '}
            e uma experiência pensada para comprar e vender melhor.
          </p>

          <label className="mt-7 hidden max-w-[620px] items-center rounded-xl border border-[rgba(80,130,255,0.28)] bg-[rgba(7,11,22,0.78)] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.3)] backdrop-blur transition focus-within:border-[rgba(20,149,255,0.58)] md:flex">
            <span className="sr-only">Buscar conta</span>
            <Search aria-hidden="true" className="ml-3 size-5 text-white/45" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por jogo, conta, preço ou características..."
              className="min-h-12 flex-1 border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/48"
            />
            <span className="inline-flex size-12 items-center justify-center rounded-lg bg-[#1495FF] text-white shadow-[0_0_20px_rgba(20,149,255,0.22)]">
              <Search aria-hidden="true" className="size-5" />
            </span>
          </label>
        </div>
      </div>
    </section>
  )
}
