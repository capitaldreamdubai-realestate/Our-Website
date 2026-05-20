import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCms } from '../contexts/CmsContext'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { SectionShell } from '../components/SectionShell'

type AboutFaqTopicsSectionProps = {
  id?: string
  'aria-label'?: string
}

export function AboutFaqTopicsSection({
  id = 'about-video-band',
  'aria-label': ariaLabel = 'About us — FAQ topics',
}: AboutFaqTopicsSectionProps = {}) {
  const { faqSections, loading } = useCms()
  const { t } = useLocalePreferences()
  const topics = faqSections.slice(0, 5).map((topic) => ({
    ...topic,
    entries: topic.entries.slice(0, 7),
  }))
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const activeTopic = useMemo(() => {
    if (topics.length === 0) return null
    if (activeTopicId) {
      const found = topics.find((topic) => topic.id === activeTopicId)
      if (found) return found
    }
    return topics[0]
  }, [topics, activeTopicId])

  return (
    <SectionShell variant="cream" id={id} aria-label={ariaLabel} compactMobilePad>
      <div className="w-full py-4 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="nav-caps text-ink/60">Topics</p>
            <h1 className="mt-3 type-heading-display font-display font-semibold leading-tight text-ink">
              Frequently asked questions
            </h1>
            <div className="mt-3 overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm">
              {loading ? (
                <p className="px-4 py-3 text-sm text-ink/70">{t('faq.loading')}</p>
              ) : null}
              {!loading && topics.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink/70">{t('faq.cmsEmpty')}</p>
              ) : null}
              {!loading && topics.length > 0
                ? topics.map((topic) => {
                    const isActive = activeTopic?.id === topic.id
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setActiveTopicId(topic.id)}
                        className={`w-full border-t border-ink/10 px-4 py-3 text-left text-sm transition first:border-t-0 sm:text-[0.9375rem] ${
                          isActive
                            ? 'bg-white/85 font-medium text-ink'
                            : 'text-ink/72 hover:bg-white/70'
                        }`}
                      >
                        {topic.title}
                      </button>
                    )
                  })
                : null}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-8 lg:col-start-5">
            {activeTopic ? (
              <article className="rounded-2xl bg-white/60 px-5 py-4 backdrop-blur-sm sm:px-6">
                <h3 className="type-card-title font-display font-medium text-ink">{activeTopic.title}</h3>
                <div className="mt-4 space-y-2">
                  {activeTopic.entries.map((entry) => (
                    <details
                      key={entry.id}
                      className="group rounded-xl border border-ink/10 bg-white/70 px-4 py-1"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-ink sm:text-[0.9375rem] [&::-webkit-details-marker]:hidden">
                        <span>{entry.question}</span>
                        <ChevronDown
                          className="size-4 shrink-0 opacity-70 transition-transform duration-200 group-open:rotate-180"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </summary>
                      <div className="border-t border-ink/10 pb-3 pt-3">
                        {entry.answer
                          .split(/\n\n+/)
                          .filter(Boolean)
                          .map((paragraph, paragraphIndex) => (
                            <p
                              key={paragraphIndex}
                              className="mt-2 text-sm leading-relaxed text-ink/78 first:mt-0 sm:text-[0.95rem]"
                            >
                              {paragraph}
                            </p>
                          ))}
                      </div>
                    </details>
                  ))}
                </div>
              </article>
            ) : null}
            <div>
              <Link
                to="/faq"
                className="type-button font-display inline-flex items-center justify-center rounded-xl border border-ink/25 px-5 py-2.5 font-medium text-ink transition hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
              >
                View all FAQs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
