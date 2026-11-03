import clsx from 'clsx'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { CampaignPopupLeadForm } from '@/components/CampaignPopupLeadForm'
import { FormSuccessPanel } from '@/components/FormSuccessPanel'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getSupabase } from '@/integrations/supabase/client'
import type { CampaignPopup } from '@/lib/campaignPopup'
import { markPopupShownThisSession, pickPopupForPage } from '@/lib/campaignPopup'

/** Form column width on desktop; the image column takes whatever the image's shape needs. */
const FORM_WIDTH = 416
const MAX_DIALOG_HEIGHT = 720
const MAX_DIALOG_WIDTH = 1120
/** Wider than this, the image sits above the form instead of beside it. */
const SIDE_BY_SIDE_MAX_RATIO = 1.2

type Layout = {
  dialog: CSSProperties
  image: CSSProperties
  sideBySide: boolean
}

/** Size the dialog around the uploaded image so it is never cropped. */
function desktopLayout(ratio: number, viewportWidth: number, viewportHeight: number): Layout {
  const maxHeight = Math.min(viewportHeight * 0.9, MAX_DIALOG_HEIGHT)
  const maxWidth = Math.min(viewportWidth - 48, MAX_DIALOG_WIDTH)
  if (ratio <= SIDE_BY_SIDE_MAX_RATIO) {
    let height = maxHeight
    let imageWidth = height * ratio
    if (imageWidth + FORM_WIDTH > maxWidth) {
      imageWidth = Math.max(0, maxWidth - FORM_WIDTH)
      height = imageWidth / ratio
    }
    return {
      dialog: { width: imageWidth + FORM_WIDTH, height: Math.max(height, Math.min(maxHeight, 520)) },
      image: { width: imageWidth },
      sideBySide: true,
    }
  }
  const width = Math.min(maxWidth, 760)
  return {
    dialog: { width, maxHeight },
    image: { height: Math.min(width / ratio, maxHeight * 0.45) },
    sideBySide: false,
  }
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export function CampaignPopupOverlay() {
  const { pathname } = useLocation()
  const { t } = useLocalePreferences()
  const { offplanProjects, salespeopleById } = useCms()
  const [popups, setPopups] = useState<CampaignPopup[]>([])
  const [active, setActive] = useState<CampaignPopup | null>(null)
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // Width ÷ height of the uploaded image, read once it loads. 3:4 until then.
  const [imageRatio, setImageRatio] = useState(3 / 4)
  const [step, setStep] = useState<1 | 2>(1)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const viewport = useViewportSize()

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
    setSubmitted(false)
    setStep(1)
    const next = pickPopupForPage(popups, pathname)
    if (!next) return

    const popup = next
    setActive(popup)

    function reveal() {
      setOpen(true)
      setSubmitted(false)
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

  const close = useCallback(() => {
    setOpen(false)
    setSubmitted(false)
    setStep(1)
  }, [])

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

  const launch = active.project_id
    ? offplanProjects.find((project) => project.id === active.project_id) ?? null
    : null
  const salesperson = launch?.salespersonId ? salespeopleById[launch.salespersonId] ?? null : null
  const layout = isDesktop ? desktopLayout(imageRatio, viewport.width, viewport.height) : null
  // On phones the second form step drops the image so the questions have room.
  const showImage = Boolean(active.image_url) && (isDesktop || step === 1 || submitted)

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
        style={layout?.dialog}
        className={clsx(
          'fixed z-[250] flex flex-col overflow-hidden border border-ink/10 bg-[#FAF7F2] text-terracotta',
          isDesktop
            ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl'
            : 'inset-x-0 bottom-0 max-h-[94dvh] w-full rounded-t-[1.25rem] shadow-[0_-16px_48px_rgba(28,20,18,0.2)]',
        )}
      >
        <button
          type="button"
          onClick={close}
          className="btn-icon-ink absolute right-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-full border border-ink bg-ink text-cream shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          aria-label={t('popup.closeAria')}
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </button>

        <div
          className={clsx(
            'flex min-h-0 flex-1',
            layout?.sideBySide ? 'flex-row' : 'flex-col overflow-y-auto',
          )}
        >
          {showImage ? (
            <div
              className={clsx(
                'relative shrink-0 overflow-hidden bg-ink',
                layout?.sideBySide ? 'h-full' : 'w-full',
              )}
              style={
                layout
                  ? layout.image
                  : { height: `min(${100 / imageRatio}vw, 40dvh)` }
              }
            >
              {/* Blurred fill behind the whole image, only visible when the box is not the image's exact shape. */}
              <img
                src={active.image_url}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-75"
              />
              <img
                src={active.image_url}
                alt=""
                className="relative h-full w-full object-contain"
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget
                  if (naturalWidth && naturalHeight) setImageRatio(naturalWidth / naturalHeight)
                }}
              />
            </div>
          ) : null}

          <div
            className={clsx(
              'flex min-w-0 flex-1 flex-col p-5 sm:p-6',
              layout?.sideBySide && 'min-h-0 overflow-y-auto',
              submitted ? 'justify-center' : 'gap-4',
            )}
          >
            {submitted ? (
              <div className="pr-10">
                <p id="campaign-popup-title" className="sr-only">
                  {active.title}
                </p>
                <FormSuccessPanel
                  variant="popup"
                  actions={
                    <div className="flex flex-wrap gap-2">
                      {launch ? (
                        <Link
                          to={`/offplan/${launch.slug}`}
                          onClick={close}
                          className={buttonClassNames('outlineTerracotta', 'min-h-11 px-5 py-2.5')}
                        >
                          {t('popup.viewLaunch')}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={close}
                        className={buttonClassNames('primary', 'min-h-11 px-5 py-2.5')}
                      >
                        {t('popup.closeContinue')}
                      </button>
                    </div>
                  }
                />
              </div>
            ) : (
              <>
                <div className="pr-10">
                  <h2
                    id="campaign-popup-title"
                    className="type-section-title font-display text-xl font-semibold leading-tight text-terracotta sm:text-2xl"
                  >
                    {active.title}
                  </h2>
                  {active.description?.trim() && step === 1 ? (
                    <p className="mt-2 font-sans text-sm leading-relaxed text-terracotta/90 sm:text-[0.95rem]">
                      {active.description}
                    </p>
                  ) : null}
                </div>
                <CampaignPopupLeadForm
                  popupId={active.id}
                  popupTitle={active.title}
                  submitLabel={active.submit_button_label}
                  projectId={launch?.id ?? null}
                  projectName={launch?.name ?? null}
                  projectSlug={launch?.slug ?? null}
                  salespersonId={salesperson?.id ?? null}
                  salespersonName={salesperson?.name ?? null}
                  compact
                  stepped={!isDesktop}
                  onStepChange={setStep}
                  onSuccess={() => setSubmitted(true)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
