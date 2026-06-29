import { getSupabase, isSupabaseConfigured } from '@/integrations/supabase/client'

export async function fetchProjectBrochureUrl(
  projectId: string,
  contact: { email: string; name: string },
): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { url: null, error: 'Site is not connected.' }
  }
  const sb = getSupabase()
  if (!sb) return { url: null, error: 'Site is not connected.' }

  const { data, error } = await sb.functions.invoke('get-project-brochure', {
    body: {
      project_id: projectId,
      email: contact.email.trim(),
      name: contact.name.trim(),
    },
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
