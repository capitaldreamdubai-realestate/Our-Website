import { PAGE_ENQUIRY_ANCHOR, PageEnquirySection } from '@/components/PageEnquirySection'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { isForSaleListing } from '../lib/propertyChannels'
import { PropertyListingPage } from './PropertyListingPage'

export function ForSalePage() {
  const { t } = useLocalePreferences()
  return (
    <PropertyListingPage
      variant="channel"
      channelFilter={isForSaleListing}
      seoTitle={t('seo.forSale.title')}
      seoDescription={t('seo.forSale.description')}
      mainId="page-for-sale"
      heroTitle={t('listing.hero.sale.title')}
      heroDescription={t('listing.hero.sale.desc')}
      featuredEyebrow={t('listing.featured.sale')}
      gridTitle={t('listing.grid.sale')}
      emptyFilteredMessage={t('listing.emptyFiltered')}
      emptyChannelMessage={t('listing.emptyChannel.sale')}
      primaryHref={`#${PAGE_ENQUIRY_ANCHOR}`}
      primaryLabel={t('pageEnquiry.cta')}
      afterGrid={
        <PageEnquirySection
          pageContext="for_sale"
          title={t('pageEnquiry.forSale.title')}
          intro={t('pageEnquiry.forSale.intro')}
          interest={t('pageEnquiry.forSale.interest')}
        />
      }
    />
  )
}
