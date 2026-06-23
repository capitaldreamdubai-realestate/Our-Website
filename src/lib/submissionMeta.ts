import type { Json } from '@/integrations/supabase/database.types'

export type SubmissionMeta = {
  salesperson_id: string | null
  salesperson_name: string | null
  popup_title: string | null
  intent: string | null
}

export function parseSubmissionMeta(meta: Json): SubmissionMeta {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { salesperson_id: null, salesperson_name: null, popup_title: null, intent: null }
  }
  const m = meta as Record<string, unknown>
  return {
    salesperson_id:
      typeof m.salesperson_id === 'string' ? m.salesperson_id : null,
    salesperson_name:
      typeof m.salesperson_name === 'string' ? m.salesperson_name : null,
    popup_title: typeof m.popup_title === 'string' ? m.popup_title : null,
    intent: typeof m.intent === 'string' ? m.intent : null,
  }
}
