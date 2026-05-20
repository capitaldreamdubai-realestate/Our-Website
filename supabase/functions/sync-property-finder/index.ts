/**
 * Server-side sync: PF Expert Enterprise API → public.properties (listing_source = property_finder).
 *
 * Secrets (Dashboard → Project Settings → Edge Functions):
 *   PF_API_KEY, PF_API_SECRET, APP_SUPABASE_URL, APP_SUPABASE_SERVICE_ROLE_KEY
 * Runtime also injects SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in many setups.
 *
 * Invoke (authenticated admin JWT): supabase.functions.invoke('sync-property-finder', { body: { includeDrafts?: boolean } })
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const PF_BASE = 'https://atlas.propertyfinder.com'
const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=800&q=85'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PfPagination = { totalPages?: number; page?: number }
type PfListResponse = { results?: Record<string, unknown>[]; pagination?: PfPagination }

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function pfToken(apiKey: string, apiSecret: string): Promise<string> {
  const res = await fetch(`${PF_BASE}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`PF token ${res.status}: ${text}`)
  const j = JSON.parse(text) as { accessToken?: string }
  if (!j.accessToken) throw new Error('PF token: missing accessToken')
  return j.accessToken
}

async function pfListingsPage(
  accessToken: string,
  page: number,
  draft: boolean,
): Promise<PfListResponse> {
  const url = new URL(`${PF_BASE}/v1/listings`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('perPage', '100')
  url.searchParams.set('draft', draft ? 'true' : 'false')

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (res.status === 429) {
      await sleep(800 * (attempt + 1) + Math.random() * 400)
      continue
    }
    const text = await res.text()
    if (!res.ok) throw new Error(`PF listings page ${page} (${draft ? 'draft' : 'live'}) ${res.status}: ${text}`)
    return JSON.parse(text) as PfListResponse
  }
  throw new Error('PF listings: rate limited after retries')
}

async function pfAllListings(accessToken: string, draft: boolean): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  let page = 1
  let totalPages = 1
  do {
    const batch = await pfListingsPage(accessToken, page, draft)
    const results = Array.isArray(batch.results) ? batch.results : []
    out.push(...results)
    totalPages = Math.max(1, batch.pagination?.totalPages ?? 1)
    page += 1
  } while (page <= totalPages)
  return out
}

function slugify(s: string): string {
  const x = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return x || 'listing'
}

function emirateLabel(u?: string): string | null {
  if (!u) return null
  const m: Record<string, string> = {
    dubai: 'Dubai',
    abu_dhabi: 'Abu Dhabi',
    northern_emirates: 'Northern Emirates',
  }
  return m[u] ?? u
}

function parseBeds(b: unknown): number | null {
  if (b === 'studio' || b === 'none') return 0
  if (typeof b === 'number' && Number.isFinite(b)) return Math.max(0, Math.floor(b))
  if (typeof b === 'string') {
    const lower = b.trim().toLowerCase()
    if (lower === 'studio' || lower === 'none') return 0
    const n = parseInt(b, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function parseBaths(b: unknown): number | null {
  if (b === 'none' || b == null) return null
  if (typeof b === 'number' && Number.isFinite(b)) return Math.max(0, Math.floor(b))
  if (typeof b === 'string') {
    const lower = b.trim().toLowerCase()
    if (lower === 'none') return null
    const n = parseInt(b, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asText(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return null
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const nested = parseNumeric(obj.value)
    if (nested != null) return nested
    const nestedAmount = parseNumeric(obj.amount)
    if (nestedAmount != null) return nestedAmount
  }
  return null
}

function extractAed(price: unknown): number | null {
  if (!price || typeof price !== 'object') return null
  const p = price as Record<string, unknown>

  const fromAmounts = (): number | null => {
    const amounts = p.amounts
    if (!amounts || typeof amounts !== 'object' || amounts === null) return null
    const a = amounts as Record<string, unknown>
    const type = typeof p.type === 'string' ? p.type : null
    if (type) {
      const typedAmount = parseNumeric(a[type])
      if (typedAmount != null) return typedAmount
    }
    for (const k of ['sale', 'yearly', 'monthly', 'weekly', 'daily']) {
      const typedFallback = parseNumeric(a[k])
      if (typedFallback != null) return typedFallback
    }
    for (const k of Object.keys(a)) {
      const v = parseNumeric(a[k])
      if (v != null) return v
    }
    for (const k of ['AED', 'aed', 'Aed']) {
      const n = parseNumeric(a[k])
      if (n != null) return n
    }
    const amountCurrency = parseNumeric(a.currency)
    if (amountCurrency != null) return amountCurrency
    return null
  }

  const direct =
    fromAmounts() ??
    parseNumeric(p.value) ??
    parseNumeric(p.amount) ??
    parseNumeric(p.publishPrice) ??
    parseNumeric(p.askingPrice)

  if (direct != null) return direct
  if (p.onRequest === true) return null
  return null
}

function isPublishedStage(stage: string): boolean {
  // PF can return multiple non-draft states depending on moderation/lifecycle.
  // Treat explicit inactive states as unpublished; everything else is visible.
  const inactive = new Set(['', 'draft', 'unpublished', 'takendown', 'archived', 'rejected', 'failed'])
  return !inactive.has(stage)
}

function imageUrls(listing: Record<string, unknown>): string[] {
  const media = listing.media as Record<string, unknown> | undefined
  const images = media?.images
  if (!Array.isArray(images)) return []
  const urls: string[] = []
  for (const im of images) {
    if (!im || typeof im !== 'object') continue
    const orig = (im as { original?: { url?: string } }).original
    const url = orig?.url
    if (typeof url === 'string' && url.startsWith('https://')) urls.push(url)
  }
  return urls
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMeta(priceAed: number | null, emirate: string | null, ref: string | null): string {
  const parts: string[] = []
  if (priceAed != null) parts.push(`AED ${priceAed.toLocaleString('en-AE')}`)
  else parts.push('Price on request')
  const loc = [emirate, ref].filter(Boolean).join(' · ')
  if (loc) parts.push(loc)
  return parts.join(' · ')
}

function propertyTypeLabel(type: unknown): string | null {
  if (typeof type !== 'string') return null
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function listingTagsFromPf(offering: string, projectStatus: string | null): string[] {
  const tags: string[] = []
  const isRent =
    offering === 'rent' || offering === 'monthly' || offering === 'yearly'
  tags.push(isRent ? 'For rent' : 'For sale')
  const status = (projectStatus ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (
    status.includes('off plan') ||
    status.includes('offplan') ||
    status.includes('under construction') ||
    status.includes('launch')
  ) {
    tags.push('Offplan')
  }
  return tags
}

const CHANNEL_TAGS_LOWER = new Set(['for sale', 'for rent', 'offplan'])

function mergePfSyncTags(
  existingTags: string[] | null | undefined,
  pfChannelTags: string[],
): string[] {
  const existing = Array.isArray(existingTags)
    ? existingTags.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
    : []
  const kept = existing.filter((t) => !CHANNEL_TAGS_LOWER.has(t.trim().toLowerCase()))
  return [...new Set([...pfChannelTags, ...kept])]
}

function primaryTagFromTags(tags: string[]): string {
  return tags[0] ?? 'For sale'
}

type Preserve = {
  home_section: string
  sort_order_home: number
  salesperson_id: string | null
  developer_id: string | null
  exclusive_with_us: boolean
  tags: string[] | null
  /** May be null for legacy rows; sync always sends a non-null `created_at` on upsert. */
  created_at: string | null
}

