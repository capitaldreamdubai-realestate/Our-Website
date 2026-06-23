import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Database } from '@/integrations/supabase/database.types'
import { parseSubmissionMeta } from '@/lib/submissionMeta'
import { adminModalCloseBtn } from '@/admin/adminClassNames'

type Row = Database['public']['Tables']['form_submissions']['Row']

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="border-b border-ink/8 py-3 last:border-0">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/45">
        {label}
      </p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  )
}

export function SubmissionDetailSheet({
  row,
  open,
  onClose,
}: {
  row: Row | null
  open: boolean
  onClose: () => void
}) {
  const mobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !row) return null

  const meta = parseSubmissionMeta(row.meta)
  const metaPretty = JSON.stringify(row.meta ?? {}, null, 2)

  const shellMobile =
    'fixed inset-x-0 bottom-0 z-[111] flex max-h-[min(92dvh,760px)] w-full flex-col overflow-hidden rounded-t-[24px] border border-ink/10 border-b-0 bg-[#FAFAF8] shadow-[0_-12px_48px_rgba(28,20,18,0.18)] motion-safe:animate-[adminSheetUp_0.32s_ease-out]'
  const shellDesktop =
    'fixed inset-y-0 right-0 z-[111] flex w-full max-w-md flex-col overflow-hidden border-l border-ink/10 bg-[#FAFAF8] shadow-2xl motion-safe:animate-[submissionSheetSlideIn_0.28s_ease-out]'

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[110] cursor-default bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close submission details"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-sheet-title"
        className={mobile ? shellMobile : shellDesktop}
        style={mobile ? { marginBottom: 0 } : undefined}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/10 px-4 py-3 md:px-5 md:py-4">
          <h2
            id="submission-sheet-title"
            className="min-w-0 pr-2 text-base font-semibold leading-snug text-ink md:text-lg"
          >
            Submission details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={adminModalCloseBtn}
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 md:px-5 md:py-4">
          <Field label="Received">{new Date(row.created_at).toLocaleString()}</Field>
          <Field label="Source">{row.source}</Field>
          <Field label="Property">
            <p className="font-medium">{row.property_title ?? '—'}</p>
            {row.property_id ? (
              <p className="mt-0.5 font-mono text-xs text-ink/55">ID: {row.property_id}</p>
            ) : null}
          </Field>
          <Field label="Off-plan project">
            <p className="font-medium">{row.project_name ?? '—'}</p>
            {row.project_id ? (
              <p className="mt-0.5 font-mono text-xs text-ink/55">ID: {row.project_id}</p>
            ) : null}
          </Field>
          {meta.intent ? <Field label="Intent">{meta.intent}</Field> : null}
          <Field label="Assigned salesperson">
            {meta.salesperson_name ? (
              <>
                <p className="font-medium">{meta.salesperson_name}</p>
                {meta.salesperson_id ? (
                  <p className="mt-0.5 font-mono text-xs text-ink/55">{meta.salesperson_id}</p>
                ) : null}
              </>
            ) : (
              <span className="text-ink/55">Unassigned / Capital Dream</span>
            )}
          </Field>
          <Field label="Name">{row.name}</Field>
          <Field label="Email">
            <a
              href={`mailto:${encodeURIComponent(row.email)}`}
              className="break-all text-[var(--admin-primary)] hover:underline"
            >
              {row.email}
            </a>
          </Field>
          <Field label="Phone">
            {row.phone ? (
              <a
                href={`tel:${row.phone.replace(/\s/g, '')}`}
                className="text-[var(--admin-primary)] hover:underline"
              >
                {row.phone}
              </a>
            ) : (
              <span className="text-ink/45">—</span>
            )}
          </Field>
          <Field label="Message">
            {row.message ? (
              <p className="whitespace-pre-wrap text-ink/85">{row.message}</p>
            ) : (
              <span className="text-ink/45">—</span>
            )}
          </Field>
          <div className="pt-2">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/45">
              Raw meta (JSON)
            </p>
            <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-ink/10 bg-ink/[0.03] p-3 font-mono text-[0.6875rem] leading-relaxed text-ink/80">
              {metaPretty}
            </pre>
          </div>
        </div>

        <div className="shrink-0 border-t border-ink/10 px-4 py-3 md:px-5 md:py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/[0.04]"
          >
            Close
          </button>
        </div>
      </div>

    </>
  )
}
