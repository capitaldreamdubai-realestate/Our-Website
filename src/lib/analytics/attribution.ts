/**
 * Ad-click attribution saved with each lead, so qualified leads and sales can be
 * uploaded back to Google Ads (gclid/gbraid/wbraid) and Meta (fbclid) later.
 *
 * Kept in sessionStorage only: it lasts for the visit and is never sent anywhere
 * except with a form the visitor submits.
 */

const STORAGE_KEY = 'cd_attribution'

const PARAMS = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const

export type Attribution = Partial<Record<(typeof PARAMS)[number], string>> & {
  landing_page?: string
  captured_at?: string
}

/** Call once on page load. A new ad click in the same visit replaces the earlier one. */
export function captureAttribution() {
  try {
    const query = new URLSearchParams(window.location.search)
    const found: Attribution = {}
    for (const key of PARAMS) {
      const value = query.get(key)
      if (value) found[key] = value.slice(0, 500)
    }
    if (Object.keys(found).length === 0) return
    found.landing_page = window.location.pathname
    found.captured_at = new Date().toISOString()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found))
  } catch {
    /* storage blocked: leads are still submitted without attribution */
  }
}

export function readAttribution(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Attribution) : null
  } catch {
    return null
  }
}
