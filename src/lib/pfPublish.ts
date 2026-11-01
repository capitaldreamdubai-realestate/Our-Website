import { getSupabase } from '@/integrations/supabase/client'

/** Result shape shared by the pf-publish-listing actions. */
export type PfPublishResult = {
  ok: boolean
  error?: string
  status?: string
  pfListingId?: string | null
  missing?: string[]
  results?: unknown
  result?: unknown
}

/** Calls the `pf-publish-listing` Edge Function with the signed-in admin's session. */
export async function callPfPublish(action: string, body: Record<string, unknown> = {}): Promise<PfPublishResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Supabase is not configured.' }
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return { ok: false, error: 'Your admin session expired. Sign in again.' }
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
  try {
    const res = await fetch(`${baseUrl}/functions/v1/pf-publish-listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: anonKey },
      body: JSON.stringify({ action, ...body }),
    })
    const data = (await res.json().catch(() => null)) as PfPublishResult | null
    if (res.status === 404 && !data) return { ok: false, error: 'pf-publish-listing is not deployed yet.' }
    return data ?? { ok: false, error: `Request failed (${res.status}).` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Property Finder location search results vary in shape; flatten to id + label. */
export function pfLocationOptions(raw: unknown): { id: string; label: string }[] {
  const list = Array.isArray(raw)
    ? raw
    : ((raw as Record<string, unknown> | null)?.data ??
        (raw as Record<string, unknown> | null)?.results ??
        []) as unknown[]
  if (!Array.isArray(list)) return []
  return list
    .map((l) => {
      const o = l as Record<string, unknown>
      const name = o.name as unknown
      const nameText =
        typeof name === 'string' ? name : ((name as Record<string, string> | undefined)?.en ?? '')
      const path = o.path ?? o.tree ?? o.fullName ?? o.fullPath
      const pathText = Array.isArray(path)
        ? path
            .map((p) =>
              typeof p === 'string' ? p : ((p as Record<string, unknown>)?.name as string | undefined) ?? '',
            )
            .filter(Boolean)
            .join(' › ')
        : typeof path === 'string'
          ? path
          : ''
      return { id: o.id != null ? String(o.id) : '', label: pathText || nameText }
    })
    .filter((o) => o.id && o.label)
}
