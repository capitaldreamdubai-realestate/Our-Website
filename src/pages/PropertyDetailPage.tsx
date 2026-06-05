import { Bath, Bed, Building2, Maximize2, Square } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { formatAreaFromM2 } from '../lib/formatArea'
import { PropertyExpertCard } from '../components/PropertyExpertCard'
import { PropertyLeafletMap } from '../components/PropertyLeafletMap'
import { PropertyDetailHero } from '../components/PropertyDetailHero'
import { PropertyLeadForm } from '../components/PropertyLeadForm'
import { PropertyListingCard } from '../components/PropertyListingCard'
import { SectionShell } from '../components/SectionShell'
import { buttonClassNames } from '../components/Button'
import { usePropertyDetail } from '../hooks/usePropertyDetail'
import { usePageSeo } from '../hooks/usePageSeo'
import { useRelatedProperties } from '../hooks/useRelatedProperties'
import { resolveGallery } from '../lib/resolvePropertyDetail'
import { agentWhatsappUrl } from '../lib/whatsapp'

export function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const { property, salesperson, loading } = usePropertyDetail(propertyId)
  const related = useRelatedProperties(property, 3)
  const { areaUnit, intlLocale, t } = useLocalePreferences()
  const listingMeta = property?.meta ?? ''
  usePageSeo({
    title: property
      ? t('property.seo.listingTitle', { title: property.title })
      : t('property.seo.fallbackTitle'),
    description: property
      ? t('property.seo.descWith', {
          title: property.title,
          location: property.location || 'Dubai, UAE',
          meta: listingMeta,
        })
      : t('property.seo.descFallback'),
  })

  if (loading && !property) {
    return (
      <main
        id="page-property-loading"
        className="flex w-full flex-col gap-[0.625rem]"
        aria-busy="true"
        aria-label={t('property.loading.aria')}
      >
        <SectionShell variant="cream">
          <p className="text-sm text-ink/70">{t('property.loading.body')}</p>
        </SectionShell>
      </main>
    )
  }

  if (!property) {
    return (
      <main
        id="page-property-missing"
        className="flex w-full flex-col gap-[0.625rem]"
        aria-label={t('property.notFound.aria')}
      >
        <SectionShell variant="cream">
          <h1 className="type-section-title font-display text-2xl font-semibold text-ink">
            {t('property.notFound.title')}
          </h1>
          <p className="mt-3 max-w-xl text-ink/70">
            {t('property.notFound.body')}
          </p>
          <div className="mt-8">
            <Link
              to="/all-properties"
              className={buttonClassNames('inkSolid')}
            >
              {t('property.backToAll')}
            </Link>
          </div>
        </SectionShell>
      </main>
    )
  }

  const gallery = resolveGallery(property)
  const mapLabel =
    property.fullAddress ??
    [property.title, property.location].filter(Boolean).join(' · ')
  const hasCoords =
    typeof property.latitude === 'number' &&
    typeof property.longitude === 'number' &&
    Number.isFinite(property.latitude) &&
    Number.isFinite(property.longitude)

  const wa = agentWhatsappUrl(salesperson)

  return (
    <main
      id={`page-property-${property.id}`}
      className="flex w-full flex-col gap-[0.625rem]"
      aria-label={property.title}
    >
      <PropertyDetailHero property={property} gallery={gallery} />

      <SectionShell variant="cream">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="type-section-title font-display text-xl font-semibold text-terracotta sm:text-2xl">
              About this property
            </h2>
            {property.propertyRefId ? (
              <p className="mt-1 font-compact text-sm uppercase tracking-widest text-ink/50">
                Ref {property.propertyRefId}
                {property.yearBuilt != null ? ` · Built ${property.yearBuilt}` : ''}
              </p>
            ) : null}
            {(property.propertyType ||
              property.beds != null ||
              property.baths != null ||
              (property.interiorM2 != null && property.interiorM2 > 0) ||
              (property.plotM2 != null && property.plotM2 > 0)) ? (
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70 [&>li]:flex [&>li]:items-center [&>li]:gap-1.5">
                {property.propertyType ? (
                  <li>
                    <Building2 className="size-4 shrink-0 text-terracotta" strokeWidth={1.75} aria-hidden />
                    {property.propertyType}
                  </li>
                ) : null}
                {property.beds != null ? (
                  <li>
                    <Bed className="size-4 shrink-0 text-terracotta" strokeWidth={1.75} aria-hidden />
                    {property.beds === 0 ? 'Studio' : `${property.beds} bed${property.beds === 1 ? '' : 's'}`}
                  </li>
                ) : null}
                {property.baths != null ? (
                  <li>
                    <Bath className="size-4 shrink-0 text-terracotta" strokeWidth={1.75} aria-hidden />
                    {property.baths} bath{property.baths === 1 ? '' : 's'}
                  </li>
                ) : null}
                {property.interiorM2 != null && property.interiorM2 > 0 ? (
                  <li>
                    <Maximize2 className="size-4 shrink-0 text-terracotta" strokeWidth={1.75} aria-hidden />
                    {formatAreaFromM2(property.interiorM2, areaUnit, intlLocale)}
                  </li>
                ) : null}
                {property.plotM2 != null && property.plotM2 > 0 ? (
                  <li>
                    <Square className="size-4 shrink-0 text-terracotta" strokeWidth={1.75} aria-hidden />
                    Plot {formatAreaFromM2(property.plotM2, areaUnit, intlLocale)}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
          <Link
            to="/all-properties"
            className={buttonClassNames(
              'outlineTerracotta',
              'w-full shrink-0 justify-center sm:mt-0 sm:w-auto',
            )}
          >
            All properties
          </Link>
        </div>

        <div className="mt-8 flex w-full flex-col gap-10 lg:flex-row lg:items-start">
          <div className="flex min-w-0 w-full flex-col gap-10 lg:w-[50%] lg:max-w-[50%] lg:shrink-0">
            {property.descriptionHtml ? (
              <div
                className="max-w-none space-y-4 leading-relaxed text-ink/80 [&_p]:text-pretty"
                dangerouslySetInnerHTML={{ __html: property.descriptionHtml }}
              />
            ) : (
              <p className="max-w-3xl text-ink/70">{t('property.descriptionEmpty')}</p>
            )}

            <div>
              <h3 className="type-section-title font-display text-lg font-semibold text-terracotta sm:text-xl">
                Location
              </h3>
              <p className="mt-2 max-w-2xl text-ink/70">
                {property.fullAddress ?? property.location ?? mapLabel}
              </p>
              {hasCoords ? (
                <div className="mt-6">
                  <PropertyLeafletMap
                    latitude={property.latitude!}
                    longitude={property.longitude!}
                    label={mapLabel}
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink/55">
                  Map preview appears when latitude and longitude are set for this listing.
                </p>
              )}
            </div>

            <div className="border-t border-ink/10 pt-8">
              {salesperson ? (
                <p className="max-w-xl text-sm leading-relaxed text-ink/75">
                  Prefer to talk directly?{' '}
                  <Link
                    to="/about"
                    className="font-medium text-terracotta underline-offset-2 hover:underline"
                  >
                    View {salesperson.name}&apos;s profile
                  </Link>
                  {wa ? (
                    <>
                      {' '}
                      or{' '}
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-terracotta underline-offset-2 hover:underline"
                      >
                        message on WhatsApp
                      </a>
                    </>
                  ) : null}
                  .
                </p>
              ) : (
                <p className="max-w-xl text-sm leading-relaxed text-ink/75">
                  <span className="font-semibold text-terracotta">Capital Dream</span>{' '}
                  is your point of contact for this property — send an enquiry and our
                  team will respond promptly.
                </p>
              )}
            </div>

            <div className="w-full">
              <PropertyExpertCard salesperson={salesperson} />
            </div>
          </div>

          <div
            className="hidden min-h-px shrink lg:block lg:min-w-[clamp(1.25rem,3vw,4rem)] lg:flex-1"
            aria-hidden
          />

          <aside className="min-w-0 w-full lg:w-[35%] lg:max-w-[35%] lg:shrink-0 lg:sticky lg:top-28 lg:self-start">
            <PropertyLeadForm
              propertyId={property.id}
              propertyTitle={property.title}
              salesperson={salesperson}
            />
          </aside>
        </div>
      </SectionShell>

      {related.length > 0 ? (
        <SectionShell variant="cream">
          <h2 className="type-section-title font-display mb-8 text-xl font-semibold text-terracotta sm:mb-10 sm:text-2xl">
            You might also like
          </h2>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-6">
            {related.map((p) => (
              <PropertyListingCard key={p.id} property={p} compact />
            ))}
          </div>
        </SectionShell>
      ) : null}
    </main>
  )
}
