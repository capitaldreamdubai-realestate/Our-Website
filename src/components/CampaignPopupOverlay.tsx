import clsx from 'clsx'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { CampaignPopupLeadForm } from '@/components/CampaignPopupLeadForm'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { getSupabase } from '@/integrations/supabase/client'
import type { CampaignPopup } from '@/lib/campaignPopup'
import { markPopupShownThisSession, pickPopupForPage } from '@/lib/campaignPopup'

export function CampaignPopupOverlay() {
  const { pathname } = useLocation()
  const { t } = useLocalePreferences()
  const [popups, setPopups] = useState<CampaignPopup[]>([])
  const [active, setActive] = useState<CampaignPopup | null>(null)
  const [open, setOpen] = useState(false)

  const loadPopups = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb
      .from('campaign_popups')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    setPopups(data ?? [])
  }, [])

  useEffect(() => {
    void loadPopups()
  }, [loadPopups])

  useEffect(() => {
    setOpen(false)
    setActive(null)
    const next = pickPopupForPage(popups, pathname)
    if (!next) return

    const popup = next
    setActive(popup)

    function reveal() {
      setOpen(true)
      if (popup.show_once_per_session) markPopupShownThisSession(popup.id)
    }

    if (popup.trigger_type === 'immediate') {
      reveal()
      return
    }

    if (popup.trigger_type === 'delay') {
      const ms = Math.max(0, (popup.trigger_delay_seconds ?? 5) * 1000)
      const timer = window.setTimeout(reveal, ms)
      return () => window.clearTimeout(timer)
    }

    const threshold = Math.min(100, Math.max(0, popup.trigger_scroll_percent ?? 50))

    function onScroll() {
      const doc = document.documentElement
      const maxScroll = doc.scrollHeight - window.innerHeight
      if (maxScroll <= 0) {
        reveal()
        return
      }
      const pct = (window.scrollY / maxScroll) * 100
      if (pct >= threshold) {
        reveal()
        window.removeEventListener('scroll', onScroll)
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [popups, pathname])

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !active) return null

  return createPortal(
  <>
      <button
        type="button"
        className="fixed inset-0 z-[240] bg-ink/50 backdrop-blur-[2px]"
        aria-label={t('popup.closeAria')}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-popup-title"
        className={clsx(
          'fixed z-[250] flex w-full max-h-[min(94dvh,720px)] flex-col overflow-hidden border border-ink/10 bg-[#FAF7F2] text-terracotta shadow-[0_-16px_48px_rgba(28,20,18,0.2)]',
          'inset-x-0 bottom-0 rounded-t-[1.25rem]',
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-2xl',
        )}
        style={{ marginBottom: 0 }}
      >
        <div className="flex shrink-0 justify-end border-b border-ink/10 px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={close}
            className="btn-icon-ink inline-flex size-10 items-center justify-center rounded-full border border-ink bg-ink text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            aria-label={t('popup.closeAria')}
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-2">
          <div className="relative min-h-[200px] bg-ink/5 md:min-h-0">
            <img
              src={active.image_url}
              alt=""
              className="h-full w-full object-cover md:absolute md:inset-0"
            />
          </div>
          <div className="flex flex-col gap-4 p-5 sm:p-6 md:overflow-y-auto">
            <div>
              <h2
                id="campaign-popup-title"
                className="type-section-title font-display text-xl font-semibold leading-tight text-terracotta sm:text-2xl"
              >
                {active.title}
              </h2>
              {active.description?.trim() ? (
                <p className="mt-2 font-sans text-sm leading-relaxed text-terracotta/90 sm:text-[0.95rem]">
                  {active.description}
                </p>
              ) : null}
            </div>
            <CampaignPopupLeadForm
              popupId={active.id}
              popupTitle={active.title}
              submitLabel={active.submit_button_label}
              compact
            />
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
