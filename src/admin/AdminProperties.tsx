import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCms } from '@/contexts/CmsContext'
import type { TerracottaDropdownOption } from '@/components/TerracottaDropdown'
import { TerracottaDropdown } from '@/components/TerracottaDropdown'
import { AdminSearchableTerracottaDropdown } from './components/AdminSearchableTerracottaDropdown'
import {
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnPrimarySm,
  adminStepActive,
  adminStepInactive,
} from './adminClassNames'
import { AdminTablePagination } from './components/AdminTablePagination'
import { AdminModal } from './components/AdminModal'
import { EntityDetailSheet } from './components/EntityDetailSheet'
import { AdminPageHeading } from './components/AdminPageHeading'
import { ImageUploadField } from './components/ImageUploadField'
import { AdminRichTextField } from './components/AdminRichTextField'
import { useAdminTablePagination } from './useAdminTablePagination'
import { gallerySixForPropertyId } from '@/data/propertyGallerySeeds'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'
import { propertyRowToUpsert } from '@/lib/cms/mapProperty'
import { propertiesHasTagsColumn } from '@/lib/cms/propertiesSchema'
import { propertyIdValidationMessage, slugifyPropertyKey } from '@/lib/propertyId'
import {
  hasListingTag,
  normalizePropertyTags,
  sortTagsByLookupOrder,
  syncLegacyTagField,
} from '@/lib/listingTags'

type Row = Database['public']['Tables']['properties']['Row']
type SalesRow = Database['public']['Tables']['salespeople']['Row']
type ListingTagRow = Database['public']['Tables']['property_listing_tags']['Row']
type PropertyTypeOptRow = Database['public']['Tables']['property_type_options']['Row']
type DeveloperRow = Database['public']['Tables']['property_developers']['Row']

type GalleryImageItem = { type: 'image'; src: string }

function slotsFromGallery(g: unknown): string[] {
  const arr = Array.isArray(g) ? g : []
  const urls = arr.map((x: unknown) => {
    if (x && typeof x === 'object' && 'src' in x && typeof (x as { src: unknown }).src === 'string') {
      return (x as { src: string }).src
    }
    return ''
  })
  while (urls.length < 6) urls.push('')
  return urls.slice(0, 6)
}

function galleryFromSlots(slots: string[]): GalleryImageItem[] {
  return slots
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) => ({ type: 'image' as const, src }))
}

function formatPriceTableCell(r: Row): string {
  if (r.price_aed != null && Number.isFinite(r.price_aed)) {
    return `AED ${r.price_aed.toLocaleString('en-AE')}`
  }
  if (r.pf_price_on_request) return 'On request'
  return '—'
}

