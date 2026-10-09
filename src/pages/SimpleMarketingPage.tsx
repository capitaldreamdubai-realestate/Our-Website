import { useCms } from '../contexts/CmsContext'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { Seo } from '../components/Seo'

type Props = {
  title: string
  /** CMS slug (defaults to route-friendly key for Experiences). */
  slug?: string
}

export function SimpleMarketingPage({ title, slug = 'experiences' }: Props) {
  const { marketingBySlug, mode } = useCms()
  const { t } = useLocalePreferences()
  const page = marketingBySlug[slug]
  const displayTitle = page?.title?.trim() ? page.title : title
  const bodyHtml = page?.body_html?.trim()
  const heroUrl = page?.hero_image_url?.trim()

  return (
    <main className="flex min-h-[50vh] w-full flex-col justify-center gap-4 py-16 text-cream [text-shadow:0_1px_2px_rgba(28,20,18,0.35)]">
      <Seo
        title={`${displayTitle} | ${t('seo.brandSuffix')}`}
        description={t('seo.simpleMarketing.description')}
      />
      {mode === 'live' && heroUrl ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-cream/25">
          <img
            src={heroUrl}
            alt=""
            className="aspect-[21/9] w-full object-cover object-center sm:aspect-[24/9]"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="type-section-header font-display text-cream">{displayTitle}</h1>
      </div>
      {mode === 'live' && bodyHtml ? (
        <div
          className="max-w-3xl space-y-4 text-[length:var(--brand-font-body-lg)] leading-relaxed text-cream/90 [&_a]:underline [&_p]:text-pretty"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        <p className="max-w-xl text-cream/85">{t('simple.fallback')}</p>
      )}
    </main>
  )
}
