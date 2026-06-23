import type { PropertyGalleryItem } from '@/components/PropertyCard'
import type { Database } from '@/integrations/supabase/database.types'
import type { OffplanLaunchStatus } from '@/lib/offplanLaunchStatus'

export type PublicOffplanProject = {
  id: string
  slug: string
  name: string
  shortDescription: string
  descriptionHtml: string | null
  heroImageUrl: string | null
  gallery: PropertyGalleryItem[]
  launchStatus: OffplanLaunchStatus
  developerId: string
  salespersonId: string | null
  location: string | null
  emirate: string | null
  sortOrder: number
  hasBrochure: boolean
}

function asGallery(raw: unknown): PropertyGalleryItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is PropertyGalleryItem =>
      !!item &&
      typeof item === 'object' &&
      'src' in item &&
      typeof (item as PropertyGalleryItem).src === 'string',
  )
}

export function mapOffplanProjectRow(
  row: Database['public']['Tables']['offplan_projects']['Row'],
): PublicOffplanProject {
  const gallery = asGallery(row.gallery)
  const hero = row.hero_image_url?.trim() || gallery[0]?.src || null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description?.trim() ?? '',
    descriptionHtml: row.description_html,
    heroImageUrl: hero,
    gallery: gallery.length > 0 ? gallery : hero ? [{ type: 'image', src: hero }] : [],
    launchStatus: row.launch_status,
    developerId: row.developer_id,
    salespersonId: row.salesperson_id,
    location: row.location,
    emirate: row.emirate,
    sortOrder: row.sort_order,
    hasBrochure: Boolean(row.brochure_storage_path?.trim() || row.brochure_url?.trim()),
  }
}

export function projectCardImage(project: PublicOffplanProject): string | null {
  return project.heroImageUrl ?? project.gallery[0]?.src ?? null
}
