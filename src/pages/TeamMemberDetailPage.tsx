import { Mail, Phone } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { ImagePrimaryOverlay } from '@/components/ImagePrimaryOverlay'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { usePageSeo } from '@/hooks/usePageSeo'
import { agentWhatsappUrl, openAgentWhatsapp } from '@/lib/whatsapp'

function socialHref(
  socialLinks: Record<string, unknown>,
  key: string,
): string | null {
  const value = socialLinks[key]
  if (typeof value !== 'string') return null
  const href = value.trim()
  return href.length > 0 ? href : null
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.4" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.8" />
      <path d="M8 10v6M8 8.2v.1M12 16v-3.3c0-1.5 1.2-2.7 2.7-2.7S17.4 11.2 17.4 12.7V16" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.8" />
      <path d="M13.2 16v-4h2.1l.3-2h-2.4V8.8c0-.7.3-1.2 1.3-1.2h1.2V5.8c-.2 0-.9-.1-1.7-.1-1.8 0-2.8 1.1-2.8 3V10H9.5v2h1.7v4" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function socialItem(
  label: string,
  href: string | null,
  Icon: ComponentType<{ className?: string }>,
) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex size-9 items-center justify-center rounded-full border border-terracotta/35 text-terracotta transition hover:bg-terracotta/10"
      aria-label={label}
    >
      <Icon className="size-[1.05rem]" />
    </a>
  )
}

export function TeamMemberDetailPage() {
  const { slug } = useParams()
  const { salespeopleList, loading } = useCms()
  const person = salespeopleList.find((item) => item.slug === slug)
  const { t } = useLocalePreferences()

  usePageSeo({
    title: person
      ? t('teamMember.seo.title', { name: person.name })
      : t('teamMember.seo.titleMissing'),
    description: person
      ? person.title?.trim()
        ? t('teamMember.seo.descWithTitle', {
            name: person.name,
            title: person.title.trim(),
          })
        : t('teamMember.seo.descNoTitle', { name: person.name })
      : t('teamMember.seo.descMissing'),
  })

  if (!loading && !person) {
    return <Navigate to="/team" replace />
  }

  if (!person) {
    return (
      <main className="flex w-full flex-col gap-[0.625rem]">
        <SectionShell variant="cream" aria-label={t('teamMember.loadingAria')}>
          <p className="text-[length:var(--brand-font-body-lg)] text-ink/70">
            {t('teamMember.loadingProfile')}
          </p>
        </SectionShell>
      </main>
    )
  }

  const phone = person.phone?.trim() || ''
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null
  const email = person.email?.trim() || ''
  const waHref = agentWhatsappUrl(person)
  const instagram = socialHref(person.social_links, 'instagram')
  const linkedIn = socialHref(person.social_links, 'linkedin')
  const facebook = socialHref(person.social_links, 'facebook')
  const imageSrc =
    person.profile_image_url?.trim() ||
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1000&h=1200&q=85'

  return (
    <main
      id="page-team-member"
      aria-label={t('teamMember.mainAria')}
      className="flex w-full flex-col gap-[0.625rem]"
    >
      <SectionShell
        variant="cream"
        id="team-member-card"
        aria-label={t('teamMember.profileAria', { name: person.name })}
      >
        <div className="grid w-full items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,44%)] lg:gap-10">
          <article className="flex flex-col justify-between rounded-[1rem] border border-ink/8 bg-cream p-5 sm:p-7 lg:p-10">
            <div>
              <p className="type-card-title font-compact uppercase tracking-[0.02em] text-ink/72">
                {person.title || t('teamMember.roleFallback')}
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-terracotta sm:text-5xl">
                {person.name}
              </h1>

              <div className="mt-6 space-y-2 text-sm text-ink/80 sm:text-[0.95rem]">
                {phone ? (
                  <p>
                    {t('teamMember.labelPhone')} {phone}
                  </p>
                ) : null}
                {email ? (
                  <p>
                    {t('teamMember.labelEmail')}{' '}
                    <a
                      href={`mailto:${email}`}
                      className="underline-offset-2 transition hover:text-terracotta hover:underline"
                    >
                      {email}
                    </a>
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {socialItem(t('teamMember.socialInstagram', { name: person.name }), instagram, InstagramIcon)}
                {socialItem(t('teamMember.socialLinkedin', { name: person.name }), linkedIn, LinkedinIcon)}
                {socialItem(t('teamMember.socialFacebook', { name: person.name }), facebook, FacebookIcon)}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-terracotta/35 text-terracotta transition hover:bg-terracotta/10"
                    aria-label={t('teamMember.emailAria', { name: person.name })}
                  >
                    <Mail className="size-[1.05rem]" strokeWidth={1.9} aria-hidden />
                  </a>
                ) : null}
                {telHref ? (
                  <a
                    href={telHref}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-terracotta/35 text-terracotta transition hover:bg-terracotta/10"
                    aria-label={t('teamMember.callAria', { name: person.name })}
                  >
                    <Phone className="size-[1.05rem]" strokeWidth={1.9} aria-hidden />
                  </a>
                ) : null}
              </div>

              <div className="mt-8 space-y-4 text-[0.96rem] leading-relaxed text-ink/85 sm:text-base">
                {(person.bio || '')
                  .split(/\n\s*\n/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, idx) => (
                    <p key={`${person.id}-p-${idx}`}>{paragraph}</p>
                  ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {waHref ? (
                <button
                  type="button"
                  onClick={() => void openAgentWhatsapp(person)}
                  className={buttonClassNames('primary')}
                >
                  {t('teamMember.speakCta')}
                </button>
              ) : null}
              <Link to="/team" className={buttonClassNames('outlineTerracotta')}>
                {t('teamMember.backTeam')}
              </Link>
            </div>
          </article>

          <aside className="relative overflow-hidden rounded-[1rem]">
            <img
              src={imageSrc}
              alt={person.name}
              className="h-full w-full object-cover object-center"
              width={1000}
              height={1200}
              loading="eager"
            />
            <ImagePrimaryOverlay />
          </aside>
        </div>
      </SectionShell>
    </main>
  )
}
