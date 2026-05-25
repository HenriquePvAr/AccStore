import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

const sections = [
  {
    title: '1. Idade mínima',
    items: [
      '1.1. A compra é exclusivamente permitida para maiores de 18 anos.',
      '1.2. Ao prosseguir com a aquisição, o comprador declara ser maior de idade e estar plenamente capaz de assumir obrigações civis.',
    ],
  },
  {
    title: '2. Natureza da negociação',
    items: [
      '2.1. O comprador reconhece que a venda de contas não possui vínculo oficial com as desenvolvedoras dos jogos, incluindo, mas não se limitando a Garena Free Fire, Riot Games, Supercell, Valve, Epic Games ou qualquer outra empresa responsável pelos jogos.',
      '2.2. A negociação é realizada de forma privada entre a ACCSTORE, vendedores autorizados e o comprador, conforme o caso.',
      '2.3. O comprador declara estar ciente de que contas digitais podem estar sujeitas às regras e termos das respectivas plataformas ou desenvolvedoras.',
    ],
  },
  {
    title: '3. Garantia da ACCSTORE',
    items: [
      '3.1. A ACCSTORE se compromete a entregar a conta com dados corretos de acesso, quando aplicável, acesso funcional no momento da entrega e informações compatíveis com o anúncio ou proposta aprovada.',
      '3.2. A ACCSTORE oferece garantia de 15 dias a partir da data de entrega da conta, cobrindo problemas relacionados ao acesso e autenticidade da conta fornecida.',
      '3.3. Durante o período de garantia, o comprador terá direito a suporte da ACCSTORE para resolução de eventuais problemas de acesso ou dúvidas relacionadas à conta adquirida.',
      '3.4. Durante o prazo de garantia, é proibido alterar dados sensíveis da conta sem autorização da ACCSTORE, incluindo senha, e-mail vinculado, telefone vinculado, autenticação em dois fatores, configurações de segurança e dados de recuperação.',
      '3.5. Caso o comprador altere dados sensíveis da conta durante o prazo de garantia sem autorização, a garantia poderá ser invalidada.',
      '3.6. Após o prazo de 15 dias, a ACCSTORE não se responsabiliza por problemas posteriores, ficando o uso da conta sob responsabilidade do comprador.',
    ],
  },
  {
    title: '4. Privacidade',
    items: [
      '4.1. Os dados fornecidos pelo comprador serão utilizados apenas para efetivação da compra, entrega da conta, suporte e segurança da operação.',
      '4.2. A ACCSTORE deverá tratar dados sensíveis com sigilo e adotar medidas de segurança para evitar exposição indevida.',
    ],
  },
  {
    title: '5. Suporte',
    items: [
      '5.1. Durante o período de garantia, o comprador poderá entrar em contato com a ACCSTORE pelos canais oficiais de suporte informados na plataforma.',
      '5.2. O suporte poderá solicitar informações adicionais para verificar a compra, validar a titularidade e analisar o problema relatado.',
    ],
  },
  {
    title: '6. Responsabilidade do comprador',
    items: [
      '6.1. O comprador é responsável por utilizar a conta de forma adequada após a entrega.',
      '6.2. O comprador não deve praticar ações que possam gerar bloqueio, banimento, perda de acesso ou violação de regras da plataforma do jogo.',
      '6.3. A ACCSTORE não se responsabiliza por punições, banimentos ou restrições causadas por mau uso após a entrega da conta.',
    ],
  },
  {
    title: '7. Aceite eletrônico',
    items: [
      '7.1. Ao finalizar a compra ou prosseguir com a aquisição, o comprador declara ter lido, entendido e aceitado integralmente este termo.',
      '7.2. O aceite eletrônico realizado na plataforma terá validade como comprovação de ciência e concordância com as condições acima.',
    ],
  },
]

export function TermsPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[linear-gradient(135deg,rgba(11,18,34,0.96),rgba(8,14,28,0.88))] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-blue-300">ACCSTORE</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                Termo de Compra e Responsabilidade — Venda de Contas de Jogos
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Pelo presente instrumento particular, o comprador declara estar ciente e de acordo com as condições abaixo ao adquirir uma conta de jogo na plataforma ACCSTORE.
              </p>
            </div>
          </div>
          <Link
            to="/explorar"
            className="inline-flex min-h-10 w-fit items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300"
          >
            Voltar para explorar
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        A ACCSTORE é uma plataforma independente. A ACCSTORE não possui vínculo oficial com Garena, Riot Games ou outras desenvolvedoras, publicadoras ou plataformas de jogos.
      </section>

      <div className="space-y-3">
        {sections.map((section) => (
          <article key={section.title} className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
            <h2 className="text-lg font-black text-white">{section.title}</h2>
            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <p key={item} className="text-sm leading-6 text-slate-300">
                  {item}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
