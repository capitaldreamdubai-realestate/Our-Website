import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('APP_SUPABASE_URL')?.trim() || Deno.env.get('SUPABASE_URL')?.trim()
    const serviceRoleKey =
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: 'Missing Supabase service env for function.' }, 500)
    }

    const body = (await req.json()) as { project_id?: string; submission_id?: string }
    const projectId = body.project_id?.trim()
    const submissionId = body.submission_id?.trim()
    if (!projectId || !submissionId) {
      return json({ ok: false, error: 'project_id and submission_id are required.' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: submission, error: subErr } = await admin
      .from('form_submissions')
      .select('id, source, project_id')
      .eq('id', submissionId)
      .maybeSingle()

    if (subErr) return json({ ok: false, error: subErr.message }, 500)
    if (!submission) return json({ ok: false, error: 'Submission not found.' }, 404)
    if (submission.source !== 'project_brochure') {
      return json({ ok: false, error: 'Invalid submission type.' }, 403)
    }
    if (submission.project_id !== projectId) {
      return json({ ok: false, error: 'Submission does not match project.' }, 403)
    }

    const { data: project, error: projErr } = await admin
      .from('offplan_projects')
      .select('brochure_storage_path, brochure_url, name')
      .eq('id', projectId)
      .eq('published', true)
      .maybeSingle()

    if (projErr) return json({ ok: false, error: projErr.message }, 500)
    if (!project) return json({ ok: false, error: 'Project not found.' }, 404)

    const storagePath = project.brochure_storage_path?.trim()
    if (storagePath) {
      const { data: signed, error: signErr } = await admin.storage
        .from('cms-media')
        .createSignedUrl(storagePath, 3600)
      if (signErr) return json({ ok: false, error: signErr.message }, 500)
      if (!signed?.signedUrl) return json({ ok: false, error: 'Unable to sign brochure URL.' }, 500)
      return json({ ok: true, url: signed.signedUrl })
    }

    const publicUrl = project.brochure_url?.trim()
    if (publicUrl) return json({ ok: true, url: publicUrl })

    return json({ ok: false, error: 'No brochure available for this project.' }, 404)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error.'
    return json({ ok: false, error: message }, 500)
  }
})
