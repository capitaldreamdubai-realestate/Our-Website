import { pdf } from '@react-pdf/renderer'
import type { Property } from '@/components/PropertyCard'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'
import type { AreaDisplayMode } from '@/lib/formatArea'
import { formatAreaFromM2 } from '@/lib/formatArea'
import type { DisplayCurrency } from '@/lib/formatCurrency'
import { formatPriceFromAed } from '@/lib/formatCurrency'
import type { RatesFromAed } from '@/lib/exchangeRates'
import { CHANNEL_LISTING_TAGS, normalizePropertyTags } from '@/lib/listingTags'
import { propertyLocationQuery } from '@/lib/propertyLocationQuery'
import {
  brochureFileName,
  PropertyBrochureDocument,
} from '@/lib/propertyBrochure/PropertyBrochureDocument'
import { resolveGallery } from '@/lib/resolvePropertyDetail'
import { agentWhatsappUrl } from '@/lib/whatsapp'
import type { ListingCoordinates } from '@/lib/geocodeListingLocation'

const CHANNELS = new Set(CHANNEL_LISTING_TAGS.map((tag) => tag.toLowerCase()))

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function latLngToTile(latitude: number, longitude: number, zoom: number) {
  const scale = 2 ** zoom
  const x = Math.floor(((longitude + 180) / 360) * scale)
  const latRad = (latitude * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  )
  return { x, y }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadPropertyBrochure(options: {
  property: Property
  salesperson: PublicSalesperson | null
  coords: ListingCoordinates | null
  currency: DisplayCurrency
  rates: RatesFromAed
  intlLocale: string
  areaUnit: AreaDisplayMode
}): Promise<void> {
  const { property, salesperson, coords, currency, rates, intlLocale, areaUnit } = options
  const tags = normalizePropertyTags(property.tags, property.tag)
  const listingType = tags.find((tag) => CHANNELS.has(tag.toLowerCase())) ?? ''
  const highlight = tags.filter((tag) => !CHANNELS.has(tag.toLowerCase())).join('  |  ')
  const priceText =
    property.priceAed != null
      ? formatPriceFromAed(property.priceAed, currency, rates, intlLocale)
      : 'Price on request'

  const snapshot: { label: string; value: string }[] = []
  if (property.beds != null) {
    snapshot.push({
      label: 'Bedrooms',
      value: property.beds === 0 ? 'Studio' : String(property.beds),
    })
  }
  if (property.baths != null) snapshot.push({ label: 'Bathrooms', value: String(property.baths) })
  if (property.interiorM2 != null && property.interiorM2 > 0) {
    snapshot.push({
      label: 'Area',
      value: formatAreaFromM2(property.interiorM2, areaUnit, intlLocale),
    })
  }
  if (property.plotM2 != null && property.plotM2 > 0) {
    snapshot.push({
      label: 'Plot',
      value: formatAreaFromM2(property.plotM2, areaUnit, intlLocale),
    })
  }
  if (property.propertyType) snapshot.push({ label: 'Property type', value: property.propertyType })
  if (property.neighbourhood) snapshot.push({ label: 'Community', value: property.neighbourhood })
  if (listingType) snapshot.push({ label: 'Listing type', value: listingType })

  const imageUrls = resolveGallery(property)
    .filter((item) => item.type === 'image' && item.src)
    .map((item) => item.src)
    .filter((src, index, all) => all.indexOf(src) === index)
    .slice(0, 7)

  const [logo, images, agentPhoto, mapImage] = await Promise.all([
    toDataUrl(`${window.location.origin}/LOGO%20NO%20ICON.png`),
    Promise.all(imageUrls.map((src) => toDataUrl(src))).then((rows) =>
      rows.filter((row): row is string => Boolean(row)),
    ),
    salesperson?.profile_image_url
      ? toDataUrl(salesperson.profile_image_url)
      : Promise.resolve(null),
    coords
      ? toDataUrl(
          `https://tile.openstreetmap.org/15/${latLngToTile(coords.latitude, coords.longitude, 15).x}/${latLngToTile(coords.latitude, coords.longitude, 15).y}.png`,
        )
      : Promise.resolve(null),
  ])

  const whatsapp = agentWhatsappUrl(salesperson)
  const blob = await pdf(
    <PropertyBrochureDocument
      title={property.title}
      highlight={highlight}
      priceText={priceText}
      listingType={listingType}
      propertyType={property.propertyType ?? ''}
      reference={property.propertyRefId ?? ''}
      snapshot={snapshot}
      descriptionHtml={property.descriptionHtml ?? ''}
      images={images}
      locationText={propertyLocationQuery(property) || property.location || 'Dubai, UAE'}
      mapImage={mapImage}
      logo={logo}
      agent={
        salesperson
          ? {
              name: salesperson.name,
              title: salesperson.title,
              photo: agentPhoto,
              phone: salesperson.phone ?? '',
              whatsapp: whatsapp ?? '',
              email: salesperson.email ?? '',
              agencyName: salesperson.agency_name ?? '',
              brokerLicense: salesperson.broker_license ?? '',
            }
          : null
      }
    />,
  ).toBlob()

  triggerDownload(blob, brochureFileName(property.title))
}
