import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/database.types'
import { CMS_MEDIA_BUCKET, insertCmsMediaRow } from './cmsMedia'

function safeName(name: string) {
  return name.replace(/[^\w.-]/g, '_').slice(0, 120)
}

export async function uploadCmsDocument(
  supabase: SupabaseClient<Database>,
  folder: string,
  file: File,
): Promise<{
  publicUrl: string | null
  storagePath: string | null
  error: string | null
}> {
  const path = `${folder}/${Date.now()}-${safeName(file.name)}`
  const { error: upErr } = await supabase.storage
    .from(CMS_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (upErr) return { publicUrl: null, storagePath: null, error: upErr.message }

  const { data } = supabase.storage.from(CMS_MEDIA_BUCKET).getPublicUrl(path)
  const publicUrl = data.publicUrl

  const { error: dbErr } = await insertCmsMediaRow(supabase, {
    storage_path: path,
    public_url: publicUrl,
    folder,
    original_filename: file.name || 'upload',
    mime_type: file.type || 'application/octet-stream',
    file_size_bytes: Number.isFinite(file.size) ? file.size : null,
    kind: 'document',
  })
  if (dbErr) {
    await supabase.storage.from(CMS_MEDIA_BUCKET).remove([path])
    return { publicUrl: null, storagePath: null, error: dbErr }
  }

  return { publicUrl, storagePath: path, error: null }
}
