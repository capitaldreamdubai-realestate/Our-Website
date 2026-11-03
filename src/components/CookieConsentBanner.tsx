import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import {
  needsConsentPrompt,
  OPEN_CONSENT_EVENT,
  saveConsent,
  type ConsentChoice,
} from '@/lib/analytics/consent'

/**
 * Shown to visitors in European time zones until they choose, and to anyone who
 * opens "Cookie settings" in the footer. Never shown to the Playwright prerender
 * (navigator.webdriver), so prerendered HTML doesn't contain it.
 */
export function CookieConsentBanner() {
  const { t } = useLocalePreferences()
  const [open, setOpen] = useState(() => !navigator.webdriver && needsConsentPrompt())

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  if (!open) return null

  function choose(choice: ConsentChoice) {
    saveConsent(choice)
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-terracotta/25 bg-cream p-4 text-ink shadow-[0_18px_50px_rgba(28,20,18,0.28)] sm:inset-x-auto sm:left-4 sm:bottom-4 sm:p-5"
    >
      <p id="cookie-consent-title" className="font-display text-base font-medium">
        {t('consent.title')}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink/75">
        {t('consent.body')}{' '}
        <Link to="/cookies" className="underline underline-offset-2 hover:text-terracotta">
          {t('legal.cookiePolicyLink')}
        </Link>
      </p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => choose('denied')}
          className={buttonClassNames('outlineTerracotta', 'px-5 py-2 text-sm')}
        >
          {t('consent.reject')}
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className={buttonClassNames('primary', 'px-5 py-2 text-sm')}
        >
          {t('consent.accept')}
        </button>
      </div>
    </div>
  )
}
