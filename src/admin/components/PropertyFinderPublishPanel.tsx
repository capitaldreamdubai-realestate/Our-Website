import { useEffect, useState } from 'react'
import type { Database, Json } from '@/integrations/supabase/database.types'
import { callPfPublish, pfLocationOptions } from '@/lib/pfPublish'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { adminBtnGhost, adminBtnPrimarySm, adminNativeSelect } from '../adminClassNames'

type Row = Database['public']['Tables']['properties']['Row']
type SalesRow = Database['public']['Tables']['salespeople']['Row']

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  off: { label: 'Not on Property Finder', tone: 'bg-ink/5 text-ink/70' },
  draft: { label: 'Draft on Property Finder', tone: 'bg-amber-50 text-amber-900' },
  live: { label: 'Live on Property Finder', tone: 'bg-emerald-50 text-emerald-900' },
  error: { label: 'Needs attention', tone: 'bg-red-50 text-red-900' },
  removed: { label: 'Taken down', tone: 'bg-ink/5 text-ink/70' },
}

/** What Property Finder needs before it accepts a listing, and which editor step fixes each. */
export type PfRequirement = { label: string; ok: boolean; step: 'Basics' | 'Specs' | 'Copy' | 'Property Finder' }

export function pfRequirements(draft: Row, salespeople: SalesRow[]): PfRequirement[] {
  const agent = salespeople.find((s) => s.id === draft.salesperson_id) ?? null
  const compliance = draft.pf_compliance as Record<string, unknown> | null
  return [
    { label: 'DLD permit number', ok: !!draft.pf_permit_number?.trim(), step: 'Property Finder' },
    { label: 'Permit checked with Property Finder', ok: !!compliance?.issuingClientLicenseNumber, step: 'Property Finder' },
    { label: 'Property Finder location', ok: !!draft.pf_location_id, step: 'Property Finder' },
    {
      label: agent
        ? agent.pf_public_profile_id
          ? `Agent on Property Finder (${agent.name})`
          : `${agent.name} has no Property Finder profile`
        : 'Assigned agent',
      ok: !!agent?.pf_public_profile_id,
      step: 'Basics',
    },
    { label: 'Price', ok: Number(draft.price_aed) > 0, step: 'Specs' },
    { label: 'Size', ok: Number(draft.interior_m2) > 0 || Number(draft.plot_m2) > 0, step: 'Specs' },
    { label: 'Description (30+ characters)', ok: (draft.description_html ?? '').replace(/<[^>]+>/g, '').trim().length >= 30, step: 'Copy' },
  ]
}

type Unlinked = { id: string; reference: string | null; title: string | null; location: unknown; bedrooms: unknown; stage?: string | null }

const words = (t: string) => new Set(t.toLowerCase().split(/[^a-z0-9%]+/).filter((w) => w.length > 2))

/** Share of the website title's words found in the Property Finder title (0–1). */
function titleMatch(a: string, b: string): number {
  const wa = words(a)
  if (!wa.size) return 0
  const wb = words(b)
  let hit = 0
  for (const w of wa) if (wb.has(w)) hit += 1
  return hit / wa.size
}

/**
 * Website → Property Finder for one listing. The website stays the master copy: saving the
 * listing updates the Property Finder draft; "Publish" makes it public (uses listing credits).
 */
