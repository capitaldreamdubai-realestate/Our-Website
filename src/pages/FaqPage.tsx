import { ChevronDown } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { Seo } from '@/components/Seo'
import type { FaqSection } from '@/lib/cms/mapFaq'

const panelBg = '#FAF7F2'
const panelInk = '#6B3B34'
const rule = 'rgba(107, 59, 52, 0.18)'

function FaqToc({ sections }: { sections: FaqSection[] }) {
  const { t } = useLocalePreferences()
  return (
    <nav aria-label={t('faq.toc.navAria')}>
      <p
        className="font-compact text-[0.6875rem] font-semibold uppercase tracking-[0.22em]"
        style={{ color: panelInk, opacity: 0.75 }}
      >
        {t('faq.toc.topics')}
      </p>
      <ul className="mt-4 space-y-0">
        {sections.map((s) => (
          <li key={s.id} className="border-t first:border-t-0" style={{ borderColor: rule }}>
            <a
              href={`#faq-topic-${s.slug}`}
              className="block py-3.5 font-sans text-[0.9375rem] font-medium leading-snug text-terracotta transition hover:opacity-80"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function AnswerBody({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).filter(Boolean)
  return (
    <div className="mt-3 space-y-3 border-t border-[#6B3B34]/12 pt-3">
      {parts.map((p, i) => (
        <p
          key={i}
          className="font-sans text-[length:var(--brand-font-body-lg)] font-normal leading-[1.65] text-terracotta/90"
        >
          {p}
        </p>
      ))}
    </div>
  )
}

export function FaqPage() {
  const { faqSections, loading } = useCms()
  const { t } = useLocalePreferences()
  const jsonLd = useMemo(() => {
    if (faqSections.length === 0) return null
    const mainEntity = faqSections.flatMap((s) =>
      s.entries.map((e) => ({
        '@type': 'Question',
        name: e.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: e.answer.replace(/\n\n+/g, ' '),
        },
      })),
    )
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      name: t('faq.schema.name'),
      description: t('faq.schema.description'),
      mainEntity,
    }
  }, [faqSections, t])

  return (
    <>
      <Seo
        title={t('seo.faq.title')}
        description={t('seo.faq.description')}
        jsonLd={jsonLd}
      />
      <main
        aria-label={t('faq.aria.main')}
        className="w-full min-w-0 max-w-none rounded-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-10 xl:px-12 xl:py-12"
        style={{ backgroundColor: panelBg, color: panelInk }}
      >
        <div className="grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,30%)_minmax(0,1fr)] lg:gap-x-10 xl:gap-x-14 2xl:gap-x-20">
          <div className="hidden justify-end lg:col-span-2 lg:flex">
            <Link
              to="/"
              className="type-button font-display rounded-xl border border-[#6B3B34]/35 px-5 py-2.5 font-medium text-terracotta transition hover:bg-[#6B3B34]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B3B34]/40"
            >
              {t('faq.backHome')}
            </Link>
          </div>

          <div className="order-2 min-w-0 space-y-10 lg:order-none lg:col-start-2 lg:row-start-2">
            <header className="space-y-3 text-left">
              <h1 className="type-heading-founders font-display font-medium leading-tight tracking-tight text-terracotta">
                {t('faq.h1')}
              </h1>
              <p className="max-w-2xl font-sans text-[length:var(--brand-font-body-lg)] font-normal leading-relaxed text-terracotta/90">
                {t('faq.intro')}
              </p>
            </header>

            {loading ? (
              <p className="text-center font-sans text-sm text-terracotta/70">
                {t('faq.loading')}
              </p>
            ) : null}

            {!loading && faqSections.length === 0 ? (
              <p className="text-center font-sans text-sm text-terracotta/75">
                {t('faq.cmsEmpty')}
              </p>
            ) : null}

            <div className="space-y-12">
              {faqSections.map((section, sectionIndex) => {
                const entryBase = faqSections
                  .slice(0, sectionIndex)
                  .reduce((acc, s) => acc + s.entries.length, 0)
                return (
                  <section
                    key={section.id}
                    id={`faq-topic-${section.slug}`}
                    className="scroll-mt-28"
                    aria-labelledby={`faq-topic-${section.slug}-heading`}
                  >
                    <h2
                      id={`faq-topic-${section.slug}-heading`}
                      className="type-card-title font-display text-left font-medium leading-snug tracking-[0.02em] text-terracotta"
                    >
                      {section.title}
                    </h2>
                    <div className="mt-6 space-y-3">
                      {section.entries.map((e, j) => {
                        const i = entryBase + j
                        const delayStyle: CSSProperties = { animationDelay: `${i * 55}ms` }
                        return (
                          <details
                            key={e.id}
                            className="faq-card-reveal group rounded-2xl border border-[#6B3B34]/14 bg-white/60 px-4 py-1 shadow-sm backdrop-blur-sm sm:px-5"
                            style={delayStyle}
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-sans text-[0.9375rem] font-semibold leading-snug text-terracotta [&::-webkit-details-marker]:hidden">
                              <span className="min-w-0">{e.question}</span>
                              <ChevronDown
                                className="size-4 shrink-0 opacity-70 transition-transform duration-200 group-open:rotate-180"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            </summary>
                            <AnswerBody text={e.answer} />
                          </details>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          <aside className="order-1 min-w-0 space-y-8 border-b border-[#6B3B34]/15 pb-8 lg:order-none lg:col-start-1 lg:row-start-2 lg:border-b-0 lg:pb-0 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-2 font-sans text-[0.875rem] font-normal leading-relaxed text-terracotta/90">
              <p className="font-medium text-terracotta">{t('faq.aside.title')}</p>
              <p className="text-terracotta/70">{t('faq.aside.body')}</p>
            </div>
            {faqSections.length > 0 ? <FaqToc sections={faqSections} /> : null}
          </aside>
        </div>
      </main>
    </>
  )
}
