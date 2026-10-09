export const SITE_URL = 'https://capitaldreamdubai.com'

/** Temporary share image. TODO: replace with a real 1200×630 Open Graph image. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/LOGO%20NO%20ICON.png`

export const SITE_NAME = 'Capital Dreams Dubai'

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const withSlash = path.startsWith('/') ? path : `/${path}`
  if (withSlash === '/') return `${SITE_URL}/`
  const encoded = withSlash
    .replace(/\/+$/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${SITE_URL}${encoded}`
}

export function absoluteAsset(src: string | null | undefined): string | undefined {
  const value = src?.trim()
  if (!value) return undefined
  if (/^https?:\/\//i.test(value)) return value
  return absoluteUrl(value.startsWith('/') ? value : `/${value}`)
}

export function plainText(value: string | null | undefined, max = 300): string | undefined {
  if (!value) return undefined
  const text = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export const realEstateAgentJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  name: 'Capital Dreams',
  url: `${SITE_URL}/`,
  logo: DEFAULT_OG_IMAGE,
  image: DEFAULT_OG_IMAGE,
  email: 'Info@capitaldreamdubai.com',
  telephone: '+971501083541',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rosebay Living, Office No R02, Meydan',
    addressLocality: 'Dubai',
    addressCountry: 'AE',
  },
  areaServed: [
    { '@type': 'City', name: 'Dubai' },
    { '@type': 'Country', name: 'United Arab Emirates' },
  ],
}

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  publisher: {
    '@type': 'RealEstateAgent',
    name: 'Capital Dreams',
    url: `${SITE_URL}/`,
  },
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function articleJsonLd(article: {
  title: string
  excerpt?: string | null
  slug: string
  image?: string | null
  author?: string | null
}) {
  const url = absoluteUrl(`/articles/${article.slug}`)
  const image = absoluteAsset(article.image)
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    url,
    mainEntityOfPage: url,
    author: article.author?.trim()
      ? { '@type': 'Person', name: article.author.trim() }
      : { '@type': 'Organization', name: 'Capital Dreams' },
    publisher: {
      '@type': 'Organization',
      name: 'Capital Dreams',
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_OG_IMAGE,
      },
    },
  }
  const description = plainText(article.excerpt)
  if (description) data.description = description
  if (image) data.image = image
  return data
}

export function realEstateListingJsonLd(input: {
  name: string
  path: string
  description?: string | null
  image?: string | null
  streetAddress?: string | null
  addressLocality?: string | null
  priceAed?: number | null
}) {
  const url = absoluteUrl(input.path)
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: input.name,
    url,
  }
  const description = plainText(input.description)
  if (description) data.description = description
  const image = absoluteAsset(input.image)
  if (image) data.image = image
  if (input.streetAddress?.trim() || input.addressLocality?.trim()) {
    data.address = {
      '@type': 'PostalAddress',
      ...(input.streetAddress?.trim()
        ? { streetAddress: input.streetAddress.trim() }
        : {}),
      ...(input.addressLocality?.trim()
        ? { addressLocality: input.addressLocality.trim() }
        : {}),
      addressCountry: 'AE',
    }
  }
  if (typeof input.priceAed === 'number' && input.priceAed > 0) {
    data.offers = {
      '@type': 'Offer',
      price: input.priceAed,
      priceCurrency: 'AED',
      url,
    }
  }
  return data
}
