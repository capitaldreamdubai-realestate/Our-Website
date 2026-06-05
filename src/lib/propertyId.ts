/** URL-safe property keys used in `/properties/:id`. */
const PROPERTY_ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/i

const RESERVED_PROPERTY_IDS = new Set([
  'admin',
  'all',
  'all-properties',
  'api',
  'new',
  'properties',
])

export function slugifyPropertyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function isValidPropertyId(id: string): boolean {
  const trimmed = id.trim()
  if (!trimmed || trimmed === '.' || trimmed === '..') return false
  if (!PROPERTY_ID_RE.test(trimmed)) return false
  if (RESERVED_PROPERTY_IDS.has(trimmed.toLowerCase())) return false
  return true
}

export function propertyIdValidationMessage(id: string): string | null {
  const trimmed = id.trim()
  if (!trimmed) return 'Property ID is required.'
  if (trimmed === '.' || trimmed === '..') {
    return 'Property ID cannot be "." — use letters and numbers (e.g. knightsbridge-by-leos).'
  }
  if (trimmed.length < 3) {
    return 'Property ID must be at least 3 characters.'
  }
  if (!PROPERTY_ID_RE.test(trimmed)) {
    return 'Property ID may only contain letters, numbers, and hyphens, and must start with a letter or number.'
  }
  if (RESERVED_PROPERTY_IDS.has(trimmed.toLowerCase())) {
    return 'That property ID is reserved. Choose a different one.'
  }
  return null
}

export function suggestPropertyIdFromTitle(title: string, fallbackId: string): string {
  const fromTitle = slugifyPropertyKey(title)
  if (fromTitle && isValidPropertyId(fromTitle)) return fromTitle
  const fromFallback = slugifyPropertyKey(fallbackId.replace(/^vm-/, ''))
  if (fromFallback && isValidPropertyId(fromFallback)) return fromFallback
  return fallbackId.trim()
}
