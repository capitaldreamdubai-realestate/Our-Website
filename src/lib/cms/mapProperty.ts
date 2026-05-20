import type { Property, PropertyGalleryItem } from '@/components/PropertyCard'
import type { Database } from '@/integrations/supabase/database.types'
import {
  normalizePropertyTags,
  primaryListingTag,
  syncLegacyTagField,
} from '@/lib/listingTags'

type Row = Database['public']['Tables']['properties']['Row']

function asGallery(raw: unknown): PropertyGalleryItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(Boolean) as PropertyGalleryItem[]
}

export function mapPropertyRow(row: Row): Property {
  const gallery = asGallery(row.gallery)
  const tags = normalizePropertyTags(row.tags, row.tag)
  return {
    id: row.id,
    slug: row.slug ?? undefined,
    image: row.image_url,
    tag: primaryListingTag(tags) || row.tag,
    tags,
    title: row.title,
    meta: row.meta ?? '',
    detail: row.detail ?? undefined,
    alt: row.alt,
    priceAed: row.price_aed ?? undefined,
    beds: row.beds ?? undefined,
    baths: row.baths ?? undefined,
    location: row.location ?? undefined,
    neighbourhood: row.neighbourhood ?? undefined,
    emirate: row.emirate ?? undefined,
    exclusiveWithUs: row.exclusive_with_us,
    interiorM2: row.interior_m2 ?? undefined,
    plotM2: row.plot_m2 ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    fullAddress: row.full_address ?? undefined,
    descriptionHtml: row.description_html ?? undefined,
    propertyRefId: row.property_ref_id ?? undefined,
    yearBuilt: row.year_built ?? undefined,
    gallery: gallery.length > 0 ? gallery : undefined,
    salespersonId: row.salesperson_id ?? undefined,
    propertyType: row.property_type ?? undefined,
    developerId: row.developer_id ?? undefined,
  }
}

/** Admin save: map DB row → upsert payload without losing FKs (e.g. developer_id). */
export function propertyRowToUpsert(
  row: Row,
  options?: { includeTagsColumn?: boolean },
): Database['public']['Tables']['properties']['Insert'] {
  const tags = normalizePropertyTags(row.tags, row.tag)
  const payload: Database['public']['Tables']['properties']['Insert'] = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tag: syncLegacyTagField(tags),
    meta: row.meta,
    detail: row.detail,
    alt: row.alt,
    image_url: row.image_url,
    price_aed: row.price_aed,
    beds: row.beds,
    baths: row.baths,
    location: row.location,
    neighbourhood: row.neighbourhood,
    emirate: row.emirate,
    exclusive_with_us: row.exclusive_with_us,
    interior_m2: row.interior_m2,
    plot_m2: row.plot_m2,
    latitude: row.latitude,
    longitude: row.longitude,
    full_address: row.full_address,
    description_html: row.description_html,
    property_ref_id: row.property_ref_id,
    year_built: row.year_built,
    gallery: row.gallery,
    home_section: row.home_section,
    sort_order_home: row.sort_order_home,
    published: row.published,
    salesperson_id: row.salesperson_id,
    property_type: row.property_type,
    developer_id: row.developer_id ?? null,
    listing_source: row.listing_source,
    pf_listing_id: row.pf_listing_id,
    pf_payload: row.pf_payload,
    pf_state_stage: row.pf_state_stage,
    pf_state_type: row.pf_state_type,
    pf_category: row.pf_category,
    pf_offering_type: row.pf_offering_type,
    pf_project_status: row.pf_project_status,
    pf_verification_status: row.pf_verification_status,
    pf_quality_score: row.pf_quality_score,
    pf_assigned_to_id: row.pf_assigned_to_id,
    pf_assigned_to_name: row.pf_assigned_to_name,
    pf_created_by_id: row.pf_created_by_id,
    pf_location_id: row.pf_location_id,
    pf_location_name: row.pf_location_name,
    pf_latitude: row.pf_latitude,
    pf_longitude: row.pf_longitude,
    pf_price_type: row.pf_price_type,
    pf_price_on_request: row.pf_price_on_request,
    pf_price_raw: row.pf_price_raw,
    pf_currency: row.pf_currency,
    pf_published_at: row.pf_published_at,
  }
  if (options?.includeTagsColumn) {
    payload.tags = tags
  }
  return payload
}

export function propertyToInsert(
  p: Property,
  homeSection: Row['home_section'],
  sortOrderHome: number,
  published: boolean,
  sourceMeta?: Pick<Row, 'listing_source' | 'pf_listing_id' | 'pf_payload'>,
): Database['public']['Tables']['properties']['Insert'] {
  const gallery = p.gallery && p.gallery.length > 0 ? p.gallery : []
  const tags = normalizePropertyTags(p.tags, p.tag)
  return {
    id: p.id,
    slug: p.slug ?? null,
    title: p.title,
    tag: syncLegacyTagField(tags),
    tags,
    meta: p.meta || null,
    detail: p.detail ?? null,
    alt: p.alt,
    image_url: p.image,
    price_aed: p.priceAed ?? null,
    beds: p.beds ?? null,
    baths: p.baths ?? null,
    location: p.location ?? null,
    neighbourhood: p.neighbourhood ?? null,
    emirate: p.emirate ?? null,
    exclusive_with_us: Boolean(p.exclusiveWithUs),
    interior_m2: p.interiorM2 ?? null,
    plot_m2: p.plotM2 ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    full_address: p.fullAddress ?? null,
    description_html: p.descriptionHtml ?? null,
    property_ref_id: p.propertyRefId ?? null,
    year_built: p.yearBuilt ?? null,
    gallery: gallery as unknown as Database['public']['Tables']['properties']['Row']['gallery'],
    home_section: homeSection,
    sort_order_home: sortOrderHome,
    published,
    salesperson_id: p.salespersonId ?? null,
    property_type: p.propertyType ?? null,
    developer_id: p.developerId ?? null,
    listing_source: sourceMeta?.listing_source ?? 'cms',
    pf_listing_id: sourceMeta?.pf_listing_id ?? null,
    pf_payload: sourceMeta?.pf_payload ?? null,
  }
}
