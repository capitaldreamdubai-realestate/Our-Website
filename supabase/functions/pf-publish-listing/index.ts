/**
 * Website → Property Finder publishing (the website CMS is the master copy).
 *
 * Actions (POST body `{ action, ... }`, website admin JWT required):
 *   probe     read-only: token scopes, one sample listing's shape, location search, live listing summary
 *   locations read-only: search Property Finder's location tree `{ query }`
 *   permit    read-only: validate a DLD permit `{ permitNumber, licenseNumber }`
 *   known     read-only: locations and company license used by this account's PF listings
 *   unlinked  read-only: live Property Finder listings not yet linked to a website listing
 *   sync      `{ propertyId }` create/update the draft on PF, or take it down when the listing is off
 *   publish   `{ propertyId }` sync, then publish (public, uses listing credits)
 *   link      `{ propertyId, pfListingId }` attach an existing PF listing instead of creating one
 *
 * Secrets: PF_API_KEY, PF_API_SECRET (shared with sync-property-finder).
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const PF_BASE = 'https://atlas.propertyfinder.com'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/* ------------------------------ Property Finder ------------------------------ */

type PfToken = { token: string; claims: Record<string, unknown> | null; raw: Record<string, unknown> }

async function pfToken(apiKey: string, apiSecret: string): Promise<PfToken> {
  const res = await fetch(`${PF_BASE}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Property Finder sign-in failed (${res.status})`)
  const raw = JSON.parse(text) as Record<string, unknown>
  const token = (raw.accessToken ?? raw.access_token) as string | undefined
  if (!token) throw new Error('Property Finder sign-in returned no token')
  let claims: Record<string, unknown> | null = null
  try {
    const part = token.split('.')[1]
    if (part) claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    /* opaque token */
  }
  return { token, claims, raw }
}

/** GET against Atlas; returns status and parsed body without throwing (probing needs both). */
async function pfGet(token: string, path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${PF_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    /* not JSON */
  }
  return { status: res.status, body }
}

/** Field names and value types of a payload, with short sample values for non-text fields. */
function shapeOf(v: unknown, depth = 0): unknown {
  if (depth > 5) return '…'
  if (Array.isArray(v)) return v.length ? [shapeOf(v[0], depth + 1), `(${v.length} items)`] : []
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      // Free text and contact details are not needed to learn the schema.
      if (/description|phone|email|mobile|whatsapp/i.test(k)) {
        out[k] = typeof val
        continue
      }
      out[k] = shapeOf(val, depth + 1)
    }
    return out
  }
  if (typeof v === 'string') return v.length > 60 ? `string(${v.length})` : v
  return v
}

