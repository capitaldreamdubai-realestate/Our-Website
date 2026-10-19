import { PropertyLeadForm } from '../components/PropertyLeadForm'
import { SectionShell } from '../components/SectionShell'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { isSoldListing } from '../lib/propertyChannels'
import { PropertyListingPage } from './PropertyListingPage'

export function SoldPropertiesPage() {
  const { t } = useLocalePreferences()
  return (
    <PropertyListingPage
      variant="channel"
      channelFilter={isSoldListing}
      seoTitle={t('seo.sold.title')}
      seoDescription={t('seo.sold.description')}
      mainId="page-sold-properties"
      heroTitle={t('listing.hero.sold.title')}
      heroDescription={t('listing.hero.sold.desc')}
      featuredEyebrow={t('listing.featured.sold')}
      gridTitle={t('listing.grid.sold')}
      emptyFilteredMessage={t('listing.emptyFiltered')}
      emptyChannelMessage={t('listing.emptyChannel.sold')}
      primaryHref="#sold-enquiry"
      primaryLabel={t('portfolio.sold.primary')}
      secondaryHref="/for-sale"
      secondaryLabel={t('portfolio.sold.secondary')}
      belowHero={
        <SectionShell variant="cream" id="sold-enquiry">
          <PropertyLeadForm
            headlineOverride={t('portfolio.sold.formTitle')}
            enquiryChoices={[
              { label: t('portfolio.sold.primary'), source: 'sold_property_seller_enquiry' },
              { label: t('portfolio.sold.buyer'), source: 'sold_property_buyer_enquiry' },
            ]}
            similarHref="/for-sale"
            similarLabel={t('portfolio.sold.secondary')}
          />
        </SectionShell>
      }
    />
  )
}
