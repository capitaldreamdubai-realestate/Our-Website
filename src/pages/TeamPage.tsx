import useEmblaCarousel from 'embla-carousel-react'
import { useMemo, useState } from 'react'
import { buttonClassNames } from '@/components/Button'
import { CarouselNav } from '@/components/CarouselNav'
import { SalesTeamMemberCard } from '@/components/SalesTeamMemberCard'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { Seo } from '@/components/Seo'

const PAGE_SIZE = 8

export function TeamPage() {
  const { salespeopleList, loading } = useCms()
  const { t } = useLocalePreferences()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visiblePeople = useMemo(
    () => salespeopleList.slice(0, visibleCount),
    [salespeopleList, visibleCount],
  )
  const canShowMore = visibleCount < salespeopleList.length

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: visiblePeople.length > 1,
      skipSnaps: false,
      dragFree: false,
    },
    [],
  )

  return (
    <main
      id="page-team"
      aria-label={t('team.aria.main')}
      className="flex w-full flex-col gap-[0.625rem]"
    >
      <Seo title={t('seo.team.title')} description={t('seo.team.description')} />
      <SectionShell variant="cream" id="team-grid" aria-label={t('team.aria.grid')}>
        <div className="w-full">
          <div className="mb-8 flex items-center justify-between gap-3 sm:mb-10">
            <div>
              <p className="type-card-title font-compact uppercase tracking-[0.02em] text-ink">
                {t('team.eyebrow')}
              </p>
              <h1 className="mt-2 hidden text-balance font-display text-3xl font-semibold leading-tight text-ink sm:block sm:text-4xl">
                {t('team.h1')}
              </h1>
            </div>
            {!loading && visiblePeople.length > 0 ? (
              <div className="md:hidden">
                <CarouselNav emblaApi={emblaApi} />
              </div>
            ) : null}
          </div>

          {loading ? (
            <p className="text-[length:var(--brand-font-body-lg)] text-ink/70">
              {t('team.loading')}
            </p>
          ) : visiblePeople.length === 0 ? (
            <p className="max-w-xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/75">
              {t('team.cmsEmpty')}
            </p>
          ) : (
            <>
              <div className="hidden grid-cols-1 gap-x-8 gap-y-10 sm:grid sm:grid-cols-2 xl:grid-cols-4">
                {visiblePeople.map((person) => (
                  <SalesTeamMemberCard
                    key={person.id}
                    person={person}
                    profileHref={`/team/${person.slug}`}
                  />
                ))}
              </div>

              <div
                className="overflow-hidden sm:hidden"
                ref={emblaRef}
                role="region"
                aria-roledescription="carousel"
                aria-label={t('team.carouselAria')}
              >
                <div className="flex touch-pan-y [-webkit-tap-highlight-color:transparent]">
                  {visiblePeople.map((person) => (
                    <div key={person.id} className="min-w-0 shrink-0 grow-0 basis-full pr-5">
                      <SalesTeamMemberCard
                        person={person}
                        profileHref={`/team/${person.slug}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!loading && canShowMore ? (
            <div className="mt-10 hidden justify-center sm:flex">
              <button
                type="button"
                className={buttonClassNames('primary')}
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + PAGE_SIZE, salespeopleList.length),
                  )
                }
              >
                {t('team.showMore')}
              </button>
            </div>
          ) : null}

          {!loading && salespeopleList.length > PAGE_SIZE ? (
            <p className="mt-4 hidden text-center text-sm text-ink/55 sm:block">
              {t('team.showing', {
                current: String(Math.min(visibleCount, salespeopleList.length)),
                total: String(salespeopleList.length),
              })}
            </p>
          ) : null}
        </div>
      </SectionShell>
    </main>
  )
}
