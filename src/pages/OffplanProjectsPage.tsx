import useEmblaCarousel from 'embla-carousel-react'
import { useMemo } from 'react'
import { CarouselNav } from '@/components/CarouselNav'
import { OffplanProjectCard } from '@/components/OffplanProjectCard'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { usePageSeo } from '@/hooks/usePageSeo'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  OFFPLAN_LAUNCH_STATUSES,
  OFFPLAN_LAUNCH_STATUS_LABELS,
  type OffplanLaunchStatus,
} from '@/lib/offplanLaunchStatus'
import type { PublicOffplanProject } from '@/lib/cms/mapOffplanProject'

function ProjectSection({
  status,
  projects,
}: {
  status: OffplanLaunchStatus
  projects: PublicOffplanProject[]
}) {
  const { propertyDevelopersList } = useCms()
  const { t } = useLocalePreferences()
  const isMobile = useMediaQuery('(max-width: 639px)')

  const devById = useMemo(() => {
    const map = new Map(propertyDevelopersList.map((d) => [d.id, d]))
    return map
  }, [propertyDevelopersList])

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: projects.length > 1,
      skipSnaps: false,
      dragFree: false,
    },
    [],
  )

  if (projects.length === 0) return null

  const sectionLabel = t(
    status === 'new'
      ? 'offplan.section.new'
      : status === 'existing'
        ? 'offplan.section.existing'
        : 'offplan.section.upcoming',
  )

  return (
    <SectionShell
      variant="cream"
      id={`offplan-${status}`}
      aria-label={OFFPLAN_LAUNCH_STATUS_LABELS[status]}
    >
      <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <p className="type-card-title font-compact uppercase tracking-[0.02em] text-ink/70">
            {t('offplan.eyebrow')}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
            {sectionLabel}
          </h2>
        </div>
        {isMobile && projects.length > 1 ? (
          <CarouselNav emblaApi={emblaApi} />
        ) : null}
      </div>

      <div className="hidden grid-cols-1 gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <OffplanProjectCard
            key={project.id}
            project={project}
            developer={devById.get(project.developerId) ?? null}
          />
        ))}
      </div>

      <div
        className="overflow-hidden sm:hidden"
        ref={emblaRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={sectionLabel}
      >
        <div className="flex touch-pan-y [-webkit-tap-highlight-color:transparent]">
          {projects.map((project) => (
            <div
              key={project.id}
              className="min-w-0 shrink-0 grow-0 basis-full pr-5"
            >
              <OffplanProjectCard
                project={project}
                developer={devById.get(project.developerId) ?? null}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

export function OffplanProjectsPage() {
  const { offplanProjectsByStatus, loading, cmsEmpty } = useCms()
  const { t } = useLocalePreferences()

  usePageSeo({
    title: t('seo.newDevelopments.title'),
    description: t('seo.newDevelopments.description'),
  })

  const totalProjects = OFFPLAN_LAUNCH_STATUSES.reduce(
    (sum, status) => sum + offplanProjectsByStatus[status].length,
    0,
  )

  return (
    <main
      id="page-offplan"
      aria-label={t('offplan.aria.main')}
      className="flex w-full flex-col gap-[0.625rem]"
    >
      <SectionShell variant="cream" aria-label={t('offplan.heroAria')}>
        <p className="type-card-title font-compact uppercase tracking-[0.02em] text-ink/70">
          {t('listing.hero.new.title')}
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight text-terracotta sm:text-4xl">
          {t('offplan.h1')}
        </h1>
        <p className="mt-4 max-w-2xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/75">
          {t('offplan.intro')}
        </p>
      </SectionShell>

      {loading ? (
        <SectionShell variant="cream">
          <p className="text-[length:var(--brand-font-body-lg)] text-ink/70">
            {t('offplan.loading')}
          </p>
        </SectionShell>
      ) : totalProjects === 0 ? (
        <SectionShell variant="cream">
          <p className="max-w-xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/75">
            {cmsEmpty ? t('offplan.emptyCms') : t('offplan.empty')}
          </p>
        </SectionShell>
      ) : (
        OFFPLAN_LAUNCH_STATUSES.map((status) => (
          <ProjectSection
            key={status}
            status={status}
            projects={offplanProjectsByStatus[status]}
          />
        ))
      )}
    </main>
  )
}
