import { Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ImagePrimaryOverlay } from './ImagePrimaryOverlay'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'
import { agentWhatsappUrl, openAgentWhatsapp } from '@/lib/whatsapp'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

const FALLBACK_PORTRAIT =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=960&h=640&q=85'

type Props = {
  person: PublicSalesperson
  profileHref?: string
}

export function SalesTeamMemberCard({ person, profileHref }: Props) {
  const src = person.profile_image_url?.trim() || FALLBACK_PORTRAIT
  const email = person.email?.trim() || ''
  const title = person.title?.trim() || ''
  const phone = person.phone?.trim() || ''
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null
  const waHref = agentWhatsappUrl(person)
  const showContactRow = Boolean(email || telHref || waHref)

  return (
    <article className="group relative flex flex-col overflow-hidden bg-cream">
      {profileHref ? (
        <Link
          to={profileHref}
          className="absolute inset-0 z-10 rounded-[1.125rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          aria-label={`View ${person.name} profile`}
        />
      ) : null}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[1.125rem]">
        <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.02]">
          <img
            src={src}
            alt={person.name}
            className="absolute inset-0 z-0 h-full w-full object-cover object-top"
            width={960}
            height={640}
            loading="lazy"
          />
          <ImagePrimaryOverlay />
        </div>
      </div>
      <div className="relative z-20 flex flex-1 flex-col gap-1.5 px-1 pt-6 sm:pt-7">
        <p className="type-card-title font-compact font-normal uppercase tracking-[0.02em] text-ink">
          {person.name}
        </p>
        {title ? <p className="font-normal leading-snug text-ink/72">{title}</p> : null}
        {showContactRow ? (
          <div className="mt-2 border-t border-ink/10 pt-3">
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${email ? 'justify-between' : 'justify-end'}`}
            >
              {email ? (
                <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
                  <a
                    href={`mailto:${email}`}
                    className="block truncate text-left text-sm font-normal text-ink/72 underline-offset-2 transition hover:text-terracotta hover:underline"
                  >
                    {email}
                  </a>
                </div>
              ) : null}
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {telHref ? (
                  <a
                    href={telHref}
                    className="inline-flex size-10 items-center justify-center rounded-full text-terracotta transition hover:bg-terracotta/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                    aria-label={`Call ${person.name}`}
                  >
                    <Phone className="size-[1.125rem]" strokeWidth={2} aria-hidden />
                  </a>
                ) : null}
                {waHref ? (
                  <button
                    type="button"
                    onClick={() => void openAgentWhatsapp(person)}
                    className="inline-flex size-10 items-center justify-center rounded-full text-terracotta transition hover:bg-terracotta/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                    aria-label={`WhatsApp ${person.name}`}
                  >
                    <WhatsAppIcon className="size-[1.125rem]" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
