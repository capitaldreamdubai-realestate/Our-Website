import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const normalizedUrl = url?.trim().toLowerCase()

export const isSupabaseConfigured = Boolean(
  normalizedUrl && anon?.trim() && normalizedUrl.startsWith('http'),
)

let client: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient<Database>(normalizedUrl!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return client
}
