import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useCms } from '@/contexts/CmsContext'
import { adminBtnPrimary } from './adminClassNames'
import { AdminModal } from './components/AdminModal'
import { AdminPageHeading } from './components/AdminPageHeading'
import { AdminRichTextField } from './components/AdminRichTextField'
import { AdminTablePagination } from './components/AdminTablePagination'
import { DocumentUploadField } from './components/DocumentUploadField'
import { ImageUploadField } from './components/ImageUploadField'
import {
  FaqEditor,
  FloorPlanEditor,
  PaymentPlanEditor,
  faqsFromJson,
  floorPlansFromRows,
  paymentPlansFromRows,
  validateFloorPlans,
  validatePaymentPlans,
  type FaqDraft,
  type FloorPlanDraft,
  type PaymentPlanDraft,
} from './components/OffplanLaunchFields'
import { useAdminTablePagination } from './useAdminTablePagination'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'
import {
  OFFPLAN_LAUNCH_STATUSES,
  OFFPLAN_LAUNCH_STATUS_LABELS,
  type OffplanLaunchStatus,
} from '@/lib/offplanLaunchStatus'

type Row = Database['public']['Tables']['offplan_projects']['Row']
type DeveloperRow = Database['public']['Tables']['property_developers']['Row']
type SalespersonRow = Pick<
  Database['public']['Tables']['salespeople']['Row'],
  'id' | 'name'
>

type GalleryImageItem = { type: 'image'; src: string }

