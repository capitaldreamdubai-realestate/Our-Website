import type { Property } from '@/components/PropertyCard'
import type { Article } from '@/data/articles'
import { CAPITAL_DREAM_SALESPEOPLE } from '@/data/capitalDreamSalespeople'
import type { ConciergeService } from '@/data/conciergeServices'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/database.types'
import { INTEGRATION_KEYS } from '@/lib/cms/integrationSettingsKeys'
import {
  DEFAULT_FLOATING_SOCIAL_LINKS,
  normalizeFloatingSocialLinks,
  type FloatingSocialLink,
} from '@/lib/socialFloatingLinks'
import { mapArticleDetailRow, mapArticleListRow } from './mapArticle'
import { buildFaqSections, type FaqSection } from './mapFaq'
import { mapExperienceRow } from './mapExperience'
import { mapPropertyRow } from './mapProperty'

export type HeroNeighbourhoodItem = { id: string; label: string; to: string }

export type MarketingPage = {
  slug: string
  title: string
  body_html: string | null
  hero_image_url: string | null
}

export type SiteSettings = {
  heroBannerUrl: string | null
  fullBleedYoutubeId: string | null
  floatingSocialLinks: FloatingSocialLink[]
}

export type PublicTestimonial = {
  id: string
  quote: string
  authorName: string
  authorRole: string | null
  authorLocation: string | null
  rating: number
}

/** Published developer row for public directory and listing assignment. */
export type PublicDeveloper = {
  id: string
  slug: string
  name: string
  descriptionHtml: string | null
  logoUrl: string | null
  websiteUrl: string | null
  sortOrder: number
}

export type DeveloperWithListings = PublicDeveloper & {
  listingsCount: number
}

/** Published agent row exposed to the public site (property detail, forms). */
export type PublicSalesperson = {
  id: string
  slug: string
  name: string
  title: string
  bio: string
  listings_count: number
  phone: string | null
  email: string | null
  profile_image_url: string
  social_links: Record<string, unknown>
}

/** Used when `uae_emirates` is empty or unavailable (e.g. before migration). */
export const FALLBACK_UAE_EMIRATE_NAMES: string[] = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
  'Northern Emirates',
]

export type CmsSnapshot = {
  catalogProperties: Property[]
  featuredProperties: Property[]
  moreHomes: Property[]
  articles: Article[]
  articleDetailsBySlug: Record<string, ReturnType<typeof mapArticleDetailRow>>
  heroNeighbourhoods: HeroNeighbourhoodItem[]
  /** Published rows from `uae_emirates.name` for filter dropdowns. */
  uaeEmirateNames: string[]
  marketingBySlug: Record<string, MarketingPage>
  siteSettings: SiteSettings
  salespeopleById: Record<string, PublicSalesperson>
  /** Published salespeople in `sort_order` (same query as building `salespeopleById`). */
  salespeopleList: PublicSalesperson[]
  experiences: ConciergeService[]
  faqSections: FaqSection[]
  testimonials: PublicTestimonial[]
  propertyDevelopersList: PublicDeveloper[]
  developersBySlug: Record<string, PublicDeveloper>
  developersWithListings: DeveloperWithListings[]
}

function mapPublicDeveloper(
  row: Database['public']['Tables']['property_developers']['Row'],
): PublicDeveloper {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    descriptionHtml: row.description_html,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    sortOrder: row.sort_order,
  }
}

