import { Download, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TerracottaDropdownOption } from '@/components/TerracottaDropdown'
import { TerracottaDropdown } from '@/components/TerracottaDropdown'
import { adminBtnGhost, adminBtnPrimarySm } from './adminClassNames'
import { AdminModal } from './components/AdminModal'
import { AdminPageHeading } from './components/AdminPageHeading'
import { AdminTablePagination } from './components/AdminTablePagination'
import { SubmissionDetailSheet } from './components/SubmissionDetailSheet'
import { useAdminTablePagination } from './useAdminTablePagination'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'
import { parseSubmissionMeta } from '@/lib/submissionMeta'

type Row = Database['public']['Tables']['form_submissions']['Row']
type SalespersonOption = Pick<
  Database['public']['Tables']['salespeople']['Row'],
  'id' | 'name'
>

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`
  return cell
}

function rowsToCsv(rows: Row[]): string {
  const headers = [
    'id',
    'created_at',
    'source',
    'property_id',
    'property_title',
    'project_id',
    'project_name',
    'name',
    'email',
    'phone',
    'message',
    'salesperson_id',
    'salesperson_name',
    'intent',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    const m = parseSubmissionMeta(r.meta)
    const msg = (r.message ?? '').replace(/\r\n/g, '\n').replace(/\n/g, ' ')
    const vals = [
      r.id,
      r.created_at,
      r.source,
      r.property_id ?? '',
      r.property_title ?? '',
      r.project_id ?? '',
      r.project_name ?? '',
      r.name,
      r.email,
      r.phone ?? '',
      msg,
      m.salesperson_id ?? '',
      m.salesperson_name ?? '',
      m.intent ?? '',
    ]
    lines.push(vals.map((v) => csvEscape(String(v))).join(','))
  }
  return lines.join('\r\n')
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminFormSubmissions() {
  const sb = getSupabase()
  const [rows, setRows] = useState<Row[]>([])
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [detailRow, setDetailRow] = useState<Row | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  /** all | unassigned | salesperson id */
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all')

  const refresh = useCallback(async () => {
    if (!sb) return
    const [subRes, spRes] = await Promise.all([
      sb.from('form_submissions').select('*').order('created_at', { ascending: false }),
      sb.from('salespeople').select('id, name').order('sort_order', { ascending: true }),
    ])
    if (subRes.error) {
      setLoadErr(subRes.error.message)
      return
    }
    if (spRes.error) {
      console.error(spRes.error)
    }
    setLoadErr(null)
    setRows(subRes.data ?? [])
    setSalespeople(spRes.error ? [] : (spRes.data ?? []))
    setSelectedIds(new Set())
  }, [sb])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filteredRows = useMemo(() => {
    if (salespersonFilter === 'all') return rows
    return rows.filter((r) => {
      const m = parseSubmissionMeta(r.meta)
      if (salespersonFilter === 'unassigned') return !m.salesperson_id
      return m.salesperson_id === salespersonFilter
    })
  }, [rows, salespersonFilter])

  const salespersonFilterOptions = useMemo((): TerracottaDropdownOption[] => {
    return [
      { value: 'all', label: 'All submissions' },
      { value: 'unassigned', label: 'Unassigned (Capital Dream)' },
      ...salespeople.map((s) => ({ value: s.id, label: s.name })),
    ]
  }, [salespeople])

  const {
    page: tablePage,
    setPage: setTablePage,
    total: tableTotal,
    totalPages: tableTotalPages,
    pagedItems: pagedRows,
    rangeStart: tableRangeStart,
    rangeEnd: tableRangeEnd,
    showPagination: showTablePagination,
  } = useAdminTablePagination(filteredRows)

  useEffect(() => {
    setTablePage(1)
    setSelectedIds(new Set())
  }, [salespersonFilter, setTablePage])

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

  function openDetail(r: Row) {
    setDetailRow(r)
    setDetailOpen(true)
  }

  function closeDetail() {
    setDetailOpen(false)
    setDetailRow(null)
  }

  function exportCsv() {
    const useSelected = selectedIds.size > 0
    const sourceRows = useSelected
      ? rows.filter((r) => selectedIds.has(r.id))
      : filteredRows
    if (sourceRows.length === 0) return
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const scope = useSelected
      ? 'selected'
      : salespersonFilter === 'all'
        ? 'all'
        : salespersonFilter === 'unassigned'
          ? 'unassigned'
          : 'salesperson'
    const content = rowsToCsv(sourceRows)
    downloadCsv(content, `form-submissions-${scope}-${stamp}.csv`)
  }

  async function confirmDelete() {
    if (!sb || !deleteId) return
    const { error } = await sb.from('form_submissions').delete().eq('id', deleteId)
    if (error) {
      setLoadErr(error.message)
      return
    }
    setDeleteId(null)
    if (detailRow?.id === deleteId) closeDetail()
    void refresh()
  }

  async function runBulkDelete() {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb.from('form_submissions').delete().in('id', selectedList)
    setBulkBusy(false)
    setBulkDeleteOpen(false)
    if (error) setLoadErr(error.message)
    else {
      if (detailRow && selectedList.includes(detailRow.id)) closeDetail()
      void refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeading title="Form submissions" helpAriaLabel="About form submissions">
          <p>
            Property and off-plan project enquiry leads. Click a row to open full contact details
            and message. Export respects the salesperson filter, or the current selection when any
            rows are checked.
          </p>
        </AdminPageHeading>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:items-end">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/50">
            Filter by salesperson
          </label>
          <TerracottaDropdown
            variant="admin"
            listPortal
            label="Filter by salesperson"
            options={salespersonFilterOptions}
            value={salespersonFilter}
            onChange={setSalespersonFilter}
            className="min-w-[min(100%,240px)] sm:min-w-[220px]"
          />
          <button
            type="button"
            onClick={() => exportCsv()}
            disabled={selectedIds.size === 0 && filteredRows.length === 0}
            className={`inline-flex items-center justify-center gap-2 self-stretch sm:self-end ${adminBtnPrimarySm}`}
          >
            <Download className="size-4" aria-hidden />
            Export CSV
            {selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : ' (filtered)'}
          </button>
        </div>
      </div>

      {loadErr ? <p className="text-sm text-red-600">{loadErr}</p> : null}

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
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs md:text-sm">
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
              <th className="px-3 py-3 md:px-4">When</th>
              <th className="px-3 py-3 md:px-4">Source</th>
              <th className="px-3 py-3 md:px-4">Property</th>
              <th className="px-3 py-3 md:px-4">Salesperson</th>
              <th className="px-3 py-3 md:px-4">Lead name</th>
              <th className="px-3 py-3 md:px-4">Details</th>
              <th className="px-3 py-3 text-right md:px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => {
              const m = parseSubmissionMeta(r.meta)
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-ink/5 align-top transition last:border-0 hover:bg-ink/[0.02]"
                  onClick={() => openDetail(r)}
                >
                  <td className="px-2 py-2.5 md:px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="size-4 rounded border-ink/20"
                      aria-label={`Select ${r.name}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink/70 md:px-4">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 md:px-4">{r.source}</td>
                  <td className="max-w-[200px] px-3 py-2.5 md:px-4">
                    <span className="line-clamp-2 font-medium text-ink">
                      {r.project_name ?? r.property_title ?? r.project_id ?? r.property_id ?? '—'}
                    </span>
                  </td>
                  <td className="max-w-[160px] px-3 py-2.5 text-ink/75 md:px-4">
                    <span className="line-clamp-2">
                      {m.salesperson_name ?? (
                        <span className="text-ink/45">Unassigned</span>
                      )}
                    </span>
                  </td>
                  <td className="max-w-[140px] px-3 py-2.5 font-medium text-ink md:px-4">
                    <span className="line-clamp-2">{r.name}</span>
                  </td>
                  <td className="px-3 py-2.5 md:px-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openDetail(r)}
                      className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-primary)] underline-offset-2 hover:underline"
                    >
                      View
                    </button>
                  </td>
                  <td
                    className="px-3 py-2.5 text-right md:px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setDeleteId(r.id)}
                      className="rounded-full p-2 text-red-600/80 hover:bg-red-50"
                      aria-label="Delete submission"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
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
        {filteredRows.length === 0 && !loadErr ? (
          <p className="px-4 py-6 text-center text-sm text-ink/50">
            {rows.length === 0
              ? 'No submissions yet.'
              : 'No submissions match this filter.'}
          </p>
        ) : null}
      </div>

      <SubmissionDetailSheet
        row={detailRow}
        open={detailOpen}
        onClose={closeDetail}
      />

      <AdminModal
        open={!!deleteId}
        title="Delete this submission?"
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
          This removes the lead from the database. It cannot be undone.
        </p>
      </AdminModal>

      <AdminModal
        open={bulkDeleteOpen}
        title={`Delete ${selectedList.length} submissions?`}
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
          This cannot be undone. Consider exporting a CSV first if you need a record.
        </p>
      </AdminModal>
    </div>
  )
}
