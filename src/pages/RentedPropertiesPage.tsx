import { PropertyLeadForm } from '../components/PropertyLeadForm'
import { SectionShell } from '../components/SectionShell'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { isRentedListing } from '../lib/propertyChannels'
import { PropertyListingPage } from './PropertyListingPage'

export function RentedPropertiesPage() {
  const { t } = useLocalePreferences()
  return (
    <PropertyListingPage
      variant="channel"
      channelFilter={isRentedListing}
      seoTitle={t('seo.rented.title')}
      seoDescription={t('seo.rented.description')}
      mainId="page-rented-properties"
      heroTitle={t('listing.hero.rented.title')}
      heroDescription={t('listing.hero.rented.desc')}
      featuredEyebrow={t('listing.featured.rented')}
      gridTitle={t('listing.grid.rented')}
      emptyFilteredMessage={t('listing.emptyFiltered.rent')}
      emptyChannelMessage={t('listing.emptyChannel.rented')}
      primaryHref="#rented-enquiry"
      primaryLabel={t('portfolio.rented.primary')}
      secondaryHref="/for-rent"
      secondaryLabel={t('portfolio.rented.secondary')}
      belowHero={
        <SectionShell variant="cream" id="rented-enquiry">
          <PropertyLeadForm
            headlineOverride={t('portfolio.rented.formTitle')}
            enquiryChoices={[
              { label: t('portfolio.rented.primary'), source: 'rented_property_landlord_enquiry' },
              { label: t('portfolio.rented.tenant'), source: 'rented_property_tenant_enquiry' },
            ]}
            similarHref="/for-rent"
            similarLabel={t('portfolio.rented.secondary')}
          />
        </SectionShell>
      }
    />
  )
}
