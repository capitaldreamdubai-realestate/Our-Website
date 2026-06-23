import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/database.types'

export const CMS_MEDIA_BUCKET = 'cms-media'

export type CmsMediaKind = 'image' | 'video' | 'document'

export function inferMediaKindFromMime(mime: string): CmsMediaKind {
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf' || mime.startsWith('application/')) return 'document'
  return 'image'
}

export async function insertCmsMediaRow(
  supabase: SupabaseClient<Database>,
  row: {
    storage_path: string
    public_url: string
    folder: string
    original_filename: string
    mime_type: string
    file_size_bytes: number | null
    kind: CmsMediaKind
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cms_media').insert({
    storage_path: row.storage_path,
    public_url: row.public_url,
    folder: row.folder,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes,
    kind: row.kind,
  })
  return { error: error?.message ?? null }
}

export async function removeStorageObjects(
  supabase: SupabaseClient<Database>,
  paths: string[],
): Promise<{ error: string | null }> {
  if (paths.length === 0) return { error: null }
  const { error } = await supabase.storage.from(CMS_MEDIA_BUCKET).remove(paths)
  return { error: error?.message ?? null }
}
