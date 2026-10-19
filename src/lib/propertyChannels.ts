import type { Property } from '../components/PropertyCard'
import { hasListingTag } from './listingTags'
import {
  availabilityStatusOf,
  isAvailableStatus,
  type AvailabilityStatus,
} from './propertyAvailability'

/** Listing has **Offplan** tag (matches CMS `property_listing_tags`). */
export function isOffplanListing(p: Property): boolean {
  return hasListingTag(p, 'Offplan')
}

/** Currently available homes tagged For rent. */
export function isForRentListing(p: Property): boolean {
  return isAvailableStatus(p) && hasListingTag(p, 'For rent')
}

/** Currently available homes tagged For sale. */
export function isForSaleListing(p: Property): boolean {
  return isAvailableStatus(p) && hasListingTag(p, 'For sale')
}

/** Currently available homes tagged Deals. */
export function isDealsListing(p: Property): boolean {
  return isAvailableStatus(p) && hasListingTag(p, 'Deals')
}

export function isSoldListing(p: Property): boolean {
  return availabilityStatusOf(p) === 'sold'
}

export function isRentedListing(p: Property): boolean {
  return availabilityStatusOf(p) === 'rented'
}

/** Default /all-properties pool. Historical statuses are opt-in. */
export function matchesDiscoveryStatus(p: Property, status: string): boolean {
  const current = availabilityStatusOf(p)
  if (status === 'under_offer' || status === 'sold' || status === 'rented') {
    return current === status
  }
  return current === 'available'
}

export function discoveryStatusFromParam(value: string | null): AvailabilityStatus | 'available' {
  if (value === 'under_offer' || value === 'sold' || value === 'rented') return value
  return 'available'
}
