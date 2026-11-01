import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Same key the site reads in `src/lib/exchangeRates.ts`. */
const SETTINGS_KEY = 'fx_rates_from_aed'

/** AED is pegged to USD (1 USD = 3.6725 AED), so USD-based quotes convert exactly. */
const AED_PER_USD = 3.6725

/** Refuse a rate that moved more than this since the last stored value (bad upstream data). */
const MAX_DAILY_MOVE = 0.15

const QUOTED = ['EUR', 'GBP'] as const

type RatesFromAed = Record<string, number>

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isPositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

async function fetchRatesFromAed(): Promise<{ rates: RatesFromAed; date: string }> {
  const url = new URL('https://api.frankfurter.dev/v1/latest')
  url.searchParams.set('base', 'USD')
  url.searchParams.set('symbols', QUOTED.join(','))
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`)
  const body = (await res.json()) as { date?: string; rates?: Record<string, unknown> }

  const rates: RatesFromAed = { AED: 1, USD: 1 / AED_PER_USD }
  for (const c of QUOTED) {
    const perUsd = body.rates?.[c]
    if (!isPositive(perUsd)) throw new Error(`Frankfurter returned no usable ${c} rate`)
    rates[c] = perUsd / AED_PER_USD
  }
  return { rates, date: typeof body.date === 'string' ? body.date : '' }
}

function largeMoves(next: RatesFromAed, prev: RatesFromAed | null): string[] {
  if (!prev) return []
  const out: string[] = []
  for (const c of QUOTED) {
    const before = prev[c]
    if (!isPositive(before)) continue
    const move = Math.abs(next[c] - before) / before
    if (move > MAX_DAILY_MOVE) out.push(`${c} moved ${(move * 100).toFixed(1)}%`)
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('APP_SUPABASE_URL')?.trim() || Deno.env.get('SUPABASE_URL')?.trim()
    const serviceKey =
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, error: 'Missing Supabase service env for function.' }, 500)
    }

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) return json({ ok: false, error: 'Missing bearer token.' }, 401)

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // The daily pg_cron job sends the service role key; the admin "Refresh now" button sends a user session.
    const fromCron = token === serviceKey
    if (!fromCron) {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser(token)
      if (userErr || !user) return json({ ok: false, error: 'Invalid auth token.' }, 401)
    }

    let force = false
    try {
      const body = await req.json()
      force = !fromCron && (body as { force?: boolean } | null)?.force === true
    } catch {
      /* empty body */
    }

    const { rates, date } = await fetchRatesFromAed()

    const { data: existing } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()
    let previous: RatesFromAed | null = null
    if (existing?.value) {
      try {
        previous = (JSON.parse(existing.value) as { rates?: RatesFromAed }).rates ?? null
      } catch {
        previous = null
      }
    }

    const moves = largeMoves(rates, previous)
    if (moves.length > 0 && !force) {
      return json(
        { ok: false, error: `Rates not saved: ${moves.join(', ')} since the last refresh.`, rates },
        422,
      )
    }

    const stored = {
      rates,
      source: 'frankfurter (ECB) via USD peg',
      rateDate: date,
      at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('site_settings')
      .upsert([{ key: SETTINGS_KEY, value: JSON.stringify(stored) }], { onConflict: 'key' })
    if (error) throw new Error(error.message)

    return json({ ok: true, ...stored })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return json({ ok: false, error: message }, 500)
  }
})
