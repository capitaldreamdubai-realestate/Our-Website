import { getSupabase } from '@/integrations/supabase/client'

export type ListingCoordinates = {
  latitude: number
  longitude: number
}

export async function resolveListingCoordinates(
  propertyId: string,
): Promise<ListingCoordinates | null> {
  const sb = getSupabase()
  if (!sb || !propertyId) return null
  const { data, error } = await sb.functions.invoke('geocode-property-location', {
    body: { property_id: propertyId },
  })
  if (error || !data || typeof data !== 'object') return null
  const payload = data as { ok?: boolean; latitude?: unknown; longitude?: unknown }
  if (
    payload.ok !== true ||
    typeof payload.latitude !== 'number' ||
    typeof payload.longitude !== 'number' ||
    !Number.isFinite(payload.latitude) ||
    !Number.isFinite(payload.longitude)
  ) {
    return null
  }
  return { latitude: payload.latitude, longitude: payload.longitude }
}
