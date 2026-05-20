import { ImagePrimaryOverlay } from './ImagePrimaryOverlay'
import { PropertyTagBadges } from './PropertyTagBadges'
import { Link } from 'react-router-dom'

/** Gallery item for property detail hero (images and optional video URLs from admin uploads). */
export type PropertyGalleryItem = {
  type: 'image' | 'video'
  src: string
  poster?: string
}

export type Property = {
  id: string
  image: string
  /** Primary badge label (legacy); use `tags` when multiple apply. */
  tag: string
  /** All listing tags, e.g. New + Offplan + For sale. */
  tags?: string[]
  title: string
  meta: string
  detail?: string
  alt: string
  /** Listing page filters & rich card (AED). */
  priceAed?: number
  beds?: number
  baths?: number
  location?: string
  /** Area / community name for filters (e.g. Palm Jumeirah). */
  neighbourhood?: string
  emirate?: string
  /** Listing is exclusive with the agency. */
  exclusiveWithUs?: boolean
  interiorM2?: number
  plotM2?: number
  /** Public URL slug when different from `id` (optional). */
  slug?: string
  /** Ordered media for detail hero; falls back to `image` when empty. */
  gallery?: PropertyGalleryItem[]
  latitude?: number
  longitude?: number
  /** Full address line for map popups / SEO. */
  fullAddress?: string
  /** Rich description HTML from CMS / admin editor. */
  descriptionHtml?: string
  /** Display reference e.g. DV1035. */
  propertyRefId?: string
  yearBuilt?: number
  /** Assigned sales consultant (CMS). */
  salespersonId?: string
  /** e.g. Villa, Apartment, Penthouse. */
  propertyType?: string
  /** FK to property_developers. */
  developerId?: string
}

type Props = {
  property: Property
}

export function PropertyCard({ property }: Props) {
  return (
    <Link
      to={`/properties/${property.id}`}
      className="group block rounded-[1.125rem] outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
    >
      <article className="flex flex-col overflow-hidden bg-cream">
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
        <div className="flex flex-1 flex-col gap-1.5 px-1 pt-6 sm:pt-7">
          <p className="type-card-title font-compact font-normal uppercase tracking-[0.02em] text-ink">
            {property.title}
          </p>
          <p className="font-normal leading-snug text-ink/72">
            {property.meta}
          </p>
          {property.detail ? (
            <p className="type-card-detail font-compact font-medium uppercase tracking-[0.14em] text-ink/45">
              {property.detail}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  )
}
