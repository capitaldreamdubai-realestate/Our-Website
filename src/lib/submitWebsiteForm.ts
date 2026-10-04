import { getSupabase } from '@/integrations/supabase/client'

export type WebsiteFormSource =
  | 'property_enquiry'
  | 'campaign_popup'
  | 'project_enquiry'
  | 'project_brochure'
  | 'property_brochure'
  | 'contact'
  | 'newsletter'
  | 'whatsapp_click'

export type WebsiteFormPayload = {
  source: WebsiteFormSource
  name: string
  email?: string | null
  phone?: string | null
  message?: string | null
  meta?: Record<string, unknown>
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
    p_meta: payload.meta ?? {},
    p_property_id: payload.propertyId ?? null,
    p_property_title: payload.propertyTitle ?? null,
    p_project_id: payload.projectId ?? null,
    p_project_name: payload.projectName ?? null,
    p_popup_id: payload.popupId ?? null,
  })

  return {
    data: (data as string | null) ?? null,
    error: error ? new Error(error.message) : null,
  }
}
