import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/database.types'

let propertiesTagsColumn: boolean | null = null

/** Whether `public.properties.tags` exists (migration 20260520120000). */
export async function propertiesHasTagsColumn(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  if (propertiesTagsColumn !== null) return propertiesTagsColumn
  const { error } = await supabase.from('properties').select('tags').limit(1)
  if (!error) {
    propertiesTagsColumn = true
    return true
  }
  const msg = error.message.toLowerCase()
  if (
    msg.includes('tags') &&
    (msg.includes('column') || msg.includes('schema cache') || error.code === 'PGRST204')
  ) {
    propertiesTagsColumn = false
    return false
  }
  propertiesTagsColumn = true
  return true
}

export function resetPropertiesSchemaCache(): void {
  propertiesTagsColumn = null
}
