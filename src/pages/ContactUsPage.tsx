import { useMemo, useState, type FormEvent } from 'react'
import { buttonClassNames } from '@/components/Button'
import { PhoneInputField } from '@/components/PhoneInputField'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { usePageSeo } from '../hooks/usePageSeo'

const panelBg = '#FAF7F2'
const panelInk = '#6B3B34'

type ContactFormState = {
  name: string
  email: string
  phone: string
  message: string
}

const initialState: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  message: '',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function ContactUsPage() {
  const { t } = useLocalePreferences()
  const [values, setValues] = useState<ContactFormState>(initialState)
  const [attempted, setAttempted] = useState(false)

  usePageSeo({
    title: t('seo.contact.title'),
    description: t('seo.contact.description'),
  })

  const errors = useMemo(() => {
    const name = values.name.trim()
    const email = values.email.trim()
    const message = values.message.trim()
    return {
      name: attempted && name.length === 0,
      emailRequired: attempted && email.length === 0,
      emailFormat: attempted && email.length > 0 && !isValidEmail(email),
      message: attempted && message.length === 0,
    }
  }, [attempted, values])

  const hasErrors = errors.name || errors.emailRequired || errors.emailFormat || errors.message

  function updateField<Key extends keyof ContactFormState>(key: Key, value: ContactFormState[Key]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    if (hasErrors) return

    const subject = encodeURIComponent(t('contact.mailSubject'))
    const body = encodeURIComponent(
      t('contact.mailBody', {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || '-',
        message: values.message.trim(),
      }),
    )
    window.location.href = `mailto:Info@capitaldreamdubai.com?subject=${subject}&body=${body}`
  }

  return (
    <main
      aria-label={t('contact.aria.main')}
      className="w-full min-w-0 rounded-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-10 xl:px-12 xl:py-12"
      style={{ backgroundColor: panelBg, color: panelInk }}
    >
      <div className="grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-x-10 xl:gap-x-14">
        <section className="space-y-4">
          <p className="font-compact text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-terracotta/75">
            {t('contact.eyebrow')}
          </p>
          <h1 className="type-heading-founders font-display font-medium leading-tight tracking-tight text-terracotta">
            {t('contact.h1')}
          </h1>
          <p className="max-w-xl font-sans text-[length:var(--brand-font-body-lg)] font-normal leading-relaxed text-terracotta/90">
            {t('contact.intro')}
          </p>

          <div className="space-y-3 rounded-2xl border border-[#6B3B34]/14 bg-white/60 p-5">
            <a
              href="mailto:Info@capitaldreamdubai.com"
              className="block break-all text-[0.95rem] leading-relaxed text-terracotta transition hover:opacity-80"
            >
              Info@capitaldreamdubai.com
            </a>
            <a
              href="tel:+971501083541"
              className="block text-[0.95rem] leading-relaxed text-terracotta transition hover:opacity-80"
            >
              +971 50 108 3541
            </a>
            <p className="text-[0.95rem] leading-relaxed text-terracotta/85">{t('contact.office')}</p>
          </div>
        </section>

        <section
          className="rounded-2xl border border-[#6B3B34]/14 bg-white/60 p-5 shadow-sm sm:p-6"
          aria-label={t('contact.formAria')}
        >
          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="contact-name"
                label={t('contact.name')}
                value={values.name}
                onChange={(value) => updateField('name', value)}
                error={errors.name ? t('contact.errorName') : null}
              />
              <Field
                id="contact-email"
                label={t('contact.email')}
                type="email"
                value={values.email}
                onChange={(value) => updateField('email', value)}
                error={
                  errors.emailRequired
                    ? t('contact.errorEmailRequired')
                    : errors.emailFormat
                      ? t('contact.errorEmailFormat')
                      : null
                }
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-phone" className="font-sans text-sm font-medium text-terracotta/90">
                {t('contact.phone')}
              </label>
              <PhoneInputField
                id="contact-phone"
                value={values.phone}
                onChange={(value) => updateField('phone', value ?? '')}
                variant="public"
                defaultCountry="AE"
                placeholder={t('contact.phone')}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="contact-message"
                className="font-sans text-sm font-medium text-terracotta/90"
              >
                {t('contact.message')}
              </label>
              <textarea
                id="contact-message"
                value={values.message}
                onChange={(event) => updateField('message', event.target.value)}
                rows={5}
                aria-invalid={errors.message || undefined}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                className="w-full rounded-xl border border-[#6B3B34]/28 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20"
              />
              {errors.message ? (
                <p id="contact-message-error" className="text-sm text-terracotta" role="alert">
                  {t('contact.errorMessage')}
                </p>
              ) : null}
            </div>

            <button type="submit" className={buttonClassNames('primary', 'min-h-11 px-5 py-2.5')}>
              {t('contact.submit')}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error = null,
  type = 'text',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  type?: 'text' | 'email'
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="font-sans text-sm font-medium text-terracotta/90">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-xl border border-[#6B3B34]/28 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20"
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-terracotta" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
