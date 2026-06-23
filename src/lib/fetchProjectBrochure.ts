import { getSupabase, isSupabaseConfigured } from '@/integrations/supabase/client'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined

export async function fetchProjectBrochureUrl(
  projectId: string,
  submissionId: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured || !url?.trim()) {
    return { url: null, error: 'Site is not connected.' }
  }
  const sb = getSupabase()
  if (!sb) return { url: null, error: 'Site is not connected.' }

  const { data, error } = await sb.functions.invoke('get-project-brochure', {
    body: { project_id: projectId, submission_id: submissionId },
  })

  if (error) {
    return { url: null, error: error.message }
  }

  const payload = data as { ok?: boolean; url?: string; error?: string } | null
  if (!payload?.ok || !payload.url) {
    return { url: null, error: payload?.error ?? 'Unable to fetch brochure.' }
  }

  return { url: payload.url, error: null }
}

export function triggerBrochureDownload(url: string, filename = 'brochure.pdf') {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener noreferrer'
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
