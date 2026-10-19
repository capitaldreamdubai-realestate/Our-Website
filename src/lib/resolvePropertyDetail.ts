import type { Property, PropertyGalleryItem } from '../components/PropertyCard'
import { catalogProperties } from '../data/properties'
import { propertyDetailOverlays } from '../data/propertyDetailOverlays'
import { availabilityStatusOf, isAvailableStatus, isCompletedStatus } from './propertyAvailability'

export function resolveGallery(property: Property): PropertyGalleryItem[] {
  if (property.gallery && property.gallery.length > 0) return property.gallery
  return [{ type: 'image', src: property.image }]
}

/** Merges catalog row + optional admin overlay + map defaults. */
export function resolvePropertyDetail(id: string): Property | null {
  const base = catalogProperties.find((p) => p.id === id)
  if (!base) return null
  const overlay = propertyDetailOverlays[id] ?? {}
  return { ...base, ...overlay }
}

export function relatedProperties(
  current: Property,
  limit = 3,
): Property[] {
  return relatedPropertiesInCatalog(catalogProperties, current, limit)
}

export function relatedPropertiesInCatalog(
  catalog: Property[],
  current: Property,
  limit = 3,
): Property[] {
  const others = catalog.filter((p) => p.id !== current.id)
  const preferred = isCompletedStatus(current)
    ? others.filter(isAvailableStatus)
    : others.filter((p) => availabilityStatusOf(p) === availabilityStatusOf(current))
  const pool = preferred.length > 0 ? preferred : others.filter(isAvailableStatus)
  const n = current.neighbourhood?.trim()
  const sameNeighbourhood = n ? pool.filter((p) => p.neighbourhood === n) : []
  const sameIds = new Set(sameNeighbourhood.map((p) => p.id))
  const rest = pool.filter((p) => !sameIds.has(p.id))
  return [...sameNeighbourhood, ...rest].slice(0, limit)
}

