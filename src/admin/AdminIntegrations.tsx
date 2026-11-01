import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCms } from '@/contexts/CmsContext'
import { AdminModal } from './components/AdminModal'
import { AdminPageHeading } from './components/AdminPageHeading'
import { ImageUploadField } from './components/ImageUploadField'
import { adminBtnGhost, adminBtnPrimary } from './adminClassNames'
import { getSupabase } from '@/integrations/supabase/client'
import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SURFACE,
  DEFAULT_CARD_RADIUS,
  INTEGRATION_KEYS,
} from '@/lib/cms/integrationSettingsKeys'
import { parseStoredFxRates, type StoredFxRates } from '@/lib/exchangeRates'
import {
  FLOATING_SOCIAL_PLATFORMS,
  normalizeFloatingSocialLinks,
  type FloatingSocialLink,
  type FloatingSocialPlatform,
} from '@/lib/socialFloatingLinks'

function fieldClass() {
  return 'mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm'
}

function maskUrl(url: string) {
  if (!url) return '—'
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}/…`
  } catch {
    return url.slice(0, 32) + (url.length > 32 ? '…' : '')
  }
}

export function AdminIntegrations() {
  const sb = getSupabase()
  const { refetch } = useCms()
  const supabaseHost = useMemo(
    () => (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '',
    [],
  )

  const [heroUrl, setHeroUrl] = useState('')
  const [youtubeId, setYoutubeId] = useState('')
  const [brandPrimary, setBrandPrimary] = useState(DEFAULT_BRAND_PRIMARY)
  const [brandSurface, setBrandSurface] = useState(DEFAULT_BRAND_SURFACE)
  const [cardRadius, setCardRadius] = useState(DEFAULT_CARD_RADIUS)
  const [glassPanels, setGlassPanels] = useState(false)
  const [floatingSocialLinks, setFloatingSocialLinks] = useState<FloatingSocialLink[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pfSyncBusy, setPfSyncBusy] = useState(false)
  const [pfSyncMsg, setPfSyncMsg] = useState<string | null>(null)
  const [pfSyncErr, setPfSyncErr] = useState<string | null>(null)
  const [pfLastSync, setPfLastSync] = useState<string | null>(null)
  const [pfIncludeDrafts, setPfIncludeDrafts] = useState(false)
  const [fxStored, setFxStored] = useState<StoredFxRates | null>(null)
  const [fxBusy, setFxBusy] = useState(false)
  const [fxMsg, setFxMsg] = useState<string | null>(null)
  const [fxErr, setFxErr] = useState<string | null>(null)
  const [fxNeedsForce, setFxNeedsForce] = useState(false)

  const load = useCallback(async () => {
    if (!sb) return
    const { data } = await sb.from('site_settings').select('key, value')
    const m = new Map((data ?? []).map((r) => [r.key, r.value]))
    setHeroUrl(m.get(INTEGRATION_KEYS.heroBannerUrl) ?? '')
    setYoutubeId(m.get(INTEGRATION_KEYS.fullBleedYoutubeId) ?? '')
    setBrandPrimary(m.get(INTEGRATION_KEYS.brandPrimaryHex) ?? DEFAULT_BRAND_PRIMARY)
    setBrandSurface(m.get(INTEGRATION_KEYS.brandSurfaceHex) ?? DEFAULT_BRAND_SURFACE)
    setCardRadius(m.get(INTEGRATION_KEYS.brandCardRadiusPx) ?? DEFAULT_CARD_RADIUS)
    setGlassPanels((m.get(INTEGRATION_KEYS.adminGlassPanels) ?? '0') === '1')
    setPfLastSync(m.get(INTEGRATION_KEYS.pfLastSyncAt) ?? null)
    setFxStored(parseStoredFxRates(m.get(INTEGRATION_KEYS.fxRatesFromAed)))
    const socialRaw = m.get(INTEGRATION_KEYS.floatingSocialLinks) ?? ''
    if (!socialRaw.trim()) {
      setFloatingSocialLinks([])
      return
    }
    try {
      const parsed = JSON.parse(socialRaw) as unknown
      setFloatingSocialLinks(normalizeFloatingSocialLinks(parsed))
    } catch {
      setFloatingSocialLinks([])
    }
  }, [sb])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!sb) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    const rows = [
      { key: INTEGRATION_KEYS.heroBannerUrl, value: heroUrl.trim() },
      { key: INTEGRATION_KEYS.fullBleedYoutubeId, value: youtubeId.trim() },
      { key: INTEGRATION_KEYS.brandPrimaryHex, value: brandPrimary.trim() },
      { key: INTEGRATION_KEYS.brandSurfaceHex, value: brandSurface.trim() },
      {
        key: INTEGRATION_KEYS.brandCardRadiusPx,
        value: String(Math.min(40, Math.max(8, Number(cardRadius) || 24))),
      },
      { key: INTEGRATION_KEYS.adminGlassPanels, value: glassPanels ? '1' : '0' },
      {
        key: INTEGRATION_KEYS.floatingSocialLinks,
        value: JSON.stringify(
          floatingSocialLinks
            .map((item) => ({ ...item, url: item.url.trim() }))
            .filter((item) => Boolean(item.url)),
        ),
      },
    ]
    const { error } = await sb.from('site_settings').upsert(rows, { onConflict: 'key' })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg('Saved. Reload the admin shell or navigate away and back to apply brand variables.')
    await refetch()
    window.dispatchEvent(new Event('capitaldream-admin-brand-updated'))
  }

  async function runPropertyFinderSync() {
    if (!sb) return
    const { data: refreshed, error: refreshError } = await sb.auth.refreshSession()
    const session = refreshed.session
    if (refreshError || !session) {
      setPfSyncErr('Your admin session expired. Please sign in again, then run sync.')
      return
    }
    setPfSyncBusy(true)
    setPfSyncErr(null)
    setPfSyncMsg(null)
    const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
    if (!baseUrl || !anonKey) {
      setPfSyncBusy(false)
      setPfSyncErr('Supabase env is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    const res = await fetch(`${baseUrl}/functions/v1/sync-property-finder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ includeDrafts: pfIncludeDrafts }),
    })
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string; upserted?: number; unpublished?: number }
      | null
    setPfSyncBusy(false)
    if (!res.ok) {
      if (res.status === 401) {
        setPfSyncErr('Unauthorized (401). Session token was rejected by Supabase Functions. Sign out/in and retry.')
      } else {
        setPfSyncErr(data?.error ?? `Sync request failed (${res.status}).`)
      }
      return
    }
    const body = data
    if (body && body.ok === false) {
      setPfSyncErr(body.error ?? 'Sync failed')
      return
    }
    if (body && typeof body.upserted === 'number') {
      const u = body.unpublished ? `; ${body.unpublished} no longer in feed → unpublished` : ''
      setPfSyncMsg(`Updated ${body.upserted} listings${u}.`)
    } else {
      setPfSyncMsg('Sync finished.')
    }
    await load()
    await refetch()
  }

  async function runExchangeRatesRefresh(force: boolean) {
    if (!sb) return
    const { data: refreshed, error: refreshError } = await sb.auth.refreshSession()
    const session = refreshed.session
    if (refreshError || !session) {
      setFxErr('Your admin session expired. Please sign in again, then refresh rates.')
      return
    }
    const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
    if (!baseUrl || !anonKey) {
      setFxErr('Supabase env is missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }
    setFxBusy(true)
    setFxErr(null)
    setFxMsg(null)
    setFxNeedsForce(false)
    const res = await fetch(`${baseUrl}/functions/v1/refresh-exchange-rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ force }),
    })
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setFxBusy(false)
    if (res.status === 422) {
      setFxErr(data?.error ?? 'Rates moved unusually far since the last refresh.')
      setFxNeedsForce(true)
      return
    }
    if (!res.ok || data?.ok === false) {
      setFxErr(data?.error ?? `Rates refresh failed (${res.status}).`)
      return
    }
    setFxMsg('Rates updated. Visitors pick them up within an hour.')
    await load()
  }

  function addSocialLink() {
    setFloatingSocialLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), platform: 'instagram', url: '' },
    ])
  }

  function updateSocialLink(
    id: string,
    patch: Partial<Pick<FloatingSocialLink, 'platform' | 'url'>>,
  ) {
    setFloatingSocialLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  function removeSocialLink(id: string) {
    setFloatingSocialLinks((prev) => prev.filter((item) => item.id !== id))
  }

  function moveSocialLink(id: string, direction: 'up' | 'down') {
    setFloatingSocialLinks((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      if (index < 0) return prev
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const current = next[index]
      next[index] = next[target]
      next[target] = current
      return next
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <AdminPageHeading title="Integrations" helpAriaLabel="About integrations">
          <p>
            Connect media embeds, global imagery, and the admin <strong>branding engine</strong> (terracotta / cream
            defaults match the public site). Changes to colours and radius apply to this CMS after save; the public site
            still uses its CSS theme unless you wire these tokens into the storefront later.
          </p>
        </AdminPageHeading>
      </div>

      <section className="space-y-4 rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-ink md:text-base">Supabase</h2>
        <p className="text-xs text-ink/60 md:text-sm">
          Client URL (from <code className="rounded bg-ink/5 px-1">VITE_SUPABASE_URL</code>). The
          anon key stays in <code className="rounded bg-ink/5 px-1">.env</code> only — never commit
          it.
        </p>
        <p className="rounded-2xl border border-ink/10 bg-ink/[0.03] px-3 py-2 font-mono text-xs text-ink/80">
          {supabaseHost ? maskUrl(supabaseHost) : 'Not configured'}
        </p>
      </section>

      <section className="space-y-4 rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-ink md:text-base">Property Finder (PF Expert API)</h2>
        <p className="text-xs leading-relaxed text-ink/60 md:text-sm">
          Listings sync runs in a Supabase Edge Function (server-side). Add your PF API Integration credentials
          as function secrets, deploy the function, then run a sync from here. The site never sees your PF
          secret.
        </p>
        <div className="space-y-3 text-xs leading-relaxed text-ink/70 md:text-sm" role="list">
          <div className="flex gap-3" role="listitem">
            <span className="w-6 shrink-0 pt-0.5 text-right font-medium tabular-nums text-ink/45">1.</span>
            <div className="min-w-0 flex-1">
              Apply migration{' '}
              <code className="rounded bg-ink/5 px-1">supabase/migrations/20260408140000_property_finder_integration.sql</code>{' '}
              (or <code className="rounded bg-ink/5 px-1">supabase db push</code>).
            </div>
          </div>
          <div className="flex gap-3" role="listitem">
            <span className="w-6 shrink-0 pt-0.5 text-right font-medium tabular-nums text-ink/45">2.</span>
            <div className="min-w-0 flex-1">
              Dashboard → Project Settings → Edge Functions → Secrets: set{' '}
              <code className="rounded bg-ink/5 px-1">PF_API_KEY</code>,{' '}
              <code className="rounded bg-ink/5 px-1">PF_API_SECRET</code>,{' '}
              <code className="rounded bg-ink/5 px-1">APP_SUPABASE_URL</code>, and{' '}
              <code className="rounded bg-ink/5 px-1">APP_SUPABASE_SERVICE_ROLE_KEY</code>. (Supabase blocks custom
              names starting with <code className="rounded bg-ink/5 px-1">SUPABASE_</code>.) PF key must include scope{' '}
              <code className="rounded bg-ink/5 px-1">listings:read</code>.
            </div>
          </div>
          <div className="flex gap-3" role="listitem">
            <span className="w-6 shrink-0 pt-0.5 text-right font-medium tabular-nums text-ink/45">3.</span>
            <div className="min-w-0 flex-1">
              CLI: <code className="rounded bg-ink/5 px-1">supabase functions deploy sync-property-finder</code>{' '}
              from the project root folder.
            </div>
          </div>
        </div>
        <p className="text-xs text-ink/55">
          Last sync:{' '}
          {pfLastSync ? (
            <time dateTime={pfLastSync} className="font-mono text-ink/75">
              {new Date(pfLastSync).toLocaleString()}
            </time>
          ) : (
            'Never (run a sync below)'
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink/75 md:text-sm">
            <input
              type="checkbox"
              checked={pfIncludeDrafts}
              onChange={(e) => setPfIncludeDrafts(e.target.checked)}
              className="size-4 rounded border-ink/20"
            />
            Include draft listings (second API pass)
          </label>
        </div>
        {pfSyncErr ? <p className="text-sm text-red-600">{pfSyncErr}</p> : null}
        {pfSyncMsg ? <p className="text-sm text-[var(--admin-primary)]">{pfSyncMsg}</p> : null}
        <button
          type="button"
          disabled={pfSyncBusy || !sb}
          onClick={() => void runPropertyFinderSync()}
          className={adminBtnPrimary}
        >
          {pfSyncBusy ? 'Syncing…' : 'Run Property Finder sync'}
        </button>
      </section>

      <section className="space-y-4 rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-ink md:text-base">Exchange rates</h2>
        <p className="text-xs leading-relaxed text-ink/60 md:text-sm">
          Prices are stored in AED. USD, EUR and GBP prices use rates refreshed daily at 10:00 Dubai time by the{' '}
          <code className="rounded bg-ink/5 px-1">refresh-exchange-rates</code> Edge Function (ECB rates via the
          AED–USD peg). If no rates are stored, the site uses built-in fallback rates.
        </p>
        {fxStored ? (
          <div className="space-y-1 text-xs text-ink/55">
            <p>
              Last refresh:{' '}
              {fxStored.at ? (
                <time dateTime={fxStored.at} className="font-mono text-ink/75">
                  {new Date(fxStored.at).toLocaleString()}
                </time>
              ) : (
                '—'
              )}
              {fxStored.rateDate ? ` (ECB rate date ${fxStored.rateDate})` : null}
            </p>
            <p className="font-mono text-ink/75">
              {(['USD', 'EUR', 'GBP'] as const)
                .map((c) => `1 AED = ${fxStored.rates[c]?.toFixed(5) ?? '—'} ${c}`)
                .join(' · ')}
            </p>
          </div>
        ) : (
          <p className="text-xs text-ink/55">Last refresh: Never (site is using fallback rates)</p>
        )}
        {fxErr ? <p className="text-sm text-red-600">{fxErr}</p> : null}
        {fxMsg ? <p className="text-sm text-[var(--admin-primary)]">{fxMsg}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={fxBusy || !sb}
            onClick={() => void runExchangeRatesRefresh(false)}
            className={adminBtnPrimary}
          >
            {fxBusy ? 'Refreshing…' : 'Refresh rates now'}
          </button>
          {fxNeedsForce ? (
            <button
              type="button"
              disabled={fxBusy}
              onClick={() => void runExchangeRatesRefresh(true)}
              className={adminBtnGhost}
            >
              Save these rates anyway
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-5 rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-ink md:text-base">Media &amp; embeds</h2>
        <ImageUploadField
          label="Home hero background image"
          folder="site"
          value={heroUrl}
          onChange={setHeroUrl}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="yt-int" className="text-xs font-medium text-ink/70">
              Full-bleed YouTube video ID
            </label>
            <input
              id="yt-int"
              value={youtubeId}
              onChange={(e) => setYoutubeId(e.target.value)}
              placeholder="11-character ID"
              className={fieldClass()}
            />
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className={`${adminBtnGhost} shrink-0 text-xs md:text-sm`}
          >
            YouTube help
          </button>
        </div>
      </section>

      <section className="space-y-5 rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-ink md:text-base">Admin branding engine</h2>
        <p className="text-xs text-ink/60 md:text-sm">
          Primary and surface colours map to CSS variables on the admin shell. Card radius controls
          large rounded corners in the CMS.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink/70">Primary (accent / buttons)</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={brandPrimary}
                onChange={(e) => setBrandPrimary(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-xl border border-ink/15 bg-white p-1"
                aria-label="Primary colour"
              />
              <input
                value={brandPrimary}
                onChange={(e) => setBrandPrimary(e.target.value)}
                className={`${fieldClass()} min-w-[8rem] flex-1 font-mono text-xs`}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink/70">Shell surface</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={brandSurface}
                onChange={(e) => setBrandSurface(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-xl border border-ink/15 bg-white p-1"
                aria-label="Surface colour"
              />
              <input
                value={brandSurface}
                onChange={(e) => setBrandSurface(e.target.value)}
                className={`${fieldClass()} min-w-[8rem] flex-1 font-mono text-xs`}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="radius" className="text-xs font-medium text-ink/70">
              Card radius (px)
            </label>
            <input
              id="radius"
              type="number"
              min={8}
              max={40}
              value={cardRadius}
              onChange={(e) => setCardRadius(e.target.value)}
              className={fieldClass()}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="glass"
              type="checkbox"
              checked={glassPanels}
              onChange={(e) => setGlassPanels(e.target.checked)}
              className="size-4 rounded border-ink/20"
            />
            <label htmlFor="glass" className="text-xs font-medium text-ink/70">
              Glass-style admin panels (blur + translucent sidebar/header)
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink md:text-base">Floating social bubble</h2>
            <p className="text-xs text-ink/60 md:text-sm">
              Icons appear in a vertical capsule above the WhatsApp chat button.
            </p>
          </div>
          <button type="button" onClick={addSocialLink} className={adminBtnGhost}>
            <Plus className="size-4" aria-hidden />
            Add icon
          </button>
        </div>

        {floatingSocialLinks.length === 0 ? (
          <p className="text-xs text-ink/55 md:text-sm">
            No social icons yet. Add at least one to show the bubble stack.
          </p>
        ) : (
          <div className="space-y-3">
            {floatingSocialLinks.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-3 rounded-2xl border border-ink/10 bg-ink/[0.02] p-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end"
              >
                <div>
                  <label className="text-xs font-medium text-ink/70">Platform</label>
                  <select
                    value={item.platform}
                    onChange={(e) =>
                      updateSocialLink(item.id, {
                        platform: e.target.value as FloatingSocialPlatform,
                      })
                    }
                    className={fieldClass()}
                  >
                    {FLOATING_SOCIAL_PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">URL</label>
                  <input
                    value={item.url}
                    onChange={(e) => updateSocialLink(item.id, { url: e.target.value })}
                    placeholder="https://..."
                    className={fieldClass()}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSocialLink(item.id)}
                  className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50"
                  aria-label={`Delete social icon ${idx + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Delete
                </button>
                <div className="flex items-center gap-2 sm:col-span-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => moveSocialLink(item.id, 'up')}
                    disabled={idx === 0}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-ink/15 px-2.5 text-xs font-medium text-ink/70 hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label={`Move social icon ${idx + 1} up`}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSocialLink(item.id, 'down')}
                    disabled={idx === floatingSocialLinks.length - 1}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-ink/15 px-2.5 text-xs font-medium text-ink/70 hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label={`Move social icon ${idx + 1} down`}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-[var(--admin-primary)]">{msg}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className={adminBtnPrimary}
      >
        {busy ? 'Saving…' : 'Save integrations'}
      </button>

      <AdminModal
        open={helpOpen}
        title="YouTube video ID"
        onClose={() => setHelpOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:ml-auto md:w-auto"
          >
            Close
          </button>
        }
      >
        <p className="text-sm text-ink/75">
          From any YouTube watch URL, copy the <code className="rounded bg-ink/5 px-1">v=</code>{' '}
          parameter or the segment after <code className="rounded bg-ink/5 px-1">youtu.be/</code> (11
          characters).
        </p>
      </AdminModal>
    </div>
  )
}
