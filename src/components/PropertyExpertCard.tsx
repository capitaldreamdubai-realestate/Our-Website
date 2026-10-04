import { Link } from 'react-router-dom'
import { buttonClassNames } from './Button'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'
import { agentWhatsappUrl, openAgentWhatsapp } from '@/lib/whatsapp'

type Props = {
  salesperson: PublicSalesperson | null
}

export function PropertyExpertCard({ salesperson }: Props) {
  const wa = agentWhatsappUrl(salesperson)

  if (!salesperson) {
    return (
      <div className="rounded-2xl border border-terracotta/15 bg-white/80 p-5 shadow-sm sm:p-6">
        <p className="font-compact text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink/50">
          Your property contact
        </p>
        <p className="mt-2 font-display text-xl font-semibold text-terracotta">
          Capital Dream
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/70">
          Speak with our team about this property — we&apos;ll match you with the right
          expert.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            to="/about"
            className={buttonClassNames('outlineTerracotta', 'justify-center sm:w-auto')}
          >
            About Capital Dream
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-terracotta/15 bg-white/80 p-5 shadow-sm sm:flex-row sm:items-stretch sm:gap-5 sm:p-6">
      <div className="shrink-0 overflow-hidden rounded-xl sm:w-[140px]">
        <img
          src={salesperson.profile_image_url}
          alt=""
          className="aspect-[4/3] h-full w-full object-cover sm:aspect-auto sm:min-h-[160px]"
          width={280}
          height={210}
          loading="lazy"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="font-compact text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink/50">
          Your property expert
        </p>
        <p className="mt-1 font-display text-2xl font-semibold text-terracotta">
          {salesperson.name}
        </p>
        {salesperson.title ? (
          <p className="mt-1 text-sm text-ink/65">{salesperson.title}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Link
            to="/about"
            className="text-sm font-medium text-terracotta underline-offset-2 hover:underline"
          >
            Agent details
          </Link>
          {salesperson.phone ? (
            <a
              href={`tel:${salesperson.phone.replace(/\s/g, '')}`}
              className="text-sm font-medium text-ink/80 hover:text-terracotta"
            >
              {salesperson.phone}
            </a>
          ) : null}
        </div>
        {wa ? (
          <button
            type="button"
            onClick={() => void openAgentWhatsapp(salesperson)}
            className={`mt-4 w-full sm:mt-3 sm:w-auto ${buttonClassNames('outlineTerracotta', 'justify-center')}`}
          >
            Contact on WhatsApp
          </button>
        ) : null}
      </div>
    </div>
  )
}
