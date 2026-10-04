import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCms } from '../contexts/CmsContext'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'

/** Fallback names → slug guesses when CMS has no published developers yet. */
const FALLBACK_PARTNERS: { name: string; slug: string }[] = [
  { name: 'Emaar', slug: 'emaar' },
  { name: 'DAMAC', slug: 'damac' },
  { name: 'Nakheel', slug: 'nakheel' },
  { name: 'Meraas', slug: 'meraas' },
  { name: 'Sobha Realty', slug: 'sobha-realty' },
  { name: 'Dubai Properties', slug: 'dubai-properties' },
  { name: 'Omniyat', slug: 'omniyat' },
  { name: 'Binghatti', slug: 'binghatti' },
  { name: 'Ellington', slug: 'ellington' },
  { name: 'Select Group', slug: 'select-group' },
]

function LogoTile({ name, slug }: { name: string; slug: string }) {
  return (
    <Link
      to={`/developers/${slug}`}
      className="flex shrink-0 items-center justify-center rounded-2xl bg-white/95 px-7 py-3.5 shadow-sm ring-1 ring-terracotta/5 transition hover:bg-white hover:ring-terracotta/20 sm:px-9 sm:py-4"
    >
      <span className="whitespace-nowrap font-display font-semibold tracking-wide text-terracotta">
        {name}
      </span>
    </Link>
  )
}

type MarqueeProps = {
  id?: string
  'aria-label'?: string
}

export function LogoMarqueeSection({
  id = 'partner-marquee',
  'aria-label': ariaLabel,
}: MarqueeProps = {}) {
  const { t } = useLocalePreferences()
  const { developersWithListings, propertyDevelopersList } = useCms()

  const partners = useMemo(() => {
    const fromListings = developersWithListings.map((d) => ({
      name: d.name,
      slug: d.slug,
    }))
    if (fromListings.length > 0) return fromListings

    const fromCms = propertyDevelopersList.map((d) => ({
      name: d.name,
      slug: d.slug,
    }))
    if (fromCms.length > 0) return fromCms

    return FALLBACK_PARTNERS
  }, [developersWithListings, propertyDevelopersList])

  const resolvedAria = ariaLabel ?? t('marquee.defaultAria')
  const track = [...partners, ...partners]
  const srOnly = useMemo(
    () => t('marquee.srOnly', { names: partners.map((p) => p.name).join(', ') }),
    [t, partners],
  )

  return (
    <section id={id} aria-label={resolvedAria} className="w-full">
      <p className="sr-only">{srOnly}</p>
      <div className="relative w-full overflow-hidden py-2 sm:py-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-terracotta to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-terracotta to-transparent sm:w-16" />
        <div className="overflow-hidden">
          <div className="marquee-track flex gap-4 sm:gap-5">
            {track.map((partner, i) => (
              <LogoTile key={`${partner.slug}-${i}`} name={partner.name} slug={partner.slug} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
