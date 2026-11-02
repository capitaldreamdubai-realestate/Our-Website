/**
 * Prints SQL that makes the live `articles` table match src/data/articles.ts:
 * upserts every article in the file and deletes the retired template slugs.
 * Articles added later through the admin CMS are left alone.
 *
 *   npx tsx --tsconfig tsconfig.seed.json scripts/articles-to-sql.ts > /tmp/articles.sql
 *   supabase db query --linked -f /tmp/articles.sql
 */
import { articles } from '../src/data/articles'
import { getArticleDetailModel } from '../src/data/articleDetails'

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function json(value: unknown): string {
  return `$json$${JSON.stringify(value)}$json$::jsonb`
}

const rows = articles.map((a, i) => {
  const d = getArticleDetailModel(a.slug)
  if (!d) throw new Error(`No detail model for ${a.slug}`)
  return `(${[
    lit(a.id),
    lit(a.slug),
    lit(a.title),
    lit(a.dateLabel),
    lit(a.author),
    lit(a.image),
    lit(a.alt),
    lit(a.excerpt),
    lit(d.dateLong),
    lit(d.lastUpdated),
    json(d.toc),
    json(d.sections),
    String(i),
    'true',
  ].join(', ')})`
})

/** Starter-template articles (Ibiza / Balearic copy) that must never be published. */
const RETIRED_SLUGS = [
  'ibiza-price-index-q1',
  'rental-law-updates-2026',
  'santa-eulalia-neighbourhood-notes',
  'formentera-day-routes',
  'restoration-vs-new-build',
]

const retired = RETIRED_SLUGS.map(lit).join(', ')

console.log(`begin;
insert into public.articles
  (id, slug, title, date_label, author, image_url, alt, excerpt, date_long, last_updated, toc, sections, sort_order, published)
values
  ${rows.join(',\n  ')}
on conflict (slug) do update set
  title = excluded.title, date_label = excluded.date_label, author = excluded.author,
  image_url = excluded.image_url, alt = excluded.alt, excerpt = excluded.excerpt,
  date_long = excluded.date_long, last_updated = excluded.last_updated,
  toc = excluded.toc, sections = excluded.sections,
  sort_order = excluded.sort_order, published = excluded.published;
delete from public.articles where slug in (${retired});
commit;`)
