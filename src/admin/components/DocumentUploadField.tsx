import { FileText, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { getSupabase } from '@/integrations/supabase/client'
import { uploadCmsDocument } from '@/lib/cms/uploadCmsDocument'
import { adminBtnGhost } from '@/admin/adminClassNames'

type Props = {
  label: string
  folder: string
  brochureUrl: string
  brochureStoragePath: string
  onChange: (next: { brochureUrl: string; brochureStoragePath: string }) => void
}

export function DocumentUploadField({
  label,
  folder,
  brochureUrl,
  brochureStoragePath,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onPick(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setErr(null)
    setBusy(true)
    const supabase = getSupabase()
    if (!supabase) {
      setErr('Supabase not configured')
      setBusy(false)
      return
    }
    const { publicUrl, storagePath, error } = await uploadCmsDocument(supabase, folder, f)
    setBusy(false)
    if (error || !publicUrl || !storagePath) {
      setErr(error ?? 'Upload failed')
      return
    }
    onChange({ brochureUrl: publicUrl, brochureStoragePath: storagePath })
  }

  const hasFile = Boolean(brochureUrl.trim() || brochureStoragePath.trim())

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink/70 md:text-[0.8125rem]">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        {hasFile ? (
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-ink/10 bg-white px-3 py-2.5">
            <FileText className="size-5 shrink-0 text-terracotta" aria-hidden />
            <span className="min-w-0 truncate text-xs text-ink/75">
              {brochureStoragePath.split('/').pop() ?? 'Brochure.pdf'}
            </span>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void onPick(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl border border-dashed border-[var(--admin-primary)]/45 bg-white px-3 py-2.5 text-left text-xs font-medium text-[var(--admin-primary)] transition hover:bg-[var(--admin-accent-soft)] disabled:opacity-50 md:text-[0.8125rem]"
          >
            {busy ? 'Uploading…' : hasFile ? 'Replace PDF' : 'Upload PDF brochure'}
          </button>
          {hasFile ? (
            <button
              type="button"
              onClick={() => onChange({ brochureUrl: '', brochureStoragePath: '' })}
              className={`inline-flex items-center gap-1 ${adminBtnGhost}`}
            >
              <X className="size-4" aria-hidden />
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  )
}
