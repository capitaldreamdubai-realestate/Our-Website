import type { Property } from '../components/PropertyCard'

function listingTagNorm(p: Property): string {
  return p.tag?.trim().toLowerCase() ?? ''
}

/** Listing tag equals **Offplan** (matches CMS `property_listing_tags`). */
export function isOffplanListing(p: Property): boolean {
  return listingTagNorm(p) === 'offplan'
}

/** Listing tag equals **For rent** (matches CMS `property_listing_tags`). */
export function isForRentListing(p: Property): boolean {
  return listingTagNorm(p) === 'for rent'
}

/** Listing tag equals **For sale**. */
export function isForSaleListing(p: Property): boolean {
  return listingTagNorm(p) === 'for sale'
}
