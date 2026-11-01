import { getSupabase } from '../integrations/supabase/client'
import { INTEGRATION_KEYS } from './cms/integrationSettingsKeys'

/** How much of `currency` one AED buys (e.g. USD: ~0.27 → 1 AED = 0.27 USD). */
export type RatesFromAed = Record<string, number>

/**
 * Used until stored rates load, and whenever they are missing or invalid.
 * Live rates come from `site_settings.fx_rates_from_aed`, refreshed daily by the
 * `refresh-exchange-rates` Edge Function. USD is exact (AED peg); EUR/GBP as of 2026-10-30.
 */
export const FALLBACK_RATES_FROM_AED: RatesFromAed = {
  AED: 1,
  USD: 0.27229,
  EUR: 0.24373,
  GBP: 0.20322,
}

/** Stored JSON in `site_settings` under `fx_rates_from_aed`. */
export type StoredFxRates = {
  rates: RatesFromAed
  source?: string
  rateDate?: string
  at?: string
}

const CACHE_MS = 60 * 60 * 1000
let cached: { rates: RatesFromAed; at: number } | null = null

export function parseStoredFxRates(raw: string | null | undefined): StoredFxRates | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredFxRates>
    if (!parsed.rates || typeof parsed.rates !== 'object') return null
    return parsed as StoredFxRates
  } catch {
    return null
  }
}

/** Keep only positive finite rates; anything missing falls back per currency. */
function mergeWithFallback(rates: RatesFromAed): RatesFromAed {
  const out: RatesFromAed = { ...FALLBACK_RATES_FROM_AED }
  for (const [code, value] of Object.entries(rates)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) out[code] = value
  }
  out.AED = 1
  return out
}

export async function fetchAedRates(): Promise<RatesFromAed> {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_MS) {
    return cached.rates
  }
  const sb = getSupabase()
  if (!sb) return FALLBACK_RATES_FROM_AED

  const { data, error } = await sb
    .from('site_settings')
    .select('value')
    .eq('key', INTEGRATION_KEYS.fxRatesFromAed)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const stored = parseStoredFxRates(data?.value)
  const rates = stored ? mergeWithFallback(stored.rates) : FALLBACK_RATES_FROM_AED
  cached = { rates, at: now }
  return rates
}
