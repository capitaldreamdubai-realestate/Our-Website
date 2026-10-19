import type { Json } from '@/integrations/supabase/database.types'

export type SubmissionMeta = {
  salesperson_id: string | null
  salesperson_name: string | null
  popup_title: string | null
  intent: string | null
  floor_plan_name: string | null
  bedrooms: string | null
  price_aed: string | null
  investment_budget: string | null
  invest_timeline: string | null
  invested_uae_before: string | null
}

export function parseSubmissionMeta(meta: Json): SubmissionMeta {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {
      salesperson_id: null,
      salesperson_name: null,
      popup_title: null,
      intent: null,
      floor_plan_name: null,
      bedrooms: null,
      price_aed: null,
      investment_budget: null,
      invest_timeline: null,
      invested_uae_before: null,
    }
  }
  const m = meta as Record<string, unknown>
  return {
    salesperson_id:
      typeof m.salesperson_id === 'string' ? m.salesperson_id : null,
    salesperson_name:
      typeof m.salesperson_name === 'string' ? m.salesperson_name : null,
    popup_title: typeof m.popup_title === 'string' ? m.popup_title : null,
    intent: typeof m.intent === 'string' ? m.intent : null,
    floor_plan_name: typeof m.floor_plan_name === 'string' ? m.floor_plan_name : null,
    bedrooms: typeof m.bedrooms === 'string' || typeof m.bedrooms === 'number' ? String(m.bedrooms) : null,
    price_aed: typeof m.price_aed === 'string' || typeof m.price_aed === 'number' ? String(m.price_aed) : null,
    investment_budget: typeof m.investment_budget === 'string' ? m.investment_budget : null,
    invest_timeline: typeof m.invest_timeline === 'string' ? m.invest_timeline : null,
    invested_uae_before: typeof m.invested_uae_before === 'string' ? m.invested_uae_before : null,
  }
}
