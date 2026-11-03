import { getSupabase } from '@/integrations/supabase/client'
import type { Json } from '@/integrations/supabase/database.types'
import { readAttribution } from '@/lib/analytics/attribution'
import { LEAD_TIER_VALUE, leadTier } from '@/lib/leadQualification'

function withAttribution(meta: Json | undefined): Json {
  const base =
    meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as Record<string, Json>) : {}
  const attribution = readAttribution()
  return attribution ? { ...base, attribution: attribution as Json } : base
}

function metaString(meta: Json | undefined, key: string): string | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const value = (meta as Record<string, unknown>)[key]
  return typeof value === 'string' && value ? value : null
}

export type WebsiteFormSource =
  | 'property_enquiry'
  | 'campaign_popup'
  | 'project_enquiry'
  | 'project_brochure'
  | 'property_brochure'
  | 'contact'
  | 'newsletter'
  | 'whatsapp_click'
  | 'sold_property_seller_enquiry'
  | 'sold_property_buyer_enquiry'
  | 'rented_property_landlord_enquiry'
  | 'rented_property_tenant_enquiry'

export type WebsiteFormPayload = {
  source: WebsiteFormSource
  name: string
  email?: string | null
  phone?: string | null
  message?: string | null
  meta?: Json
  propertyId?: string | null
  propertyTitle?: string | null
  projectId?: string | null
  projectName?: string | null
  popupId?: string | null
}

/**
 * Public form intake via SECURITY DEFINER RPC.
 * Direct anon INSERT into form_submissions is blocked by RLS in this project;
 * this path is the supported write entrypoint and still fires the CRM sync trigger.
 */
export async function submitWebsiteForm(payload: WebsiteFormPayload) {
  const sb = getSupabase()
  if (!sb) {
    return { data: null as string | null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await sb.rpc('submit_website_form', {
    p_source: payload.source,
    p_name: payload.name,
    p_email: payload.email ?? null,
    p_phone: payload.phone ?? null,
    p_message: payload.message ?? null,
    p_meta: withAttribution(payload.meta),
    p_property_id: payload.propertyId ?? null,
    p_property_title: payload.propertyTitle ?? null,
    p_project_id: payload.projectId ?? null,
    p_project_name: payload.projectName ?? null,
    p_popup_id: payload.popupId ?? null,
  })

  if (!error && typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    // Qualification answers only; never names, emails or phone numbers.
    const budget = metaString(payload.meta, 'investment_budget')
    const tier = leadTier(budget)
    const leadEvent: Record<string, unknown> = {
      event: 'generate_lead',
      form_source: payload.source,
      page_path: window.location.pathname,
      lead_tier: tier,
      lead_value: LEAD_TIER_VALUE[tier],
      lead_budget: budget,
      lead_timeline: metaString(payload.meta, 'invest_timeline'),
      lead_invested_before: metaString(payload.meta, 'invested_uae_before'),
    }
    if (payload.propertyId) leadEvent.property_id = payload.propertyId
    if (payload.projectId) leadEvent.project_id = payload.projectId
    window.dataLayer.push(leadEvent)
  }

  return {
    data: (data as string | null) ?? null,
    error: error ? new Error(error.message) : null,
  }
}
