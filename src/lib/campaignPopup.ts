import type { Database } from '@/integrations/supabase/database.types'

export type CampaignPopup = Database['public']['Tables']['campaign_popups']['Row']

const SESSION_PREFIX = 'cd-campaign-popup-seen:'

export function popupSessionKey(popupId: string) {
  return `${SESSION_PREFIX}${popupId}`
}

export function wasPopupShownThisSession(popupId: string) {
  try {
    return sessionStorage.getItem(popupSessionKey(popupId)) === '1'
  } catch {
    return false
  }
}

export function markPopupShownThisSession(popupId: string) {
  try {
    sessionStorage.setItem(popupSessionKey(popupId), '1')
  } catch {
    /* ignore */
  }
}

/** Empty target_paths = show on all public pages. Paths are prefix matches (e.g. `/` or `/for-sale`). */
export function popupMatchesPath(targetPaths: string[], pathname: string) {
  if (!targetPaths.length) return true
  return targetPaths.some((raw) => {
    const p = raw.trim()
    if (!p) return false
    if (p === '*') return true
    if (p === pathname) return true
    if (p !== '/' && pathname.startsWith(`${p}/`)) return true
    return false
  })
}

export function pickPopupForPage(popups: CampaignPopup[], pathname: string) {
  const eligible = popups
    .filter((p) => p.active && popupMatchesPath(p.target_paths ?? [], pathname))
    .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at))

  for (const popup of eligible) {
    if (popup.show_once_per_session && wasPopupShownThisSession(popup.id)) continue
    return popup
  }
  return null
}
