import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { OffplanProjectCard } from '@/components/OffplanProjectCard'
import { PropertyListingCard } from '@/components/PropertyListingCard'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { usePageSeo } from '@/hooks/usePageSeo'

export function DeveloperDetailPage() {
  const { slug } = useParams()
  const {
    developersWithListings,
    developersBySlug,
    offplanProjectsByDeveloperId,
    catalogProperties,
    loading,
  } = useCms()
  const { t } = useLocalePreferences()

  const developer = slug ? developersBySlug[slug] : undefined
  const hasContent = developer
    ? developersWithListings.some((d) => d.id === developer.id)
    : false

  const projects = developer ? (offplanProjectsByDeveloperId[developer.id] ?? []) : []
  const listings = useMemo(() => {
    if (!developer) return []
    return catalogProperties.filter((p) => p.developerId === developer.id)
  }, [catalogProperties, developer])

  usePageSeo({
    title: developer
      ? t('developerDetail.seo.title', { name: developer.name })
      : t('developerDetail.seo.titleMissing'),
    description: developer
      ? t('developerDetail.seo.description', { name: developer.name })
      : t('developerDetail.seo.descriptionMissing'),
  })

  if (!loading && (!developer || !hasContent)) {
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
    <main
      id="page-developer-detail"
      className="flex w-full flex-col gap-[0.625rem]"
      aria-label={developer.name}
    >
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
              {heroDescription ? (
                <p className="mt-4 max-w-2xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/75">
                  {heroDescription}
                </p>
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

      {projects.length > 0 ? (
        <SectionShell variant="cream" aria-label={t('developerDetail.projectsAria', { name: developer.name })}>
          <h2 className="type-section-title font-display text-xl font-semibold text-ink sm:text-2xl">
            {t('developerDetail.projectsTitle', { name: developer.name })}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <OffplanProjectCard key={project.id} project={project} developer={developer} />
            ))}
          </div>
        </SectionShell>
      ) : null}

      {listings.length > 0 ? (
        <SectionShell variant="cream" aria-label={t('developerDetail.listingsAria', { name: developer.name })}>
          <h2 className="type-section-title font-display text-xl font-semibold text-ink sm:text-2xl">
            {t('developerDetail.grid', { name: developer.name })}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((property) => (
              <PropertyListingCard key={property.id} property={property} />
            ))}
          </div>
        </SectionShell>
      ) : null}
    </main>
  )
}
