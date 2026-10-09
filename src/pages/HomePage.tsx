import { useMemo } from 'react'
import { FULL_BLEED_YOUTUBE_VIDEO_ID } from '../config/fullBleedYoutube'
import { useCms } from '../contexts/CmsContext'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { Seo } from '../components/Seo'
import { realEstateAgentJsonLd, websiteJsonLd } from '../lib/seo/site'
import { isForRentListing, isForSaleListing } from '../lib/propertyChannels'
import { FoundersSection } from '../sections/FoundersSection'
import { FullBleedYouTube } from '../sections/FullBleedYouTube'
import { HeroSection } from '../sections/HeroSection'
import { IntroStatementSection } from '../sections/IntroStatementSection'
import { PropertyGridSection } from '../sections/PropertyGridSection'
import { QuoteSection } from '../sections/QuoteSection'
import { ServicesGridSection } from '../sections/ServicesGridSection'
import { LogoMarqueeSection } from '../sections/LogoMarqueeSection'

export function HomePage() {
  const { catalogProperties, siteSettings } = useCms()
  const { t } = useLocalePreferences()
  const forSaleHomes = useMemo(
    () => catalogProperties.filter(isForSaleListing),
    [catalogProperties],
  )
  const forRentHomes = useMemo(
    () => catalogProperties.filter(isForRentListing),
    [catalogProperties],
  )
  return (
    <main
      id="page-home"
      aria-label={t('aria.home.main')}
      className="flex w-full flex-col gap-[0.625rem]"
    >
      <Seo
        title={t('seo.home.title')}
        description={t('seo.home.description')}
        jsonLd={[realEstateAgentJsonLd, websiteJsonLd]}
      />
      <HeroSection heroImageUrl={siteSettings.heroBannerUrl} />
      <IntroStatementSection
        id="about"
        aria-label={t('aria.home.intro')}
      />
      <PropertyGridSection
        id="homes"
        sectionAriaLabel={t('aria.home.forSale')}
        carouselLabel={t('aria.home.forSaleCarousel')}
        eyebrow={t('home.eyebrow.sale')}
        eyebrowTo="/for-sale"
        eyebrowLeft
        featuredLayout
        properties={forSaleHomes}
      />
      <QuoteSection id="home-quote" aria-label={t('aria.home.quote')} />
      <ServicesGridSection
        id="services"
        aria-label={t('aria.home.services')}
      />
      <FullBleedYouTube
        videoId={
          siteSettings.fullBleedYoutubeId?.trim()
            ? siteSettings.fullBleedYoutubeId
            : FULL_BLEED_YOUTUBE_VIDEO_ID
        }
        embedInstanceId="home-fullbleed-youtube"
        sectionId="home-video-band"
        aria-label={t('aria.home.video')}
        compactMobilePad
      />
      <FoundersSection
        id="founders"
        aria-label={t('aria.home.founders')}
      />
      <PropertyGridSection
        id="home-more-homes"
        sectionAriaLabel={t('aria.home.forRent')}
        carouselLabel={t('aria.home.forRentCarousel')}
        eyebrow={t('home.eyebrow.rent')}
        eyebrowTo="/for-rent"
        eyebrowLeft
        featuredLayout
        properties={forRentHomes}
      />
      <LogoMarqueeSection
        id="home-partner-marquee"
        aria-label={t('aria.home.partners')}
      />
    </main>
  )
}
