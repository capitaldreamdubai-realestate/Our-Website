import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { PropertyListingPage } from './PropertyListingPage'

export function AllPropertiesPage() {
  const { t } = useLocalePreferences()
  return (
    <PropertyListingPage
      variant="all"
      showStatusFilter
      seoTitle={t('seo.allProperties.title')}
      seoDescription={t('seo.allProperties.description')}
      mainId="page-all-properties"
      heroTitle={t('listing.hero.all.title')}
      heroDescription={t('listing.hero.all.desc')}
      featuredEyebrow={t('listing.featured.all')}
      gridTitle={t('listing.grid.all')}
      emptyFilteredMessage={t('listing.emptyFilteredAll')}
    />
  )
}
