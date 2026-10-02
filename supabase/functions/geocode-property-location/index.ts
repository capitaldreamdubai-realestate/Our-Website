import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

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

function locationQuery(row: {
  full_address: string | null
  location: string | null
  neighbourhood: string | null
  emirate: string | null
}): string {
  const full = row.full_address?.trim()
  if (full) return full
  const parts = [row.location, row.neighbourhood, row.emirate, 'UAE']
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
  return [...new Set(parts)].join(', ')
}

async function geocode(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', query)
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CapitalDreamWebsite/1.0 (https://capitaldreamdubai.com)',
    },
  })
  if (!response.ok) return null
  const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>
  const first = rows[0]
  if (!first) return null
  const latitude = Number(first.lat)
  const longitude = Number(first.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('APP_SUPABASE_URL')?.trim() || Deno.env.get('SUPABASE_URL')?.trim()
    const serviceRoleKey =
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: 'Missing Supabase service env for function.' }, 500)
    }

    const body = (await req.json()) as { property_id?: string }
    const propertyId = body.property_id?.trim()
    if (!propertyId) return json({ ok: false, error: 'property_id is required.' }, 400)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: property, error } = await admin
      .from('properties')
      .select(
        'id, full_address, location, neighbourhood, emirate, latitude, longitude, location_geocode_query',
      )
      .eq('id', propertyId)
      .maybeSingle()

    if (error) return json({ ok: false, error: error.message }, 500)
    if (!property) return json({ ok: false, error: 'Property not found.' }, 404)

    const query = locationQuery(property)
    if (!query) return json({ ok: false, error: 'This listing has no location.' }, 422)

    if (
      property.location_geocode_query === query &&
      typeof property.latitude === 'number' &&
      typeof property.longitude === 'number'
    ) {
      return json({
        ok: true,
        latitude: property.latitude,
        longitude: property.longitude,
        cached: true,
      })
    }

    const coords = await geocode(query)
    if (!coords) return json({ ok: false, error: 'Location could not be placed on the map.' }, 404)

    const { error: updateError } = await admin
      .from('properties')
      .update({
        latitude: coords.latitude,
        longitude: coords.longitude,
        location_geocode_query: query,
      })
      .eq('id', propertyId)

    if (updateError) return json({ ok: false, error: updateError.message }, 500)

    return json({ ok: true, ...coords, cached: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json({ ok: false, error: message }, 500)
  }
})
