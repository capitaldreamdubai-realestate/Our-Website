import { ChevronDown } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useCms } from '../contexts/CmsContext'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { usePageSeo } from '../hooks/usePageSeo'
import type { ArticleTocEntry } from '../data/articleDetails'
import { resolveArticleDetail } from '../lib/cms/resolveArticleDetail'

const panelBg = '#FAF7F2'
const panelInk = '#6B3B34'
const rule = 'rgba(107, 59, 52, 0.18)'

const articleBodyClass =
  'font-sans text-[length:var(--brand-font-body-lg)] font-normal leading-[1.65] text-[#6B3B34]/95 [&_a]:font-medium [&_a]:text-[#6B3B34] [&_a]:underline [&_a]:decoration-[#6B3B34]/35 [&_a]:underline-offset-[0.2em] [&_h2]:type-card-title [&_h2]:font-display [&_h2]:mt-8 [&_h2]:text-left [&_h2]:font-medium [&_h2]:leading-snug [&_h2]:tracking-[0.02em] [&_h2]:first:mt-0 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-medium [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+_p]:mt-4 [&_p]:text-pretty [&_ul]:list-disc [&_ul]:pl-5'

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim())
}

function TocBlock({ toc }: { toc: ArticleTocEntry[] }) {
  const { t } = useLocalePreferences()
  return (
    <nav aria-label={t('article.toc.navAria')}>
      <p
        className="font-compact text-[0.6875rem] font-semibold uppercase tracking-[0.22em]"
        style={{ color: panelInk, opacity: 0.75 }}
      >
        {t('article.toc.heading')}
      </p>
      <ul className="mt-4 space-y-0">
        {toc.map((entry) => (
          <li key={entry.id} className="border-t first:border-t-0" style={{ borderColor: rule }}>
            {'subItems' in entry && entry.subItems.length > 0 ? (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-3.5 pr-0.5 font-sans text-[0.9375rem] font-medium leading-snug text-[#6B3B34] [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">{entry.label}</span>
                  <ChevronDown
                    className="size-4 shrink-0 opacity-70 transition-transform duration-200 group-open:rotate-180"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </summary>
                <ul className="space-y-0 border-t pb-1 pt-1" style={{ borderColor: rule }}>
                  {entry.subItems.map((sub) => (
                    <li key={sub.id}>
                      <a
                        href={`#${sub.id}`}
                        className="block py-2.5 pl-1 font-sans text-[0.875rem] font-medium leading-snug text-[#6B3B34]/90 transition hover:text-[#6B3B34]"
                      >
                        {sub.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <a
                href={`#${entry.id}`}
                className="block py-3.5 font-sans text-[0.9375rem] font-medium leading-snug text-[#6B3B34] transition hover:opacity-80"
              >
                {entry.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { mode, articleDetailsBySlug } = useCms()
  const { t } = useLocalePreferences()
  const article = resolveArticleDetail(slug, mode, articleDetailsBySlug)
  usePageSeo({
    title: article
      ? `${article.title}${t('article.titleSuffix')}`
      : t('seo.articleMissing.title'),
    description: article
      ? article.excerpt
      : t('seo.articleMissing.description'),
  })

  if (!article) {
    return (
      <main
        className="w-full min-w-0 rounded-2xl px-4 py-10 sm:px-8 sm:py-12"
        style={{ backgroundColor: panelBg, color: panelInk }}
        aria-label={t('article.notFound.aria')}
      >
        <div className="flex w-full min-w-0 flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="type-heading-founders font-display font-medium leading-tight tracking-[0.02em]">
            {t('article.notFound.title')}
          </h1>
          <Link
            to="/articles"
            className="type-button font-display ml-auto shrink-0 rounded-xl border border-[#6B3B34]/35 px-5 py-2.5 font-medium text-[#6B3B34] transition hover:bg-[#6B3B34]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B3B34]/40"
          >
            {t('article.back')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main
      id={`article-${article.id}`}
      aria-label={article.title}
      className="w-full min-w-0 rounded-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12"
      style={{ backgroundColor: panelBg, color: panelInk }}
    >
      <div className="flex w-full min-w-0 flex-col gap-8 lg:grid lg:grid-cols-[minmax(12.5rem,22%)_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-10 xl:gap-x-16">
        <div className="flex justify-end lg:col-span-2">
          <Link
            to="/articles"
            className="type-button font-display rounded-xl border border-[#6B3B34]/35 px-5 py-2.5 font-medium text-[#6B3B34] transition hover:bg-[#6B3B34]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B3B34]/40"
          >
            {t('article.back')}
          </Link>
        </div>

        <div className="order-2 min-w-0 space-y-8 lg:order-none lg:col-start-2 lg:row-start-2">
          <h1 className="type-heading-founders font-display text-center font-medium leading-tight tracking-tight">
            {article.title}
          </h1>

          <div className="overflow-hidden rounded-2xl">
            <img
              src={article.image}
              alt={article.alt}
              className="aspect-[16/10] w-full object-cover sm:aspect-[2.1/1]"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="space-y-10">
            {article.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28"
                aria-labelledby={`${section.id}-heading`}
              >
                {section.heading.trim() ? (
                  <h2
                    id={`${section.id}-heading`}
                    className="type-card-title font-display text-left font-medium leading-snug tracking-[0.02em]"
                  >
                    {section.heading}
                  </h2>
                ) : null}
                <div
                  className={
                    section.heading.trim()
                      ? 'mt-5 w-full min-w-0 space-y-4'
                      : 'w-full min-w-0 space-y-4'
                  }
                >
                  {section.paragraphs.map((p, j) =>
                    looksLikeHtml(p) ? (
                      <div
                        key={j}
                        className={articleBodyClass}
                        dangerouslySetInnerHTML={{ __html: p }}
                      />
                    ) : (
                      <p key={j} className={articleBodyClass}>
                        {p}
                      </p>
                    ),
                  )}
                  {article.slug === 'dubai-price-index-q1' && section.id === 'what-measured' ? (
                    <p className="font-sans text-[length:var(--brand-font-body-lg)] font-normal leading-[1.65] text-[#6B3B34]/95">
                      Where public series exist, we still read them against title-transfer
                      timelines and broker-reported absorption —{' '}
                      <a
                        href="https://dubailand.gov.ae/en/open-data/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#6B3B34] underline decoration-[#6B3B34]/35 underline-offset-[0.2em] transition hover:decoration-[#6B3B34]"
                      >
                        Dubai Land Department open data
                      </a>{' '}
                      are a useful cross-check, not the full story.
                    </p>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="order-3 space-y-10 border-t border-[#6B3B34]/15 pt-8 lg:order-none lg:col-start-1 lg:row-start-2 lg:border-t-0 lg:pt-0 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 font-sans text-[0.875rem] font-normal leading-relaxed text-[#6B3B34]/88">
            <p>{article.dateLong}</p>
            <p className="font-medium text-[#6B3B34]">
              {t('articles.byAuthor', { author: article.author })}
            </p>
            <p className="text-[#6B3B34]/70">
              {t('article.lastUpdatedPrefix')} {article.lastUpdated}
            </p>
          </div>
          <TocBlock toc={article.toc} />
        </aside>
      </div>
    </main>
  )
}
