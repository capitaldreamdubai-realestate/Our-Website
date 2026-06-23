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
      sort_order: rows.length,
      published: false,
      created_at: now,
      updated_at: now,
    })
    setSaveErr(null)
    setModalOpen(true)
  }

  function openEdit(r: Row) {
    setIsNew(false)
    setSlugLocked(true)
    setGallerySlots(slotsFromGallery(r.gallery))
    setDraft({ ...r })
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

    const gallery = galleryFromSlots(gallerySlots)
    const hero =
      draft.hero_image_url?.trim() ||
      gallery[0]?.src ||
      null

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
      sort_order: Number(draft.sort_order) || 0,
      published: draft.published,
      updated_at: new Date().toISOString(),
    }

    if (isNew) {
      const { error } = await sb.from('offplan_projects').insert(payload)
      if (error) {
        setSaveErr(error.message)
        return
      }
    } else if (draft.id) {
      const { error } = await sb.from('offplan_projects').update(payload).eq('id', draft.id)
      if (error) {
        setSaveErr(error.message)
        return
      }
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
            Developer launches shown on <strong>/offplan</strong>. Group by launch status (New,
            Existing, Upcoming). Brochures are gated behind an enquiry form on the public site.
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
