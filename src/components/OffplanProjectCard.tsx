import { Link } from 'react-router-dom'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { projectCardImage, type PublicOffplanProject } from '@/lib/cms/mapOffplanProject'
import type { PublicDeveloper } from '@/lib/cms/loadCmsSnapshot'

type Props = {
  project: PublicOffplanProject
  developer?: PublicDeveloper | null
}

export function OffplanProjectCard({ project, developer }: Props) {
  const { t } = useLocalePreferences()
  const image = projectCardImage(project)

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.125rem] border border-ink/8 bg-white shadow-sm transition hover:border-terracotta/25 hover:shadow-md">
      <Link
        to={`/offplan/${project.slug}`}
        className="absolute inset-0 z-10 rounded-[1.125rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        aria-label={t('offplan.cardAria', { name: project.name })}
      />
      <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
        {image ? (
          <img
            src={image}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-terracotta/10 px-4 text-center font-display text-lg font-semibold text-terracotta">
            {project.name}
          </div>
        )}
      </div>
      <div className="relative z-20 flex flex-1 flex-col gap-2 px-4 py-4">
        {developer?.logoUrl ? (
          <img
            src={developer.logoUrl}
            alt=""
            className="h-6 w-auto max-w-[8rem] object-contain object-left"
            loading="lazy"
          />
        ) : developer ? (
          <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/50">
            {developer.name}
          </p>
        ) : null}
        <h3 className="font-display text-lg font-semibold leading-snug text-ink">
          {project.name}
        </h3>
        {project.shortDescription ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink/70">
            {project.shortDescription}
          </p>
        ) : null}
        <p className="mt-auto pt-2 text-sm font-medium text-terracotta">
          {t('offplan.viewProject')}
        </p>
      </div>
    </article>
  )
}
