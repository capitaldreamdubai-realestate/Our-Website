import { Link } from 'react-router-dom'
import type { Article } from '../data/articles'
import { useCms } from '../contexts/CmsContext'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { Seo } from '../components/Seo'

const panelBg = '#FAF7F2'
const panelInk = '#6B3B34'

export function ArticlesPage() {
  const { articles } = useCms()
  const { t } = useLocalePreferences()
  const featured = articles.slice(0, 2)
  const standard = articles.slice(2)

  return (
    <main
      id="page-articles"
      aria-label={t('articles.aria')}
      className="w-full min-w-0 pb-8 pt-0 sm:pb-10 lg:pb-12"
    >
      <Seo title={t('seo.articles.title')} description={t('seo.articles.description')} />
      <section
        aria-label={t('articles.aria')}
        className="w-full min-w-0 rounded-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
        style={{ backgroundColor: panelBg, color: panelInk }}
      >
        <div className="flex w-full min-w-0 flex-col gap-8 sm:gap-10">
          <header className="w-full min-w-0">
            <h1 className="type-section-header font-display tracking-[0.02em] text-terracotta">
              {t('articles.h1')}
            </h1>
            <p className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-terracotta/90 sm:text-[length:var(--brand-font-body-lg)]">
              {t('articles.intro')}
            </p>
          </header>

          <div
            className="grid w-full min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:gap-7"
            aria-label={t('articles.featuredAria')}
          >
            {featured.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <div
            className="grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3"
            aria-label={t('articles.moreAria')}
          >
            {standard.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function ArticleCard({ article }: { article: Article }) {
  const { t } = useLocalePreferences()
  return (
    <article className="min-w-0">
      <Link
        to={`/articles/${article.slug}`}
        className="group flex h-full flex-col text-left outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6B3B34]/50"
      >
        <div className="overflow-hidden rounded-lg">
          <div className="aspect-[16/10] w-full overflow-hidden">
            <img
              src={article.image}
              alt={article.alt}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <p className="mt-3 font-compact text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-terracotta/85 sm:text-[0.75rem]">
          {article.dateLabel}
          <span className="mx-2 opacity-50" aria-hidden>
            ·
          </span>
          <span>{t('articles.byAuthor', { author: article.author })}</span>
        </p>
        <h2 className="type-card-title font-compact mt-2 font-medium leading-snug text-terracotta transition-opacity group-hover:opacity-90">
          {article.title}
        </h2>
      </Link>
    </article>
  )
}
