import {
  BadgeCheck,
  ChevronRight,
  Filter,
  Gamepad2,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Tags,
  Trophy,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import Lenis from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import type { AppView } from '../../lib/navigation'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/utils'
import { getWhatsAppUrl } from '../../lib/whatsapp'
import type { Account } from '../../services/types'

interface HomePageProps {
  featuredAccounts: Account[]
  loading?: boolean
  onOpenAccount: (account: Account) => void
  onNavigate: (view: AppView) => void
}

type ShowcaseAccount = {
  title: string
  price: number
  tags: string[]
  accent: 'blue' | 'emerald' | 'violet' | 'cyan'
}

const homeAssets = {
  heroBackground: '/assets/accstore/home/hero-battle-royale-bg.png',
  cardBanner: '/assets/accstore/home/card-banner.png',
  angelicalPants: '/assets/accstore/home/angelical-pants-clean.png',
  bandeirao: '/assets/accstore/home/bandeirao-clean.png',
  evolutiveSmg: '/assets/accstore/home/evolutive-smg-clean.png',
}

const heroTags = ['Itens raros', 'Bandeirão', 'Armas evolutivas', 'Contas antigas', 'Vendedor verificado']

const premiumAccountItems = [
  { label: 'Calça Angelical Branca', src: homeAssets.angelicalPants, imageClassName: 'max-h-44 sm:max-h-56' },
  { label: 'Bandeirão', src: homeAssets.bandeirao, imageClassName: 'max-h-44 sm:max-h-56' },
  { label: 'MP40 Cobra', subtitle: 'Arma evolutiva', src: homeAssets.evolutiveSmg, imageClassName: 'max-h-32 w-full scale-[1.34] sm:max-h-40' },
]

const showcaseAccounts: ShowcaseAccount[] = [
  { title: 'Conta FF com itens raros', price: 379.9, tags: ['Itens raros', 'Bandeirão', 'Verificado'], accent: 'blue' },
  { title: 'Conta FF com bandeirão', price: 289.9, tags: ['Bandeirão', 'Contas antigas', 'Seguro'], accent: 'emerald' },
  { title: 'Conta FF com arma evolutiva', price: 449.9, tags: ['Armas evolutivas', 'Itens raros', 'Verificado'], accent: 'violet' },
  { title: 'Conta FF antiga com itens raros', price: 229.9, tags: ['Contas antigas', 'Itens raros', 'Oferta recente'], accent: 'cyan' },
]

const trustCards: Array<{ icon: LucideIcon; title: string; description: string }> = [
  { icon: ShieldCheck, title: 'Vendedores verificados', description: 'Perfis com sinais claros de confiança para negociar com mais tranquilidade.' },
  { icon: Filter, title: 'Filtros por preço e itens', description: 'Encontre contas por faixa de valor, raridade, estilo de conta e itens especiais.' },
  { icon: Tags, title: 'Contas organizadas', description: 'Cards objetivos, status legíveis e informações principais sem excesso de texto.' },
  { icon: Zap, title: 'Atendimento rápido', description: 'Fluxos diretos para comprar, vender e tirar dúvidas quando precisar.' },
  { icon: Smartphone, title: 'Experiência mobile', description: 'Interface pensada para navegar, comparar e chamar no WhatsApp pelo celular.' },
  { icon: Gamepad2, title: 'Foco em contas gamer', description: 'Uma vitrine feita para contas de Free Fire e outros jogos, com linguagem do mercado.' },
]

const categories = ['Itens raros', 'Bandeirão', 'Armas evolutivas', 'Contas antigas', 'Vendedor verificado', 'Ofertas recentes']

const steps: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: ShoppingBag, title: 'Escolha sua conta', text: 'Veja itens, bandeirão, preço e vendedor.' },
  { icon: MessageCircle, title: 'Fale com o vendedor', text: 'Tire dúvidas e combine a compra de forma simples.' },
  { icon: ShieldCheck, title: 'Receba com segurança', text: 'Finalize a negociação com mais confiança e praticidade.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 34, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

export function HomePage({ onNavigate }: HomePageProps) {
  useHomeSmoothScroll()

  const supportWhatsapp = typeof import.meta.env.VITE_PUBLIC_WHATSAPP === 'string' ? import.meta.env.VITE_PUBLIC_WHATSAPP : ''
  const supportWhatsappUrl = supportWhatsapp ? getWhatsAppUrl(supportWhatsapp) : null

  return (
    <div className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-7">
      <HeroSection onNavigate={onNavigate} />
      <FeaturedAccountsSection supportWhatsappUrl={supportWhatsappUrl} onNavigate={onNavigate} />
      <HowItWorksSection />
      <TrustSection />
      <CategoriesSection onNavigate={onNavigate} />
      <FinalCta onNavigate={onNavigate} />
    </div>
  )
}

function useHomeSmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      return undefined
    }

    const lenis = new Lenis({
      duration: 1.18,
      easing: (time) => Math.min(1, 1.001 - 2 ** (-10 * time)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 0.95,
    })
    const onScroll = () => ScrollTrigger.update()
    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }

    lenis.on('scroll', onScroll)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    ScrollTrigger.refresh()

    return () => {
      lenis.off('scroll', onScroll)
      gsap.ticker.remove(tick)
      lenis.destroy()
      ScrollTrigger.refresh()
    }
  }, [])
}