function fieldClass() {
  return 'mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm'
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function galleryFromSlots(slots: string[]): GalleryImageItem[] {
  return slots.filter(Boolean).map((src) => ({ type: 'image' as const, src }))
}

async function saveLaunchChildren(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  projectId: string,
  floorPlans: FloorPlanDraft[],
  paymentPlans: PaymentPlanDraft[],
): Promise<string | null> {
  const existing = await sb.from('offplan_floor_plans').select('id').eq('project_id', projectId)
  if (existing.error) return existing.error.message
  const keep = new Set(floorPlans.map((plan) => plan.id))
  const remove = (existing.data ?? []).map((row) => row.id).filter((id) => !keep.has(id))
  if (remove.length > 0) {
    const { error } = await sb.from('offplan_floor_plans').delete().in('id', remove)
    if (error) return error.message
  }
  if (floorPlans.length > 0) {
    const { error } = await sb.from('offplan_floor_plans').upsert(
      floorPlans.map((plan, index) => ({
        id: plan.id,
        project_id: projectId,
        name: plan.name.trim(),
        bedrooms: Math.max(0, Math.round(Number(plan.bedrooms) || 0)),
        bathrooms: plan.bathrooms.trim() ? Number(plan.bathrooms) : null,
        area_sqft: Number(plan.areaSqft) || 0,
        starting_price_aed: plan.startingPriceAed.trim() ? Number(plan.startingPriceAed) : null,
        layout_image_url: plan.layoutImageUrl.trim(),
        render_image_url: plan.renderImageUrl.trim(),
        alt_text: plan.altText.trim(),
        sort_order: index,
        published: plan.published,
        updated_at: new Date().toISOString(),
      })),
    )
    if (error) return error.message
  }

  const deleted = await sb.from('offplan_payment_plans').delete().eq('project_id', projectId)
  if (deleted.error) return deleted.error.message
  for (const [index, plan] of paymentPlans.entries()) {
    const inserted = await sb
      .from('offplan_payment_plans')
      .insert({
        project_id: projectId,
        name: plan.name.trim(),
        is_default: plan.isDefault,
        dld_fee_payer: plan.dldFeePayer,
        sort_order: index,
      })
      .select('id')
      .single()
    if (inserted.error || !inserted.data) return inserted.error?.message ?? 'Could not save a payment plan.'
    const { error } = await sb.from('offplan_payment_milestones').insert(
      plan.milestones.map((stage, stageIndex) => ({
        plan_id: inserted.data.id,
        label: stage.label.trim(),
        percent: Number(stage.percent),
        phase: stage.phase,
        sort_order: stageIndex,
      })),
    )
    if (error) return error.message
  }
  return null
}

async function createLaunchPopup(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  projectId: string,
  name: string,
  description: string,
  imageUrl: string,
): Promise<string | null> {
  const existing = await sb.from('campaign_popups').select('id').eq('project_id', projectId).limit(1)
  if (existing.error) return existing.error.message
  if ((existing.data ?? []).length > 0) {
    return 'A campaign popup already exists for this project. Turn it on under Campaign popups.'
  }
  const { error } = await sb.from('campaign_popups').insert({
    internal_name: `Launch: ${name}`,
    title: name,
    description,
    image_url: imageUrl,
    active: false,
    trigger_type: 'delay',
    trigger_delay_seconds: 5,
    target_paths: ['/', '/offplan'],
    show_once_per_session: true,
    sort_order: 0,
    project_id: projectId,
  })
  return error?.message ?? null
}

function slotsFromGallery(gallery: unknown): string[] {
  const slots = ['', '', '', '', '', '']
  if (!Array.isArray(gallery)) return slots
  gallery.forEach((item, i) => {
    if (i >= 6) return
    if (item && typeof item === 'object' && 'src' in item && typeof item.src === 'string') {
      slots[i] = item.src
    }
  })
  return slots
}

export function AdminOffplanProjects() {
  const { refetch: refetchCms } = useCms()
  const sb = getSupabase()
  const [rows, setRows] = useState<Row[]>([])
  const [developers, setDevelopers] = useState<DeveloperRow[]>([])
  const [salespeople, setSalespeople] = useState<SalespersonRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Row | null>(null)
  const [gallerySlots, setGallerySlots] = useState<string[]>(() => ['', '', '', '', '', ''])
  const [floorPlans, setFloorPlans] = useState<FloorPlanDraft[]>([])
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanDraft[]>([])
  const [faqs, setFaqs] = useState<FaqDraft[]>([])
  const [amenitiesText, setAmenitiesText] = useState('')
  const [popupNote, setPopupNote] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(true)
  const [slugLocked, setSlugLocked] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sb) return
    const [projRes, devRes, spRes] = await Promise.all([
      sb
        .from('offplan_projects')
        .select('*')
        .order('launch_status', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      sb
        .from('property_developers')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      sb.from('salespeople').select('id, name').order('sort_order', { ascending: true }),
    ])
    if (projRes.error) {
      setErr(projRes.error.message)
      return
    }
    if (devRes.error) console.error(devRes.error)
    if (spRes.error) console.error(spRes.error)
    setErr(null)
    setRows(projRes.data ?? [])
    setDevelopers(devRes.data ?? [])
    setSalespeople(spRes.data ?? [])
  }, [sb])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const devNameById = useCallback(
    (id: string) => developers.find((d) => d.id === id)?.name ?? '—',
    [developers],
  )

  const {
    page: tablePage,
    setPage: setTablePage,
    total: tableTotal,
    totalPages: tableTotalPages,
    pagedItems: pagedRows,
    rangeStart: tableRangeStart,
    rangeEnd: tableRangeEnd,
    showPagination: showTablePagination,
  } = useAdminTablePagination(rows)

  function openCreate() {
    const now = new Date().toISOString()
    const defaultDev = developers[0]?.id ?? ''
    setIsNew(true)
    setSlugLocked(false)
    setGallerySlots(['', '', '', '', '', ''])
    setFloorPlans([])
    setPaymentPlans([])
    setFaqs([])
    setAmenitiesText('')
    setPopupNote(null)
    setDraft({
      id: '',
      slug: '',
      name: '',
      short_description: '',
      description_html: null,
      hero_image_url: null,
      gallery: [],
      brochure_url: null,
      brochure_storage_path: null,
      launch_status: 'new',
      developer_id: defaultDev,
      salesperson_id: null,
      location: null,
      emirate: null,
      starting_price_aed: null,
      handover: null,
      community: null,
      dld_project_number: null,
      escrow_bank: null,
      amenities: [],
      faqs: [],
      seo_title: null,
      seo_description: null,
      sort_order: rows.length,
      published: false,
      created_at: now,
      updated_at: now,
    })
    setSaveErr(null)
    setModalOpen(true)
  }

  async function openEdit(r: Row) {
    setIsNew(false)
    setSlugLocked(true)
    setGallerySlots(slotsFromGallery(r.gallery))
    setDraft({ ...r })
    setAmenitiesText((r.amenities ?? []).join('\n'))
    setFaqs(faqsFromJson(r.faqs))
    setFloorPlans([])
    setPaymentPlans([])
    setPopupNote(null)
    setSaveErr(null)
    setModalOpen(true)
    if (!sb) return
    const [floorRes, planRes] = await Promise.all([
      sb.from('offplan_floor_plans').select('*').eq('project_id', r.id).order('sort_order'),
      sb.from('offplan_payment_plans').select('*').eq('project_id', r.id).order('sort_order'),
    ])
    if (floorRes.error || planRes.error) {
      setSaveErr(floorRes.error?.message ?? planRes.error?.message ?? 'Could not load launch details.')
      return
    }
    const planIds = (planRes.data ?? []).map((plan) => plan.id)
    const mileRes = planIds.length
      ? await sb.from('offplan_payment_milestones').select('*').in('plan_id', planIds).order('sort_order')
      : { data: [], error: null }
    if (mileRes.error) {
      setSaveErr(mileRes.error.message)
      return
    }
    setFloorPlans(floorPlansFromRows(floorRes.data ?? []))
    setPaymentPlans(paymentPlansFromRows(planRes.data ?? [], mileRes.data ?? []))
  }

  function closeModal() {
    setModalOpen(false)
    setDraft(null)
  }

  async function save(alsoCreatePopup = false) {
    if (!sb || !draft) return
    setSaveErr(null)
    setPopupNote(null)
    const name = draft.name.trim()
    if (!name) {
      setSaveErr('Project name is required.')
      return
    }
    const slug = (draft.slug.trim() || slugify(name)).toLowerCase()
    if (!slug) {
      setSaveErr('Slug is required.')
      return
    }
    if (!draft.developer_id) {
      setSaveErr('Developer is required.')
      return
    }
    const shortDescription = draft.short_description.trim()
    if (!shortDescription) {
      setSaveErr('Short description is required.')
      return
    }
    const floorError = validateFloorPlans(floorPlans)
    if (floorError) {
      setSaveErr(floorError)
      return
    }
    const planError = validatePaymentPlans(paymentPlans)
    if (planError) {
      setSaveErr(planError)
      return
    }
    if (faqs.some((faq) => Boolean(faq.question.trim()) !== Boolean(faq.answer.trim()))) {
      setSaveErr('Each question needs an answer.')
      return
    }
    if (draft.starting_price_aed != null && (!Number.isFinite(draft.starting_price_aed) || draft.starting_price_aed < 0)) {
      setSaveErr('Starting price must be a number of dirhams.')
      return
    }

    const gallery = galleryFromSlots(gallerySlots)
    const hero =
      draft.hero_image_url?.trim() ||
      gallery[0]?.src ||
      null
    if (alsoCreatePopup && !hero) {
      setSaveErr('Add a hero image before creating a campaign popup.')
      return
    }

    const amenities = amenitiesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const faqPayload = faqs
      .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
      .filter((faq) => faq.question && faq.answer)

    const payload = {
      slug,
      name,
      short_description: shortDescription,
      description_html: draft.description_html?.trim() || null,
      hero_image_url: hero,
      gallery: gallery as Row['gallery'],
      brochure_url: draft.brochure_url?.trim() || null,
      brochure_storage_path: draft.brochure_storage_path?.trim() || null,
      launch_status: draft.launch_status,
      developer_id: draft.developer_id,
      salesperson_id: draft.salesperson_id || null,
      location: draft.location?.trim() || null,
      emirate: draft.emirate?.trim() || null,
      starting_price_aed: draft.starting_price_aed,
      handover: draft.handover?.trim() || null,
      community: draft.community?.trim() || null,
      dld_project_number: draft.dld_project_number?.trim() || null,
      escrow_bank: draft.escrow_bank?.trim() || null,
      amenities,
      faqs: faqPayload,
      seo_title: draft.seo_title?.trim() || null,
      seo_description: draft.seo_description?.trim() || null,
      sort_order: Number(draft.sort_order) || 0,
      published: draft.published,
      updated_at: new Date().toISOString(),
    }

    let projectId = draft.id
    if (isNew) {
      const { data, error } = await sb.from('offplan_projects').insert(payload).select('id').single()
      if (error || !data) {
        setSaveErr(error?.message ?? 'Could not create the project.')
        return
      }
      projectId = data.id
    } else if (draft.id) {
      const { error } = await sb.from('offplan_projects').update(payload).eq('id', draft.id)
      if (error) {
        setSaveErr(error.message)
        return
      }
    }
    if (!projectId) {
      setSaveErr('Could not save the project.')
      return
    }

    const childError = await saveLaunchChildren(sb, projectId, floorPlans, paymentPlans)
    if (childError) {
      setSaveErr(childError)
      setIsNew(false)
      setSlugLocked(true)
      setDraft((current) => (current ? { ...current, id: projectId, slug } : current))
      return
    }

    if (alsoCreatePopup && hero) {
      const popupError = await createLaunchPopup(sb, projectId, name, shortDescription, hero)
      setIsNew(false)
      setSlugLocked(true)
      setDraft((current) => (current ? { ...current, id: projectId, slug } : current))
      if (popupError) {
        setSaveErr(popupError)
        return
      }
      setPopupNote('Campaign popup created and left inactive. Turn it on under Campaign popups.')
      void refresh()
      void refetchCms()
      return
    }

    closeModal()
    void refresh()
    void refetchCms()
  }

  async function confirmDelete() {
    if (!sb || !deleteId) return
    const { error } = await sb.from('offplan_projects').delete().eq('id', deleteId)
    if (error) {
      setErr(error.message)
      return
    }
    setDeleteId(null)
    void refresh()
    void refetchCms()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeading title="Off-plan projects" helpAriaLabel="About off-plan projects">
          <p>
            Developer launches shown on <strong>/offplan</strong>. Add floor plans, a payment
            plan, and an optional campaign popup. Publishing a project makes its page indexable
            on the next site build. Brochures stay behind an enquiry form.
          </p>
        </AdminPageHeading>
        <button
          type="button"
          onClick={openCreate}
          disabled={developers.length === 0}
          className={`inline-flex items-center gap-2 self-end sm:self-start ${adminBtnPrimary}`}
        >
          <Plus className="size-4" aria-hidden />
          Add project
        </button>
      </div>

      {developers.length === 0 ? (
        <p className="text-sm text-amber-800">
          Add at least one developer before creating off-plan projects.
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="overflow-x-auto rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-xs md:text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/50">
              <th className="px-3 py-3 md:px-4">Project</th>
              <th className="px-3 py-3 md:px-4">Developer</th>
              <th className="px-3 py-3 md:px-4">Launch</th>
              <th className="px-3 py-3 md:px-4">Sort</th>
              <th className="px-3 py-3 md:px-4">Pub</th>
              <th className="px-3 py-3 text-right md:px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => (
              <tr key={r.id} className="border-b border-ink/5 last:border-0">
                <td className="px-3 py-2.5 font-medium md:px-4">{r.name}</td>
                <td className="px-3 py-2.5 text-ink/70 md:px-4">{devNameById(r.developer_id)}</td>
                <td className="px-3 py-2.5 md:px-4">
                  {OFFPLAN_LAUNCH_STATUS_LABELS[r.launch_status as OffplanLaunchStatus]}
                </td>
                <td className="px-3 py-2.5 md:px-4">{r.sort_order}</td>
                <td className="px-3 py-2.5 md:px-4">{r.published ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2.5 text-right md:px-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="rounded-full p-2 text-ink/60 hover:bg-ink/5"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(r.id)}
                      className="rounded-full p-2 text-red-600/80 hover:bg-red-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminTablePagination
          visible={showTablePagination}
          page={tablePage}
          totalPages={tableTotalPages}
          total={tableTotal}
          rangeStart={tableRangeStart}
          rangeEnd={tableRangeEnd}
          onPageChange={setTablePage}
        />
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink/50">
            No projects yet (run DB migration if the table is missing).
          </p>
        ) : null}
      </div>

      <AdminModal
        open={modalOpen && !!draft}
        title={draft?.name ? `Project · ${draft.name}` : 'New off-plan project'}
        onClose={closeModal}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save(true)}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Save and create popup
            </button>
            <button type="button" onClick={() => void save()} className={`w-full md:w-auto ${adminBtnPrimary}`}>
              Save
            </button>
          </>
        }
      >
        {draft ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">Project name</label>
              <input
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          name,
                          slug: !slugLocked && isNew && !d.slug.trim() ? slugify(name) : d.slug,
                        }
                      : d,
                  )
                }}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Slug (URL)</label>
              <input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                disabled={slugLocked}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Launch status</label>
              <select
                value={draft.launch_status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    launch_status: e.target.value as OffplanLaunchStatus,
                  })
                }
                className={fieldClass()}
              >
                {OFFPLAN_LAUNCH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {OFFPLAN_LAUNCH_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Developer</label>
              <select
                value={draft.developer_id}
                onChange={(e) => setDraft({ ...draft, developer_id: e.target.value })}
                className={fieldClass()}
              >
                {developers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Assigned agent</label>
              <select
                value={draft.salesperson_id ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    salesperson_id: e.target.value || null,
                  })
                }
                className={fieldClass()}
              >
                <option value="">Unassigned</option>
                {salespeople.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Sort</label>
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) =>
                  setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })
                }
                className={fieldClass()}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="project-pub"
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                className="size-4 rounded border-ink/20"
              />
              <label htmlFor="project-pub" className="text-xs font-medium text-ink/70">
                Published (visible on /offplan)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">Short description</label>
              <textarea
                value={draft.short_description}
                onChange={(e) => setDraft({ ...draft, short_description: e.target.value })}
                rows={3}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Community</label>
              <input
                value={draft.community ?? ''}
                onChange={(e) => setDraft({ ...draft, community: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Location</label>
              <input
                value={draft.location ?? ''}
                onChange={(e) => setDraft({ ...draft, location: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Emirate</label>
              <input
                value={draft.emirate ?? ''}
                onChange={(e) => setDraft({ ...draft, emirate: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Handover</label>
              <input
                value={draft.handover ?? ''}
                placeholder="Q4 2028"
                onChange={(e) => setDraft({ ...draft, handover: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Starting price (AED)</label>
              <input
                value={draft.starting_price_aed ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    starting_price_aed: e.target.value.trim() ? Number(e.target.value) : null,
                  })
                }
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">DLD project number</label>
              <input
                value={draft.dld_project_number ?? ''}
                onChange={(e) => setDraft({ ...draft, dld_project_number: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Escrow bank</label>
              <input
                value={draft.escrow_bank ?? ''}
                onChange={(e) => setDraft({ ...draft, escrow_bank: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">SEO title (optional)</label>
              <input
                value={draft.seo_title ?? ''}
                onChange={(e) => setDraft({ ...draft, seo_title: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">SEO description (optional)</label>
              <textarea
                value={draft.seo_description ?? ''}
                rows={2}
                onChange={(e) => setDraft({ ...draft, seo_description: e.target.value || null })}
                className={fieldClass()}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">Amenities, one per line</label>
              <textarea
                value={amenitiesText}
                rows={3}
                onChange={(e) => setAmenitiesText(e.target.value)}
                className={fieldClass()}
              />
            </div>
            <div className="sm:col-span-2">
              <ImageUploadField
                label="Hero image"
                folder="projects"
                value={draft.hero_image_url ?? ''}
                onChange={(url) => setDraft({ ...draft, hero_image_url: url || null })}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-ink/70">Gallery — up to six images</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {gallerySlots.map((slotUrl, i) => (
                  <ImageUploadField
                    key={i}
                    compact
                    label={`Image ${i + 1}`}
                    folder="projects"
                    value={slotUrl}
                    onChange={(url) => {
                      setGallerySlots((prev) => {
                        const next = [...prev]
                        next[i] = url
                        return next
                      })
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <DocumentUploadField
                label="Project brochure (PDF)"
                folder="projects/brochures"
                brochureUrl={draft.brochure_url ?? ''}
                brochureStoragePath={draft.brochure_storage_path ?? ''}
                onChange={({ brochureUrl, brochureStoragePath }) =>
                  setDraft({
                    ...draft,
                    brochure_url: brochureUrl || null,
                    brochure_storage_path: brochureStoragePath || null,
                  })
                }
              />
            </div>
            <FloorPlanEditor plans={floorPlans} onChange={setFloorPlans} />
            <PaymentPlanEditor plans={paymentPlans} onChange={setPaymentPlans} />
            <FaqEditor faqs={faqs} onChange={setFaqs} />
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">Full description (optional)</label>
              <AdminRichTextField
                value={draft.description_html ?? ''}
                onChange={(html) => setDraft({ ...draft, description_html: html || null })}
              />
            </div>
          </div>
        ) : null}
        {saveErr ? <p className="mt-2 text-xs text-red-600">{saveErr}</p> : null}
        {popupNote ? <p className="mt-2 text-xs text-ink/70">{popupNote}</p> : null}
      </AdminModal>

      <AdminModal
        open={!!deleteId}
        title="Delete project?"
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white md:w-auto"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-ink/75">
          Remove this off-plan project from the public site. Related form submissions will keep
          their record but lose the project link.
        </p>
      </AdminModal>
    </div>
  )
}
