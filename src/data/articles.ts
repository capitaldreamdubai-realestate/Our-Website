const u = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=85`

export type Article = {
  id: string
  slug: string
  title: string
  dateLabel: string
  author: string
  image: string
  alt: string
  excerpt: string
}

/**
 * Source of truth for the journal. The live `articles` table is synced from
 * this file (see scripts/articles-to-sql.ts), so keep copy Dubai/UAE-specific.
 * Order: first two render as featured (wide row); remainder as three-up.
 */
export const articles: Article[] = [
  {
    id: 'dubai-property-buying-costs',
    slug: 'dubai-property-buying-costs',
    title: 'Buying property in Dubai: what it really costs beyond the price',
    dateLabel: '2 Nov 2026',
    author: 'Capital Dreams',
    image: u('photo-1512453979798-5ea266f8880c', 1600, 1000),
    alt: 'Sheikh Zayed Road and the Burj Khalifa at sunset, Dubai',
    excerpt:
      'The 4% DLD transfer fee, agency commission, mortgage charges and service charges: a line-by-line budget for buying a ready home in Dubai.',
  },
  {
    id: 'dubai-off-plan-buying-guide',
    slug: 'dubai-off-plan-buying-guide',
    title: 'Buying off-plan in Dubai: payment plans, escrow and handover',
    dateLabel: '2 Nov 2026',
    author: 'Capital Dreams',
    image: u('photo-1526495124232-a04e1849168c', 1600, 1000),
    alt: 'Dubai towers along Sheikh Zayed Road at dusk',
    excerpt:
      'How off-plan purchases work in Dubai, where your instalments go, what Oqood registration means, and the checks to run before you sign an SPA.',
  },
  {
    id: 'renting-in-dubai-guide',
    slug: 'renting-in-dubai-guide',
    title: 'Renting in Dubai: Ejari, deposits and rent increases explained',
    dateLabel: '2 Nov 2026',
    author: 'Capital Dreams',
    image: u('photo-1580674684081-7617fbf3d745', 1200, 750),
    alt: 'Downtown Dubai apartment towers beside the Burj Khalifa',
    excerpt:
      'Upfront costs, Ejari registration, how the DLD rental index caps increases, and the notice rules that protect tenants and landlords.',
  },
  {
    id: 'uae-golden-visa-through-property',
    slug: 'uae-golden-visa-through-property',
    title: 'The UAE Golden Visa through property: what qualifies',
    dateLabel: '2 Nov 2026',
    author: 'Capital Dreams',
    image: u('photo-1518684079-3c830dcef090', 1200, 750),
    alt: 'Aerial view of the Dubai coastline and Burj Al Arab',
    excerpt:
      'The AED 2 million threshold, mortgaged and off-plan property, family sponsorship, and the documents to prepare for a 10-year residence visa.',
  },
  {
    id: 'living-in-meydan-guide',
    slug: 'living-in-meydan-guide',
    title: 'Living in Meydan: a neighbourhood guide for buyers and tenants',
    dateLabel: '2 Nov 2026',
    author: 'Capital Dreams',
    image: u('photo-1582672060674-bc2bd808a8b5', 1200, 750),
    alt: 'Burj Khalifa framed by palm trees, a short drive from Meydan',
    excerpt:
      'Where Meydan sits in MBR City, the communities around it, commute times to Downtown and the airport, and who the area suits.',
  },
]

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug)
}
