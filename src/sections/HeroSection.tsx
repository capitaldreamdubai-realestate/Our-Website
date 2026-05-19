import { Button } from '../components/Button'
import { HeroNeighbourhoodCards } from '../components/HeroNeighbourhoodCards'
import { ImagePrimaryOverlay } from '../components/ImagePrimaryOverlay'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { usePropertyFilterDock } from '../contexts/PropertyFilterDockContext'

const HERO_DESKTOP_IMAGE =
  'https://images.pexels.com/photos/14749801/pexels-photo-14749801.jpeg'
const HERO_MOBILE_IMAGE =
  'https://images.pexels.com/photos/25286657/pexels-photo-25286657.jpeg'

type HeroProps = {
  heroImageUrl?: string | null
}

export function HeroSection({ heroImageUrl }: HeroProps) {
  const { openDock } = usePropertyFilterDock()
  const { t } = useLocalePreferences()
  const desktopSrc = heroImageUrl?.trim() ? heroImageUrl : HERO_DESKTOP_IMAGE
  return (
    <section
      className="relative min-h-[95vh] min-h-[95dvh] w-full overflow-hidden rounded-[1.5rem]"
      aria-label={t('hero.aria')}
    >
      <img
        src={HERO_MOBILE_IMAGE}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover object-center md:hidden"
        width={2400}
        height={1029}
        fetchPriority="high"
        decoding="async"
      />
      <img
        src={desktopSrc}
        alt=""
        className="absolute inset-0 z-0 hidden h-full w-full object-cover object-center md:block"
        width={2400}
        height={1029}
        fetchPriority="high"
        decoding="async"
        aria-hidden
      />
      <ImagePrimaryOverlay />
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-t from-ink/75 via-ink/45 to-ink/25"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[95vh] min-h-[95dvh] flex-col p-[1.5rem] pb-16 pt-24 sm:pb-20 sm:pt-28 md:flex-row md:items-stretch md:pb-24 md:pt-32">
        <div className="flex min-h-0 w-full flex-1 flex-col justify-end md:w-[60%] md:flex-none md:shrink-0">
          <div className="w-full min-w-0 max-w-full">
            <h1 className="type-hero font-hero text-cream [text-shadow:0_2px_24px_rgba(28,20,18,0.55)]">
              {t('hero.line1')}
              <br />
              {t('hero.line2')}
              <br />
              {t('hero.line3')}
            </h1>
            <p className="mt-7 max-w-full font-light leading-relaxed text-cream/90 [text-shadow:0_1px_12px_rgba(28,20,18,0.45)]">
              {t('hero.sub1')}
              <br />
              {t('hero.sub2')}
              <br />
              {t('hero.sub3')}
            </p>
            <div className="mt-10">
              <Button
                type="button"
                variant="whiteSolid"
                className="btn-cool-cta"
                onClick={() => openDock()}
              >
                {t('hero.ctaSearch')}
              </Button>
            </div>
          </div>
        </div>
        <div className="hidden min-h-0 w-full flex-col justify-end md:flex md:w-[40%] md:shrink-0 md:pl-4 lg:pl-6">
          <HeroNeighbourhoodCards />
        </div>
      </div>
    </section>
  )
}
