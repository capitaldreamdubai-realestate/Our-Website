import type { PropertyGalleryItem } from '@/components/PropertyCard'
import type { Database } from '@/integrations/supabase/database.types'
import type { OffplanLaunchStatus } from '@/lib/offplanLaunchStatus'

export type LaunchFaq = { question: string; answer: string }

export type PublicFloorPlan = {
  id: string
  name: string
  bedrooms: number
  bathrooms: number | null
  areaSqft: number
  startingPriceAed: number | null
  layoutImageUrl: string
  renderImageUrl: string
  altText: string
  sortOrder: number
}

export type MilestonePhase = 'booking' | 'construction' | 'handover' | 'post_handover'
export type DldFeePayer = 'buyer' | 'shared' | 'developer' | 'excluded'

export type PublicPaymentMilestone = {
  id: string
  label: string
  percent: number
  phase: MilestonePhase
  sortOrder: number
}

export type PublicPaymentPlan = {
  id: string
  name: string
  isDefault: boolean
  dldFeePayer: DldFeePayer
  sortOrder: number
  milestones: PublicPaymentMilestone[]
}

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
  startingPriceAed: number | null
  handover: string | null
  community: string | null
  dldProjectNumber: string | null
  escrowBank: string | null
  amenities: string[]
  faqs: LaunchFaq[]
  seoTitle: string | null
  seoDescription: string | null
  floorPlans: PublicFloorPlan[]
  paymentPlans: PublicPaymentPlan[]
  sortOrder: number
  hasBrochure: boolean
}

type FloorPlanRow = Database['public']['Tables']['offplan_floor_plans']['Row']
type PaymentPlanRow = Database['public']['Tables']['offplan_payment_plans']['Row']
type MilestoneRow = Database['public']['Tables']['offplan_payment_milestones']['Row']

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function parseAmenities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
}

function parseFaqs(raw: unknown): LaunchFaq[] {
  if (!Array.isArray(raw)) return []
  const faqs: LaunchFaq[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const question =
      'question' in item && typeof item.question === 'string' ? item.question.trim() : ''
    const answer = 'answer' in item && typeof item.answer === 'string' ? item.answer.trim() : ''
    if (question && answer) faqs.push({ question, answer })
  }
  return faqs
}

const PHASES: MilestonePhase[] = ['booking', 'construction', 'handover', 'post_handover']
const PAYERS: DldFeePayer[] = ['buyer', 'shared', 'developer', 'excluded']

function asPhase(value: string): MilestonePhase {
  return PHASES.includes(value as MilestonePhase) ? (value as MilestonePhase) : 'construction'
}

function asPayer(value: string): DldFeePayer {
  return PAYERS.includes(value as DldFeePayer) ? (value as DldFeePayer) : 'buyer'
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
    startingPriceAed: asNumber(row.starting_price_aed),
    handover: row.handover?.trim() || null,
    community: row.community?.trim() || null,
    dldProjectNumber: row.dld_project_number?.trim() || null,
    escrowBank: row.escrow_bank?.trim() || null,
    amenities: parseAmenities(row.amenities),
    faqs: parseFaqs(row.faqs),
    seoTitle: row.seo_title?.trim() || null,
    seoDescription: row.seo_description?.trim() || null,
    floorPlans: [],
    paymentPlans: [],
    sortOrder: row.sort_order,
    hasBrochure: Boolean(row.brochure_storage_path?.trim() || row.brochure_url?.trim()),
  }
}

export function attachLaunchContent(
  project: PublicOffplanProject,
  floorRows: FloorPlanRow[],
  planRows: PaymentPlanRow[],
  milestoneRows: MilestoneRow[],
): PublicOffplanProject {
  const floorPlans = floorRows
    .filter((row) => row.project_id === project.id && row.published)
    .map(mapFloorPlan)
    .filter((plan): plan is PublicFloorPlan => plan != null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

  const milestonesByPlan = new Map<string, PublicPaymentMilestone[]>()
  for (const row of milestoneRows) {
    const percent = asNumber(row.percent)
    if (percent == null || percent <= 0) continue
    const list = milestonesByPlan.get(row.plan_id) ?? []
    list.push({
      id: row.id,
      label: row.label.trim(),
      percent,
      phase: asPhase(row.phase),
      sortOrder: row.sort_order,
    })
    milestonesByPlan.set(row.plan_id, list)
  }

  const paymentPlans = planRows
    .filter((row) => row.project_id === project.id && row.name.trim())
    .map((row) => {
      const milestones = (milestonesByPlan.get(row.id) ?? [])
        .filter((item) => item.label)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return {
        id: row.id,
        name: row.name.trim(),
        isDefault: row.is_default,
        dldFeePayer: asPayer(row.dld_fee_payer),
        sortOrder: row.sort_order,
        milestones,
      }
    })
    .filter((plan) => percentsTotal100(plan.milestones))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.sortOrder - b.sortOrder)

  return { ...project, floorPlans, paymentPlans }
}

function mapFloorPlan(row: FloorPlanRow): PublicFloorPlan | null {
  const name = row.name.trim()
  const layout = row.layout_image_url.trim()
  const render = row.render_image_url.trim()
  const alt = row.alt_text.trim()
  const area = asNumber(row.area_sqft)
  if (!name || !layout || !render || !alt || area == null || area <= 0) return null
  return {
    id: row.id,
    name,
    bedrooms: row.bedrooms,
    bathrooms: asNumber(row.bathrooms),
    areaSqft: area,
    startingPriceAed: asNumber(row.starting_price_aed),
    layoutImageUrl: layout,
    renderImageUrl: render,
    altText: alt,
    sortOrder: row.sort_order,
  }
}

function percentsTotal100(milestones: PublicPaymentMilestone[]): boolean {
  if (milestones.length === 0) return false
  const total = milestones.reduce((sum, item) => sum + item.percent, 0)
  return Math.abs(total - 100) < 0.05
}

export function projectCardImage(project: PublicOffplanProject): string | null {
  return project.heroImageUrl ?? project.gallery[0]?.src ?? null
}
