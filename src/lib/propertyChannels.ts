import type { Property } from '../components/PropertyCard'
import { hasListingTag } from './listingTags'

/** Listing has **Offplan** tag (matches CMS `property_listing_tags`). */
export function isOffplanListing(p: Property): boolean {
  return hasListingTag(p, 'Offplan')
}

/** Listing has **For rent** tag. */
export function isForRentListing(p: Property): boolean {
  return hasListingTag(p, 'For rent')
}

/** Listing has **For sale** tag. */
export function isForSaleListing(p: Property): boolean {
  return hasListingTag(p, 'For sale')
}

/** Listing has **Deals** tag. */
export function isDealsListing(p: Property): boolean {
  return hasListingTag(p, 'Deals')
}
