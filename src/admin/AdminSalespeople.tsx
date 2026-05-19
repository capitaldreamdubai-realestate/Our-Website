import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
import { useAdminTablePagination } from './useAdminTablePagination'
import { ImageUploadField } from './components/ImageUploadField'
import { PhoneInputField } from '@/components/PhoneInputField'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'

type Row = Database['public']['Tables']['salespeople']['Row']

function emptyRow(): Row {
  const now = new Date().toISOString()
  return {
    id: `sp-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    slug: '',
    name: '',
    title: '',
    bio: '',
    profile_image_url: '',
    listings_count: 0,
    phone: null,
    email: null,
    social_links: {},
    pf_public_profile_id: null,
    pf_user_id: null,
    sort_order: 0,
    published: true,
    created_at: now,
    updated_at: now,
  }
}

function fieldClass(extra = '') {
  return `mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm ${extra}`
}

const steps = ['Profile', 'Contact & social'] as const

export function AdminSalespeople() {
  const sb = getSupabase()
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Row | null>(null)
  const [step, setStep] = useState(0)
  const [socialText, setSocialText] = useState('{}')
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [slugLocked, setSlugLocked] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [viewRow, setViewRow] = useState<Row | null>(null)

  const refresh = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from('salespeople')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) {
      setErr(error.message)
      return
    }
    setErr(null)
    setRows(data ?? [])
    setSelectedIds(new Set())
  }, [sb])

  useEffect(() => {
    void refresh()
  }, [refresh])

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
    const r = emptyRow()
    setDraft(r)
    setSocialText(JSON.stringify(r.social_links ?? {}, null, 2))
    setSlugLocked(false)
    setStep(0)
    setSaveErr(null)
    setModalOpen(true)
  }

  function openEdit(r: Row) {
    setDraft({ ...r })
    setSocialText(JSON.stringify(r.social_links ?? {}, null, 2))
    setSlugLocked(true)
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
    if (!draft.slug.trim() || !draft.name.trim()) {
      setSaveErr('Slug and name are required.')
      return
    }
    let social: unknown
    try {
      social = JSON.parse(socialText || '{}')
    } catch {
      setSaveErr('Social links must be valid JSON (object).')
      setStep(1)
      return
    }
    if (typeof social !== 'object' || social === null || Array.isArray(social)) {
      setSaveErr('Social links must be a JSON object.')
      setStep(1)
      return
    }
    const payload: Database['public']['Tables']['salespeople']['Insert'] = {
      id: draft.id,
      slug: draft.slug.trim(),
      name: draft.name.trim(),
      title: draft.title,
      bio: draft.bio,
      profile_image_url: draft.profile_image_url,
      listings_count: draft.listings_count,
      phone: draft.phone?.trim() || null,
      email: draft.email?.trim() || null,
      social_links: social as Row['social_links'],
      pf_public_profile_id: draft.pf_public_profile_id?.trim() || null,
      pf_user_id: draft.pf_user_id?.trim() || null,
      sort_order: draft.sort_order,
      published: draft.published,
    }
    const { error } = await sb.from('salespeople').upsert(payload, { onConflict: 'id' })
    if (error) {
      setSaveErr(error.message)
      return
    }
    closeModal()
    void refresh()
  }

  async function confirmDelete() {
    if (!sb || !deleteId) return
    const { error } = await sb.from('salespeople').delete().eq('id', deleteId)
    if (error) {
      setErr(error.message)
      return
    }
    setDeleteId(null)
    void refresh()
  }

  function upd<K extends keyof Row>(key: K, v: Row[K]) {
    setDraft((d) => (d ? { ...d, [key]: v } : d))
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
    const { error } = await sb.from('salespeople').update({ published }).in('id', selectedList)
    setBulkBusy(false)
    if (error) setErr(error.message)
    else {
      clearSelection()
      void refresh()
    }
  }

  async function runBulkDelete() {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb.from('salespeople').delete().in('id', selectedList)
    setBulkBusy(false)
    setBulkDeleteOpen(false)
    if (error) setErr(error.message)
    else {
      clearSelection()
      void refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeading title="Sales team" helpAriaLabel="About the sales team">
          <p>
            Consultants and staff profiles. Assign listings to team members from <strong>Listings</strong> (property
            editor or bulk assign).
          </p>
        </AdminPageHeading>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex items-center justify-center gap-2 self-end sm:self-start ${adminBtnPrimary}`}
        >
          <Plus className="size-4" aria-hidden />
          New person
        </button>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

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
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 md:text-sm"
            >
              Delete
            </button>
            <button type="button" onClick={clearSelection} className={adminBtnGhost}>
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[800px] border-collapse text-left text-xs md:text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/50">
              <th className="w-10 px-2 py-3 md:px-3">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={() => toggleSelectAllOnPage()}
                  className="size-4 rounded border-ink/20"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-3 py-3 md:px-4">Name</th>
              <th className="px-3 py-3 md:px-4">Title</th>
              <th className="px-3 py-3 md:px-4">Listings #</th>
              <th className="px-3 py-3 md:px-4">Sort</th>
              <th className="px-3 py-3 md:px-4">Status</th>
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
                    aria-label={`Select ${r.name}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-medium md:px-4">
                  <div className="flex items-center gap-2">
                    {r.profile_image_url ? (
                      <img
                        src={r.profile_image_url}
                        alt=""
                        className="size-8 shrink-0 rounded-full object-cover ring-1 ring-ink/10"
                      />
                    ) : null}
                    <span>{r.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-ink/70 md:px-4">{r.title}</td>
                <td className="px-3 py-2.5 md:px-4">{r.listings_count}</td>
                <td className="px-3 py-2.5 text-ink/65 md:px-4">{r.sort_order}</td>
                <td className="px-3 py-2.5 md:px-4">
                  {r.published ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-800">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[0.6875rem] font-medium text-ink/60">
                      Hidden
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right md:px-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(r)
                      }}
                      className="rounded-full p-2 text-ink/60 hover:bg-ink/5"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteId(r.id)
                      }}
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
          <p className="px-4 py-6 text-center text-sm text-ink/50">No team members yet. Run seed or add one.</p>
        ) : null}
      </div>

      <AdminModal
        open={modalOpen && !!draft}
        wide
        title={draft?.name ? `Team · ${draft.name}` : 'New team member'}
        onClose={closeModal}
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

            {step === 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-ink/70">ID</label>
                  <input
                    value={draft.id}
                    onChange={(e) => upd('id', e.target.value)}
                    disabled={slugLocked}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Slug</label>
                  <input
                    value={draft.slug}
                    onChange={(e) => upd('slug', e.target.value)}
                    disabled={slugLocked}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Full name</label>
                  <input value={draft.name} onChange={(e) => upd('name', e.target.value)} className={fieldClass()} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Job title</label>
                  <input value={draft.title} onChange={(e) => upd('title', e.target.value)} className={fieldClass()} />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Sort order</label>
                  <input
                    type="number"
                    value={draft.sort_order}
                    onChange={(e) => upd('sort_order', Number(e.target.value) || 0)}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Listings count (badge)</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.listings_count}
                    onChange={(e) => upd('listings_count', Math.max(0, Number(e.target.value) || 0))}
                    className={fieldClass()}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="sp-pub"
                    type="checkbox"
                    checked={draft.published}
                    onChange={(e) => upd('published', e.target.checked)}
                    className="size-4 rounded border-ink/20"
                  />
                  <label htmlFor="sp-pub" className="text-xs font-medium text-ink/70">
                    Published (API / future site)
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Bio</label>
                  <textarea
                    value={draft.bio}
                    onChange={(e) => upd('bio', e.target.value)}
                    rows={5}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ImageUploadField
                    label="Profile photo"
                    folder="salespeople"
                    value={draft.profile_image_url}
                    onChange={(url) => upd('profile_image_url', url)}
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="sp-phone" className="text-xs font-medium text-ink/70">
                    Phone
                  </label>
                  <PhoneInputField
                    id="sp-phone"
                    value={draft.phone}
                    onChange={(v) => upd('phone', v ?? null)}
                    variant="admin"
                    defaultCountry="AE"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Email</label>
                  <input
                    type="email"
                    value={draft.email ?? ''}
                    onChange={(e) => upd('email', e.target.value || null)}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">PF public profile ID</label>
                  <input
                    value={draft.pf_public_profile_id ?? ''}
                    onChange={(e) => upd('pf_public_profile_id', e.target.value || null)}
                    className={fieldClass()}
                    placeholder="e.g. 216582"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">PF user ID (fallback)</label>
                  <input
                    value={draft.pf_user_id ?? ''}
                    onChange={(e) => upd('pf_user_id', e.target.value || null)}
                    className={fieldClass()}
                    placeholder="e.g. 1234"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Social links (JSON)</label>
                  <textarea
                    value={socialText}
                    onChange={(e) => setSocialText(e.target.value)}
                    rows={8}
                    className={`${fieldClass()} font-mono text-[0.6875rem] md:text-xs`}
                    spellCheck={false}
                  />
                  <p className="mt-1 text-[0.6875rem] text-ink/45">
                    Example:{' '}
                    <code className="break-all rounded bg-ink/5 px-1">
                      {`{"linkedin":"https://...","instagram":"https://..."}`}
                    </code>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <EntityDetailSheet
        open={!!viewRow}
        title={viewRow?.name ? `Salesperson · ${viewRow.name}` : 'Salesperson details'}
        onClose={() => setViewRow(null)}
        fields={
          viewRow
            ? [
                { label: 'Title', value: viewRow.title || '—' },
                { label: 'Email', value: viewRow.email || '—' },
                { label: 'Phone', value: viewRow.phone || '—' },
                { label: 'PF public profile ID', value: viewRow.pf_public_profile_id || '—' },
                { label: 'PF user ID', value: viewRow.pf_user_id || '—' },
                { label: 'Listings count', value: String(viewRow.listings_count) },
                { label: 'Sort order', value: String(viewRow.sort_order) },
                { label: 'Status', value: viewRow.published ? 'Live' : 'Hidden' },
                { label: 'Bio', value: viewRow.bio || '—' },
              ]
            : []
        }
      />

      <AdminModal
        open={bulkDeleteOpen}
        title={`Delete ${selectedList.length} team members?`}
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
          Listings assigned to them will have salesperson cleared (database rule).
        </p>
      </AdminModal>

      <AdminModal
        open={!!deleteId}
        title="Delete team member?"
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
        <p className="text-sm text-ink/75">Assigned listings will lose this contact link.</p>
      </AdminModal>
    </div>
  )
}
