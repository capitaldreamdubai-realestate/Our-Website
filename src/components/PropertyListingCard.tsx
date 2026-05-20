import { Bath, Bed, MapPin, Maximize2, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { formatAreaFromM2 } from '../lib/formatArea'
import { formatPriceFromAed } from '../lib/formatCurrency'
import { ImagePrimaryOverlay } from './ImagePrimaryOverlay'
import { PropertyTagBadges } from './PropertyTagBadges'
import type { Property } from './PropertyCard'

type Props = {
  property: Property
  compact?: boolean
}

export function PropertyListingCard({ property, compact }: Props) {
  const { currency, rates, intlLocale, areaUnit } = useLocalePreferences()
  const price =
    property.priceAed != null
      ? formatPriceFromAed(property.priceAed, currency, rates, intlLocale)
      : property.meta.split('·')[0]?.trim() ?? property.meta
  const location =
    property.location ?? property.meta.split('·')[1]?.trim() ?? ''

  return (
    <Link
      to={`/properties/${property.id}`}
      className="group block rounded-[1.125rem] outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
    >
    <article
      className={`flex flex-col overflow-hidden bg-cream ${compact ? '' : ''}`}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[1.125rem]">
        <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.02]">
          <img
            src={property.image}
            alt={property.alt}
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
          <ImagePrimaryOverlay />
        </div>
        <PropertyTagBadges
          tag={property.tag}
          tags={property.tags}
          className="absolute right-3 top-3 z-[2]"
        />
      </div>
      <div
        className={`flex flex-1 flex-col gap-2 px-1 ${compact ? 'pt-4 sm:pt-5' : 'pt-6 sm:pt-7'}`}
      >
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="type-card-title shrink-0 font-compact font-semibold text-ink">
            {price}
          </p>
          {location ? (
            <p className="flex min-w-0 items-center gap-1 font-normal leading-snug text-ink/80 sm:shrink">
              <MapPin
                className="size-3.5 shrink-0 text-terracotta"
                strokeWidth={2}
                aria-hidden
              />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>
        <p className="type-card-title font-compact text-[0.9rem] leading-snug font-normal uppercase tracking-[0.02em] text-ink sm:text-[1rem]">
          {property.title}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/10 pt-3 text-ink/65">
          {property.interiorM2 != null && property.interiorM2 > 0 ? (
            <span className="flex items-center gap-1.5 text-sm">
              <Maximize2 className="size-4 shrink-0" strokeWidth={1.75} />
              {formatAreaFromM2(property.interiorM2, areaUnit, intlLocale)}
            </span>
          ) : null}
          {property.plotM2 != null && property.plotM2 > 0 ? (
            <span className="flex items-center gap-1.5 text-sm">
              <Square className="size-4 shrink-0" strokeWidth={1.75} />
              {formatAreaFromM2(property.plotM2, areaUnit, intlLocale)}
            </span>
          ) : null}
          {property.beds != null ? (
            <span className="flex items-center gap-1.5 text-sm">
              <Bed className="size-4 shrink-0" strokeWidth={1.75} />
              {property.beds}
            </span>
          ) : null}
          {property.baths != null ? (
            <span className="flex items-center gap-1.5 text-sm">
              <Bath className="size-4 shrink-0" strokeWidth={1.75} />
              {property.baths}
            </span>
          ) : null}
        </div>
      </div>
    </article>
    </Link>
  )
}
