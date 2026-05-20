import clsx from 'clsx'
import { NavLink } from 'react-router-dom'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'

type Props = {
  className?: string
}

/** Prominent Deals CTA — desktop header, left of locale controls. */
export function NavbarDealsButton({ className }: Props) {
  const { t } = useLocalePreferences()

  return (
    <NavLink
      to="/deals"
      className={({ isActive }) =>
        clsx(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full px-4 py-2',
          'font-compact text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white sm:px-5 sm:py-2.5 sm:text-xs',
          'bg-red-600 shadow-[0_4px_14px_rgba(185,28,28,0.45)]',
          'transition-[transform,background-color,box-shadow] duration-300',
          'hover:bg-red-700 hover:shadow-[0_6px_18px_rgba(185,28,28,0.55)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600',
          'motion-safe:animate-deals-glow',
          isActive && 'ring-2 ring-white/90 ring-offset-2 ring-offset-transparent',
          className,
        )
      }
    >
      <span
        className="pointer-events-none absolute inset-0 motion-safe:animate-deals-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />
      <span className="relative z-[1]">{t('nav.deals')}</span>
    </NavLink>
  )
}
