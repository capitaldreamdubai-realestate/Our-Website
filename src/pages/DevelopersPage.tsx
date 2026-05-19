import useEmblaCarousel from 'embla-carousel-react'
import { useMemo, useState } from 'react'
import { buttonClassNames } from '@/components/Button'
import { CarouselNav } from '@/components/CarouselNav'
import { DeveloperCard } from '@/components/DeveloperCard'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { usePageSeo } from '@/hooks/usePageSeo'

const PAGE_SIZE = 12

export function DevelopersPage() {
  const { developersWithListings, loading } = useCms()
  const { t } = useLocalePreferences()
  usePageSeo({
    title: t('seo.developers.title'),
    description: t('seo.developers.description'),
  })

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = useMemo(
    () => developersWithListings.slice(0, visibleCount),
    [developersWithListings, visibleCount],
  )
  const canShowMore = visibleCount < developersWithListings.length

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: visible.length > 1,
      skipSnaps: false,
      dragFree: false,
    },
    [],
  )

  return (
    <main
      id="page-developers"
      aria-label={t('developers.aria.main')}
      className="flex w-full flex-col gap-[0.625rem]"
    >
      <SectionShell variant="cream" id="developers-grid" aria-label={t('developers.aria.grid')}>
        <div className="w-full">
          <div className="mb-8 flex items-center justify-between gap-3 sm:mb-10">
            <div className="min-w-0">
              <p className="type-card-title font-compact uppercase tracking-[0.02em] text-ink">
                {t('developers.eyebrow')}
              </p>
              <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                {t('developers.h1')}
              </h1>
              <p className="mt-4 max-w-2xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/75">
                {t('developers.intro')}
              </p>
            </div>
            {!loading && visible.length > 0 ? (
              <div className="md:hidden">
                <CarouselNav emblaApi={emblaApi} />
              </div>
            ) : null}
          </div>

          {loading ? (
            <p className="text-[length:var(--brand-font-body-lg)] text-ink/70">
              {t('developers.loading')}
            </p>
          ) : visible.length === 0 ? (
            <p className="max-w-xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/75">
              {t('developers.empty')}
            </p>
          ) : (
            <>
              <div className="hidden grid-cols-1 gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((developer) => (
                  <DeveloperCard key={developer.id} developer={developer} />
                ))}
              </div>

              <div
                className="overflow-hidden sm:hidden"
                ref={emblaRef}
                role="region"
                aria-roledescription="carousel"
                aria-label={t('developers.carouselAria')}
              >
                <div className="flex touch-pan-y [-webkit-tap-highlight-color:transparent]">
                  {visible.map((developer) => (
                    <div
                      key={developer.id}
                      className="min-w-0 shrink-0 grow-0 basis-full pr-5"
                    >
                      <DeveloperCard developer={developer} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {canShowMore ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                className={buttonClassNames('outlineTerracotta')}
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              >
                {t('developers.showMore')}
              </button>
            </div>
          ) : null}
        </div>
      </SectionShell>
    </main>
  )
}
