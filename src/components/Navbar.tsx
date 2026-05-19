import clsx from 'clsx'
import { ArrowUpRight, ChevronDown, Menu, PanelRight, X } from 'lucide-react'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { NavbarLocaleControls } from './NavbarLocaleControls'

type NavFlatItem = { type: 'link'; key: string; to: string; end?: boolean }
type NavAboutItem = {
  type: 'about'
  aboutKey: string
  aboutTo: string
  subItems: Array<{ key: string; to: string }>
}
type NavItem = NavFlatItem | NavAboutItem

const navStructure: NavItem[] = [
  { type: 'link', key: 'nav.home', to: '/', end: true },
  { type: 'link', key: 'nav.allProperties', to: '/all-properties' },
  { type: 'link', key: 'nav.newDevelopments', to: '/offplan' },
  { type: 'link', key: 'nav.developers', to: '/developers' },
  { type: 'link', key: 'nav.forRent', to: '/for-rent' },
  { type: 'link', key: 'nav.forSale', to: '/for-sale' },
  {
    type: 'about',
    aboutKey: 'nav.about',
    aboutTo: '/about',
    subItems: [
      { key: 'nav.team', to: '/team' },
      { key: 'nav.contact', to: '/contact-us' },
      { key: 'nav.testimonials', to: '/testimonials' },
      { key: 'nav.articles', to: '/articles' },
    ],
  },
  { type: 'link', key: 'nav.faq', to: '/faq' },
]

function subItemPathActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function Navbar() {
  const { t } = useLocalePreferences()
  const { pathname } = useLocation()
  const isXl = useMediaQuery('(min-width: 1280px)')
  const heroOverlayLayout = pathname === '/'
  const [solidBar, setSolidBar] = useState(false)
  const [open, setOpen] = useState(false)
  const innerScrolled = !heroOverlayLayout && solidBar && !open
  const centerSlotRef = useRef<HTMLDivElement>(null)
  const measureUlRef = useRef<HTMLUListElement>(null)
  const [desktopOverflow, setDesktopOverflow] = useState(false)

  useEffect(() => {
    const update = () => {
      const y = window.scrollY
      const pastHero = heroOverlayLayout ? y > 0 : y > 12
      setSolidBar(pastHero)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [heroOverlayLayout])

  useLayoutEffect(() => {
    if (!isXl) {
      setDesktopOverflow(false)
      return
    }
    const slot = centerSlotRef.current
    const measure = measureUlRef.current
    if (!slot || !measure) return

    const check = () => {
      const needSheet = measure.offsetWidth > slot.clientWidth + 12
      setDesktopOverflow(needSheet)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(slot)
    window.addEventListener('resize', check)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [isXl, pathname, t])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const headerBar =
    solidBar && !open
      ? heroOverlayLayout
        ? 'border-b border-white/15 bg-terracotta/35 shadow-sm backdrop-blur-xl backdrop-saturate-150'
        : 'border-b border-black/10 bg-white shadow-sm'
      : 'border-b border-transparent bg-transparent'

  const linkStructure =
    'type-nav-link font-display font-medium uppercase tracking-[0.16em] sm:tracking-[0.2em] lg:tracking-[0.14em] xl:tracking-[0.18em]'

  const linkClass = clsx(
    linkStructure,
    innerScrolled ? 'text-ink/90' : 'text-cream/95',
  )

  /** Cream-on-terracotta flyout (parent link may be ink on white bar). */
  const linkClassFlyout = clsx(linkStructure, 'text-cream/95')

  const linkActive = innerScrolled ? 'bg-black/10 text-ink' : 'bg-white/20 text-white'
  const linkHover = innerScrolled ? 'hover:text-ink' : 'hover:text-white'

  const showInlineDesktop = isXl && !desktopOverflow
  const showMenuControl = !isXl || desktopOverflow
  const desktopSheet = isXl && desktopOverflow && open
  const mobileOverlay = !isXl && open

  const measureSpanClass = clsx(
    linkClass,
    'inline-block whitespace-nowrap px-3 py-2 sm:px-3.5 sm:py-2',
  )

  return (
    <header
      className={clsx(
        'top-0 z-[100] w-full transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300',
        heroOverlayLayout ? 'fixed left-0 right-0' : 'sticky top-0',
        headerBar,
      )}
    >
      <nav
        className={clsx(
          'flex w-full min-w-0 items-center justify-between gap-2 px-6 py-5 sm:gap-3 sm:px-6 sm:py-4 xl:gap-4 xl:px-6 2xl:px-10',
          innerScrolled
            ? 'text-ink'
            : 'text-cream [text-shadow:0_1px_2px_rgba(28,20,18,0.45)]',
        )}
        aria-label={t('aria.nav.main')}
      >
        <Link
          to="/"
          className="type-wordmark-nav font-brand z-10 ml-2.5 max-w-[46%] shrink-0 font-bold uppercase tracking-[0.06em] sm:ml-0 sm:max-w-none"
          onClick={() => setOpen(false)}
        >
          <img
            src="/LOGO%20NO%20ICON.png"
            alt={t('aria.logo')}
            className={clsx(
              'h-8 w-auto object-contain sm:h-5 xl:h-8',
              innerScrolled && 'brightness-0',
            )}
            loading="eager"
            decoding="async"
          />
        </Link>

        {/* Width sample for overflow detection (xl+) */}
        <ul
          ref={measureUlRef}
          className="pointer-events-none fixed left-0 top-0 z-[-1] flex w-max flex-nowrap items-center gap-x-0.5 opacity-0 xl:gap-x-1.5"
          aria-hidden
        >
          {navStructure.map((item) =>
            item.type === 'link' ? (
              <li key={item.to} className="shrink-0">
                <span className={measureSpanClass}>{t(item.key)}</span>
              </li>
            ) : (
              <li key={item.aboutTo} className="shrink-0">
                <span className={measureSpanClass}>{t(item.aboutKey)}</span>
              </li>
            ),
          )}
        </ul>

        <div
          ref={centerSlotRef}
          className={clsx(
            'min-h-0 min-w-0 flex-1',
            showInlineDesktop ? 'flex justify-center' : 'hidden xl:flex xl:justify-center',
          )}
        >
          {showInlineDesktop ? (
            <ul className="flex min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-0.5 xl:gap-x-1.5">
              {navStructure.map((item) =>
                item.type === 'link' ? (
                  <li key={item.to} className="shrink-0">
                    <NavLink
                      to={item.to}
                      end={Boolean(item.end)}
                      className={({ isActive }) =>
                        clsx(
                          linkClass,
                          'inline-block whitespace-nowrap rounded-md px-3 py-2 transition-colors sm:px-3.5 sm:py-2',
                          isActive && linkActive,
                          !isActive && linkHover,
                        )
                      }
                    >
                      {t(item.key)}
                    </NavLink>
                  </li>
                ) : (
                  <li key={item.aboutTo} className="group relative shrink-0">
                    <NavLink
                      to={item.aboutTo}
                      end
                      className={({ isActive }) => {
                        const subItemOn = item.subItems.some((subItem) =>
                          subItemPathActive(pathname, subItem.to),
                        )
                        return clsx(
                          linkClass,
                          'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 transition-colors sm:px-3.5 sm:py-2',
                          (isActive || subItemOn) && linkActive,
                          !isActive && !subItemOn && linkHover,
                        )
                      }}
                    >
                      {t(item.aboutKey)}
                      <ChevronDown className="size-3.5 shrink-0 opacity-90" aria-hidden />
                    </NavLink>
                    <div className="pointer-events-none invisible absolute left-0 top-full z-[120] mt-1 min-w-[11rem] rounded-lg border border-white/20 bg-terracotta/95 py-1.5 opacity-0 shadow-lg transition-[opacity,visibility] duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                      {item.subItems.map((subItem) => (
                        <NavLink
                          key={subItem.to}
                          to={subItem.to}
                          className={({ isActive }) =>
                            clsx(
                              linkClassFlyout,
                              'block whitespace-nowrap px-4 py-2.5 text-[0.7rem] transition-colors sm:text-[0.72rem]',
                              isActive && 'bg-white/15 text-white',
                              !isActive && 'hover:bg-white/10 hover:text-white',
                            )
                          }
                        >
                          {t(subItem.key)}
                        </NavLink>
                      ))}
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : null}
        </div>

        <div className="z-10 flex shrink-0 items-center gap-2">
          <NavbarLocaleControls
            surface={innerScrolled ? 'paper' : 'hero'}
            className={clsx(!showInlineDesktop && isXl ? 'inline-flex' : 'hidden xl:inline-flex')}
          />
          {showMenuControl ? (
            <button
              type="button"
              className={clsx(
                'rounded-full p-2 transition-[color,background-color] duration-300 ease-out xl:p-2.5',
                innerScrolled
                  ? 'text-ink hover:bg-terracotta hover:text-cream'
                  : 'text-cream hover:bg-terracotta/85 hover:text-cream',
              )}
              aria-expanded={open}
              aria-controls="site-nav-sheet"
              aria-label={open ? t('aria.nav.closeMenu') : t('aria.nav.openMenu')}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <X className="h-6 w-6" />
              ) : isXl && desktopOverflow ? (
                <PanelRight className="h-6 w-6" strokeWidth={1.75} />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          ) : null}
        </div>
      </nav>

      {/* Mobile / tablet: full-screen menu */}
      <div
        id="site-nav-sheet"
        className={clsx(
          'fixed inset-0 z-[200] xl:hidden',
          mobileOverlay
            ? 'pointer-events-auto'
            : 'pointer-events-none',
        )}
        aria-hidden={!mobileOverlay}
      >
        <button
          type="button"
          className={clsx(
            'absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300',
            mobileOverlay ? 'opacity-100' : 'opacity-0',
          )}
          aria-label={t('aria.nav.closeMenu')}
          onClick={() => setOpen(false)}
        />
        <div
          className={clsx(
            'absolute inset-y-0 right-0 flex w-[min(100vw,24rem)] flex-col bg-black text-cream shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            mobileOverlay ? 'translate-x-0' : 'translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t('aria.nav.siteMenu')}
        >
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-white/25 px-4 py-3 sm:px-5">
            <NavbarLocaleControls />
            <button
              type="button"
              className="rounded-xl border border-white/20 bg-terracotta/20 p-3 text-cream transition-[color,background-color,border-color] duration-300 ease-out hover:border-terracotta hover:bg-terracotta hover:text-cream"
              onClick={() => setOpen(false)}
              aria-label={t('aria.nav.closeMenu')}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-5">
            {navStructure.map((item) =>
              item.type === 'link' ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={Boolean(item.end)}
                  className={({ isActive }) =>
                    clsx(
                      linkClassFlyout,
                      'flex origin-left transform-gpu items-center justify-between border-b border-dashed border-white/25 py-5 text-left transition-[transform,color,font-weight] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
                      isActive && 'scale-[1.4] text-white font-semibold',
                      !isActive && 'hover:scale-[1.4] hover:text-white hover:font-semibold',
                    )
                  }
                  onClick={() => setOpen(false)}
                >
                  <span>{t(item.key)}</span>
                  <ArrowUpRight aria-hidden className="size-5 shrink-0" />
                </NavLink>
              ) : (
                <Fragment key={item.aboutTo}>
                  <NavLink
                    to={item.aboutTo}
                    end
                    className={({ isActive }) =>
                      clsx(
                        linkClassFlyout,
                        'flex origin-left transform-gpu items-center justify-between border-b border-dashed border-white/25 py-5 text-left transition-[transform,color,font-weight] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
                        isActive && 'scale-[1.4] text-white font-semibold',
                        !isActive && 'hover:scale-[1.4] hover:text-white hover:font-semibold',
                      )
                    }
                    onClick={() => setOpen(false)}
                  >
                    <span>{t(item.aboutKey)}</span>
                    <ArrowUpRight aria-hidden className="size-5 shrink-0" />
                  </NavLink>
                  {item.subItems.map((subItem) => (
                    <NavLink
                      key={subItem.to}
                      to={subItem.to}
                      className={({ isActive }) =>
                        clsx(
                          linkClassFlyout,
                          'flex origin-left transform-gpu items-center justify-between border-b border-dashed border-white/25 py-5 text-left transition-[transform,color,font-weight] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
                          isActive && 'scale-[1.4] text-white font-semibold',
                          !isActive && 'hover:scale-[1.4] hover:text-white hover:font-semibold',
                        )
                      }
                      onClick={() => setOpen(false)}
                    >
                      <span>{t(subItem.key)}</span>
                      <ArrowUpRight aria-hidden className="size-5 shrink-0" />
                    </NavLink>
                  ))}
                </Fragment>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Desktop (xl+): slide-in sheet when nav does not fit */}
      {desktopSheet ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[199] bg-ink/40 backdrop-blur-[2px]"
            aria-label={t('aria.nav.closeMenu')}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-[200] flex w-[min(100vw-1rem,22rem)] flex-col border-l border-white/15 bg-terracotta/98 py-4 text-cream shadow-2xl backdrop-blur-xl motion-safe:animate-[navSheetIn_0.28s_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-label={t('aria.nav.siteMenu')}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-3">
              <p className="type-nav-link font-display text-xs font-semibold uppercase tracking-[0.2em] text-cream/90">
                {t('aria.nav.menuTitle')}
              </p>
              <button
                type="button"
                className="rounded-full p-2 text-cream"
                onClick={() => setOpen(false)}
                aria-label={t('aria.nav.closeMenu')}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-8 pt-4">
              {navStructure.map((item) =>
                item.type === 'link' ? (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={Boolean(item.end)}
                    className={({ isActive }) =>
                      clsx(
                        linkClassFlyout,
                        'rounded-xl px-3 py-3.5 transition-colors',
                        isActive && 'bg-white/20 text-white',
                        !isActive && 'hover:bg-white/10',
                      )
                    }
                    onClick={() => setOpen(false)}
                  >
                    {t(item.key)}
                  </NavLink>
                ) : (
                  <Fragment key={item.aboutTo}>
                    <NavLink
                      to={item.aboutTo}
                      end
                      className={({ isActive }) =>
                        clsx(
                          linkClassFlyout,
                          'rounded-xl px-3 py-3.5 transition-colors',
                          isActive && 'bg-white/20 text-white',
                          !isActive && 'hover:bg-white/10',
                        )
                      }
                      onClick={() => setOpen(false)}
                    >
                      {t(item.aboutKey)}
                    </NavLink>
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.to}
                        to={subItem.to}
                        className={({ isActive }) =>
                          clsx(
                            linkClassFlyout,
                            '-mt-0.5 ml-2 rounded-xl border-l border-white/20 py-2.5 pl-4 pr-3 transition-colors',
                            isActive && 'bg-white/20 text-white',
                            !isActive && 'hover:bg-white/10',
                          )
                        }
                        onClick={() => setOpen(false)}
                      >
                        {t(subItem.key)}
                      </NavLink>
                    ))}
                  </Fragment>
                ),
              )}
            </div>
          </div>
        </>
      ) : null}

      <style>{`
        @keyframes navSheetIn {
          from {
            transform: translateX(100%);
            opacity: 0.85;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </header>
  )
}
