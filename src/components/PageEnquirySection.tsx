import { ProjectLeadForm } from '@/components/ProjectLeadForm'
import { SectionShell } from '@/components/SectionShell'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'

export const PAGE_ENQUIRY_ANCHOR = 'enquire'

type Props = {
  /** Which page the lead came from, saved with the lead for the sales team. */
  pageContext: 'offplan' | 'developer' | 'for_sale'
  title: string
  intro: string
  /** What the visitor is interested in (e.g. "Emaar"), shown to the team in the CRM. */
  interest: string
}

/**
 * General enquiry form for landing pages that list many projects or homes,
 * so ad visitors can enquire without first opening a single project.
 */
export function PageEnquirySection({ pageContext, title, intro, interest }: Props) {
  const { t } = useLocalePreferences()
  const points = [t('pageEnquiry.point1'), t('pageEnquiry.point2'), t('pageEnquiry.point3')]

  return (
    <SectionShell
      variant="cream"
      id={PAGE_ENQUIRY_ANCHOR}
      aria-label={title}
      className="scroll-mt-24"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start">
        <div className="min-w-0">
          <p className="type-card-title font-compact uppercase tracking-[0.02em] text-ink/70">
            {t('pageEnquiry.eyebrow')}
          </p>
          <h2 className="mt-2 max-w-xl font-display text-2xl font-semibold leading-tight text-terracotta sm:text-3xl">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-ink/75">
            {intro}
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-ink/80">
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-terracotta"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <ProjectLeadForm
          projectId={null}
          projectName={interest}
          salesperson={null}
          intent="inquiry"
          source="contact"
          headline={t('pageEnquiry.formHeadline')}
          extraMeta={{ page_context: pageContext, interest }}
          idPrefix={`page-enquiry-${pageContext}`}
        />
      </div>
    </SectionShell>
  )
}
