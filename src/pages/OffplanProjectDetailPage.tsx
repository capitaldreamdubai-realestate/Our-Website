import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { ProjectBrochureDialog } from '@/components/ProjectBrochureDialog'
import { ProjectGalleryHero } from '@/components/ProjectGalleryHero'
import { ProjectLeadForm } from '@/components/ProjectLeadForm'
import { SectionShell } from '@/components/SectionShell'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { usePageSeo } from '@/hooks/usePageSeo'
import {
  fetchProjectBrochureUrl,
  triggerBrochureDownload,
} from '@/lib/fetchProjectBrochure'

export function OffplanProjectDetailPage() {
  const { slug } = useParams()
  const {
    offplanProjectsBySlug,
    propertyDevelopersList,
    salespeopleById,
    loading,
  } = useCms()
  const { t } = useLocalePreferences()
  const [brochureOpen, setBrochureOpen] = useState(false)
  const [brochureBusy, setBrochureBusy] = useState(false)
  const [brochureErr, setBrochureErr] = useState<string | null>(null)

  const project = slug ? offplanProjectsBySlug[slug] : undefined

  const developer = useMemo(() => {
    if (!project) return undefined
    return propertyDevelopersList.find((d) => d.id === project.developerId)
  }, [project, propertyDevelopersList])

  const salesperson = project?.salespersonId
    ? salespeopleById[project.salespersonId] ?? null
    : null

  usePageSeo({
    title: project
      ? t('offplan.detail.seoTitle', { name: project.name })
      : t('offplan.detail.seoTitleMissing'),
    description: project
      ? project.shortDescription || t('offplan.detail.seoDesc', { name: project.name })
      : t('offplan.detail.seoDescMissing'),
  })

  async function handleBrochureUnlocked(submissionId: string) {
    if (!project) return
    setBrochureBusy(true)
    setBrochureErr(null)
    const { url, error } = await fetchProjectBrochureUrl(project.id, submissionId)
    setBrochureBusy(false)
    if (error || !url) {
      setBrochureErr(error ?? t('projectLead.brochureError'))
      return
    }
    triggerBrochureDownload(url, `${project.slug}-brochure.pdf`)
  }

  if (!loading && !project) {
    return <Navigate to="/offplan" replace />
  }

  if (!project) {
    return (
      <main className="flex w-full flex-col gap-[0.625rem]">
        <SectionShell variant="cream">
          <p className="text-[length:var(--brand-font-body-lg)] text-ink/70">
            {t('offplan.loading')}
          </p>
        </SectionShell>
      </main>
    )
  }

  return (
    <main
      id={`page-offplan-${project.slug}`}
      className="flex w-full flex-col gap-[0.625rem]"
      aria-label={project.name}
    >
      <ProjectGalleryHero title={project.name} gallery={project.gallery} />

      <SectionShell variant="cream">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                {developer ? (
                  <Link
                    to={`/developers/${developer.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-terracotta underline-offset-2 hover:underline"
                  >
                    {developer.logoUrl ? (
                      <img
                        src={developer.logoUrl}
                        alt=""
                        className="h-8 w-auto max-w-[7rem] object-contain"
                      />
                    ) : null}
                    <span>{developer.name}</span>
                  </Link>
                ) : null}
                <p className="mt-3 text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/80">
                  {project.shortDescription}
                </p>
              </div>
              <Link
                to="/offplan"
                className={`${buttonClassNames('outlineTerracotta')} shrink-0 self-end sm:self-start`}
              >
                {t('offplan.detail.back')}
              </Link>
            </div>

            {project.descriptionHtml ? (
              <div
                className="prose prose-ink mt-8 max-w-none text-ink/85"
                dangerouslySetInnerHTML={{ __html: project.descriptionHtml }}
              />
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#project-inquiry" className={buttonClassNames('primary')}>
                {t('projectLead.sendInquiry')}
              </a>
              {project.hasBrochure ? (
                <button
                  type="button"
                  disabled={brochureBusy}
                  onClick={() => setBrochureOpen(true)}
                  className={buttonClassNames('outlineTerracotta')}
                >
                  {brochureBusy ? t('projectLead.preparing') : t('projectLead.downloadBrochure')}
                </button>
              ) : null}
            </div>
            {brochureErr ? (
              <p className="mt-3 text-sm text-red-600">{brochureErr}</p>
            ) : null}
          </div>

          <aside id="project-inquiry" className="w-full shrink-0 lg:max-w-md">
            <ProjectLeadForm
              intent="inquiry"
              projectId={project.id}
              projectName={project.name}
              salesperson={salesperson}
            />
          </aside>
        </div>
      </SectionShell>

      <ProjectBrochureDialog
        open={brochureOpen}
        onClose={() => setBrochureOpen(false)}
        projectId={project.id}
        projectName={project.name}
        salesperson={salesperson}
        onBrochureUnlocked={handleBrochureUnlocked}
      />
    </main>
  )
}
