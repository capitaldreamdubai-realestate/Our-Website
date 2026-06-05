import clsx from 'clsx'
import { Globe, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import type { DisplayCurrency } from '../lib/formatCurrency'
import type { AreaDisplayMode } from '../lib/formatArea'
import type { AppLanguage } from '../locale/messages'
import { buttonClassNames } from './Button'
import { FilterTerracottaDropdown } from './FilterTerracottaDropdown'

type Props = { className?: string; surface?: 'hero' | 'paper' }

/** Set to true when the navbar language/region toggle should be shown again. */
const NAV_LOCALE_CONTROLS_VISIBLE = false

export function NavbarLocaleControls({ className, surface = 'hero' }: Props) {
  const {
    language,
    setLanguage,
    currency,
    setCurrency,
    areaUnit,
    setAreaUnit,
    t,
  } = useLocalePreferences()
  const [open, setOpen] = useState(false)
  const titleId = useId()

  const languageOptions = useMemo(
    () => [
      { value: 'en', label: t('locale.lang.en') },
      { value: 'fr', label: t('locale.lang.fr') },
      { value: 'ar', label: t('locale.lang.ar') },
    ],
    [t],
  )

  const currencyOptions = useMemo(
    () => [
      { value: 'AED', label: 'AED' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' },
    ],
    [],
  )

  const areaOptions = useMemo(
    () => [
      { value: 'm2', label: t('locale.area.m2') },
      { value: 'sqm', label: t('locale.area.sqm') },
      { value: 'sqft', label: t('locale.area.sqft') },
    ],
    [t],
  )

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

  const dialog = open ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[250] bg-ink/45 backdrop-blur-[2px]"
        aria-label={t('locale.closeDialogAria')}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'fixed z-[260] flex max-h-[min(88dvh,560px)] w-full flex-col border-ink/10 bg-cream text-ink shadow-[0_-16px_48px_rgba(28,20,18,0.18)]',
          'inset-x-0 bottom-0 rounded-t-[1.25rem] border-t',
          'sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:shadow-xl',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/10 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <h2
            id={titleId}
            className="type-section-title font-display text-lg font-semibold text-ink"
          >
            {t('locale.dialogTitle')}
          </h2>
          <button
            type="button"
            className="btn-icon-ink inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-ink bg-ink text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            aria-label={t('locale.closeDialogAria')}
            onClick={close}
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <FilterTerracottaDropdown
            id="dialog-locale-lang"
            label={t('locale.language')}
            options={languageOptions}
            value={language}
            listPortal
            onChange={(v) => setLanguage(v as AppLanguage)}
          />
          <FilterTerracottaDropdown
            id="dialog-locale-currency"
            label={t('locale.currency')}
            options={currencyOptions}
            value={currency}
            listPortal
            onChange={(v) => setCurrency(v as DisplayCurrency)}
          />
          <FilterTerracottaDropdown
            id="dialog-locale-area"
            label={t('locale.area')}
            options={areaOptions}
            value={areaUnit}
            listPortal
            onChange={(v) => setAreaUnit(v as AreaDisplayMode)}
          />
        </div>

        <div className="shrink-0 border-t border-ink/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <button
            type="button"
            className={buttonClassNames('primary', 'w-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em]')}
            onClick={close}
          >
            {t('locale.done')}
          </button>
        </div>
      </div>
    </>
  ) : null

  return (
    <>
      <button
        type="button"
        className={clsx(
          'inline-flex size-10 items-center justify-center rounded-full transition-[color,background-color,border-color] duration-300 ease-out sm:size-11',
          surface === 'paper'
            ? 'border border-ink/15 bg-ink/[0.06] text-ink hover:border-terracotta hover:bg-terracotta hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta'
            : 'border border-white/35 bg-white/10 text-cream hover:border-cream/50 hover:bg-terracotta hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
          NAV_LOCALE_CONTROLS_VISIBLE ? className : '!hidden',
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('locale.openSettingsAria')}
        onClick={() => setOpen(true)}
      >
        <Globe className="size-5" strokeWidth={1.75} aria-hidden />
      </button>
      {typeof document !== 'undefined' && dialog
        ? createPortal(dialog, document.body)
        : null}
    </>
  )
}
