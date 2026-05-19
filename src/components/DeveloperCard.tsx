import { Link } from 'react-router-dom'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import type { DeveloperWithListings } from '@/lib/cms/loadCmsSnapshot'

type Props = {
  developer: DeveloperWithListings
}

export function DeveloperCard({ developer }: Props) {
  const { t } = useLocalePreferences()
  const logo = developer.logoUrl?.trim()

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[1.125rem] border border-ink/8 bg-white shadow-sm transition hover:border-terracotta/25 hover:shadow-md">
      <Link
        to={`/developers/${developer.slug}`}
        className="absolute inset-0 z-10 rounded-[1.125rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        aria-label={t('developers.cardAria', { name: developer.name })}
      />
      <div className="flex min-h-[7.5rem] flex-col items-center justify-center px-6 py-8">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="max-h-14 w-auto max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-center font-display text-lg font-semibold tracking-wide text-terracotta sm:text-xl">
            {developer.name}
          </span>
        )}
      </div>
      <div className="relative z-20 border-t border-ink/6 px-4 py-4 text-center">
        <p className="type-card-title font-compact font-normal uppercase tracking-[0.02em] text-ink">
          {developer.name}
        </p>
        <p className="mt-1 text-sm text-ink/60">
          {t('developers.listingsCount', { count: String(developer.listingsCount) })}
        </p>
      </div>
    </article>
  )
}