function buildDevelopersWithListings(
  developers: PublicDeveloper[],
  catalog: Property[],
): DeveloperWithListings[] {
  const counts = new Map<string, number>()
  for (const p of catalog) {
    if (!p.developerId) continue
    counts.set(p.developerId, (counts.get(p.developerId) ?? 0) + 1)
  }
  return developers
    .filter((d) => counts.has(d.id))
    .map((d) => ({
      ...d,
      listingsCount: counts.get(d.id) ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

async function loadSettings(
  supabase: SupabaseClient<Database>,
): Promise<SiteSettings> {
  const { data } = await supabase.from('site_settings').select('key, value')
  const map = new Map((data ?? []).map((r) => [r.key, r.value]))
  const socialRaw = map.get(INTEGRATION_KEYS.floatingSocialLinks) ?? ''
  let floatingSocialLinks = DEFAULT_FLOATING_SOCIAL_LINKS
  if (socialRaw.trim()) {
    try {
      const parsed = JSON.parse(socialRaw) as unknown
      const normalized = normalizeFloatingSocialLinks(parsed)
      floatingSocialLinks = normalized.length > 0 ? normalized : DEFAULT_FLOATING_SOCIAL_LINKS
    } catch {
      floatingSocialLinks = DEFAULT_FLOATING_SOCIAL_LINKS
    }
  }
  return {
    heroBannerUrl: map.get('hero_banner_url') ?? null,
    fullBleedYoutubeId: map.get('full_bleed_youtube_id') ?? null,
    floatingSocialLinks,
  }
}

function mapPublicSalesperson(
  row: Database['public']['Tables']['salespeople']['Row'],
): PublicSalesperson {
  const raw = row.social_links
  const social =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.title,
    bio: row.bio,
    listings_count: row.listings_count,
    phone: row.phone,
    email: row.email,
    profile_image_url: row.profile_image_url,
    social_links: social,
  }
}

/** Static-site fallback: same order as admin seed when Supabase is not used. */
export function staticSalespeopleListForSite(): PublicSalesperson[] {
  return [...CAPITAL_DREAM_SALESPEOPLE]
    .filter((s) => s.published !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((row) =>
      mapPublicSalesperson(
        row as Database['public']['Tables']['salespeople']['Row'],
      ),
    )
}

export async function loadCmsSnapshot(
  supabase: SupabaseClient<Database>,
): Promise<CmsSnapshot | null> {
  const [propRes, artRes, heroRes, emiratesRes, devRes, mktRes, spRes, expRes, faqTopRes, faqEntRes, testimonialRes] =
    await Promise.all([
    supabase
      .from('properties')
      .select('*')
      .eq('published', true)
      .order('sort_order_home', { ascending: true }),
    supabase.from('articles').select('*').eq('published', true).order('sort_order'),
    supabase
      .from('hero_neighbourhoods')
      .select('*')
      .eq('published', true)
      .order('sort_order'),
    supabase
      .from('uae_emirates')
      .select('name')
      .eq('published', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('property_developers')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('marketing_pages').select('*'),
    supabase
      .from('salespeople')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true }),
    supabase.from('experiences').select('*').eq('published', true).order('sort_order'),
    supabase.from('faq_topics').select('*').eq('published', true).order('sort_order'),
    supabase
      .from('faq_entries')
      .select('*')
      .eq('published', true)
      .order('topic_id', { ascending: true })
      .order('sort_order', { ascending: true }),
    supabase
      .from('testimonials')
      .select('*')
      .eq('status', 'approved')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  if (propRes.error) {
    console.error(propRes.error)
    return null
  }
  if (artRes.error) {
    console.error(artRes.error)
  }
  if (heroRes.error) {
    console.error(heroRes.error)
  }
  if (emiratesRes.error) {
    console.error(emiratesRes.error)
  }
  if (devRes.error && devRes.error.code !== 'PGRST205') {
    console.error(devRes.error)
  }
  if (mktRes.error) {
    console.error(mktRes.error)
  }
  if (spRes.error) {
    console.error(spRes.error)
  }
  if (expRes.error) {
    console.error(expRes.error)
  }
  if (faqTopRes.error) {
    console.error(faqTopRes.error)
  }
  if (faqEntRes.error) {
    console.error(faqEntRes.error)
  }
  if (testimonialRes.error) {
    console.error(testimonialRes.error)
  }

  const propRows = propRes.data ?? []

  const catalogProperties = propRows.map(mapPropertyRow)

  const devRows = devRes.error ? [] : (devRes.data ?? [])
  const propertyDevelopersList: PublicDeveloper[] = devRows.map(mapPublicDeveloper)
  const developersBySlug: Record<string, PublicDeveloper> = {}
  for (const d of propertyDevelopersList) {
    developersBySlug[d.slug] = d
  }
  const developersWithListings = buildDevelopersWithListings(
    propertyDevelopersList,
    catalogProperties,
  )
  const featuredProperties = propRows
    .filter((r) => r.home_section === 'featured')
    .map(mapPropertyRow)
  const moreHomes = propRows
    .filter((r) => r.home_section === 'more_homes')
    .map(mapPropertyRow)

  const artRows = artRes.error ? [] : (artRes.data ?? [])
  const articles = artRows.map(mapArticleListRow)
  const articleDetailsBySlug: Record<string, ReturnType<typeof mapArticleDetailRow>> =
    {}
  for (const row of artRows) {
    articleDetailsBySlug[row.slug] = mapArticleDetailRow(row)
  }

  const heroRows = heroRes.error ? [] : (heroRes.data ?? [])
  const heroNeighbourhoods: HeroNeighbourhoodItem[] = heroRows.map((h) => ({
    id: h.id,
    label: h.label,
    to: h.route_path,
  }))

  const uaeEmirateNamesRaw = emiratesRes.error ? [] : (emiratesRes.data ?? [])
  const uaeEmirateNames =
    uaeEmirateNamesRaw.length > 0
      ? uaeEmirateNamesRaw.map((r) => r.name)
      : FALLBACK_UAE_EMIRATE_NAMES

  const mktRows = mktRes.error ? [] : (mktRes.data ?? [])
  const marketingBySlug: Record<string, MarketingPage> = {}
  for (const m of mktRows) {
    marketingBySlug[m.slug] = {
      slug: m.slug,
      title: m.title,
      body_html: m.body_html,
      hero_image_url: m.hero_image_url,
    }
  }

  const salespeopleById: Record<string, PublicSalesperson> = {}
  const salespeopleList: PublicSalesperson[] = []
  if (!spRes.error) {
    for (const row of spRes.data ?? []) {
      const pub = mapPublicSalesperson(row)
      salespeopleById[row.id] = pub
      salespeopleList.push(pub)
    }
  }

  const siteSettings = await loadSettings(supabase)

  const expRows = expRes.error ? [] : (expRes.data ?? [])
  const experiences: ConciergeService[] = expRows.map(mapExperienceRow)

  const faqTopicRows = faqTopRes.error ? [] : (faqTopRes.data ?? [])
  const faqEntryRows = faqEntRes.error ? [] : (faqEntRes.data ?? [])
  const faqSections = buildFaqSections(faqTopicRows, faqEntryRows)
  const testimonialRows = testimonialRes.error ? [] : (testimonialRes.data ?? [])
  const testimonials: PublicTestimonial[] = testimonialRows.map((row) => ({
    id: row.id,
    quote: row.quote,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorLocation: row.author_location,
    rating: row.rating,
  }))

  return {
    catalogProperties,
    featuredProperties,
    moreHomes,
    articles,
    articleDetailsBySlug,
    heroNeighbourhoods,
    uaeEmirateNames,
    marketingBySlug,
    siteSettings,
    salespeopleById,
    salespeopleList,
    experiences,
    faqSections,
    testimonials,
    propertyDevelopersList,
    developersBySlug,
    developersWithListings,
  }
}
