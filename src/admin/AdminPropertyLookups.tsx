import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { adminBtnGhost, adminBtnPrimary } from './adminClassNames'
import { AdminModal } from './components/AdminModal'
import { AdminPageHeading } from './components/AdminPageHeading'
import { AdminTablePagination } from './components/AdminTablePagination'
import { useAdminTablePagination } from './useAdminTablePagination'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'

type LookupTable = 'property_listing_tags' | 'property_type_options'
type LookupRow = Database['public']['Tables'][LookupTable]['Row']

const CONFIG: Record<
  LookupTable,
  {
    title: string
    helpAria: string
    blurb: string
    singular: string
    columnLabel: string
    pluralLabel: string
  }
> = {
  property_listing_tags: {
    title: 'Listing tags',
    helpAria: 'About listing tags',
    blurb:
      'Labels such as “For sale”, “New”, “Offplan”, and “Deals”. Listings can have multiple tags. Tags drive channel pages (/for-sale, /for-rent, /offplan, /deals) and card badges. Add or reorder options here.',
    singular: 'tag',
    columnLabel: 'Tag',
    pluralLabel: 'listing tags',
  },
  property_type_options: {
    title: 'Property types',
    helpAria: 'About property types',
    blurb:
      'Villa, Apartment, and other structural types. Options here fill the property type dropdown when editing listings.',
    singular: 'type',
    columnLabel: 'Type',
    pluralLabel: 'property types',
  },
}

function fieldClass() {
  return 'mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm'
}

function PropertyLookupAdmin({ table }: { table: LookupTable }) {
  const sb = getSupabase()
  const cfg = CONFIG[table]
  const [rows, setRows] = useState<LookupRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<LookupRow | null>(null)
  const [isNew, setIsNew] = useState(true)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from(table)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) {
      setErr(error.message)
      return
    }
    setErr(null)
    setRows((data ?? []) as LookupRow[])
    setSelectedIds(new Set())
  }, [sb, table])

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

  const selectedList = [...selectedIds]
  const allSelectedOnPage =
    pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id))

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
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (allSelectedOnPage) ids.forEach((id) => n.delete(id))
      else ids.forEach((id) => n.add(id))
      return n
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function runBulkDelete() {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb.from(table).delete().in('id', selectedList)
    setBulkBusy(false)
    setBulkDeleteOpen(false)
    if (error) setErr(error.message)
    else {
      clearSelection()
      void refresh()
    }
  }

  function openCreate() {
    setIsNew(true)
    const now = new Date().toISOString()
    setDraft({
      id: '',
      name: '',
      sort_order: rows.length,
      created_at: now,
      updated_at: now,
    } as LookupRow)
    setSaveErr(null)
    setModalOpen(true)
  }

  function openEdit(r: LookupRow) {
    setIsNew(false)
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
      setSaveErr('Label is required.')
      return
    }
    const sortOrder = Number(draft.sort_order) || 0
    if (isNew) {
      const { error } = await sb.from(table).insert({ name, sort_order: sortOrder })
      if (error) {
        setSaveErr(error.message)
        return
      }
    } else if (draft.id) {
      const { error } = await sb
        .from(table)
        .update({ name, sort_order: sortOrder })
        .eq('id', draft.id)
      if (error) {
        setSaveErr(error.message)
        return
      }
    }
    closeModal()
    void refresh()
  }

  async function confirmDelete() {
    if (!sb || !deleteId) return
    const { error } = await sb.from(table).delete().eq('id', deleteId)
    if (error) {
      setErr(error.message)
      return
    }
    setDeleteId(null)
    void refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeading title={cfg.title} helpAriaLabel={cfg.helpAria}>
          <p>{cfg.blurb}</p>
        </AdminPageHeading>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex items-center gap-2 self-end sm:self-start ${adminBtnPrimary}`}
        >
          <Plus className="size-4" aria-hidden />
          Add {cfg.singular}
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
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 md:text-sm"
            >
              Delete selected
            </button>
            <button type="button" onClick={clearSelection} className={adminBtnGhost}>
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[400px] text-left text-xs md:text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/50">
              <th className="w-10 px-2 py-3 md:px-3">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAllOnPage}
                  className="size-4 rounded border-ink/20"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-3 py-3 md:px-4">{cfg.columnLabel}</th>
              <th className="px-3 py-3 md:px-4">Sort</th>
              <th className="px-3 py-3 text-right md:px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => (
              <tr key={r.id} className="border-b border-ink/5 last:border-0">
                <td className="px-2 py-2.5 md:px-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="size-4 rounded border-ink/20"
                    aria-label={`Select ${r.name}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-medium md:px-4">{r.name}</td>
                <td className="px-3 py-2.5 md:px-4">{r.sort_order}</td>
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
          <p className="px-4 py-6 text-center text-sm text-ink/50">No options yet.</p>
        ) : null}
      </div>

      <AdminModal
        open={modalOpen && !!draft}
        title={
          draft?.name
            ? `${cfg.columnLabel} · ${draft.name}`
            : `New ${cfg.singular}`
        }
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
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-medium text-ink/70">{cfg.columnLabel}</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Sort order</label>
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) =>
                  setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })
                }
                className={fieldClass()}
              />
            </div>
            {saveErr ? <p className="text-xs text-red-600">{saveErr}</p> : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={!!deleteId}
        title={`Delete ${cfg.singular}?`}
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
          Existing listings keep their current text; this only removes the option from dropdowns for new edits.
        </p>
      </AdminModal>

      <AdminModal
        open={bulkDeleteOpen}
        title={`Delete ${selectedList.length} ${cfg.pluralLabel}?`}
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
              className={`w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white md:w-auto ${bulkBusy ? 'opacity-50' : ''}`}
            >
              {bulkBusy ? 'Deleting…' : 'Delete all selected'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink/75">
          This removes the selected {cfg.pluralLabel} from the database. Listings that still use those labels keep
          their text; the options will no longer appear in listing dropdowns.
        </p>
      </AdminModal>
    </div>
  )
}

export function AdminPropertyListingTags() {
  return <PropertyLookupAdmin table="property_listing_tags" />
}

export function AdminPropertyTypes() {
  return <PropertyLookupAdmin table="property_type_options" />
}
