import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { FloorPlanSection } from '@/components/FloorPlanSection'
import { PaymentPlanCalculator } from '@/components/PaymentPlanCalculator'
import { ProjectBrochureDialog } from '@/components/ProjectBrochureDialog'
import { ProjectGalleryHero } from '@/components/ProjectGalleryHero'
import { ProjectLeadForm } from '@/components/ProjectLeadForm'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { Seo } from '@/components/Seo'
import type { PublicFloorPlan } from '@/lib/cms/mapOffplanProject'
import { formatPriceFromAed } from '@/lib/formatCurrency'
import {
  fetchProjectBrochureUrl,
  triggerBrochureDownload,
} from '@/lib/fetchProjectBrochure'
import { breadcrumbJsonLd, faqPageJsonLd, floorPlanListJsonLd, realEstateListingJsonLd } from '@/lib/seo/site'

export function OffplanProjectDetailPage() {
  const { slug } = useParams()
  const {
    offplanProjectsBySlug,
    propertyDevelopersList,
    salespeopleById,
    loading,
  } = useCms()
  const { t, currency, rates, intlLocale } = useLocalePreferences()
  const [brochureOpen, setBrochureOpen] = useState(false)
  const [brochureBusy, setBrochureBusy] = useState(false)
  const [brochureErr, setBrochureErr] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null)

  const project = slug ? offplanProjectsBySlug[slug] : undefined

  const developer = useMemo(() => {
    if (!project) return undefined
    return propertyDevelopersList.find((d) => d.id === project.developerId)
  }, [project, propertyDevelopersList])

  const salesperson = project?.salespersonId
    ? salespeopleById[project.salespersonId] ?? null
    : null

  const selectedPlan = project?.floorPlans.find((plan) => plan.id === selectedPlanId) ?? null

  useEffect(() => {
    setSelectedPlanId(null)
    setQuotedPrice(project?.startingPriceAed ?? null)
  }, [project?.id, project?.startingPriceAed])

  const seoTitle = project
    ? project.seoTitle || launchSeoTitle(project.name, developer?.name, project.community, t)
    : t('offplan.detail.seoTitleMissing')
  const seoDescription = project
    ? project.seoDescription || project.shortDescription || t('offplan.detail.seoDesc', { name: project.name })
    : t('offplan.detail.seoDescMissing')
  const jsonLd = project
    ? [
        realEstateListingJsonLd({
          name: project.name,
          path: `/offplan/${project.slug}`,
          description: project.seoDescription || project.shortDescription,
          image: project.heroImageUrl,
          addressLocality: project.community || project.location || project.emirate,
          priceAed: project.startingPriceAed,
        }),
        ...(project.floorPlans.length > 0
          ? [floorPlanListJsonLd(project.floorPlans, `/offplan/${project.slug}`)]
          : []),
        ...(project.faqs.length > 0 ? [faqPageJsonLd(project.faqs)] : []),
        breadcrumbJsonLd([
          { name: t('nav.home'), path: '/' },
          { name: t('nav.newDevelopments'), path: '/offplan' },
          { name: project.name, path: `/offplan/${project.slug}` },
        ]),
      ]
    : null

  function choosePlan(plan: PublicFloorPlan) {
    setSelectedPlanId(plan.id)
    if (plan.startingPriceAed != null && plan.startingPriceAed > 0) {
      setQuotedPrice(plan.startingPriceAed)
    }
  }

  function enquireOnPlan(plan: PublicFloorPlan) {
    choosePlan(plan)
    document.getElementById('project-inquiry')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleBrochureUnlocked(contact: { email: string; name: string }) {
    if (!project) return
    setBrochureBusy(true)
    setBrochureErr(null)
    const { url, error } = await fetchProjectBrochureUrl(project.id, contact)
    setBrochureBusy(false)
    if (error || !url) {
      setBrochureErr(error ?? t('projectLead.brochureError'))
      return
    }
    triggerBrochureDownload(url, `${project.slug}-brochure.pdf`)
  }

  if (!loading && !project) {
    return <Navigate to="/offplan" replace />
  }

  if (!project) {
    return (
      <main className="flex w-full flex-col gap-[0.625rem]">
        <Seo title={seoTitle} description={seoDescription} />
        <SectionShell variant="cream">
          <p className="text-[length:var(--brand-font-body-lg)] text-ink/70">
            {t('offplan.loading')}
          </p>
        </SectionShell>
      </main>
    )
  }

  const fromPrice =
    project.startingPriceAed != null && project.startingPriceAed > 0
      ? formatPriceFromAed(project.startingPriceAed, currency, rates, intlLocale)
      : null
  const floorPlanContext = selectedPlan
    ? {
        id: selectedPlan.id,
        name: selectedPlan.name,
        bedrooms: selectedPlan.bedrooms,
        priceAed: quotedPrice ?? selectedPlan.startingPriceAed,
      }
    : null
  const place = [project.community, project.location, project.emirate].filter(Boolean).join(', ')

  return (
    <main
      id={`page-offplan-${project.slug}`}
      className="flex w-full flex-col gap-[0.625rem]"
      aria-label={project.name}
    >
      <Seo
        title={seoTitle}
        description={seoDescription}
        image={project.heroImageUrl}
        path={`/offplan/${project.slug}`}
        jsonLd={jsonLd}
      />
      <ProjectGalleryHero title={project.name} gallery={project.gallery} />

      <SectionShell variant="cream">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                {developer ? (
                  <Link
                    to={`/developers/${developer.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-terracotta underline-offset-2 hover:underline"
                  >
                    {developer.logoUrl ? (
                      <img
                        src={developer.logoUrl}
                        alt=""
                        className="h-8 w-auto max-w-[7rem] object-contain"
                      />
                    ) : null}
                    <span>{developer.name}</span>
                  </Link>
                ) : null}
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/75">
                  {project.community ? (
                    <div>
                      <dt className="sr-only">{t('offplan.detail.communityLabel')}</dt>
                      <dd>{project.community}</dd>
                    </div>
                  ) : null}
                  {fromPrice ? (
                    <div>
                      <dt className="sr-only">{t('offplan.detail.fromPriceLabel')}</dt>
                      <dd className="font-medium text-ink">{t('offplan.detail.fromPrice', { price: fromPrice })}</dd>
                    </div>
                  ) : null}
                  {project.handover ? (
                    <div>
                      <dt className="sr-only">{t('offplan.detail.handoverLabel')}</dt>
                      <dd>{t('offplan.detail.handover', { when: project.handover })}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className="mt-3 text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/80">
                  {project.shortDescription}
                </p>
              </div>
              <Link
                to="/offplan"
                className={`${buttonClassNames('outlineTerracotta')} shrink-0 self-end sm:self-start`}
              >
                {t('offplan.detail.back')}
              </Link>
            </div>

            {project.descriptionHtml ? (
              <div
                className="prose prose-ink mt-8 max-w-none text-ink/85"
                dangerouslySetInnerHTML={{ __html: project.descriptionHtml }}
              />
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#project-inquiry" className={buttonClassNames('primary')}>
                {t('projectLead.sendInquiry')}
              </a>
              {project.hasBrochure ? (
                <button
                  type="button"
                  disabled={brochureBusy}
                  onClick={() => setBrochureOpen(true)}
                  className={buttonClassNames('outlineTerracotta')}
                >
                  {brochureBusy ? t('projectLead.preparing') : t('projectLead.downloadBrochure')}
                </button>
              ) : null}
            </div>
            {brochureErr ? (
              <p className="mt-3 text-sm text-red-600">{brochureErr}</p>
            ) : null}

            <FloorPlanSection
              plans={project.floorPlans}
              selectedId={selectedPlanId}
              onSelect={choosePlan}
              onEnquire={enquireOnPlan}
            />

            {project.paymentPlans.length > 0 ? (
              <PaymentPlanCalculator
                plans={project.paymentPlans}
                priceAed={quotedPrice}
                onPriceChange={setQuotedPrice}
              />
            ) : null}

            {place || project.handover || project.amenities.length > 0 || project.dldProjectNumber || project.escrowBank ? (
              <section className="mt-12" aria-label={t('offplan.detail.location')}>
                <h2 className="font-display text-2xl font-semibold text-ink">{t('offplan.detail.location')}</h2>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {place ? (
                    <div>
                      <dt className="font-medium text-ink/50">{t('offplan.detail.location')}</dt>
                      <dd className="mt-0.5 text-ink">{place}</dd>
                    </div>
                  ) : null}
                  {project.handover ? (
                    <div>
                      <dt className="font-medium text-ink/50">{t('offplan.detail.handoverLabel')}</dt>
                      <dd className="mt-0.5 text-ink">{project.handover}</dd>
                    </div>
                  ) : null}
                  {project.dldProjectNumber ? (
                    <div>
                      <dt className="font-medium text-ink/50">{t('offplan.detail.dldProject')}</dt>
                      <dd className="mt-0.5 text-ink">{project.dldProjectNumber}</dd>
                    </div>
                  ) : null}
                  {project.escrowBank ? (
                    <div>
                      <dt className="font-medium text-ink/50">{t('offplan.detail.escrow')}</dt>
                      <dd className="mt-0.5 text-ink">{project.escrowBank}</dd>
                    </div>
                  ) : null}
                </dl>
                {project.amenities.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/50">
                      {t('offplan.detail.amenities')}
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {project.amenities.map((amenity) => (
                        <li key={amenity} className="rounded-full border border-ink/10 bg-white px-3 py-1 text-sm text-ink">
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {project.faqs.length > 0 ? (
              <section className="mt-12" aria-label={t('offplan.detail.faq')}>
                <h2 className="font-display text-2xl font-semibold text-ink">{t('offplan.detail.faq')}</h2>
                <div className="mt-4 divide-y divide-ink/10">
                  {project.faqs.map((faq) => (
                    <details key={faq.question} className="group py-3">
                      <summary className="cursor-pointer font-medium text-ink">{faq.question}</summary>
                      <p className="mt-2 text-sm leading-relaxed text-ink/75">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside id="project-inquiry" className="w-full shrink-0 lg:sticky lg:top-24 lg:max-w-md">
            {selectedPlan ? (
              <p className="mb-3 text-sm text-ink/70">
                {t('offplan.detail.askingAbout', { name: selectedPlan.name })}
              </p>
            ) : null}
            <ProjectLeadForm
              intent="inquiry"
              projectId={project.id}
              projectName={project.name}
              projectSlug={project.slug}
              salesperson={salesperson}
              floorPlan={floorPlanContext}
            />
          </aside>
        </div>
      </SectionShell>

      <ProjectBrochureDialog
        open={brochureOpen}
        onClose={() => setBrochureOpen(false)}
        projectId={project.id}
        projectName={project.name}
        projectSlug={project.slug}
        salesperson={salesperson}
        floorPlan={floorPlanContext}
        onBrochureUnlocked={handleBrochureUnlocked}
      />
    </main>
  )
}

function launchSeoTitle(
  name: string,
  developer: string | undefined,
  community: string | null,
  t: (key: string, vars?: Record<string, string>) => string,
) {
  if (developer && community) {
    return t('offplan.detail.seoTitleFull', { name, developer, community })
  }
  if (developer) return t('offplan.detail.seoTitleBy', { name, developer })
  if (community) return t('offplan.detail.seoTitleIn', { name, community })
  return t('offplan.detail.seoTitle', { name })
}