type AgentMaps = {
  byPfPublicProfileId: Map<string, string>
  byPfUserId: Map<string, string>
}

function mapListingToRow(
  listing: Record<string, unknown>,
  preserve: Preserve | undefined,
  agentMaps: AgentMaps,
): Record<string, unknown> {
  const pfId = String(listing.id ?? '')
  if (!pfId) throw new Error('Listing missing id')

  const titleObj = listing.title as Record<string, string> | undefined
  const title = titleObj?.en || titleObj?.ar || `Listing ${pfId}`

  const descObj = listing.description as Record<string, string> | undefined
  const descPlain = descObj?.en || descObj?.ar || ''
  const description_html = descPlain
    ? `<p>${escapeHtml(descPlain).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
    : null

  const priceObj = listing.price as Record<string, unknown> | undefined
  const priceAed = extractAed(priceObj)
  const pfPriceOnRequest = priceObj?.onRequest === true
  const offering = (priceObj?.type as string) || ''

  const urls = imageUrls(listing)
  const image_url = urls[0] ?? PLACEHOLDER_IMAGE
  const gallery = urls.slice(0, 24).map((src) => ({ type: 'image', src }))

  const state = listing.state as Record<string, unknown> | undefined
  const stage = typeof state?.stage === 'string' ? state.stage : ''
  const published = isPublishedStage(stage)
  const stateType = asText(state?.type)

  const ref = typeof listing.reference === 'string' ? listing.reference : null
  const emirate = emirateLabel(listing.uaeEmirate as string | undefined)
  const category = asText(listing.category)
  const projectStatus = asText(listing.projectStatus)
  const pfChannelTags = listingTagsFromPf(offering, projectStatus)
  const tags = mergePfSyncTags(preserve?.tags, pfChannelTags)
  const tag = primaryTagFromTags(tags)
  const verificationStatus = asText(listing.verificationStatus)
  const quality = listing.qualityScore as Record<string, unknown> | undefined
  const qualityValue = parseNumeric(quality?.value)

  const assignedTo = listing.assignedTo as Record<string, unknown> | undefined
  const assignedToId = asText(assignedTo?.id)
  const assignedToName = asText(assignedTo?.name)
  const createdBy = listing.createdBy as Record<string, unknown> | undefined
  const createdById = asText(createdBy?.id)

  const locationObj = listing.location as Record<string, unknown> | undefined
  const locationId = asText(locationObj?.id)
  const locationName =
    asText(locationObj?.name) ||
    asText((locationObj?.name as Record<string, unknown> | undefined)?.en) ||
    asText((locationObj?.name as Record<string, unknown> | undefined)?.ar)
  const coordinates = locationObj?.coordinates as Record<string, unknown> | undefined
  const lat = parseNumeric(coordinates?.lat)
  const lng = parseNumeric(coordinates?.lng)

  const publishedAt = asText(listing.publishedAt)

  const linkedSalespersonId =
    (assignedToId ? agentMaps.byPfPublicProfileId.get(assignedToId) : null) ||
    (createdById ? agentMaps.byPfUserId.get(createdById) : null) ||
    preserve?.salesperson_id ||
    null

  /** PF uses `builtUpArea` for some types; `size` (sqft) is required on create for AE listings. */
  const sqftInterior = (() => {
    const bu = listing.builtUpArea
    if (typeof bu === 'number' && bu > 0) return bu
    const sz = listing.size
    if (typeof sz === 'number' && sz > 0) return sz
    return null
  })()
  let interior_m2: number | null = null
  if (sqftInterior != null) {
    interior_m2 = Math.round(sqftInterior * 0.09290304 * 100) / 100
  }

  const plotSize = listing.plotSize
  let plot_m2: number | null = null
  if (typeof plotSize === 'number' && plotSize > 0) {
    plot_m2 = Math.round(plotSize * 0.09290304 * 100) / 100
  }

  const bd = parseBeds(listing.bedrooms)
  const bt = parseBaths(listing.bathrooms)
  const detailParts: string[] = []
  if (bd !== null) detailParts.push(bd === 0 ? 'Studio' : `${bd} bed`)
  if (bt !== null) detailParts.push(`${bt} bath`)
  if (interior_m2 != null && interior_m2 > 0) {
    detailParts.push(`${interior_m2.toLocaleString('en-AE')} m²`)
  }
  const detail = detailParts.length ? detailParts.join(' · ') : null

  const age = listing.age
  const year_built =
    typeof age === 'number' && age > 0 ? new Date().getFullYear() - Math.floor(age) : null

  const row: Record<string, unknown> = {
    id: `pf-${pfId}`,
    slug: `${slugify(title)}-${pfId.slice(-6)}`,
    title,
    tag,
    tags,
    meta: formatMeta(priceAed, locationName ?? emirate, ref),
    detail,
    alt: title,
    image_url,
    price_aed: priceAed,
    beds: bd,
    baths: bt,
    location: locationName ?? emirate,
    neighbourhood: locationName,
    emirate,
    interior_m2,
    plot_m2,
    latitude: lat,
    longitude: lng,
    full_address: null,
    description_html,
    property_ref_id: ref,
    year_built,
    gallery,
    listing_source: 'property_finder',
    pf_listing_id: pfId,
    pf_payload: listing,
    pf_state_stage: stage || null,
    pf_state_type: stateType,
    pf_category: category,
    pf_offering_type: offering || null,
    pf_project_status: projectStatus,
    pf_verification_status: verificationStatus,
    pf_quality_score: qualityValue,
    pf_assigned_to_id: assignedToId,
    pf_assigned_to_name: assignedToName,
    pf_created_by_id: createdById,
    pf_location_id: locationId,
    pf_location_name: locationName,
    pf_latitude: lat,
    pf_longitude: lng,
    pf_price_type: asText(priceObj?.type),
    pf_price_on_request: pfPriceOnRequest,
    pf_price_raw: (priceObj ?? null) as unknown,
    pf_currency: priceAed != null ? 'AED' : null,
    pf_published_at: publishedAt,
    published,
    property_type: propertyTypeLabel(listing.type),
    exclusive_with_us: preserve?.exclusive_with_us ?? false,
    home_section: preserve?.home_section ?? 'none',
    sort_order_home: preserve?.sort_order_home ?? 9999,
    salesperson_id: linkedSalespersonId,
    developer_id: preserve?.developer_id ?? null,
    updated_at: new Date().toISOString(),
    created_at: preserve?.created_at ?? new Date().toISOString(),
  }

  return row
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('PF_API_KEY')?.trim()
    const apiSecret = Deno.env.get('PF_API_SECRET')?.trim()
    const supabaseUrl =
      Deno.env.get('APP_SUPABASE_URL')?.trim() || Deno.env.get('SUPABASE_URL')?.trim()
    const serviceKey =
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()

    if (!apiKey || !apiSecret) {
      return json({ error: 'Missing PF_API_KEY or PF_API_SECRET on the function' }, 500)
    }
    if (!supabaseUrl || !serviceKey) {
      return json(
        {
          error:
            'Missing APP_SUPABASE_URL / APP_SUPABASE_SERVICE_ROLE_KEY (or runtime-injected Supabase envs).',
        },
        500,
      )
    }

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
      return json({ ok: false, error: 'Missing bearer token.' }, 401)
    }
    const jwt = authHeader.slice(7).trim()
    if (!jwt) {
      return json({ ok: false, error: 'Missing bearer token.' }, 401)
    }

    let includeDrafts = false
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body && typeof body === 'object' && (body as { includeDrafts?: boolean }).includeDrafts === true) {
          includeDrafts = true
        }
      } catch {
        /* empty body */
      }
    }

    const accessToken = await pfToken(apiKey, apiSecret)

    // Prefer live (`draft=false`) rows; optional second pass only adds listing ids not returned live.
    const byId = new Map<string, Record<string, unknown>>()
    for (const L of await pfAllListings(accessToken, false)) {
      const id = String((L as { id?: string }).id ?? '')
      if (id) byId.set(id, L as Record<string, unknown>)
    }
    if (includeDrafts) {
      for (const L of await pfAllListings(accessToken, true)) {
        const id = String((L as { id?: string }).id ?? '')
        if (id && !byId.has(id)) byId.set(id, L as Record<string, unknown>)
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt)
    if (userErr || !user) {
      return json({ ok: false, error: 'Invalid auth token.' }, 401)
    }

    const { data: existingRows, error: exErr } = await supabase
      .from('properties')
      .select(
        'pf_listing_id, home_section, sort_order_home, salesperson_id, developer_id, exclusive_with_us, tags, created_at',
      )
      .eq('listing_source', 'property_finder')

    if (exErr) throw new Error(exErr.message)

    const preserveMap = new Map<string, Preserve>()
    for (const r of existingRows ?? []) {
      if (!r.pf_listing_id) continue
      preserveMap.set(r.pf_listing_id, {
        home_section: r.home_section,
        sort_order_home: r.sort_order_home,
        salesperson_id: r.salesperson_id,
        developer_id: r.developer_id,
        exclusive_with_us: r.exclusive_with_us,
        tags: Array.isArray(r.tags) ? r.tags : null,
        created_at: r.created_at,
      })
    }

    const { data: salesRows, error: salesErr } = await supabase
      .from('salespeople')
      .select('id, pf_public_profile_id, pf_user_id')
    if (salesErr) throw new Error(salesErr.message)

    const agentMaps: AgentMaps = {
      byPfPublicProfileId: new Map<string, string>(),
      byPfUserId: new Map<string, string>(),
    }
    for (const s of salesRows ?? []) {
      if (s.pf_public_profile_id) {
        agentMaps.byPfPublicProfileId.set(String(s.pf_public_profile_id), s.id)
      }
      if (s.pf_user_id) {
        agentMaps.byPfUserId.set(String(s.pf_user_id), s.id)
      }
    }

    const syncedPfIds = new Set<string>()
    const rows: Record<string, unknown>[] = []

    for (const [pfId, listing] of byId) {
      syncedPfIds.add(pfId)
      const preserve = preserveMap.get(pfId)
      rows.push(mapListingToRow(listing, preserve, agentMaps))
    }

    const chunkSize = 40
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { error } = await supabase.from('properties').upsert(chunk, { onConflict: 'id' })
      if (error) throw new Error(error.message)
    }

    const { data: allPfRows } = await supabase
      .from('properties')
      .select('id, pf_listing_id')
      .eq('listing_source', 'property_finder')

    let unpublished = 0
    for (const r of allPfRows ?? []) {
      if (r.pf_listing_id && !syncedPfIds.has(r.pf_listing_id)) {
        const { error } = await supabase.from('properties').update({ published: false }).eq('id', r.id)
        if (!error) unpublished += 1
      }
    }

    const summary = {
      upserted: rows.length,
      unpublished,
      includeDrafts,
      at: new Date().toISOString(),
    }

    await supabase.from('site_settings').upsert(
      [
        { key: 'pf_last_sync_at', value: summary.at },
        { key: 'pf_last_sync_summary', value: JSON.stringify(summary) },
      ],
      { onConflict: 'key' },
    )

    return json({ ok: true, ...summary })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return json({ ok: false, error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
