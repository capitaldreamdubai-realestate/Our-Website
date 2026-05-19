import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { isOffplanListing } from '../lib/propertyChannels'
import { PropertyListingPage } from './PropertyListingPage'

export function NewDevelopmentsPage() {
  const { t } = useLocalePreferences()
  return (
    <PropertyListingPage
      variant="channel"
      channelFilter={isOffplanListing}
      seoTitle={t('seo.newDevelopments.title')}
      seoDescription={t('seo.newDevelopments.description')}
      mainId="page-offplan"
      heroTitle={t('listing.hero.new.title')}
      heroDescription={t('listing.hero.new.desc')}
      featuredEyebrow={t('listing.featured.new')}
      gridTitle={t('listing.grid.new')}
      emptyFilteredMessage={t('listing.emptyFiltered.new')}
      emptyChannelMessage={t('listing.emptyChannel.new')}
    />
  )
}
