/**
 * Writes public/sitemap.xml for https://capitaldreamdubai.com.
 * Static public routes always ship. Published property, article, developer,
 * off-plan, and team URLs are added when Supabase env is available.
 */
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env') })

const SITE_URL = 'https://capitaldreamdubai.com'

const STATIC_PATHS = [
  '/',
  '/all-properties',
  '/offplan',
  '/for-rent',
  '/for-sale',
  '/deals',
  '/developers',
  '/about',
  '/team',
  '/experiences',
  '/contact-us',
  '/testimonials',
  '/articles',
  '/faq',
  '/privacy-policy',
  '/terms',
  '/cookies',
]

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function locFor(path: string): string {
  if (path === '/') return `${SITE_URL}/`
  const encoded = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${SITE_URL}${encoded}`
}

async function publishedValues(
  supabase: SupabaseClient,
  table: string,
  column: string,
): Promise<string[]> {
  const pageSize = 1000
  const values: string[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('published', true)
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    const rows = data ?? []
    for (const row of rows) {
      const value = (row as unknown as Record<string, unknown>)[column]
      if (typeof value === 'string' && value.trim()) values.push(value.trim())
    }
    if (rows.length < pageSize) break
  }
  return values
}

async function dynamicPaths(supabase: SupabaseClient): Promise<string[]> {
  const [properties, articles, developers, projects, team] = await Promise.all([
    publishedValues(supabase, 'properties', 'id'),
    publishedValues(supabase, 'articles', 'slug'),
    publishedValues(supabase, 'property_developers', 'slug'),
    publishedValues(supabase, 'offplan_projects', 'slug'),
    publishedValues(supabase, 'salespeople', 'slug'),
  ])
  return [
    ...properties.map((id) => `/properties/${id}`),
    ...articles.map((slug) => `/articles/${slug}`),
    ...developers.map((slug) => `/developers/${slug}`),
    ...projects.map((slug) => `/offplan/${slug}`),
    ...team.map((slug) => `/team/${slug}`),
  ]
}

function writeSitemap(paths: string[]) {
  const lastmod = new Date().toISOString().slice(0, 10)
  const unique = [...new Set(paths)]
  const body = unique
    .map(
      (path) =>
        `  <url><loc>${xmlEscape(locFor(path))}</loc><lastmod>${lastmod}</lastmod></url>`,
    )
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
  writeFileSync(resolve(process.cwd(), 'public/sitemap.xml'), xml)
  console.log(`Wrote public/sitemap.xml (${unique.length} URLs)`)
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL?.trim()
  const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const key = anon || serviceKey

  if (!url || !url.startsWith('http') || !key) {
    console.warn('Supabase env missing. Sitemap will list static routes only.')
    writeSitemap(STATIC_PATHS)
    return
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const extra = await dynamicPaths(supabase)
    writeSitemap([...STATIC_PATHS, ...extra])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Could not read published URLs (${message}). Sitemap will list static routes only.`)
    writeSitemap(STATIC_PATHS)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
