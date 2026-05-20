import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { isDealsListing } from '../lib/propertyChannels'
import { PropertyListingPage } from './PropertyListingPage'

export function DealsPage() {
  const { t } = useLocalePreferences()
  return (
    <PropertyListingPage
      variant="channel"
      channelFilter={isDealsListing}
      seoTitle={t('seo.deals.title')}
      seoDescription={t('seo.deals.description')}
      mainId="page-deals"
      heroTitle={t('listing.hero.deals.title')}
      heroDescription={t('listing.hero.deals.desc')}
      featuredEyebrow={t('listing.featured.deals')}
      gridTitle={t('listing.grid.deals')}
      emptyFilteredMessage={t('listing.emptyFiltered.deals')}
      emptyChannelMessage={t('listing.emptyChannel.deals')}
    />
  )
}
