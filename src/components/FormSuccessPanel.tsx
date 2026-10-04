import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'

export type FormSuccessVariant =
  | 'contact'
  | 'newsletter'
  | 'popup'
  | 'enquiry'
  | 'brochure'

type Props = {
  variant: FormSuccessVariant
  tone?: 'light' | 'onDark'
  className?: string
  actions?: ReactNode
}

export function FormSuccessPanel({
  variant,
  tone = 'light',
  className,
  actions,
}: Props) {
  const { t } = useLocalePreferences()
  const onDark = tone === 'onDark'

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'form-success-panel flex flex-col',
        onDark ? 'items-start text-cream' : 'items-start text-terracotta',
        className,
      )}
    >
      <div
        className={clsx(
          'form-success-mark mb-4 flex size-14 items-center justify-center rounded-full sm:mb-5 sm:size-16',
          onDark
            ? 'bg-cream/12 ring-1 ring-cream/35'
            : 'bg-terracotta/[0.08] ring-1 ring-terracotta/20',
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 32 32"
          className={clsx(
            'form-success-check size-7 sm:size-8',
            onDark ? 'text-cream' : 'text-terracotta',
          )}
          fill="none"
        >
          <circle
            cx="16"
            cy="16"
            r="14"
            className={clsx(
              'form-success-ring',
              onDark ? 'stroke-cream/35' : 'stroke-terracotta/25',
            )}
            strokeWidth="1.5"
          />
          <path
            d="M9.5 16.4 13.8 20.5 22.5 11.5"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="form-success-tick"
          />
        </svg>
      </div>

      <p
        className={clsx(
          'font-compact text-[0.6875rem] font-semibold uppercase tracking-[0.22em]',
          onDark ? 'text-cream/65' : 'text-terracotta/65',
        )}
      >
        {t(`formSuccess.${variant}.eyebrow`)}
      </p>
      <h2
        className={clsx(
          'mt-2 font-display font-medium leading-tight tracking-tight',
          variant === 'newsletter'
            ? 'text-lg sm:text-xl'
            : 'type-section-title text-xl sm:text-2xl',
        )}
      >
        {t(`formSuccess.${variant}.title`)}
      </h2>
      <p
        className={clsx(
          'mt-2.5 max-w-md font-sans leading-relaxed',
          variant === 'newsletter' ? 'text-sm sm:text-[0.95rem]' : 'text-base sm:text-[1.05rem]',
          onDark ? 'text-cream/85' : 'text-terracotta/88',
        )}
      >
        {t(`formSuccess.${variant}.body`)}
      </p>

      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
