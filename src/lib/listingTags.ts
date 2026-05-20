/** Channel tags drive /for-sale, /for-rent, /offplan. Other tags (New, Exclusive) stack on top. */
export const CHANNEL_LISTING_TAGS = ['For sale', 'For rent', 'Offplan'] as const

const CHANNEL_LOWER = new Set(
  CHANNEL_LISTING_TAGS.map((t) => t.toLowerCase()),
)

export function normalizePropertyTags(
  tags: unknown,
  legacyTag?: string | null,
): string[] {
  if (Array.isArray(tags)) {
    const out = tags
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean)
    if (out.length > 0) return [...new Set(out)]
  }
  if (legacyTag?.trim()) return [legacyTag.trim()]
  return []
}

export function hasListingTag(
  property: { tags?: string[]; tag?: string },
  name: string,
): boolean {
  const norm = name.trim().toLowerCase()
  return normalizePropertyTags(property.tags, property.tag).some(
    (t) => t.toLowerCase() === norm,
  )
}

/** First tag for legacy `tag` column and primary card badge fallback. */
export function primaryListingTag(tags: string[]): string {
  return tags[0] ?? ''
}

export function syncLegacyTagField(tags: string[]): string {
  return primaryListingTag(tags) || 'For sale'
}

/** PF sync: refresh channel tags from API, keep decorative tags (New, Exclusive, …). */
export function mergePfSyncTags(
  existingTags: unknown,
  pfChannelTags: string[],
): string[] {
  const existing = normalizePropertyTags(existingTags)
  const kept = existing.filter((t) => !CHANNEL_LOWER.has(t.toLowerCase()))
  return [...new Set([...pfChannelTags, ...kept])]
}

export function sortTagsByLookupOrder(
  tags: string[],
  lookupNames: string[],
): string[] {
  const order = new Map(lookupNames.map((n, i) => [n.toLowerCase(), i]))
  return [...tags].sort((a, b) => {
    const ai = order.get(a.toLowerCase()) ?? 999
    const bi = order.get(b.toLowerCase()) ?? 999
    if (ai !== bi) return ai - bi
    return a.localeCompare(b)
  })
}
