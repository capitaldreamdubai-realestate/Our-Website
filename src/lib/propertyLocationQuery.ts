export function propertyLocationQuery(property: {
  fullAddress?: string | null
  full_address?: string | null
  location?: string | null
  neighbourhood?: string | null
  emirate?: string | null
}): string {
  const full = (property.fullAddress ?? property.full_address)?.trim()
  if (full) return full
  const parts = [property.location, property.neighbourhood, property.emirate, 'UAE']
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
  return [...new Set(parts)].join(', ')
}
