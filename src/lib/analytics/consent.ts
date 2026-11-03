/**
 * Cookie consent for Google Consent Mode v2 and the GTM tags that respect it
 * (GA4, Google Ads, Clarity, Meta pixel).
 *
 * The defaults are set in index.html before GTM loads: denied for the EEA, UK and
 * Switzerland, granted elsewhere. This module stores the visitor's choice and
 * pushes the matching consent update.
 */

export type ConsentChoice = 'granted' | 'denied'

const STORAGE_KEY = 'cd_consent'

/** Fired on window to reopen the banner (footer "Cookie settings" link). */
export const OPEN_CONSENT_EVENT = 'cd:open-consent'

/** Time zones whose visitors are asked for consent; mirrors the region list in index.html. */
const EXTRA_CONSENT_TIME_ZONES = new Set([
  'Atlantic/Azores',
  'Atlantic/Canary',
  'Atlantic/Faroe',
  'Atlantic/Madeira',
  'Atlantic/Reykjavik',
])

type GtagConsentArgs = ['consent', 'update', Record<string, ConsentChoice>]

declare global {
  interface Window {
    gtag?: (...args: GtagConsentArgs) => void
  }
}

export function readConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function needsConsentPrompt(): boolean {
  if (readConsent()) return false
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    return zone.startsWith('Europe/') || EXTRA_CONSENT_TIME_ZONES.has(zone)
  } catch {
    return false
  }
}

export function saveConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    /* private mode: the choice still applies to this page view */
  }

  const update = {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  }
  // gtag() is defined by the consent snippet in index.html.
  window.gtag?.('consent', 'update', update)
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: 'consent_update', consent_choice: choice })
}