export function PropertyFinderPublishPanel({
  draft,
  salespeople,
  isNewRecord,
  columnsReady,
  updateDraft,
  onChanged,
  onGoToStep,
}: {
  draft: Row
  salespeople: SalesRow[]
  isNewRecord: boolean
  columnsReady: boolean
  updateDraft: <K extends keyof Row>(key: K, value: Row[K]) => void
  onChanged: () => void
  onGoToStep: (step: PfRequirement['step']) => void
}) {
  const [locQuery, setLocQuery] = useState('')
  const [locResults, setLocResults] = useState<{ id: string; label: string }[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [unlinked, setUnlinked] = useState<Unlinked[] | null>(null)
  const [known, setKnown] = useState<{ id: string; label: string }[]>([])
  const [manualLoc, setManualLoc] = useState('')

  const [license, setLicense] = useState(String((draft.pf_compliance as Record<string, unknown> | null)?.issuingClientLicenseNumber ?? ''))

  // Locations and the company license already used on Property Finder (its location search is down).
  useEffect(() => {
    if (!columnsReady) return
    let cancelled = false
    void callPfPublish('known').then((r) => {
      if (cancelled || !r.ok) return
      setKnown((r.results as { id: string; label: string }[]) ?? [])
      const lic = (r as { license?: string | null }).license
      if (lic) setLicense((cur) => cur || lic)
    })
    return () => {
      cancelled = true
    }
  }, [columnsReady])
  const pendingChanges = draft.pf_sync_status === 'live' && /pending/i.test(draft.pf_state_type ?? '')
  const status = pendingChanges
    ? { label: 'Live · edit publishing on Property Finder', tone: 'bg-amber-50 text-amber-900' }
    : (STATUS_LABEL[draft.pf_sync_status ?? 'off'] ?? STATUS_LABEL.off)

  if (!columnsReady) {
    return (
      <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
        Property Finder publishing isn't set up yet. Apply migration{' '}
        <code>20261102130000_pf_publish_from_website.sql</code> and deploy <code>pf-publish-listing</code>.
      </p>
    )
  }

  const checks = pfRequirements(draft, salespeople)
  const ready = checks.every((c) => c.ok)
  const missing = checks.filter((c) => !c.ok).length

  async function run(action: string, body: Record<string, unknown>, done: (r: Awaited<ReturnType<typeof callPfPublish>>) => void) {
    setBusy(action)
    setMessage(null)
    const r = await callPfPublish(action, body)
    setBusy(null)
    done(r)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.tone}`}>{status.label}</span>
        {draft.pf_listing_id ? <span className="text-xs text-ink/55">PF id {draft.pf_listing_id}</span> : null}
        {draft.pf_synced_at ? (
          <span className="text-xs text-ink/55">· updated {new Date(draft.pf_synced_at).toLocaleString()}</span>
        ) : null}
      </div>
      {draft.pf_publish_error ? (
        <p className="whitespace-pre-wrap break-words rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-900">
          {draft.pf_publish_error}
        </p>
      ) : null}

      <div className="rounded-2xl bg-ink/[0.03] px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/55">Property Finder needs</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ready ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
            {ready ? 'Ready' : `${missing} missing`}
          </span>
        </div>
        <ul className="space-y-1">
          {checks.map((c) => (
            <li key={c.label} className="flex min-h-9 items-center gap-2 text-sm">
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[0.65rem] font-bold ${c.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
                aria-hidden
              >
                {c.ok ? '✓' : '!'}
              </span>
              <span className={`min-w-0 flex-1 ${c.ok ? 'text-ink/70' : 'font-medium text-ink'}`}>{c.label}</span>
              {!c.ok && c.step !== 'Property Finder' ? (
                <button type="button" className="shrink-0 text-xs font-medium text-[var(--admin-accent,#a67d32)] underline-offset-2 hover:underline" onClick={() => onGoToStep(c.step)}>
                  Fix in {c.step}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink/55">
          Saving updates Property Finder; edits to a live listing go live there within seconds. Hiding, withdrawing, or marking it sold or rented takes it down there.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="pf-permit">DLD permit number</FieldLabel>
          <Input
            id="pf-permit"
            value={draft.pf_permit_number ?? ''}
            onChange={(e) => {
              updateDraft('pf_permit_number', e.target.value || null)
              updateDraft('pf_compliance', null)
            }}
            placeholder="Trakheesi / advertising permit"
            className="rounded-2xl"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pf-license">License number (for the permit check)</FieldLabel>
          <div className="flex gap-2">
            <Input id="pf-license" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="ORN or BRN" className="rounded-2xl" />
            <button
              type="button"
              disabled={!draft.pf_permit_number || !license || busy !== null}
              className={`shrink-0 ${adminBtnGhost}`}
              onClick={() =>
                void run('permit', { permitNumber: draft.pf_permit_number, licenseNumber: license }, (r) => {
                  if (r.ok) {
                    updateDraft('pf_compliance', (r.result ?? null) as Json)
                    setMessage({ ok: true, text: 'Permit is valid. Save to keep it.' })
                  } else {
                    setMessage({ ok: false, text: r.error ?? `Permit check failed: ${JSON.stringify(r.result ?? '').slice(0, 300)}` })
                  }
                })
              }
            >
              {busy === 'permit' ? 'Checking…' : 'Check'}
            </button>
          </div>
          {draft.pf_compliance ? <p className="mt-1 text-xs text-emerald-700">Permit checked with Property Finder.</p> : null}
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="pf-loc">Property Finder location</FieldLabel>
          {draft.pf_location_id ? (
            <p className="mb-2 text-xs text-ink/70">
              Selected: <span className="font-medium text-ink">{draft.pf_location_name ?? draft.pf_location_id}</span>
            </p>
          ) : null}
          <div className="flex gap-2">
            <Input
              id="pf-loc"
              value={locQuery}
              onChange={(e) => setLocQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void run('locations', { query: locQuery }, (r) => {
                    if (r.ok) return setLocResults(pfLocationOptions(r.results))
                    const q = locQuery.trim().toLowerCase()
                    setLocResults(known.filter((k) => k.label.toLowerCase().includes(q)))
                    setMessage({ ok: false, text: "Property Finder's location search isn't responding, so these are locations your existing Property Finder listings use. You can also paste a location ID below." })
                  })
                }
              }}
              placeholder="Search a community or building, e.g. Dubai Marina"
              className="rounded-2xl"
            />
            <button
              type="button"
              disabled={locQuery.trim().length < 2 || busy !== null}
              className={`shrink-0 ${adminBtnGhost}`}
              onClick={() =>
                void run('locations', { query: locQuery }, (r) => {
                  if (r.ok) return setLocResults(pfLocationOptions(r.results))
                  const q = locQuery.trim().toLowerCase()
                  setLocResults(known.filter((k) => k.label.toLowerCase().includes(q)))
                  setMessage({ ok: false, text: "Property Finder's location search isn't responding, so these are locations your existing Property Finder listings use. You can also paste a location ID below." })
                })
              }
            >
              {busy === 'locations' ? 'Searching…' : 'Search'}
            </button>
          </div>
          {locResults.length > 0 ? (
            <ul className="mt-2 max-h-52 overflow-y-auto rounded-2xl bg-ink/[0.03] p-1">
              {locResults.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-white"
                    onClick={() => {
                      updateDraft('pf_location_id', l.id)
                      updateDraft('pf_location_name', l.label)
                      setLocResults([])
                    }}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {known.length > 0 ? (
              <select
                className={`w-full min-w-0 sm:w-auto sm:flex-1 ${adminNativeSelect}`}
                value=""
                onChange={(e) => {
                  const k = known.find((x) => x.id === e.target.value)
                  if (k) {
                    updateDraft('pf_location_id', k.id)
                    updateDraft('pf_location_name', k.label)
                  }
                }}
              >
                <option value="">Or pick a location your Property Finder listings use…</option>
                {known.map((k) => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
            ) : null}
            <Input
              value={manualLoc}
              onChange={(e) => setManualLoc(e.target.value.replace(/\D/g, ''))}
              placeholder="Location ID"
              className="w-32 rounded-2xl"
              aria-label="Property Finder location ID"
            />
            <button
              type="button"
              disabled={!manualLoc}
              className={adminBtnGhost}
              onClick={() => {
                updateDraft('pf_location_id', manualLoc)
                updateDraft('pf_location_name', `#${manualLoc}`)
                setManualLoc('')
              }}
            >
              Use ID
            </button>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="pf-furnish">Furnishing</FieldLabel>
          <select
            id="pf-furnish"
            className={adminNativeSelect}
            value={draft.pf_furnishing ?? ''}
            onChange={(e) => updateDraft('pf_furnishing', e.target.value || null)}
          >
            <option value="">Not specified</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-furnished</option>
            <option value="furnished">Furnished</option>
          </select>
        </Field>
      </div>



      {message ? (
        <p className={`whitespace-pre-wrap break-words text-xs ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</p>
      ) : null}

      {isNewRecord ? (
        <p className="text-xs text-ink/55">Save the listing once, then publish it to Property Finder from here.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!draft.pf_listing_id ? (
            <button
              type="button"
              disabled={busy !== null}
              className={adminBtnGhost}
              onClick={() =>
                void run('unlinked', {}, (r) =>
                  r.ok
                    ? setUnlinked(
                        [...((r.results as Unlinked[]) ?? [])].sort(
                          (a, b) => titleMatch(draft.title, b.title ?? '') - titleMatch(draft.title, a.title ?? ''),
                        ),
                      )
                    : setMessage({ ok: false, text: r.error ?? 'Could not load' }),
                )
              }
            >
              {busy === 'unlinked' ? 'Loading…' : 'Already on Property Finder? Link it'}
            </button>
          ) : null}
          <button
            type="button"
            disabled={!ready || !draft.pf_publish_enabled || busy !== null || draft.pf_sync_status === 'live'}
            className={adminBtnPrimarySm}
            onClick={() => {
              if (!window.confirm('Publish this listing on Property Finder? It goes public and uses a listing credit. Save your edits first.')) return
              void run('publish', { propertyId: draft.id }, (r) => {
                setMessage(r.ok ? { ok: true, text: 'Live on Property Finder.' } : { ok: false, text: r.error ?? 'Publish failed' })
                onChanged()
              })
            }}
          >
            {busy === 'publish' ? 'Publishing…' : draft.pf_sync_status === 'live' ? 'Live' : 'Publish on Property Finder'}
          </button>
        </div>
      )}

      {unlinked ? (
        <div className="rounded-2xl bg-ink/[0.03] p-2">
          <p className="px-2 pb-2 text-xs text-ink/60">
            Pick the Property Finder listing that is this property. It gets linked instead of listed twice.
          </p>
          {unlinked.length === 0 ? <p className="px-2 pb-2 text-xs text-ink/55">No unlinked Property Finder listings.</p> : null}
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {unlinked.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={busy !== null}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-white"
                  onClick={() =>
                    void run('link', { propertyId: draft.id, pfListingId: u.id }, (r) => {
                      setMessage(r.ok ? { ok: true, text: 'Linked. Future saves update that Property Finder listing.' } : { ok: false, text: r.error ?? 'Link failed' })
                      if (r.ok) setUnlinked(null)
                      onChanged()
                    })
                  }
                >
                  <span className="font-medium text-ink">
                    {u.title ?? u.id}
                    {titleMatch(draft.title, u.title ?? '') >= 0.6 ? (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] text-emerald-800">Likely match</span>
                    ) : null}
                  </span>
                  <span className="block text-ink/55">
                    {[u.reference, u.stage, u.location != null ? `location #${String(u.location)}` : null, u.bedrooms != null ? `${String(u.bedrooms)} bed` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