/** Write call; returns status and body, never throws on an HTTP error (the body is the reason). */
async function pfSend(token: string, method: string, path: string, payload?: unknown) {
  const res = await fetch(`${PF_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    /* not JSON */
  }
  return { status: res.status, body }
}

/** Property Finder's problem+json, kept verbatim (title, detail and any field errors). */
function pfError(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    const parts = [b.title, b.detail].filter((x) => typeof x === 'string') as string[]
    const fields = b.errors ?? b.invalidParams ?? b.violations ?? b.fields
    if (fields) parts.push(JSON.stringify(fields).slice(0, 1500))
    if (typeof b.type === 'string') parts.push(`(${b.type})`)
    if (parts.length) return `${status}: ${parts.join(' · ')}`
  }
  return `${status}: ${String(body).slice(0, 500)}`
}

/* ------------------------------ Listing mapping ------------------------------ */

type PropertyRow = {
  id: string
  title: string
  description_html: string | null
  price_aed: number | null
  beds: number | null
  baths: number | null
  interior_m2: number | null
  plot_m2: number | null
  emirate: string | null
  property_type: string | null
  tags: string[] | null
  tag: string | null
  image_url: string
  gallery: unknown
  published: boolean
  availability_status: string
  salesperson_id: string | null
  pf_listing_id: string | null
  pf_location_id: string | null
  pf_publish_enabled: boolean
  pf_permit_number: string | null
  pf_compliance: Record<string, unknown> | null
  pf_furnishing: string | null
  pf_sync_status: string
}

const ROW_COLUMNS =
  'id, title, description_html, price_aed, beds, baths, interior_m2, plot_m2, emirate, property_type, tags, tag, image_url, gallery, published, availability_status, salesperson_id, pf_listing_id, pf_location_id, pf_publish_enabled, pf_permit_number, pf_compliance, pf_furnishing, pf_sync_status'

const COMMERCIAL = /office|shop|retail|warehouse|showroom|commercial|labour|factory|business centre|whole building|bulk/i

function isRent(row: PropertyRow): boolean {
  const tags = [...(row.tags ?? []), row.tag ?? ''].map((t) => t.toLowerCase())
  return tags.some((t) => t.includes('rent'))
}

function isOffplan(row: PropertyRow): boolean {
  return [...(row.tags ?? []), row.tag ?? ''].some((t) => /off\s*-?plan/i.test(t))
}

function emirateSlug(e: string | null): string | null {
  const s = (e ?? '').toLowerCase()
  if (s.includes('dubai')) return 'dubai'
  if (s.includes('abu')) return 'abu_dhabi'
  if (s) return 'northern_emirates'
  return null
}

function htmlToText(html: string | null): string {
  return (html ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function imageList(row: PropertyRow): string[] {
  const urls = [row.image_url]
  if (Array.isArray(row.gallery)) {
    for (const g of row.gallery as { src?: string }[]) if (g?.src) urls.push(g.src)
  }
  return [...new Set(urls.filter((u) => typeof u === 'string' && u.startsWith('https://')))].slice(0, 50)
}

/** Everything Property Finder rejects outright, checked before calling it. */
function missingFor(row: PropertyRow, agentProfileId: string | null): string[] {
  const m: string[] = []
  if (!row.pf_permit_number?.trim()) m.push('DLD permit number')
  if (!row.pf_compliance?.issuingClientLicenseNumber) m.push('permit check (press Check next to the permit)')
  if (!row.pf_location_id) m.push('Property Finder location')
  if (!agentProfileId) m.push("assigned agent's Property Finder profile (Salespeople → PF public profile id)")
  if (!(Number(row.price_aed) > 0)) m.push('price')
  if (!(Number(row.interior_m2) > 0) && !(Number(row.plot_m2) > 0)) m.push('size')
  if (imageList(row).length < 1) m.push('at least one https image')
  if (htmlToText(row.description_html).length < 30) m.push('description')
  return m
}

/**
 * Atlas listing body. Field names follow the listing read payload (same resource); anything
 * Property Finder still rejects comes back verbatim in pf_publish_error.
 */
function listingBody(row: PropertyRow, agentProfileId: string, create: boolean): Record<string, unknown> {
  const rent = isRent(row)
  const sqft = (m2: number | null) => (Number(m2) > 0 ? Math.round(Number(m2) * 10.7639) : undefined)
  const typeSlug = (row.property_type ?? 'apartment').trim().toLowerCase().replace(/\s+/g, '-')
  const body: Record<string, unknown> = {
    category: COMMERCIAL.test(row.property_type ?? '') ? 'commercial' : 'residential',
    type: typeSlug,
    uaeEmirate: emirateSlug(row.emirate),
    title: { en: row.title.trim().slice(0, 50) },
    description: { en: htmlToText(row.description_html).slice(0, 4000) },
    price: rent
      ? { type: 'yearly', amounts: { yearly: Math.round(Number(row.price_aed)) } }
      : { type: 'sale', amounts: { sale: Math.round(Number(row.price_aed)) } },
    bedrooms: row.beds === 0 ? 'studio' : row.beds != null ? String(row.beds) : undefined,
    bathrooms: row.baths != null ? String(row.baths) : undefined,
    size: sqft(row.interior_m2) ?? sqft(row.plot_m2),
    plotSize: sqft(row.plot_m2),
    location: { id: Number(row.pf_location_id) },
    assignedTo: { id: Number(agentProfileId) },
    media: { images: imageList(row).map((url) => ({ original: { url } })) },
    furnishingType: row.pf_furnishing ?? undefined,
    projectStatus: isOffplan(row) ? 'off_plan' : 'completed',
    compliance: {
      listingAdvertisementNumber: row.pf_permit_number?.trim(),
      issuingClientLicenseNumber: String(row.pf_compliance?.issuingClientLicenseNumber ?? ''),
      type: String(row.pf_compliance?.type ?? 'rera'),
    },
  }
  // Property Finder makes `reference` immutable, so it is only sent once.
  if (create) body.reference = row.id
  return JSON.parse(JSON.stringify(body))
}

function listingIdOf(body: unknown): string | null {
  const b = body as Record<string, unknown> | null
  const id = b?.id ?? (b?.data as Record<string, unknown> | undefined)?.id
  return id != null ? String(id) : null
}

type SyncResult = { ok: boolean; status: string; pfListingId: string | null; error?: string; missing?: string[] }

async function saveState(sb: SupabaseClient, id: string, patch: Record<string, unknown>) {
  await sb.from('properties').update({ ...patch, pf_synced_at: new Date().toISOString() }).eq('id', id)
}

/**
 * Bring Property Finder in line with the website row. Creates or updates a draft; never
 * publishes (that spends credits and is its own action). Off, hidden, withdrawn, sold or
 * rented → taken down on Property Finder.
 */
async function syncRow(sb: SupabaseClient, token: string, row: PropertyRow): Promise<SyncResult> {
  const offPf =
    !row.pf_publish_enabled ||
    !row.published ||
    ['withdrawn', 'sold', 'rented'].includes(row.availability_status)
  if (offPf) {
    if (!row.pf_listing_id || row.pf_sync_status === 'removed' || row.pf_sync_status === 'off') {
      return { ok: true, status: row.pf_sync_status, pfListingId: row.pf_listing_id }
    }
    const r = await pfSend(token, 'POST', `/v1/listings/${row.pf_listing_id}/unpublish`)
    if (r.status >= 400 && r.status !== 404) {
      const error = pfError(r.status, r.body)
      await saveState(sb, row.id, { pf_sync_status: 'error', pf_publish_error: `Take-down failed: ${error}` })
      return { ok: false, status: 'error', pfListingId: row.pf_listing_id, error }
    }
    await saveState(sb, row.id, { pf_sync_status: 'removed', pf_publish_error: null, pf_state_stage: 'unpublished' })
    return { ok: true, status: 'removed', pfListingId: row.pf_listing_id }
  }

  let agentProfileId: string | null = null
  if (row.salesperson_id) {
    const { data } = await sb.from('salespeople').select('pf_public_profile_id').eq('id', row.salesperson_id).maybeSingle()
    agentProfileId = data?.pf_public_profile_id ? String(data.pf_public_profile_id) : null
  }
  const missing = missingFor(row, agentProfileId)
  if (missing.length) {
    const error = `Missing before Property Finder will accept it: ${missing.join(', ')}.`
    await saveState(sb, row.id, { pf_sync_status: 'error', pf_publish_error: error })
    return { ok: false, status: 'error', pfListingId: row.pf_listing_id, error, missing }
  }

  const create = !row.pf_listing_id
  const payload = listingBody(row, agentProfileId!, create)
  let r = create
    ? await pfSend(token, 'POST', '/v1/listings', payload)
    : await pfSend(token, 'PATCH', `/v1/listings/${row.pf_listing_id}`, payload)
  if (!create && r.status === 405) r = await pfSend(token, 'PUT', `/v1/listings/${row.pf_listing_id}`, payload)
  if (r.status >= 400) {
    const error = pfError(r.status, r.body)
    await saveState(sb, row.id, { pf_sync_status: 'error', pf_publish_error: error })
    return { ok: false, status: 'error', pfListingId: row.pf_listing_id, error }
  }
  const pfListingId = row.pf_listing_id ?? listingIdOf(r.body)
  const stage = ((r.body as Record<string, unknown>)?.state as Record<string, unknown> | undefined)?.stage
  const status = row.pf_sync_status === 'live' ? 'live' : 'draft'
  await saveState(sb, row.id, {
    pf_listing_id: pfListingId,
    pf_sync_status: status,
    pf_publish_error: null,
    pf_state_stage: typeof stage === 'string' ? stage : null,
    pf_payload: r.body,
  })
  return { ok: true, status, pfListingId }
}

/* ---------------------------------- Handler ---------------------------------- */

async function requireAdmin(sb: SupabaseClient, jwt: string): Promise<string | null> {
  const { data: { user }, error } = await sb.auth.getUser(jwt)
  if (error || !user?.id) return 'Invalid auth token.'
  const email = (user.email ?? '').trim().toLowerCase()
  const { data: row } = await sb
    .from('admin_users')
    .select('role, is_active')
    .or(`auth_user_id.eq.${user.id}${email ? `,email.eq.${email}` : ''}`)
    .limit(1)
    .maybeSingle()
  if (!row || !row.is_active || !['owner', 'admin'].includes(row.role)) return 'Not allowed.'
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const apiKey = Deno.env.get('PF_API_KEY')?.trim()
    const apiSecret = Deno.env.get('PF_API_SECRET')?.trim()
    const url = Deno.env.get('APP_SUPABASE_URL')?.trim() || Deno.env.get('SUPABASE_URL')?.trim()
    const serviceKey =
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')?.trim() || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!apiKey || !apiSecret) return json({ ok: false, error: 'Missing PF_API_KEY / PF_API_SECRET.' }, 500)
    if (!url || !serviceKey) return json({ ok: false, error: 'Missing Supabase service credentials.' }, 500)

    const auth = req.headers.get('Authorization') ?? ''
    const jwt = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    if (!jwt) return json({ ok: false, error: 'Missing bearer token.' }, 401)
    const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const denied = await requireAdmin(sb, jwt)
    if (denied) return json({ ok: false, error: denied }, denied === 'Not allowed.' ? 403 : 401)

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const action = String(body.action ?? '')
    const pf = await pfToken(apiKey, apiSecret)

    if (action === 'probe') {
      const { token, claims, raw } = pf
      const live = await pfGet(token, '/v1/listings?page=1&perPage=100&draft=false')
      const liveBody = live.body as { results?: Record<string, unknown>[]; pagination?: Record<string, unknown> }
      const results = Array.isArray(liveBody?.results) ? liveBody.results : []
      const locationTries: Record<string, unknown> = {}
      for (const path of ['/v1/locations?search=Dubai%20Marina', '/v1/locations?query=Dubai%20Marina', '/v1/locations?name=Dubai%20Marina']) {
        const r = await pfGet(token, path)
        locationTries[path] = { status: r.status, sample: shapeOf(r.body) }
      }
      return json({
        ok: true,
        token: {
          responseFields: Object.keys(raw).filter((k) => !/token/i.test(k)),
          scope: claims?.scope ?? claims?.scopes ?? claims?.scp ?? raw.scope ?? null,
          claimKeys: claims ? Object.keys(claims) : null,
          expiresIn: raw.expiresIn ?? raw.expires_in ?? null,
        },
        listings: {
          status: live.status,
          pagination: liveBody?.pagination ?? null,
          sampleShape: results[0] ? shapeOf(results[0]) : null,
          summary: results.map((l) => ({
            id: l.id,
            reference: l.reference ?? null,
            title: (l.title as Record<string, string> | undefined)?.en ?? null,
            price: l.price ?? null,
            bedrooms: l.bedrooms ?? null,
            type: l.type ?? null,
            location: (l.location as Record<string, unknown> | undefined)?.name ?? null,
            assignedTo: (l.assignedTo as Record<string, unknown> | undefined)?.id ?? null,
            stage: (l.state as Record<string, unknown> | undefined)?.stage ?? null,
          })),
        },
        locations: locationTries,
      })
    }

    // Read-only: raw query string against the locations endpoint (to learn its parameters).
    if (action === 'locationsRaw') {
      const qs = String(body.qs ?? '').replace(/^\?/, '')
      const r = await pfGet(pf.token, `/v1/locations?${qs}`)
      return json({ ok: r.status < 400, status: r.status, body: shapeOf(r.body) })
    }

    if (action === 'locations') {
      const q = String(body.query ?? '').trim()
      if (q.length < 2) return json({ ok: true, results: [] })
      const r = await pfGet(pf.token, `/v1/locations?search=${encodeURIComponent(q)}`)
      if (r.status >= 400) return json({ ok: false, error: `Location search failed (${r.status})`, detail: r.body }, 502)
      return json({ ok: true, results: r.body })
    }

    if (action === 'permit') {
      const permit = String(body.permitNumber ?? '').trim()
      const license = String(body.licenseNumber ?? '').trim()
      if (!permit || !license) return json({ ok: false, error: 'Permit and license numbers are required.' }, 400)
      const r = await pfGet(pf.token, `/v1/compliances/${encodeURIComponent(permit)}/${encodeURIComponent(license)}`)
      if (r.status >= 400) return json({ ok: false, status: r.status, error: pfError(r.status, r.body) })
      const result = (r.body && typeof r.body === 'object' ? r.body : {}) as Record<string, unknown>
      return json({
        ok: true,
        result: { type: 'rera', ...result, issuingClientLicenseNumber: license, listingAdvertisementNumber: permit },
      })
    }

    const propertyId = String(body.propertyId ?? '').trim()
    if (['sync', 'publish', 'link'].includes(action) && !propertyId) {
      return json({ ok: false, error: 'propertyId is required.' }, 400)
    }
    const loadRow = async () => {
      const { data, error } = await sb.from('properties').select(ROW_COLUMNS).eq('id', propertyId).maybeSingle()
      if (error) throw new Error(error.message)
      return data as PropertyRow | null
    }

    if (action === 'sync') {
      const row = await loadRow()
      if (!row) return json({ ok: false, error: 'Listing not found.' }, 404)
      return json(await syncRow(sb, pf.token, row))
    }

    // Goes public and uses listing credits, so it only runs when an admin presses Publish.
    if (action === 'publish') {
      const row = await loadRow()
      if (!row) return json({ ok: false, error: 'Listing not found.' }, 404)
      if (!row.pf_publish_enabled) return json({ ok: false, error: 'Switch on "List on Property Finder" first.' }, 400)
      const synced = await syncRow(sb, pf.token, row)
      if (!synced.ok || !synced.pfListingId) return json(synced)
      const r = await pfSend(pf.token, 'POST', `/v1/listings/${synced.pfListingId}/publish`)
      if (r.status >= 400) {
        const error = pfError(r.status, r.body)
        await saveState(sb, propertyId, { pf_sync_status: 'error', pf_publish_error: `Publish failed: ${error}` })
        return json({ ok: false, status: 'error', pfListingId: synced.pfListingId, error })
      }
      await saveState(sb, propertyId, { pf_sync_status: 'live', pf_publish_error: null, pf_published_at: new Date().toISOString() })
      return json({ ok: true, status: 'live', pfListingId: synced.pfListingId })
    }

    // Attach a listing that already exists on Property Finder instead of creating a duplicate.
    if (action === 'link') {
      const pfListingId = String(body.pfListingId ?? '').trim()
      if (!pfListingId) return json({ ok: false, error: 'pfListingId is required.' }, 400)
      const { data: taken } = await sb.from('properties').select('id').eq('pf_listing_id', pfListingId).neq('id', propertyId).limit(1)
      if (taken?.length) return json({ ok: false, error: `Already linked to listing ${taken[0].id}.` }, 409)
      const r = await pfGet(pf.token, `/v1/listings/${encodeURIComponent(pfListingId)}`)
      if (r.status >= 400) return json({ ok: false, error: pfError(r.status, r.body) }, 502)
      const l = r.body as Record<string, unknown>
      const stage = String((l.state as Record<string, unknown> | undefined)?.stage ?? '')
      const loc = l.location as Record<string, unknown> | undefined
      await saveState(sb, propertyId, {
        pf_listing_id: pfListingId,
        pf_publish_enabled: true,
        pf_sync_status: stage === 'live' || stage === 'published' ? 'live' : 'draft',
        pf_state_stage: stage || null,
        pf_location_id: loc?.id != null ? String(loc.id) : null,
        pf_location_name: typeof loc?.name === 'string' ? loc.name : loc?.id != null ? `#${loc.id}` : null,
        pf_publish_error: null,
      })
      return json({ ok: true, pfListingId, stage })
    }

    // Property Finder's location search is down (upstream 404), so offer the locations and the
    // company license already used by this account's listings.
    if (action === 'known') {
      const locations = new Map<string, { id: string; label: string; count: number }>()
      const licenses = new Map<string, number>()
      for (let page = 1; page <= 10; page++) {
        const r = await pfGet(pf.token, `/v1/listings?page=${page}&perPage=100&draft=false`)
        const b = r.body as { results?: Record<string, unknown>[]; pagination?: { totalPages?: number } }
        for (const l of b?.results ?? []) {
          const id = (l.location as Record<string, unknown> | undefined)?.id
          if (id != null) {
            const key = String(id)
            const title = (l.title as Record<string, string> | undefined)?.en ?? ''
            const cur = locations.get(key)
            if (cur) cur.count += 1
            else locations.set(key, { id: key, label: `#${key} · e.g. ${title.slice(0, 60)}`, count: 1 })
          }
          const lic = (l.compliance as Record<string, unknown> | undefined)?.issuingClientLicenseNumber
          if (lic) licenses.set(String(lic), (licenses.get(String(lic)) ?? 0) + 1)
        }
        if (page >= (b?.pagination?.totalPages ?? 1)) break
      }
      const license = [...licenses.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      return json({ ok: true, results: [...locations.values()].sort((a, b) => b.count - a.count), license })
    }

    // Unlinked Property Finder listings, for the editor's "link existing" picker.
    if (action === 'unlinked') {
      const { data: linked } = await sb.from('properties').select('pf_listing_id').not('pf_listing_id', 'is', null)
      const taken = new Set((linked ?? []).map((r) => String(r.pf_listing_id)))
      const out: Record<string, unknown>[] = []
      for (let page = 1; page <= 10; page++) {
        const r = await pfGet(pf.token, `/v1/listings?page=${page}&perPage=100&draft=false`)
        const b = r.body as { results?: Record<string, unknown>[]; pagination?: { totalPages?: number } }
        for (const l of b?.results ?? []) {
          if (taken.has(String(l.id))) continue
          out.push({
            id: l.id,
            reference: l.reference ?? null,
            title: (l.title as Record<string, string> | undefined)?.en ?? null,
            price: l.price ?? null,
            bedrooms: l.bedrooms ?? null,
            location: (l.location as Record<string, unknown> | undefined)?.id ?? null,
            stage: (l.state as Record<string, unknown> | undefined)?.stage ?? null,
          })
        }
        if (page >= (b?.pagination?.totalPages ?? 1)) break
      }
      return json({ ok: true, results: out })
    }

    return json({ ok: false, error: `Unknown action "${action}".` }, 400)
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
