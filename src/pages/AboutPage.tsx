import { useCms } from '../contexts/CmsContext'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { Link } from 'react-router-dom'
import { buttonClassNames } from '../components/Button'
import { SectionShell } from '../components/SectionShell'
import { Seo } from '../components/Seo'
import { AboutFaqTopicsSection } from '../sections/AboutFaqTopicsSection'
import { MissionSection } from '../sections/MissionSection'
import { SalesTeamSection } from '../sections/SalesTeamSection'
import { TallLifestyleSection } from '../sections/TallLifestyleSection'
import { LogoMarqueeSection } from '../sections/LogoMarqueeSection'

export function AboutPage() {
  const { salespeopleList, loading } = useCms()
  const { t } = useLocalePreferences()
  return (
    <main
      id="page-about"
      aria-label={t('nav.about')}
      className="flex w-full flex-col gap-[0.625rem]"
    >
      <Seo title={t('seo.about.title')} description={t('seo.about.description')} />
      <TallLifestyleSection
        id="about-lifestyle"
        aria-label={t('aria.about.lifestyle')}
        showServicesOverlay
      />
      <MissionSection
        id="about-mission"
        aria-label={t('aria.about.mission')}
      />
      <AboutFaqTopicsSection
        id="about-video-band"
        aria-label={t('aria.about.faq')}
      />
      <SectionShell variant="cream" id="about-portfolio" aria-label={t('portfolio.about.aria')}>
        <h2 className="font-display text-2xl font-semibold text-terracotta sm:text-3xl">
          {t('portfolio.about.title')}
        </h2>
        <p className="mt-3 max-w-2xl text-ink/75">{t('portfolio.about.body')}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/sold-properties" className={buttonClassNames('primary', 'w-full text-center sm:w-auto')}>
            {t('portfolio.about.sold')}
          </Link>
          <Link to="/rented-properties" className={buttonClassNames('outlineTerracotta', 'w-full text-center sm:w-auto')}>
            {t('portfolio.about.rented')}
          </Link>
        </div>
      </SectionShell>
      <SalesTeamSection
        id="about-team"
        sectionAriaLabel={t('aria.about.team')}
        carouselLabel={t('aria.about.teamCarousel')}
        eyebrow={t('about.eyebrow.team')}
        people={salespeopleList}
        loading={loading}
      />
      <LogoMarqueeSection
        id="about-partner-marquee"
        aria-label={t('aria.about.partners')}
      />
    </main>
  )
}
