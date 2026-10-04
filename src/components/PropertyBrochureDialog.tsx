import { X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { buttonClassNames } from '@/components/Button'
import { PhoneInputField } from '@/components/PhoneInputField'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'
import { submitWebsiteForm } from '@/lib/submitWebsiteForm'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type Props = {
  open: boolean
  onClose: () => void
  propertyId: string
  propertyTitle: string
  salesperson: PublicSalesperson | null
  onDownload: () => Promise<void>
}

export function PropertyBrochureDialog({
  open,
  onClose,
  propertyId,
  propertyTitle,
  salesperson,
  onDownload,
}: Props) {
  const { t } = useLocalePreferences()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
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

  useEffect(() => {
    if (open) return
    setSaved(false)
    setDownloading(false)
    setErr(null)
    setAttempted(false)
    setBusy(false)
  }, [open])

  const errors = useMemo(() => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    return {
      name: attempted && trimmedName.length === 0,
      emailRequired: attempted && trimmedEmail.length === 0,
      emailFormat: attempted && trimmedEmail.length > 0 && !isValidEmail(trimmedEmail),
    }
  }, [attempted, name, email])

  async function runDownload() {
    setDownloading(true)
    setErr(null)
    try {
      await onDownload()
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'The brochure could not be created.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    setErr(null)
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    if (
      trimmedName.length === 0 ||
      trimmedEmail.length === 0 ||
      !isValidEmail(trimmedEmail)
    ) {
      return
    }

    setBusy(true)
    const { error } = await submitWebsiteForm({
      source: 'property_brochure',
      propertyId,
      propertyTitle,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      message: null,
      meta: {
        salesperson_id: salesperson?.id ?? null,
        salesperson_name: salesperson?.name ?? null,
        intent: 'property_brochure',
      },
    })
    setBusy(false)
    if (error) {
      setErr(error.message === 'Supabase not configured' ? t('popup.errorNotConnected') : error.message)
      return
    }
    setSaved(true)
    await runDownload()
  }

  if (!open) return null

  const fieldClass =
    'w-full rounded-xl border border-[#6B3B34]/28 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20'
  const labelClass = 'font-sans text-xs font-medium text-terracotta/90'

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[110] bg-ink/40 backdrop-blur-[2px]"
        aria-label="Close property details form"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[120] max-h-[min(92vh,720px)] overflow-y-auto rounded-t-[1.5rem] border-t border-ink/10 bg-cream shadow-[0_-12px_40px_rgba(28,20,18,0.12)] motion-safe:animate-[adminSheetUp_0.32s_ease-out] md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.5rem] md:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-brochure-dialog-title"
      >
        <div className="flex flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-3">
            <h2
              id="property-brochure-dialog-title"
              className="type-section-title font-display text-lg font-semibold text-ink sm:text-xl"
            >
              Get property details
            </h2>
            <button
              type="button"
              className="btn-icon-terracotta inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta text-cream shadow-sm"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>
          {saved ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-ink/80" role="status">
                {downloading
                  ? 'Your brochure is downloading.'
                  : err
                    ? 'Your details are saved. The brochure did not download.'
                    : 'Your brochure is downloading.'}
              </p>
              {err ? (
                <p className="text-sm text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
              <button
                type="button"
                disabled={downloading}
                className={buttonClassNames('primary', 'min-h-11 w-full px-5 py-2.5')}
                onClick={() => void runDownload()}
              >
                {downloading ? 'Preparing brochure…' : 'Download again'}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink/65">
                Share your name and email and we’ll download the brochure for {propertyTitle}.
              </p>
              <form className="flex flex-col gap-3" noValidate onSubmit={(event) => void handleSubmit(event)}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="brochure-name" className={labelClass}>
                    {t('contact.name')}
                  </label>
                  <input
                    id="brochure-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={errors.name || undefined}
                    className={fieldClass}
                  />
                  {errors.name ? (
                    <p className="text-sm text-terracotta" role="alert">
                      {t('contact.errorName')}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="brochure-email" className={labelClass}>
                    {t('contact.email')}
                  </label>
                  <input
                    id="brochure-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={errors.emailRequired || errors.emailFormat || undefined}
                    className={fieldClass}
                  />
                  {errors.emailRequired ? (
                    <p className="text-sm text-terracotta" role="alert">
                      {t('contact.errorEmailRequired')}
                    </p>
                  ) : null}
                  {errors.emailFormat ? (
                    <p className="text-sm text-terracotta" role="alert">
                      {t('contact.errorEmailFormat')}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="brochure-phone" className={labelClass}>
                    {t('contact.phone')}
                  </label>
                  <PhoneInputField
                    id="brochure-phone"
                    value={phone}
                    onChange={(value) => setPhone(value ?? '')}
                    variant="public"
                    defaultCountry="AE"
                    placeholder={t('contact.phone')}
                  />
                </div>
                {err ? (
                  <p className="text-sm text-red-600" role="alert">
                    {err}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className={buttonClassNames('primary', 'min-h-11 w-full px-5 py-2.5')}
                >
                  {busy ? t('popup.sending') : 'Get property details'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
