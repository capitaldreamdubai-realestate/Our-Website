import { Link, Navigate, useParams } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PropertyListingPage } from './PropertyListingPage'

export function DeveloperDetailPage() {
  const { slug } = useParams()
  const { developersWithListings, developersBySlug, loading } = useCms()
  const { t } = useLocalePreferences()

  const developer = slug ? developersBySlug[slug] : undefined
  const hasListings = developer
    ? developersWithListings.some((d) => d.id === developer.id)
    : false

  usePageSeo({
    title: developer
      ? t('developerDetail.seo.title', { name: developer.name })
      : t('developerDetail.seo.titleMissing'),
    description: developer
      ? t('developerDetail.seo.description', { name: developer.name })
      : t('developerDetail.seo.descriptionMissing'),
  })

  if (!loading && (!developer || !hasListings)) {
    return <Navigate to="/developers" replace />
  }

  if (!developer) {
    return (
      <main className="flex w-full flex-col gap-[0.625rem]">
        <SectionShell variant="cream" aria-label={t('developerDetail.loadingAria')}>
          <p className="text-[length:var(--brand-font-body-lg)] text-ink/70">
            {t('developerDetail.loading')}
          </p>
        </SectionShell>
      </main>
    )
  }

  const heroDescription =
    developer.descriptionHtml?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
    t('developerDetail.hero.desc', { name: developer.name })

  return (
    <>
      <SectionShell variant="cream" aria-label={t('developerDetail.profileAria')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {developer.logoUrl ? (
              <img
                src={developer.logoUrl}
                alt=""
                className="h-16 w-auto max-w-[12rem] object-contain object-left"
              />
            ) : null}
            <div className="min-w-0">
              <p className="type-card-title font-compact uppercase tracking-[0.02em] text-ink/70">
                {t('developerDetail.eyebrow')}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-terracotta sm:text-4xl">
                {developer.name}
              </h1>
              {developer.websiteUrl ? (
                <a
                  href={developer.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-ink/70 underline-offset-2 hover:text-terracotta hover:underline"
                >
                  {t('developerDetail.website')}
                </a>
              ) : null}
            </div>
          </div>
          <Link
            to="/developers"
            className={`${buttonClassNames('outlineTerracotta')} shrink-0 self-end sm:self-start`}
          >
            {t('developerDetail.back')}
          </Link>
        </div>
      </SectionShell>

      <PropertyListingPage
        variant="channel"
        channelFilter={(p) => p.developerId === developer.id}
        seoTitle={t('developerDetail.seo.title', { name: developer.name })}
        seoDescription={heroDescription}
        mainId="page-developer-detail"
        heroTitle={t('developerDetail.hero.title', { name: developer.name })}
        heroDescription={heroDescription}
        featuredEyebrow={t('developerDetail.featured', { name: developer.name })}
        gridTitle={t('developerDetail.grid', { name: developer.name })}
        emptyFilteredMessage={t('developerDetail.emptyFiltered')}
        emptyChannelMessage={t('developerDetail.emptyChannel')}
      />
    </>
  )
}