function HeroSection({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const heroRef = useRef<HTMLElement | null>(null)
  const eyebrowRef = useRef<HTMLSpanElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const subtitleRef = useRef<HTMLParagraphElement | null>(null)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const metricsRef = useRef<HTMLDivElement | null>(null)
  const accountCardRef = useRef<HTMLDivElement | null>(null)
  const verifiedRef = useRef<HTMLDivElement | null>(null)
  const scannerRef = useRef<HTMLSpanElement | null>(null)
  const shineRef = useRef<HTMLSpanElement | null>(null)
  const blueGlowRef = useRef<HTMLDivElement | null>(null)
  const greenGlowRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const shapeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const context = gsap.context(() => {
      const media = gsap.matchMedia()
      const buttonItems = () => Array.from(buttonsRef.current?.children ?? []) as HTMLElement[]
      const copyItems = () =>
        [
          eyebrowRef.current,
          titleRef.current,
          subtitleRef.current,
          buttonsRef.current,
          metricsRef.current,
        ].filter(Boolean) as HTMLElement[]
      const itemItems = () => Array.from(heroRef.current?.querySelectorAll<HTMLElement>('.acc-home-item-card') ?? [])
      const visibleItems = () =>
        [
          ...copyItems(),
          ...buttonItems(),
          accountCardRef.current,
          verifiedRef.current,
          ...itemItems(),
        ].filter(Boolean) as HTMLElement[]

      media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const buttons = buttonItems()
        const items = itemItems()
        const titleAccent = titleRef.current?.querySelector<HTMLElement>('.acc-home-title-brush')
        const titleAccentTargets = titleAccent ? [titleAccent] : []

        gsap.set([eyebrowRef.current, titleRef.current, subtitleRef.current], { opacity: 1, y: 0, filter: 'blur(0px)' })
        gsap.set(buttonsRef.current, { opacity: 1, filter: 'blur(0px)' })
        gsap.set(buttons, { opacity: 1, y: 0, filter: 'blur(0px)' })
        gsap.set(metricsRef.current, { opacity: 1, y: 0, filter: 'blur(0px)' })
        gsap.set(accountCardRef.current, {
          opacity: 0.88,
          x: 20,
          y: 24,
          rotateX: 8,
          rotateY: -5,
          scale: 0.96,
          filter: 'blur(0px)',
          transformOrigin: 'center center',
          transformPerspective: 900,
        })
        gsap.set(items, { opacity: 0, y: 22, scale: 0.94, filter: 'blur(6px)', transformOrigin: 'center center' })
        gsap.set(scannerRef.current, { opacity: 0, yPercent: -130 })
        gsap.set(verifiedRef.current, { opacity: 0, scale: 0.8, transformOrigin: 'center center' })
        gsap.set(shineRef.current, { opacity: 0, xPercent: -130 })

        const timeline = gsap.timeline({
          defaults: { ease: 'power3.out' },
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: '+=2200',
            scrub: 1.3,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })

        timeline
          .fromTo(blueGlowRef.current, { opacity: 0.18, y: 40, x: -10 }, { opacity: 0.58, y: -80, x: 26, duration: 5.1, ease: 'none' }, 0)
          .fromTo(greenGlowRef.current, { opacity: 0.1, y: -20, x: -18 }, { opacity: 0.38, y: 60, x: 42, duration: 5.1, ease: 'none' }, 0)
          .to(gridRef.current, { opacity: 0.09, y: -42, x: 18, duration: 5.1, ease: 'none' }, 0)
          .to(shapeRef.current, { opacity: 0.26, y: 44, x: -24, rotate: 6, duration: 5.1, ease: 'none' }, 0)
          .fromTo(titleAccentTargets, { scale: 0.96 }, { scale: 1.04, duration: 0.62, ease: 'power3.out' }, 0.36)
          .to(eyebrowRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.44, ease: 'power3.out' }, 0.22)
          .to(titleRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.84, ease: 'power4.out' }, '>-0.08')
          .to(subtitleRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.58, ease: 'power3.out' }, '>-0.1')
          .to(buttons, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.08, duration: 0.46, ease: 'power3.out' }, '>-0.06')
          .to(metricsRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.42, ease: 'power3.out' }, '>-0.04')
          .to(accountCardRef.current, {
            opacity: 1,
            x: 0,
            y: 0,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.95,
            ease: 'expo.out',
          }, '>-0.08')
          .to(items, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            stagger: 0.1,
            duration: 0.54,
            ease: 'power3.out',
          }, '>-0.05')
          .to(scannerRef.current, { opacity: 0.62, yPercent: 350, duration: 0.9, ease: 'none' }, '>-0.03')
          .to(scannerRef.current, { opacity: 0, duration: 0.22, ease: 'power2.out' }, '>-0.08')
          .to(verifiedRef.current, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.2)' }, '>-0.07')
          .to(shineRef.current, { opacity: 0.5, xPercent: 140, duration: 0.78, ease: 'none' }, '>-0.06')
          .to(shineRef.current, { opacity: 0, duration: 0.24, ease: 'power2.out' }, '>-0.05')
          .to(accountCardRef.current, { scale: 1.018, duration: 0.74, ease: 'none' }, '<')
          .to([titleRef.current, accountCardRef.current], { opacity: 1, duration: 0.5, ease: 'none' }, '>')

        ScrollTrigger.refresh()

        return () => timeline.kill()
      })

      media.add('(max-width: 767px), (prefers-reduced-motion: reduce)', () => {
        gsap.set(visibleItems(), { opacity: 1, clearProps: 'transform' })
        gsap.set([scannerRef.current, shineRef.current], { opacity: 0, clearProps: 'transform' })
      })

      return () => media.revert()
    }, heroRef)

    return () => context.revert()
  }, [])

  return (
    <section ref={heroRef} className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden bg-[#05070F]">
      <img src={homeAssets.heroBackground} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-100 brightness-[1.08] contrast-[1.08] saturate-[1.18]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,11,0.5)_0%,rgba(3,5,11,0.2)_42%,rgba(3,5,11,0.04)_70%,rgba(3,5,11,0.22)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,11,0.06),rgba(3,5,11,0)_48%,rgba(5,7,15,0.7)_100%)]" />
      <div ref={blueGlowRef} className="absolute -left-36 top-5 h-[540px] w-[540px] rounded-full bg-blue-500/14 blur-[96px]" />
      <div ref={greenGlowRef} className="absolute right-[-120px] top-28 h-[360px] w-[360px] rounded-full bg-emerald-400/10 blur-[90px]" />
      <div ref={shapeRef} className="absolute right-[18%] top-[18%] hidden h-44 w-44 rotate-12 rounded-[44px] border border-yellow-300/12 bg-white/[0.025] blur-[0.2px] lg:block" />
      <div ref={gridRef} className="absolute inset-0 bg-grid-fade bg-[length:56px_56px] opacity-[0.035]" />
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#05070F] to-transparent" />

      <div className="relative mx-auto grid min-h-[calc(100svh-3.5rem)] w-full max-w-[1600px] items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(390px,0.84fr)_minmax(520px,1fr)] xl:grid-cols-[45%_50%] xl:gap-12 2xl:px-8">
        <div className="max-w-3xl lg:pl-2 xl:pl-8">
          <span ref={eyebrowRef} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-blue-200">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Contas antigas e itens raros
          </span>
          <h1 ref={titleRef} aria-label="Sua próxima conta está aqui" className="mt-5 max-w-4xl text-[50px] font-black leading-[0.86] tracking-normal text-white drop-shadow-[0_12px_38px_rgba(0,0,0,0.62)] sm:text-[78px] lg:text-[96px] xl:text-[112px]">
            <span aria-hidden="true" className="block">Sua próxima</span>
            <span aria-hidden="true" className="acc-home-title-brush -my-2 block text-[1.38em] leading-[0.76] sm:-my-3">conta</span>
            <span aria-hidden="true" className="block">está aqui</span>
          </h1>
          <p ref={subtitleRef} className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Encontre contas com <span className="font-black text-yellow-300">itens raros</span>, <span className="font-black text-yellow-300">bandeirão</span>, <span className="font-black text-yellow-300">armas evolutivas</span> e muito mais.
          </p>

          <div ref={buttonsRef} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="acc-button-hero-gold inline-flex min-h-14 items-center justify-center gap-2 px-8 text-base font-black transition duration-300 hover:-translate-y-0.5 active:scale-[0.98] sm:whitespace-nowrap"
            >
              Explorar contas
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sell')}
              className="acc-button-secondary inline-flex min-h-14 items-center justify-center gap-2 border-white/30 px-7 text-sm font-black transition duration-300 hover:-translate-y-0.5 active:scale-[0.98] sm:whitespace-nowrap"
            >
              <Store aria-hidden="true" className="size-4" />
              Quero vender minha conta
            </button>
          </div>

          <div ref={metricsRef} className="mt-8 grid max-w-xl grid-cols-1 gap-3 min-[440px]:grid-cols-3">
            <MiniMetric icon={Trophy} value="Contas antigas" />
            <MiniMetric icon={Sparkles} value="Pix facilitado" />
            <MiniMetric icon={MessageCircle} value="Suporte rápido" />
          </div>
        </div>

        <HeroAccountShowcase
          cardRef={accountCardRef}
          scannerRef={scannerRef}
          shineRef={shineRef}
          verifiedRef={verifiedRef}
        />
      </div>
    </section>
  )
}

