import { useMemo, useState, type FormEvent } from 'react'
import { buttonClassNames } from '@/components/Button'
import { PhoneInputField } from '@/components/PhoneInputField'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { getSupabase } from '@/integrations/supabase/client'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type Props = {
  popupId: string
  popupTitle: string
  submitLabel?: string | null
  onSuccess?: () => void
  compact?: boolean
}

export function CampaignPopupLeadForm({
  popupId,
  popupTitle,
  submitLabel,
  onSuccess,
  compact,
}: Props) {
  const { t } = useLocalePreferences()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const errors = useMemo(() => {
    const n = name.trim()
    const em = email.trim()
    return {
      name: attempted && n.length === 0,
      emailRequired: attempted && em.length === 0,
      emailFormat: attempted && em.length > 0 && !isValidEmail(em),
    }
  }, [attempted, name, email])

  const hasErrors = errors.name || errors.emailRequired || errors.emailFormat

  const fieldClass = compact
    ? 'w-full rounded-xl border border-[#6B3B34]/28 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20'
    : 'w-full rounded-xl border border-[#6B3B34]/28 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20'

  const labelClass = compact
    ? 'font-sans text-xs font-medium text-terracotta/90'
    : 'font-sans text-sm font-medium text-terracotta/90'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    setErr(null)
    if (hasErrors) return

    const sb = getSupabase()
    if (!sb) {
      setErr(t('popup.errorNotConnected'))
      return
    }

    setBusy(true)
    const { error } = await sb.from('form_submissions').insert({
      source: 'campaign_popup',
      popup_id: popupId,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      message: null,
      meta: { popup_title: popupTitle },
    })
    setBusy(false)

    if (error) {
      setErr(error.message)
      return
    }

    setDone(true)
    setName('')
    setEmail('')
    setPhone('')
    setAttempted(false)
    onSuccess?.()
  }

  if (done) {
    return (
      <p className="text-sm leading-relaxed text-terracotta/90" role="status">
        {t('popup.thankYou')}
      </p>
    )
  }

  return (
    <form className="space-y-3" noValidate onSubmit={handleSubmit}>
      <Field
        id={`popup-name-${popupId}`}
        label={t('contact.name')}
        value={name}
        onChange={setName}
        error={errors.name ? t('contact.errorName') : null}
        fieldClass={fieldClass}
        labelClass={labelClass}
      />
      <Field
        id={`popup-email-${popupId}`}
        label={t('contact.email')}
        type="email"
        value={email}
        onChange={setEmail}
        error={
          errors.emailRequired
            ? t('contact.errorEmailRequired')
            : errors.emailFormat
              ? t('contact.errorEmailFormat')
              : null
        }
        fieldClass={fieldClass}
        labelClass={labelClass}
      />
      <div className="space-y-1.5">
        <label htmlFor={`popup-phone-${popupId}`} className={labelClass}>
          {t('contact.phone')}
        </label>
        <PhoneInputField
          id={`popup-phone-${popupId}`}
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
        {busy ? t('popup.sending') : submitLabel?.trim() || t('popup.submit')}
      </button>
    </form>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error = null,
  type = 'text',
  fieldClass,
  labelClass,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  type?: 'text' | 'email'
  fieldClass: string
  labelClass: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-terracotta" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
