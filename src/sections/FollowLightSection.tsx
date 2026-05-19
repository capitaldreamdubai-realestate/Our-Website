import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { SectionShell } from '../components/SectionShell'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type FollowProps = {
  id?: string
  'aria-label'?: string
  /** Distinct `id` for the email field when two forms exist in the app. */
  emailFieldId?: string
}

export function FollowLightSection({
  id = 'book',
  'aria-label': ariaLabel,
  emailFieldId = 'subscribe-email',
}: FollowProps = {}) {
  const { t } = useLocalePreferences()
  const [email, setEmail] = useState('')
  const [attempted, setAttempted] = useState(false)

  const trimmed = email.trim()
  const emptyError = Boolean(attempted && trimmed.length === 0)
  const formatError = Boolean(
    attempted && trimmed.length > 0 && !isValidEmail(trimmed),
  )
  const showError = emptyError || formatError

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAttempted(true)
    if (!trimmed || !isValidEmail(trimmed)) return

    const subj = encodeURIComponent(t('follow.mailSubject'))
    const body = encodeURIComponent(t('follow.mailBody', { email: trimmed }))
    window.location.href = `mailto:Info@capitaldreamdubai.com?subject=${subj}&body=${body}`
  }

  return (
    <SectionShell variant="cream" id={id} aria-label={ariaLabel}>
      <div className="flex w-full flex-col items-stretch gap-8 py-4 sm:gap-10 sm:py-8 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="flex-1 min-w-0 text-left">
          <h2 className="type-heading-display type-heading-display--follow font-display font-semibold leading-tight text-ink">
            {t('follow.heading')}
          </h2>
          <p className="mt-3 max-w-xl font-light text-ink/70">
            {t('follow.subtitle')}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-xl flex-col gap-3 md:max-w-lg md:shrink-0 lg:max-w-xl"
          noValidate
        >
          <div className="flex min-w-0 w-full flex-col gap-1.5">
            <label htmlFor={emailFieldId} className="sr-only">
              {t('follow.emailLabel')}
            </label>
            <input
              id={emailFieldId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('follow.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={showError || undefined}
              aria-describedby={
                showError ? `${emailFieldId}-error` : undefined
              }
              className={`min-h-14 w-full rounded-xl border bg-white/90 px-6 py-3.5 text-lg leading-snug font-sans font-normal normal-case tracking-normal text-ink placeholder:text-ink/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35 sm:min-h-[3.75rem] ${
                showError
                  ? 'border-terracotta'
                  : 'border-terracotta/35 focus-visible:border-terracotta/60'
              }`}
            />
            {showError ? (
              <p
                id={`${emailFieldId}-error`}
                className="px-2 text-sm text-terracotta"
                role="alert"
              >
                {emptyError ? t('follow.errorEmpty') : t('follow.errorFormat')}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            variant="inkSolid"
            className="btn-hover-subscribe h-auto min-h-14 w-full whitespace-normal border border-ink px-5 py-3.5 text-center text-base font-medium normal-case leading-snug tracking-normal shadow-sm"
          >
            {t('follow.ctaSubscribe')}
          </Button>
        </form>
      </div>
    </SectionShell>
  )
}
