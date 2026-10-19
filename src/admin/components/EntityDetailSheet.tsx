import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { adminModalCloseBtn } from '@/admin/adminClassNames'
import { useIsMobile } from '@/hooks/useIsMobile'

type Field = { label: string; value: ReactNode }

export function EntityDetailSheet({
  open,
  title,
  fields,
  onClose,
}: {
  open: boolean
  title: string
  fields: Field[]
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

  if (!open) return null

  const shellMobile =
    'fixed inset-x-0 bottom-0 z-[111] flex max-h-[min(92dvh,760px)] w-full flex-col overflow-hidden rounded-t-[24px] border border-ink/10 border-b-0 bg-[#FAFAF8] shadow-[0_-12px_48px_rgba(28,20,18,0.18)] motion-safe:animate-[adminSheetUp_0.32s_ease-out]'
  const shellDesktop =
    'admin-portal fixed inset-y-0 right-0 z-[111] flex w-full max-w-3xl flex-col overflow-hidden border-l border-ink/10 bg-[var(--admin-surface,#f8f3ef)] text-[var(--admin-ink,#1c1412)] shadow-2xl motion-safe:animate-[submissionSheetSlideIn_0.28s_ease-out]'

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[110] cursor-default bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close details"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={mobile ? shellMobile : shellDesktop}
        style={mobile ? { marginBottom: 0 } : undefined}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/10 px-4 py-3 md:px-5 md:py-4">
          <h2 className="min-w-0 pr-2 text-base font-semibold leading-snug text-ink md:text-lg">{title}</h2>
          <button type="button" onClick={onClose} className={adminModalCloseBtn} aria-label="Close">
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 md:px-5 md:py-4">
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="min-w-0 border-b border-ink/10 py-3">
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/45">{f.label}</dt>
                <dd className="mt-1 break-words text-sm text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
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