function createEmptyRow(): Row {
  const now = new Date().toISOString()
  return {
    id: `vm-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    slug: null,
    title: '',
    tag: 'For sale',
    tags: ['For sale'],
    meta: null,
    detail: null,
    alt: '',
    image_url: '',
    price_aed: null,
    beds: null,
    baths: null,
    location: null,
    neighbourhood: null,
    emirate: null,
    exclusive_with_us: false,
    interior_m2: null,
    plot_m2: null,
    latitude: null,
    longitude: null,
    full_address: null,
    description_html: null,
    property_ref_id: null,
    year_built: null,
    gallery: [],
    home_section: 'none',
    sort_order_home: 0,
    published: true,
    salesperson_id: null,
    property_type: null,
    developer_id: null,
    listing_source: 'cms',
    pf_listing_id: null,
    pf_payload: null,
    pf_state_stage: null,
    pf_state_type: null,
    pf_category: null,
    pf_offering_type: null,
    pf_project_status: null,
    pf_verification_status: null,
    pf_quality_score: null,
    pf_assigned_to_id: null,
    pf_assigned_to_name: null,
    pf_created_by_id: null,
    pf_location_id: null,
    pf_location_name: null,
    pf_latitude: null,
    pf_longitude: null,
    pf_price_type: null,
    pf_price_on_request: false,
    pf_price_raw: null,
    pf_currency: null,
    pf_published_at: null,
    created_at: now,
    updated_at: now,
  }
}

const steps = ['Basics', 'Specs', 'Media', 'Copy'] as const

function fieldClass(extra = '') {
  return `mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm ${extra}`
}

export function AdminProperties() {
  const { refetch: refetchCms } = useCms()
  const sb = getSupabase()
  const [rows, setRows] = useState<Row[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Row | null>(null)
  const [step, setStep] = useState(0)
  const [galleryText, setGalleryText] = useState('[]')
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [isNewRecord, setIsNewRecord] = useState(true)
  const [gallerySlots, setGallerySlots] = useState<string[]>(() => ['', '', '', '', '', ''])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkHomeOpen, setBulkHomeOpen] = useState(false)
  const [bulkHomeSection, setBulkHomeSection] =
    useState<Row['home_section']>('none')
  const [bulkSalesOpen, setBulkSalesOpen] = useState(false)
  const [bulkSalespersonId, setBulkSalespersonId] = useState<string>('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [salespeople, setSalespeople] = useState<SalesRow[]>([])
  const [developers, setDevelopers] = useState<DeveloperRow[]>([])
  const [viewRow, setViewRow] = useState<Row | null>(null)
  const [listingTagOptions, setListingTagOptions] = useState<ListingTagRow[]>([])
  const [tagsColumnReady, setTagsColumnReady] = useState<boolean | null>(null)
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<PropertyTypeOptRow[]>([])
  const [geoLookup, setGeoLookup] = useState<{
    neighbourhoods: TerracottaDropdownOption[]
    emirates: TerracottaDropdownOption[]
  }>({ neighbourhoods: [], emirates: [] })

  const loadListingLookups = useCallback(async () => {
    if (!sb) return { tags: [] as ListingTagRow[], types: [] as PropertyTypeOptRow[] }
    const [tagsRes, typesRes] = await Promise.all([
      sb
        .from('property_listing_tags')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      sb
        .from('property_type_options')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ])
    const tags = (tagsRes.error ? [] : (tagsRes.data ?? [])) as ListingTagRow[]
    const types = (typesRes.error ? [] : (typesRes.data ?? [])) as PropertyTypeOptRow[]
    setListingTagOptions(tags)
    setPropertyTypeOptions(types)
    return { tags, types }
  }, [sb])

  const refresh = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from('properties')
      .select('*')
      .order('sort_order_home', { ascending: true })
    if (error) {
      setLoadErr(error.message)
      return
    }
    setLoadErr(null)
    setRows(data ?? [])
    setSelectedIds(new Set())
  }, [sb])

  const loadSalespeople = useCallback(async () => {
    if (!sb) return
    const { data } = await sb.from('salespeople').select('*').order('sort_order', { ascending: true })
    setSalespeople(data ?? [])
  }, [sb])

  const loadDevelopers = useCallback(async () => {
    if (!sb) return
    const { data } = await sb
      .from('property_developers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    setDevelopers(data ?? [])
  }, [sb])

  useEffect(() => {
    void loadSalespeople()
    void loadDevelopers()
  }, [loadSalespeople, loadDevelopers])

  useEffect(() => {
    void loadListingLookups()
  }, [loadListingLookups])

  useEffect(() => {
    if (!sb) return
    void (async () => {
      const [hn, ue] = await Promise.all([
        sb
          .from('hero_neighbourhoods')
          .select('label')
          .eq('published', true)
          .order('sort_order', { ascending: true }),
        sb
          .from('uae_emirates')
          .select('name')
          .eq('published', true)
          .order('sort_order', { ascending: true }),
      ])
      const nh: TerracottaDropdownOption[] = (hn.data ?? []).map((r: { label: string }) => ({
        value: r.label,
        label: r.label,
      }))
      const em: TerracottaDropdownOption[] = (ue.data ?? []).map((r: { name: string }) => ({
        value: r.name,
        label: r.name,
      }))
      setGeoLookup({
        neighbourhoods: nh,
        emirates: [{ value: '', label: '—' }, ...em],
      })
    })()
  }, [sb])

  const neighbourhoodFieldOptions = useMemo((): TerracottaDropdownOption[] => {
    const base = geoLookup.neighbourhoods
    const cur = draft?.neighbourhood?.trim()
    let merged = [...base]
    if (cur && !merged.some((o) => o.value === cur)) {
      merged = [{ value: cur, label: `${cur} (current)` }, ...merged]
    }
    return [{ value: '', label: '— None' }, ...merged]
  }, [geoLookup.neighbourhoods, draft?.neighbourhood])

  const salesNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of salespeople) m.set(s.id, s.name)
    return m
  }, [salespeople])

  const listingTagNames = useMemo(
    () => new Set(listingTagOptions.map((t) => t.name)),
    [listingTagOptions],
  )
  const propertyTypeNames = useMemo(
    () => new Set(propertyTypeOptions.map((t) => t.name)),
    [propertyTypeOptions],
  )

  const draftTags = useMemo(
    () => (draft ? normalizePropertyTags(draft.tags, draft.tag) : []),
    [draft],
  )

  const listingTagChoices = useMemo(() => {
    const names = listingTagOptions.map((t) => t.name)
    const extra = draftTags.filter((t) => !listingTagNames.has(t))
    return [...names, ...extra]
  }, [listingTagOptions, draftTags, listingTagNames])

  const propertyTypeDropdownOptions = useMemo((): TerracottaDropdownOption[] => {
    const pt = draft?.property_type ?? ''
    const opts: TerracottaDropdownOption[] = [{ value: '', label: '—' }]
    if (pt && !propertyTypeNames.has(pt)) {
      opts.push({ value: pt, label: `${pt} (legacy)` })
    }
    for (const t of propertyTypeOptions) {
      opts.push({ value: t.name, label: t.name })
    }
    return opts
  }, [draft?.property_type, propertyTypeOptions, propertyTypeNames])

  const salespersonDropdownOptions = useMemo(
    (): TerracottaDropdownOption[] => [
      { value: '', label: 'Unassigned' },
      ...salespeople.map((s) => ({
        value: s.id,
        label: s.title ? `${s.name} — ${s.title}` : s.name,
      })),
    ],
    [salespeople],
  )

  const developerNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of developers) m.set(d.id, d.name)
    return m
  }, [developers])

  const deleteTarget = useMemo(
    () => (deleteId ? rows.find((r) => r.id === deleteId) : undefined),
    [rows, deleteId],
  )

  const developerDropdownOptions = useMemo((): TerracottaDropdownOption[] => {
    const devId = draft?.developer_id ?? ''
    const opts: TerracottaDropdownOption[] = [{ value: '', label: '—' }]
    if (devId && !developers.some((d) => d.id === devId)) {
      opts.push({ value: devId, label: `${devId} (legacy)` })
    }
    for (const d of developers) {
      opts.push({ value: d.id, label: d.name })
    }
    return opts
  }, [draft?.developer_id, developers])

  const homeSectionDropdownOptions = useMemo(
    (): TerracottaDropdownOption[] => [
      { value: 'none', label: 'None (catalog only)' },
      { value: 'featured', label: 'Featured (home top grid)' },
      { value: 'more_homes', label: 'More homes (home lower grid)' },
    ],
    [],
  )

  const bulkSalesDropdownOptions = useMemo(
    (): TerracottaDropdownOption[] => [
      { value: '', label: 'Unassigned (clear)' },
      ...salespeople.map((s) => ({ value: s.id, label: s.name })),
    ],
    [salespeople],
  )

  const bulkHomeSectionOptions = useMemo(
    (): TerracottaDropdownOption[] => [
      { value: 'none', label: 'None (catalog only)' },
      { value: 'featured', label: 'Featured' },
      { value: 'more_homes', label: 'More homes' },
    ],
    [],
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

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!sb) return
    void propertiesHasTagsColumn(sb).then(setTagsColumnReady)
  }, [sb])

  function setDraftTags(next: string[]) {
    if (!draft || next.length === 0) return
    const ordered = sortTagsByLookupOrder(
      next,
      listingTagOptions.map((t) => t.name),
    )
    setDraft({
      ...draft,
      tags: ordered,
      tag: syncLegacyTagField(ordered),
    })
  }

  function toggleDraftTag(name: string) {
    const current = draftTags
    const lower = name.toLowerCase()
    const has = current.some((t) => t.toLowerCase() === lower)
    if (has) {
      const next = current.filter((t) => t.toLowerCase() !== lower)
      if (next.length > 0) setDraftTags(next)
      return
    }
    setDraftTags([...current, name])
  }

  async function openCreate() {
    const { tags: tagOpts } = await loadListingLookups()
    const row = createEmptyRow()
    const tagDefault =
      tagOpts.find((t) => t.name === row.tag)?.name ?? tagOpts[0]?.name ?? row.tag
    row.tag = tagDefault
    row.tags = [tagDefault]
    setIsNewRecord(true)
    setDraft(row)
    setGallerySlots(['', '', '', '', '', ''])
    setGalleryText('[]')
    setStep(0)
    setSaveErr(null)
    setModalOpen(true)
  }

  async function openEdit(row: Row) {
    await loadListingLookups()
    setIsNewRecord(false)
    const tags = normalizePropertyTags(row.tags, row.tag)
    setDraft({ ...row, tags, tag: syncLegacyTagField(tags) })
    const slots = slotsFromGallery(row.gallery)
    setGallerySlots(slots)
    setGalleryText(JSON.stringify(galleryFromSlots(slots), null, 2))
    setStep(0)
    setSaveErr(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setDraft(null)
  }

  async function save() {
    if (!sb || !draft) return
    setSaveErr(null)
    const propertyId = draft.id.trim()
    const idErr = propertyIdValidationMessage(propertyId)
    if (idErr) {
      setSaveErr(idErr)
      setStep(0)
      return
    }
    if (isNewRecord) {
      const { data: existing } = await sb
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .maybeSingle()
      if (existing) {
        setSaveErr('Another listing already uses this property ID. Choose a unique ID.')
        setStep(0)
        return
      }
    }
    if (!draft.title.trim()) {
      setSaveErr('Title is required.')
      return
    }
    if (!draft.image_url.trim()) {
      setSaveErr('Main image is required (upload or URL).')
      setStep(2)
      return
    }
    let galleryPayload: GalleryImageItem[] = galleryFromSlots(gallerySlots)
    if (galleryPayload.length === 0) {
      try {
        const parsed: unknown = JSON.parse(galleryText || '[]')
        if (Array.isArray(parsed) && parsed.length > 0) {
          galleryPayload = parsed as GalleryImageItem[]
        }
      } catch {
        setSaveErr('Gallery JSON is invalid, or add images in the six slots.')
        setStep(2)
        return
      }
    }
    if (galleryPayload.length === 0) {
      galleryPayload = gallerySixForPropertyId(draft.id) as GalleryImageItem[]
    }
    const tags = normalizePropertyTags(draft.tags, draft.tag)
    if (tags.length === 0) {
      setSaveErr('Select at least one listing tag.')
      setStep(0)
      return
    }
    const slugRaw = draft.slug?.trim() ?? ''
    const slug =
      slugRaw.length > 0
        ? slugifyPropertyKey(slugRaw) || null
        : slugifyPropertyKey(draft.title) || null
    const merged: Row = {
      ...draft,
      id: propertyId,
      slug,
      tags,
      tag: syncLegacyTagField(tags),
      gallery: galleryPayload as Row['gallery'],
    }
    const hasTagsCol =
      tagsColumnReady ?? (await propertiesHasTagsColumn(sb))
    setTagsColumnReady(hasTagsCol)
    const payload = propertyRowToUpsert(merged, { includeTagsColumn: hasTagsCol })
    const { error } = await sb.from('properties').upsert(payload, { onConflict: 'id' })
    if (error) {
      const hint =
        /tags/i.test(error.message) && /column|schema cache/i.test(error.message)
          ? ' Run migration supabase/migrations/20260520120000_property_listing_tags_array.sql in Supabase SQL Editor.'
          : ''
      setSaveErr(`${error.message}${hint}`)
      return
    }
    closeModal()
    void refresh()
    void refetchCms()
  }

  function requestDelete(id: string) {
    if (modalOpen && draft?.id === id) {
      closeModal()
    }
    if (viewRow?.id === id) {
      setViewRow(null)
    }
    setDeleteId(id)
  }

  async function confirmDelete() {
    if (!sb || !deleteId) return
    setDeleteBusy(true)
    const { error } = await sb.from('properties').delete().eq('id', deleteId)
    setDeleteBusy(false)
    if (error) {
      setLoadErr(error.message)
      return
    }
    setDeleteId(null)
    void refresh()
    void refetchCms()
  }

  function updateDraft<K extends keyof Row>(key: K, value: Row[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  function setGallerySlot(index: number, url: string) {
    setGallerySlots((prev) => {
      const next = [...prev]
      next[index] = url
      setGalleryText(JSON.stringify(galleryFromSlots(next), null, 2))
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleSelectAllOnPage() {
    const ids = pagedRows.map((r) => r.id)
    const allOn = ids.length > 0 && ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (allOn) ids.forEach((id) => n.delete(id))
      else ids.forEach((id) => n.add(id))
      return n
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  const selectedList = [...selectedIds]
  const allSelectedOnPage =
    pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id))

  async function runBulkPublish(published: boolean) {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb.from('properties').update({ published }).in('id', selectedList)
    setBulkBusy(false)
    if (error) setLoadErr(error.message)
    else {
      clearSelection()
      void refresh()
      void refetchCms()
    }
  }

  async function runBulkDelete() {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb.from('properties').delete().in('id', selectedList)
    setBulkBusy(false)
    setBulkDeleteOpen(false)
    if (error) setLoadErr(error.message)
    else {
      clearSelection()
      void refresh()
      void refetchCms()
    }
  }

  async function runBulkHomeSection() {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb
      .from('properties')
      .update({ home_section: bulkHomeSection })
      .in('id', selectedList)
    setBulkBusy(false)
    setBulkHomeOpen(false)
    if (error) setLoadErr(error.message)
    else {
      clearSelection()
      void refresh()
      void refetchCms()
    }
  }

  async function runBulkAssignSalesperson() {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const sid = bulkSalespersonId.trim() === '' ? null : bulkSalespersonId
    const { error } = await sb
      .from('properties')
      .update({ salesperson_id: sid })
      .in('id', selectedList)
    setBulkBusy(false)
    setBulkSalesOpen(false)
    if (error) setLoadErr(error.message)
    else {
      clearSelection()
      void refresh()
      void refetchCms()
    }
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeading title="Properties" helpAriaLabel="About properties">
          <p>
            Full CRUD for listings. Use <strong>Home section</strong> to control featured and &quot;more homes&quot;
            carousels on the home page.
          </p>
        </AdminPageHeading>
        <button
          type="button"
          onClick={() => void openCreate()}
          className={`inline-flex items-center justify-center gap-2 self-end sm:self-start ${adminBtnPrimary}`}
        >
          <Plus className="size-4" aria-hidden />
          New property
        </button>
      </div>

      {loadErr ? <p className="text-sm text-red-600">{loadErr}</p> : null}

      {tagsColumnReady === false ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950 md:text-sm">
          The database is missing the <code className="rounded bg-amber-100 px-1">properties.tags</code>{' '}
          column. Property saves work with one tag only until you run{' '}
          <code className="rounded bg-amber-100 px-1">
            supabase/migrations/20260520120000_property_listing_tags_array.sql
          </code>{' '}
          in Supabase → SQL Editor (then refresh this page).
        </p>
      ) : null}

      {selectedList.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[var(--admin-radius-lg,24px)] border border-[var(--admin-primary)]/25 bg-[var(--admin-accent-soft)] p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="text-xs font-medium text-ink md:text-sm">
            {selectedList.length} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkPublish(true)}
              className={adminBtnPrimarySm}
            >
              Publish
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkPublish(false)}
              className={adminBtnGhost}
            >
              Unpublish
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setBulkHomeOpen(true)}
              className={adminBtnGhost}
            >
              Set home section…
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => {
                setBulkSalespersonId('')
                setBulkSalesOpen(true)
              }}
              className={adminBtnGhost}
            >
              Assign agent…
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 md:text-sm"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className={adminBtnGhost}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-none overflow-x-auto rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse text-left text-xs md:text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/50">
              <th className="px-2 py-3 md:px-3">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={() => toggleSelectAllOnPage()}
                  className="size-4 rounded border-ink/20"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-3 py-3 md:px-4">Title</th>
              <th className="px-3 py-3 whitespace-nowrap md:px-4">Price</th>
              <th className="px-3 py-3 md:px-4">Tags</th>
              <th className="px-3 py-3 md:px-4">Type</th>
              <th className="px-3 py-3 md:px-4">Neighbourhood</th>
              <th className="px-3 py-3 md:px-4">Emirate</th>
              <th className="px-3 py-3 whitespace-nowrap md:px-4">Beds</th>
              <th className="px-3 py-3 whitespace-nowrap md:px-4">Baths</th>
              <th className="px-3 py-3 md:px-4">Exc.</th>
              <th className="px-3 py-3 md:px-4">Agent</th>
              <th className="px-3 py-3 md:px-4">Home</th>
              <th className="px-3 py-3 md:px-4">Pub</th>
              <th className="px-3 py-3 text-right md:px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-b border-ink/5 transition hover:bg-ink/[0.02] last:border-0"
                onClick={() => setViewRow(r)}
              >
                <td className="px-2 py-2.5 md:px-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="size-4 rounded border-ink/20"
                    aria-label={`Select ${r.title}`}
                  />
                </td>
                <td className="min-w-0 px-3 py-2.5 font-medium md:px-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="break-words">{r.title}</span>
                    {r.listing_source === 'property_finder' ? (
                      <span className="w-fit rounded-md bg-sky-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-sky-900">
                        Property Finder
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-medium tabular-nums text-ink/90 md:px-4">
                  {formatPriceTableCell(r)}
                </td>
                <td className="min-w-0 px-3 py-2.5 md:px-4">
                  <div className="flex max-w-[11rem] flex-wrap gap-1">
                    {normalizePropertyTags(r.tags, r.tag).map((label) => (
                      <span
                        key={label}
                        className="rounded-md bg-[var(--admin-accent-soft)] px-1.5 py-0.5 text-[0.65rem] font-medium text-ink/80"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="min-w-0 px-3 py-2.5 text-[0.65rem] text-ink/75 md:px-4">
                  {r.property_type ?? '—'}
                </td>
                <td className="min-w-0 max-w-[140px] truncate px-3 py-2.5 text-[0.65rem] text-ink/75 md:px-4" title={r.neighbourhood ?? ''}>
                  {r.neighbourhood ?? '—'}
                </td>
                <td className="min-w-0 px-3 py-2.5 text-[0.65rem] text-ink/75 md:px-4">
                  {r.emirate ?? '—'}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink/80 md:px-4">
                  {r.beds === 0 ? '0' : r.beds ?? '—'}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink/80 md:px-4">
                  {r.baths ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-center text-ink/70 md:px-4">
                  {r.exclusive_with_us ? 'Y' : '—'}
                </td>
                <td className="min-w-0 truncate px-3 py-2.5 text-ink/70 md:px-4" title={r.salesperson_id ? (salesNameById.get(r.salesperson_id) ?? '') : ''}>
                  {r.salesperson_id ? (salesNameById.get(r.salesperson_id) ?? '—') : '—'}
                </td>
                <td className="px-3 py-2.5 text-ink/70 md:px-4">{r.home_section}</td>
                <td className="px-3 py-2.5 md:px-4">
                  {r.published ? (
                    'Yes'
                  ) : (
                    <span
                      className={
                        hasListingTag(
                          { tags: normalizePropertyTags(r.tags, r.tag), tag: r.tag },
                          'Offplan',
                        )
                          ? 'font-medium text-amber-800'
                          : undefined
                      }
                      title={
                        hasListingTag(
                          { tags: normalizePropertyTags(r.tags, r.tag), tag: r.tag },
                          'Offplan',
                        )
                          ? 'Hidden on the public site — turn on Published in the listing editor'
                          : undefined
                      }
                    >
                      No
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right md:px-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void openEdit(r)
                      }}
                      className="rounded-full p-2 text-ink/60 hover:bg-ink/5"
                      aria-label={`Edit ${r.title}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        requestDelete(r.id)
                      }}
                      className="rounded-full p-2 text-red-600/80 hover:bg-red-50"
                      aria-label={`Delete ${r.title}`}
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
          <p className="px-4 py-6 text-center text-sm text-ink/50">No properties yet.</p>
        ) : null}
      </div>

      <AdminModal
        open={modalOpen && !!draft}
        wide
        title={
          draft?.listing_source === 'property_finder'
            ? `Property Finder · ${draft.title}`
            : draft?.title
              ? `Edit · ${draft.title}`
              : 'New property'
        }
        onClose={closeModal}
        footer={
          <>
            {!isNewRecord && draft ? (
              <button
                type="button"
                onClick={() => requestDelete(draft.id)}
                className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 md:mr-auto md:w-auto"
              >
                Delete listing
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeModal}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className={`w-full md:w-auto ${adminBtnPrimary}`}
            >
              Save
            </button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {steps.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider md:text-xs ${
                    step === i ? adminStepActive : adminStepInactive
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {saveErr ? <p className="text-xs text-red-600">{saveErr}</p> : null}

            {draft.listing_source === 'property_finder' ? (
              <p className="rounded-2xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs leading-relaxed text-sky-950">
                This row is synced from Property Finder. The next sync refreshes title, price, media, and
                description from PF, and updates channel tags (For sale/rent, Offplan) while keeping{' '}
                <strong>decorative tags</strong> (e.g. New, Exclusive), plus <strong>home section</strong>,{' '}
                <strong>sort order</strong>, <strong>assigned agent</strong>, and <strong>exclusive</strong>.
              </p>
            ) : null}

            {step === 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">ID (URL key)</label>
                  <input
                    value={draft.id}
                    onChange={(e) => updateDraft('id', e.target.value)}
                    disabled={!isNewRecord}
                    className={fieldClass()}
                  />
                  <p className="mt-1 text-[0.6875rem] text-ink/45">
                    Used in <code className="rounded bg-ink/5 px-1">/properties/{'{id}'}</code>. Use
                    letters, numbers, and hyphens only (e.g.{' '}
                    <code className="rounded bg-ink/5 px-1">knightsbridge-by-leos</code>). Cannot be
                    changed after saving.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Slug (optional)</label>
                  <input
                    value={draft.slug ?? ''}
                    onChange={(e) => updateDraft('slug', e.target.value || null)}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Title</label>
                  <input
                    value={draft.title}
                    onChange={(e) => updateDraft('title', e.target.value)}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-ink/70">Listing tags</p>
                  <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-ink/50">
                    Select all that apply — e.g. <strong>New</strong> and <strong>Offplan</strong>{' '}
                    together. Channel pages (/for-sale, /for-rent, /offplan) filter by these tags.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {listingTagChoices.length === 0 ? (
                      <span className="text-xs text-ink/50">
                        Add options under Properties → Listing tags
                      </span>
                    ) : (
                      listingTagChoices.map((name) => {
                        const checked = draftTags.some(
                          (t) => t.toLowerCase() === name.toLowerCase(),
                        )
                        return (
                          <label
                            key={name}
                            className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors ${
                              checked
                                ? 'border-[var(--admin-primary)] bg-[var(--admin-accent-soft)] text-ink'
                                : 'border-ink/15 bg-white text-ink/75 hover:border-ink/25'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDraftTag(name)}
                              className="size-4 rounded border-ink/20"
                            />
                            {name}
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Property type</label>
                  <TerracottaDropdown
                    variant="admin"
                    listPortal
                    label="Property type"
                    options={propertyTypeDropdownOptions}
                    value={draft.property_type ?? ''}
                    onChange={(v) => updateDraft('property_type', v || null)}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Developer</label>
                  <AdminSearchableTerracottaDropdown
                    label="Developer"
                    searchPlaceholder="Search developers…"
                    options={developerDropdownOptions}
                    value={draft.developer_id ?? ''}
                    onChange={(v) => {
                      const id = v.trim() || null
                      updateDraft('developer_id', id)
                    }}
                  />
                  <p className="mt-1 text-[0.6875rem] text-ink/45">
                    From <strong>Properties → Developers</strong>. Developer appears on{' '}
                    <strong>/developers</strong> when this listing is published.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Assigned agent</label>
                  <TerracottaDropdown
                    variant="admin"
                    listPortal
                    label="Assigned agent"
                    options={salespersonDropdownOptions}
                    value={draft.salesperson_id ?? ''}
                    onChange={(v) => updateDraft('salesperson_id', v || null)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Home section</label>
                  <TerracottaDropdown
                    variant="admin"
                    listPortal
                    label="Home section"
                    options={homeSectionDropdownOptions}
                    value={draft.home_section}
                    onChange={(v) =>
                      updateDraft('home_section', v as Row['home_section'])
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Sort (home)</label>
                  <input
                    type="number"
                    value={draft.sort_order_home}
                    onChange={(e) =>
                      updateDraft('sort_order_home', Number(e.target.value) || 0)
                    }
                    className={fieldClass()}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="pub"
                    type="checkbox"
                    checked={draft.published}
                    onChange={(e) => updateDraft('published', e.target.checked)}
                    className="size-4 rounded border-ink/20"
                  />
                  <label htmlFor="pub" className="text-xs font-medium text-ink/70">
                    Published (visible on public site)
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Meta line</label>
                  <input
                    value={draft.meta ?? ''}
                    onChange={(e) => updateDraft('meta', e.target.value || null)}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Detail line</label>
                  <input
                    value={draft.detail ?? ''}
                    onChange={(e) => updateDraft('detail', e.target.value || null)}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Image alt</label>
                  <input
                    value={draft.alt}
                    onChange={(e) => updateDraft('alt', e.target.value)}
                    className={fieldClass()}
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-ink/70">Price (AED)</label>
                  <input
                    type="number"
                    value={draft.price_aed ?? ''}
                    onChange={(e) =>
                      updateDraft(
                        'price_aed',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Beds</label>
                  <input
                    type="number"
                    value={draft.beds ?? ''}
                    onChange={(e) =>
                      updateDraft('beds', e.target.value === '' ? null : Number(e.target.value))
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Baths</label>
                  <input
                    type="number"
                    value={draft.baths ?? ''}
                    onChange={(e) =>
                      updateDraft('baths', e.target.value === '' ? null : Number(e.target.value))
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Interior m²</label>
                  <input
                    type="number"
                    value={draft.interior_m2 ?? ''}
                    onChange={(e) =>
                      updateDraft(
                        'interior_m2',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Plot m²</label>
                  <input
                    type="number"
                    value={draft.plot_m2 ?? ''}
                    onChange={(e) =>
                      updateDraft(
                        'plot_m2',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Year built</label>
                  <input
                    type="number"
                    value={draft.year_built ?? ''}
                    onChange={(e) =>
                      updateDraft(
                        'year_built',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Ref ID</label>
                  <input
                    value={draft.property_ref_id ?? ''}
                    onChange={(e) =>
                      updateDraft('property_ref_id', e.target.value || null)
                    }
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Location</label>
                  <input
                    value={draft.location ?? ''}
                    onChange={(e) => updateDraft('location', e.target.value || null)}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <AdminSearchableTerracottaDropdown
                    label="Neighbourhood (featured list)"
                    searchPlaceholder="Search neighbourhoods…"
                    options={neighbourhoodFieldOptions}
                    value={draft.neighbourhood ?? ''}
                    onChange={(v) => updateDraft('neighbourhood', v || null)}
                  />
                  <p className="mt-1 text-[0.6875rem] text-ink/45">
                    Pulled from <strong>Properties → Featured neighbourhoods</strong>. Pick a card label or keep a
                    synced value shown as &quot;(current)&quot;.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Emirate (UAE)</label>
                  <TerracottaDropdown
                    variant="admin"
                    listPortal
                    label="Emirate"
                    options={geoLookup.emirates}
                    value={draft.emirate ?? ''}
                    onChange={(v) => updateDraft('emirate', v || null)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-[0.6875rem] text-ink/45">
                    Options from <strong>Properties → Emirates</strong>. Aligns with public filters.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Full address</label>
                  <input
                    value={draft.full_address ?? ''}
                    onChange={(e) =>
                      updateDraft('full_address', e.target.value || null)
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={draft.latitude ?? ''}
                    onChange={(e) =>
                      updateDraft(
                        'latitude',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={draft.longitude ?? ''}
                    onChange={(e) =>
                      updateDraft(
                        'longitude',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className={fieldClass()}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="excl"
                    type="checkbox"
                    checked={draft.exclusive_with_us}
                    onChange={(e) =>
                      updateDraft('exclusive_with_us', e.target.checked)
                    }
                    className="size-4 rounded border-ink/20"
                  />
                  <label htmlFor="excl" className="text-xs font-medium text-ink/70">
                    Exclusive with us
                  </label>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <ImageUploadField
                  label="Main listing image"
                  folder="properties"
                  value={draft.image_url}
                  onChange={(url) => updateDraft('image_url', url)}
                />
                <p className="text-xs font-medium text-ink/70">
                  Detail gallery — six images (upload or URL each)
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {gallerySlots.map((slotUrl, i) => (
                    <ImageUploadField
                      key={i}
                      label={`Image ${i + 1} of 6`}
                      folder="properties"
                      value={slotUrl}
                      onChange={(url) => setGallerySlot(i, url)}
                      compact
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const six = gallerySixForPropertyId(draft.id)
                    const urls = six.map((g) => g.src)
                    const next = [...urls, '', '', '', '', '', ''].slice(0, 6)
                    setGallerySlots(next)
                    setGalleryText(JSON.stringify(galleryFromSlots(next), null, 2))
                  }}
                  className={adminBtnGhost}
                >
                  Fill 6 slots from default seed set
                </button>
                <div>
                  <label className="text-xs font-medium text-ink/70">
                    Advanced: gallery JSON (optional override)
                  </label>
                  <textarea
                    value={galleryText}
                    onChange={(e) => setGalleryText(e.target.value)}
                    rows={6}
                    className={`${fieldClass()} font-mono text-[0.6875rem] leading-relaxed md:text-xs`}
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <label className="text-xs font-medium text-ink/70">
                  Listing copy (rich text)
                </label>
                <AdminRichTextField
                  value={draft.description_html ?? ''}
                  onChange={(html) =>
                    updateDraft('description_html', html.trim() ? html : null)
                  }
                  minHeight={300}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={bulkSalesOpen}
        title="Assign agent to selected listings"
        onClose={() => setBulkSalesOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setBulkSalesOpen(false)}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkAssignSalesperson()}
              className={`w-full md:w-auto ${adminBtnPrimary}`}
            >
              Apply
            </button>
          </>
        }
      >
        <p className="mb-2 text-xs font-medium text-ink/70">Agent</p>
        <TerracottaDropdown
          variant="admin"
          listPortal
          label="Agent"
          options={bulkSalesDropdownOptions}
          value={bulkSalespersonId}
          onChange={setBulkSalespersonId}
        />
      </AdminModal>

      <AdminModal
        open={bulkHomeOpen}
        title="Set home section for selected"
        onClose={() => setBulkHomeOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setBulkHomeOpen(false)}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkHomeSection()}
              className={`w-full md:w-auto ${adminBtnPrimary}`}
            >
              Apply
            </button>
          </>
        }
      >
        <p className="mb-2 text-xs font-medium text-ink/70">Home section</p>
        <TerracottaDropdown
          variant="admin"
          listPortal
          label="Home section"
          options={bulkHomeSectionOptions}
          value={bulkHomeSection}
          onChange={(v) => setBulkHomeSection(v as Row['home_section'])}
        />
      </AdminModal>

      <AdminModal
        open={bulkDeleteOpen}
        title={`Delete ${selectedList.length} listings?`}
        onClose={() => setBulkDeleteOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(false)}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkDelete()}
              className="w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white md:w-auto"
            >
              Delete all selected
            </button>
          </>
        }
      >
        <p className="text-sm text-ink/75">
          This cannot be undone. URLs to these properties will stop working.
        </p>
      </AdminModal>

      <AdminModal
        open={!!deleteId}
        title={
          deleteTarget?.title
            ? `Delete “${deleteTarget.title}”?`
            : 'Delete property?'
        }
        onClose={() => {
          if (!deleteBusy) setDeleteId(null)
        }}
        footer={
          <>
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => setDeleteId(null)}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => void confirmDelete()}
              className="w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white md:w-auto"
            >
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink/75">
          {deleteTarget ? (
            <>
              You are about to permanently delete{' '}
              <strong className="font-medium text-ink">{deleteTarget.title}</strong>
              {deleteTarget.property_ref_id ? (
                <>
                  {' '}
                  (<span className="tabular-nums">{deleteTarget.property_ref_id}</span>)
                </>
              ) : null}
              . This cannot be undone and public links to this listing will stop working.
            </>
          ) : (
            'This removes the listing from the database. Links to this property will stop working.'
          )}
        </p>
      </AdminModal>

      <EntityDetailSheet
        open={!!viewRow}
        title={viewRow?.title ? `Property · ${viewRow.title}` : 'Property details'}
        onClose={() => setViewRow(null)}
        fields={
          viewRow
            ? [
                { label: 'Reference', value: viewRow.property_ref_id || '—' },
                { label: 'Price (AED)', value: viewRow.price_aed != null ? String(viewRow.price_aed) : '—' },
                { label: 'Type', value: viewRow.property_type || '—' },
                {
                  label: 'Developer',
                  value: viewRow.developer_id
                    ? (developerNameById.get(viewRow.developer_id) ?? viewRow.developer_id)
                    : '—',
                },
                {
                  label: 'Tags',
                  value: normalizePropertyTags(viewRow.tags, viewRow.tag).join(', ') || '—',
                },
                { label: 'Beds / Baths', value: `${viewRow.beds ?? '—'} / ${viewRow.baths ?? '—'}` },
                { label: 'Location', value: viewRow.location || '—' },
                {
                  label: 'Assigned agent',
                  value: viewRow.salesperson_id
                    ? (salesNameById.get(viewRow.salesperson_id) ?? viewRow.salesperson_id)
                    : '—',
                },
                { label: 'Source', value: viewRow.listing_source },
                { label: 'PF listing ID', value: viewRow.pf_listing_id || '—' },
                { label: 'Status', value: viewRow.published ? 'Published' : 'Hidden' },
              ]
            : []
        }
      />
    </div>
  )
}
