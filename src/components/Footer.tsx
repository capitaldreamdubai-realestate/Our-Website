import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { cn } from '../lib/utils'
import { Button } from './Button'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function Col({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs font-sans font-semibold uppercase tracking-wide text-white sm:text-sm">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm sm:mt-4 sm:space-y-2.5 sm:text-base">{children}</ul>
    </div>
  )
}

/** Full viewport width — sits outside the padded page frame. */
export function Footer() {
  const { t } = useLocalePreferences()
  const [email, setEmail] = useState('')
  const [attempted, setAttempted] = useState(false)
  const trimmed = email.trim()
  const emptyError = Boolean(attempted && trimmed.length === 0)
  const formatError = Boolean(attempted && trimmed.length > 0 && !isValidEmail(trimmed))
  const showError = emptyError || formatError

  const propertyLinks = useMemo(
    () =>
      [
        { label: t('footer.link.forSaleAnchor'), href: '/#homes' },
        { label: t('footer.link.forRentAnchor'), href: '/#home-more-homes' },
        { label: t('footer.link.allProperties'), href: '/all-properties' },
      ] as const,
    [t],
  )

  const aboutLinks = useMemo(
    () => [
      { label: t('footer.link.practice'), href: '/about#about-intro' },
      { label: t('footer.link.team'), href: '/team' },
      { label: t('footer.link.contact'), href: '/contact-us', useRouter: true },
      { label: t('footer.link.faq'), href: '/faq', useRouter: true },
    ],
    [t],
  )

  const serviceLinks = useMemo(
    () =>
      [
        { label: t('footer.link.buy'), href: '/#services' },
        { label: t('footer.link.sell'), href: '/#services' },
        { label: t('footer.link.concierge'), href: '/#services' },
      ] as const,
    [t],
  )

  const connectLinks = useMemo(
    () =>
      [
        { label: t('footer.instagram'), href: 'https://instagram.com' },
        {
          label: 'Info@capitaldreamdubai.com',
          href: 'mailto:Info@capitaldreamdubai.com',
        },
        { label: '+971 50 108 3541', href: 'tel:+971501083541' },
        {
          label:
            'Rosebay Living · Office No R02 · Meydan · Dubai · UAE',
          href: 'https://maps.google.com/?q=Rosebay+Living+Office+No+R02+Meydan+Dubai+UAE',
        },
      ] as const,
    [t],
  )

  function handleNewsletterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAttempted(true)
    if (!trimmed || !isValidEmail(trimmed)) return

    const subj = encodeURIComponent(t('follow.mailSubject'))
    const body = encodeURIComponent(t('follow.mailBody', { email: trimmed }))
    window.location.href = `mailto:Info@capitaldreamdubai.com?subject=${subj}&body=${body}`
  }

  return (
    <footer id="contact" className="mt-[0.625rem] w-full text-cream">
      <div className="w-full px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12 xl:grid-cols-7 xl:gap-x-4 2xl:gap-x-8">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <img
              src="/LOGO%20VERTICAL.png"
              alt={t('aria.logo')}
              className="h-32 w-auto object-contain sm:h-32"
              loading="lazy"
              decoding="async"
            />
          </div>
          <Col title={t('footer.col.property')}>
            {propertyLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-cream/90 leading-relaxed transition hover:text-white"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </Col>
          <Col title={t('footer.col.about')}>
            {aboutLinks.map((l) => (
              <li key={l.label}>
                {l.useRouter ? (
                  <Link
                    to={l.href}
                    className="text-cream/90 leading-relaxed transition hover:text-white"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    href={l.href}
                    className="text-cream/90 leading-relaxed transition hover:text-white"
                  >
                    {l.label}
                  </a>
                )}
              </li>
            ))}
          </Col>
          <Col title={t('footer.col.services')}>
            {serviceLinks.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="text-cream/90 leading-relaxed transition hover:text-white"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </Col>
          <Col
            title={t('footer.col.connect')}
            className="lg:col-span-2 xl:col-span-1"
          >
            {connectLinks.map((l) => (
              <li key={l.label} className="min-w-0">
                <a
                  href={l.href}
                  className="break-words text-cream/90 leading-relaxed transition hover:text-white"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </Col>
          <div className="min-w-0 lg:col-span-2 xl:col-span-2">
            <p className="text-xs font-sans font-semibold uppercase tracking-wide text-white sm:text-sm">
              {t('footer.newsletter')}
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="mt-3 flex w-full flex-col gap-3 sm:mt-4"
              noValidate
            >
              <div className="flex min-w-0 w-full flex-col gap-1.5">
                <label htmlFor="footer-subscribe-email" className="sr-only">
                  {t('follow.emailLabel')}
                </label>
                <input
                  id="footer-subscribe-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t('follow.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={showError || undefined}
                  aria-describedby={
                    showError ? 'footer-subscribe-email-error' : undefined
                  }
                  className={`min-h-12 w-full rounded-xl border bg-white/90 px-4 py-3 text-base leading-snug font-sans font-normal normal-case tracking-normal text-ink placeholder:text-ink/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/35 sm:min-h-[3.75rem] sm:px-6 sm:py-3.5 sm:text-lg ${
                    showError
                      ? 'border-terracotta'
                      : 'border-terracotta/35 focus-visible:border-terracotta/60'
                  }`}
                />
                {showError ? (
                  <p
                    id="footer-subscribe-email-error"
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
                className="btn-hover-subscribe h-auto min-h-12 w-full whitespace-normal border border-ink px-4 py-3 text-center text-sm font-medium normal-case leading-snug tracking-normal sm:min-h-14 sm:px-5 sm:py-3.5 sm:text-base"
              >
                {t('follow.ctaSubscribe')}
              </Button>
            </form>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-cream/15 pt-8 text-cream/70 sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('footer.copyright', { year: String(new Date().getFullYear()) })}
          </p>
          <div className="flex flex-wrap gap-6">
            <Link to="/privacy-policy" className="nav-caps hover:text-cream">
              {t('footer.privacy')}
            </Link>
            <Link to="/terms" className="nav-caps hover:text-cream">
              {t('footer.terms')}
            </Link>
            <Link to="/cookies" className="nav-caps hover:text-cream">
              {t('footer.cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
