import { useLocation } from 'react-router-dom'
import {
  absoluteAsset,
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  serializeJsonLd,
  SITE_NAME,
} from '../lib/seo/site'

type SeoProps = {
  title: string
  description: string
  path?: string
  image?: string | null
  type?: 'website' | 'article'
  jsonLd?: unknown
}

function jsonLdBlocks(jsonLd: unknown): unknown[] {
  if (jsonLd == null) return []
  return Array.isArray(jsonLd) ? jsonLd : [jsonLd]
}

export function Seo({
  title,
  description,
  path,
  image,
  type = 'website',
  jsonLd,
}: SeoProps) {
  const { pathname } = useLocation()
  const canonical = absoluteUrl(path ?? pathname)
  const ogImage = absoluteAsset(image) ?? DEFAULT_OG_IMAGE
  const blocks = jsonLdBlocks(jsonLd)

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {blocks.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(block) }}
        />
      ))}
    </>
  )
}
