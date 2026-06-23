import { X } from 'lucide-react'
import { useEffect } from 'react'
import { ProjectLeadForm } from '@/components/ProjectLeadForm'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'

type Props = {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  salesperson: PublicSalesperson | null
  onBrochureUnlocked: (submissionId: string) => void
}

export function ProjectBrochureDialog({
  open,
  onClose,
  projectId,
  projectName,
  salesperson,
  onBrochureUnlocked,
}: Props) {
  const { t } = useLocalePreferences()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[110] bg-ink/40 backdrop-blur-[2px]"
        aria-label={t('projectLead.closeDialog')}
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[120] max-h-[min(92vh,720px)] overflow-y-auto rounded-t-[1.5rem] border-t border-ink/10 bg-cream shadow-[0_-12px_40px_rgba(28,20,18,0.12)] motion-safe:animate-[adminSheetUp_0.32s_ease-out] md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.5rem] md:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-brochure-dialog-title"
        style={{ marginBottom: 0 }}
      >
        <div className="flex flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-3">
            <h2
              id="project-brochure-dialog-title"
              className="type-section-title font-display text-lg font-semibold text-ink sm:text-xl"
            >
              {t('projectLead.brochureDialogTitle')}
            </h2>
            <button
              type="button"
              className="btn-icon-terracotta inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta text-cream shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              aria-label={t('projectLead.closeDialog')}
              onClick={onClose}
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p className="text-sm text-ink/65">{t('projectLead.brochureDialogDesc')}</p>
          <ProjectLeadForm
            compact
            intent="brochure"
            projectId={projectId}
            projectName={projectName}
            salesperson={salesperson}
            onSuccess={(submissionId) => {
              onBrochureUnlocked(submissionId)
              onClose()
            }}
          />
        </div>
      </div>
    </>
  )
}