function HeroAccountShowcase({
  cardRef,
  verifiedRef,
  scannerRef,
  shineRef,
}: {
  cardRef: RefObject<HTMLDivElement | null>
  verifiedRef: RefObject<HTMLDivElement | null>
  scannerRef: RefObject<HTMLSpanElement | null>
  shineRef: RefObject<HTMLSpanElement | null>
}) {
  return (
    <div className="relative min-h-[620px] lg:min-h-[760px]">
      <div
        ref={cardRef}
        className="group/home-card relative mx-auto w-full max-w-[720px] overflow-hidden rounded-[32px] border border-fuchsia-400/75 bg-[linear-gradient(145deg,rgba(7,10,20,0.9),rgba(2,5,12,0.99))] shadow-[0_0_0_1px_rgba(250,204,21,0.42),0_0_34px_rgba(250,204,21,0.2),0_0_72px_rgba(168,85,247,0.56),0_34px_130px_rgba(0,0,0,0.68)] backdrop-blur-xl transition duration-500 hover:border-yellow-300/80 hover:shadow-[0_0_0_1px_rgba(250,204,21,0.62),0_0_46px_rgba(250,204,21,0.25),0_0_86px_rgba(168,85,247,0.62),0_38px_140px_rgba(0,0,0,0.74)]"
      >
        <span ref={scannerRef} className="acc-home-scanner scanner-line" aria-hidden="true" />
        <span ref={shineRef} className="acc-home-card-shine" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-[31px] bg-[linear-gradient(180deg,#050912,#02050c)]">
          <div className="relative h-[220px] overflow-hidden border-b border-violet-300/24 sm:h-[290px] xl:h-[320px]">
            <img src={homeAssets.cardBanner} alt="" aria-hidden="true" className="h-full w-full object-cover object-center brightness-[1.08] contrast-[1.08] saturate-[1.14]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,11,0),rgba(3,5,11,0.26)),linear-gradient(90deg,rgba(124,58,237,0.12),transparent_44%,rgba(250,204,21,0.1))]" />
            <p className="absolute left-5 top-4 rounded-br-2xl border-b border-r border-violet-300/28 bg-black/48 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-fuchsia-200 backdrop-blur sm:left-6 sm:text-sm">
              CONTA FF VERIFICADA
            </p>
            <div
              ref={verifiedRef}
              className="absolute right-4 top-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-300/28 bg-black/58 px-3 text-xs font-black text-emerald-100 shadow-[0_0_24px_rgba(34,197,94,0.24)] backdrop-blur sm:right-5"
            >
              <BadgeCheck aria-hidden="true" className="size-4" />
              Verificado
            </div>
          </div>

          <div className="relative space-y-5 p-4 sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(168,85,247,0.24),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(250,204,21,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent)]" />
            <div>
              <h2 className="relative text-2xl font-black leading-tight text-white sm:text-3xl">Conta antiga com itens raros</h2>
              <p className="relative mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Contas antigas com itens históricos, bandeirão e armas evolutivas exclusivas.
              </p>
            </div>

            <div className="relative grid grid-cols-1 gap-2 min-[520px]:grid-cols-3">
                {premiumAccountItems.map((item) => (
                  <div key={item.label} className="acc-home-item-card group/item rounded-xl border border-white/14 bg-[linear-gradient(180deg,rgba(5,13,24,0.94),rgba(0,0,0,0.42))] p-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-yellow-300/42 hover:bg-white/[0.055] sm:p-3">
                    <div className="flex h-40 items-center justify-center rounded-lg bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.1),transparent_64%)] p-0 sm:h-52">
                      <img src={item.src} alt={item.label} className={cn('max-w-full object-contain drop-shadow-[0_18px_34px_rgba(0,0,0,0.48)] transition duration-300 group-hover/item:scale-[1.04]', item.imageClassName)} />
                    </div>
                    <p className="mt-3 text-sm font-black leading-5 text-white">{item.label}</p>
                    {item.subtitle ? <p className="mt-0.5 text-xs font-semibold text-slate-400">{item.subtitle}</p> : null}
                  </div>
                ))}
            </div>

            <div className="relative grid grid-cols-1 gap-2 min-[520px]:grid-cols-2">
              {heroTags.map((tag, index) => (
                <span key={tag} className={cn('rounded-xl border border-white/10 bg-[#081525]/78 px-3 py-2 text-xs font-black text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:scale-[1.02] hover:border-yellow-300/32', index === heroTags.length - 1 && 'min-[520px]:col-span-2')}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturedAccountsSection({
  supportWhatsappUrl,
  onNavigate,
}: {
  supportWhatsappUrl: string | null
  onNavigate: (view: AppView) => void
}) {
  return (
    <HomeBand id="destaques">
      <SectionHeader
        eyebrow="Contas em destaque"
        title="Uma prévia selecionada para começar"
        description="A Home mostra quatro exemplos de perfis. O catálogo completo fica em Explorar."
        action={
          <button type="button" onClick={() => onNavigate('explore')} className="acc-button-secondary inline-flex min-h-10 items-center gap-2 px-4 text-sm font-black transition duration-300 active:scale-[0.98]">
            Ver catálogo completo
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        }
      />

      <motion.div
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {showcaseAccounts.map((account) => (
          <ShowcaseAccountCard
            key={account.title}
            account={account}
            supportWhatsappUrl={supportWhatsappUrl}
            onExplore={() => onNavigate('explore')}
          />
        ))}
      </motion.div>
    </HomeBand>
  )
}

function ShowcaseAccountCard({
  account,
  supportWhatsappUrl,
  onExplore,
}: {
  account: ShowcaseAccount
  supportWhatsappUrl: string | null
  onExplore: () => void
}) {
  return (
    <motion.article
      variants={fadeUp}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.015 }}
      className="group relative overflow-hidden rounded-2xl border border-blue-300/14 bg-[linear-gradient(145deg,rgba(16,24,39,0.86),rgba(7,11,22,0.94))] shadow-[0_18px_58px_rgba(0,0,0,0.22)] transition duration-500 hover:border-blue-300/34 hover:shadow-[0_22px_70px_rgba(20,99,255,0.16)]"
    >
      <span className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.13),transparent_42%)]" />
      <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10 bg-[#08111f]">
        <div
          className={cn(
            'absolute inset-0 opacity-80',
            account.accent === 'blue' && 'bg-[linear-gradient(135deg,rgba(56,189,248,0.26),transparent_42%,rgba(20,99,255,0.18))]',
            account.accent === 'emerald' && 'bg-[linear-gradient(135deg,rgba(34,197,94,0.22),transparent_42%,rgba(56,189,248,0.14))]',
            account.accent === 'violet' && 'bg-[linear-gradient(135deg,rgba(139,92,246,0.22),transparent_42%,rgba(56,189,248,0.14))]',
            account.accent === 'cyan' && 'bg-[linear-gradient(135deg,rgba(20,184,166,0.24),transparent_42%,rgba(20,99,255,0.14))]',
          )}
        />
        <div className="absolute inset-4 rounded-2xl border border-white/10 bg-black/18 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-emerald-300/24 bg-emerald-400/12 px-3 py-1 text-[11px] font-black text-emerald-100">
              Verificado
            </span>
            <BadgeCheck aria-hidden="true" className="size-5 text-emerald-200" />
          </div>
          <div className="mt-10 h-2 w-3/4 rounded-full bg-white/18" />
          <div className="mt-3 h-2 w-1/2 rounded-full bg-white/10" />
          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
            {['Itens', 'Bandeirão', 'Seguro'].map((tag) => (
              <span key={tag} className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2 text-center text-[10px] font-black text-slate-200">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-300">Free Fire</p>
          <h3 className="mt-1 min-h-12 text-lg font-black leading-6 text-white">{account.title}</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {account.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-black text-slate-300">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-white/10 pt-4">
          <div>
            <p className="text-xs font-bold text-slate-500">A partir de</p>
            <p className="acc-money text-2xl font-black text-white">{formatBRL(account.price)}</p>
          </div>
          <div className="flex gap-2">
            {supportWhatsappUrl ? (
              <a
                href={supportWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300/24 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300 active:scale-[0.98]"
              >
                WhatsApp
              </a>
            ) : null}
            <button type="button" onClick={onExplore} className="acc-button-primary inline-flex min-h-10 items-center px-4 text-xs font-black transition active:scale-[0.98]">
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function HowItWorksSection() {
  return (
    <HomeBand>
      <SectionHeader eyebrow="Como funciona" title="Compra simples, com contexto claro" description="Da escolha da conta até a negociação, cada etapa tem uma ação principal." />
      <div className="relative grid gap-4 lg:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent lg:block" />
        {steps.map((step, index) => (
          <motion.article
            key={step.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.58, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl border border-blue-300/16 bg-white/[0.035] p-5 backdrop-blur transition duration-500 hover:-translate-y-1.5 hover:border-blue-300/30 hover:bg-blue-500/7"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl border border-blue-300/25 bg-blue-500/12 text-blue-200 shadow-[0_0_30px_rgba(20,149,255,0.12)]">
              <step.icon aria-hidden="true" className="size-6" />
            </span>
            <span className="mt-5 block text-sm font-black text-blue-300">0{index + 1}</span>
            <h3 className="mt-2 text-xl font-black text-white">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{step.text}</p>
          </motion.article>
        ))}
      </div>
    </HomeBand>
  )
}

function TrustSection() {
  return (
    <HomeBand>
      <SectionHeader eyebrow="Por que usar a ACC Story?" title="Confiança com visual gamer limpo" description="A experiência foi pensada para comparar contas sem bagunça e seguir para a ação certa." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trustCards.map((card, index) => (
          <motion.article
            key={card.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.56, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="group relative overflow-hidden rounded-2xl border border-blue-300/14 bg-[linear-gradient(145deg,rgba(16,24,39,0.72),rgba(7,11,22,0.8))] p-5 transition duration-500 hover:-translate-y-1.5 hover:border-blue-300/34 hover:bg-blue-500/8"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_0%,rgba(56,189,248,0.12),transparent_42%)]" />
            <span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-blue-200 transition group-hover:text-emerald-200">
              <card.icon aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-black text-white">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
          </motion.article>
        ))}
      </div>
    </HomeBand>
  )
}

function CategoriesSection({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  return (
    <HomeBand>
      <SectionHeader eyebrow="Explore por categoria" title="Entre direto no estilo de conta que você procura" description="Os filtros avançados ficam no catálogo. Aqui você começa pelo caminho mais rápido." />
      <div className="flex flex-wrap gap-3">
        {categories.map((category, index) => (
          <motion.button
            key={category}
            type="button"
            onClick={() => onNavigate('explore')}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.42, delay: index * 0.04 }}
            whileHover={{ y: -3, scale: 1.02 }}
            className="group inline-flex min-h-12 items-center gap-2 rounded-full border border-blue-300/18 bg-white/[0.04] px-5 text-sm font-black text-slate-200 shadow-[0_12px_38px_rgba(0,0,0,0.16)] transition duration-300 hover:border-blue-300/44 hover:text-white active:scale-[0.98]"
          >
            <span className="size-2 rounded-full bg-blue-300 shadow-[0_0_16px_rgba(56,189,248,0.7)] transition group-hover:bg-emerald-300" />
            {category}
          </motion.button>
        ))}
      </div>
    </HomeBand>
  )
}

function FinalCta({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  return (
    <section className="relative px-4 py-12 sm:px-6 sm:py-16 lg:px-7">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(20,149,255,0.14),transparent_42%),linear-gradient(245deg,rgba(34,197,94,0.1),transparent_38%)]" />
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-4xl rounded-3xl border border-blue-300/20 bg-[linear-gradient(145deg,rgba(16,24,39,0.86),rgba(7,11,22,0.92))] p-6 text-center shadow-[0_26px_100px_rgba(20,99,255,0.16)] sm:p-10"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-300/22 bg-emerald-500/12 text-emerald-200">
          <Trophy aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-5 text-3xl font-black text-white sm:text-5xl">Pronto para encontrar sua próxima conta?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Explore contas com itens raros, bandeirão, armas evolutivas e vendedores verificados.
        </p>
        <button type="button" onClick={() => onNavigate('explore')} className="acc-button-primary mt-7 inline-flex min-h-12 items-center gap-2 px-7 text-sm font-black transition duration-300 hover:-translate-y-0.5 active:scale-[0.98]">
          Explorar contas
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </motion.div>
    </section>
  )
}

function HomeBand({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <section id={id} className="relative px-4 py-12 sm:px-6 sm:py-16 lg:px-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/18 to-transparent" />
      <div className="relative mx-auto max-w-7xl space-y-8">{children}</div>
    </section>
  )
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">{eyebrow}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </motion.div>
  )
}

function MiniMetric({ value, label, icon: Icon }: { value: string; label?: string; icon?: LucideIcon }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-white/10 bg-black/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
      {Icon ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-yellow-300/20 bg-yellow-400/10 text-yellow-300">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      ) : null}
      <p className={cn('font-black leading-tight text-white', label ? 'text-xl' : 'text-sm sm:text-base')}>{value}</p>
      {label ? <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p> : null}
    </div>
  )
}
