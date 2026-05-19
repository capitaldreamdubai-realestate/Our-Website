import { Download, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'
import { parseSubmissionMeta } from '@/lib/submissionMeta'
import { adminBtnGhost, adminBtnPrimary } from './adminClassNames'
import { AdminModal } from './components/AdminModal'
import { AdminPageHeading } from './components/AdminPageHeading'
import { AdminTablePagination } from './components/AdminTablePagination'
import { ImageUploadField } from './components/ImageUploadField'
import { SubmissionDetailSheet } from './components/SubmissionDetailSheet'
import { useAdminTablePagination } from './useAdminTablePagination'
import { adminNavActive, adminNavInactive } from './adminClassNames'

type PopupRow = Database['public']['Tables']['campaign_popups']['Row']
type SubmissionRow = Database['public']['Tables']['form_submissions']['Row']
type TriggerType = PopupRow['trigger_type']

function fieldClass() {
  return 'mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm'
}

function pathsToText(paths: string[]) {
  return (paths ?? []).join('\n')
}

function textToPaths(text: string) {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function emptyPopup(): PopupRow {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    internal_name: '',
    title: '',
    description: null,
    image_url: '',
    active: false,
    trigger_type: 'delay',
    trigger_delay_seconds: 5,
    trigger_scroll_percent: 50,
    target_paths: [],
    show_once_per_session: true,
    submit_button_label: null,
    sort_order: 0,
  }
}

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`
  return cell
}

function submissionsToCsv(rows: SubmissionRow[]): string {
  const headers = ['id', 'created_at', 'popup_id', 'popup_title', 'name', 'email', 'phone']
  const lines = [headers.join(',')]
  for (const r of rows) {
    const m = parseSubmissionMeta(r.meta)
    const vals = [r.id, r.created_at, r.popup_id ?? '', m.popup_title ?? '', r.name, r.email, r.phone ?? '']
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

const subTabClass =
  'rounded-2xl px-3 py-2 text-xs font-semibold transition md:text-sm'

export function AdminCampaignPopups() {
  const sb = getSupabase()
  const [tab, setTab] = useState<'popups' | 'submissions'>('popups')

  const [rows, setRows] = useState<PopupRow[]>([])
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<PopupRow | null>(null)
  const [targetPathsText, setTargetPathsText] = useState('')
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<SubmissionRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [popupFilter, setPopupFilter] = useState<string>('all')

  const refreshPopups = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from('campaign_popups')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) {
      setErr(error.message)
      return
    }
    setErr(null)
    setRows(data ?? [])
  }, [sb])

  const refreshSubmissions = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from('form_submissions')
      .select('*')
      .eq('source', 'campaign_popup')
      .order('created_at', { ascending: false })
    if (error) {
      setErr(error.message)
      return
    }
    setSubmissions(data ?? [])
  }, [sb])

  const refresh = useCallback(async () => {
    await Promise.all([refreshPopups(), refreshSubmissions()])
  }, [refreshPopups, refreshSubmissions])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const popupOptions = useMemo(
    () => [
      { value: 'all', label: 'All popups' },
      ...rows.map((r) => ({ value: r.id, label: r.internal_name || r.title })),
    ],
    [rows],
  )

  const filteredSubmissions = useMemo(() => {
    if (popupFilter === 'all') return submissions
    return submissions.filter((s) => s.popup_id === popupFilter)
  }, [submissions, popupFilter])

  const popupPagination = useAdminTablePagination(rows)
  const submissionPagination = useAdminTablePagination(filteredSubmissions)

  function openCreate() {
    setDraft(emptyPopup())
    setTargetPathsText('')
    setSaveErr(null)
    setModalOpen(true)
  }

  function openEdit(row: PopupRow) {
    setDraft({ ...row })
    setTargetPathsText(pathsToText(row.target_paths ?? []))
    setSaveErr(null)
    setModalOpen(true)
  }

  async function save() {
    if (!sb || !draft) return
    if (!draft.internal_name.trim() || !draft.title.trim()) {
      setSaveErr('Internal name and public title are required.')
      return
    }
    if (!draft.image_url.trim()) {
      setSaveErr('Popup image is required.')
      return
    }
    if (draft.trigger_type === 'delay' && (draft.trigger_delay_seconds ?? 0) < 0) {
      setSaveErr('Delay seconds must be 0 or greater.')
      return
    }
    if (
      draft.trigger_type === 'scroll' &&
      (draft.trigger_scroll_percent == null ||
        draft.trigger_scroll_percent < 0 ||
        draft.trigger_scroll_percent > 100)
    ) {
      setSaveErr('Scroll percent must be between 0 and 100.')
      return
    }

    const payload: Database['public']['Tables']['campaign_popups']['Insert'] = {
      id: draft.id,
      internal_name: draft.internal_name.trim(),
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      image_url: draft.image_url.trim(),
      active: draft.active,
      trigger_type: draft.trigger_type,
      trigger_delay_seconds:
        draft.trigger_type === 'delay' ? draft.trigger_delay_seconds ?? 5 : null,
      trigger_scroll_percent:
        draft.trigger_type === 'scroll' ? draft.trigger_scroll_percent ?? 50 : null,
      target_paths: textToPaths(targetPathsText),
      show_once_per_session: draft.show_once_per_session,
      submit_button_label: draft.submit_button_label?.trim() || null,
      sort_order: draft.sort_order,
    }

    const { error } = await sb.from('campaign_popups').upsert(payload, { onConflict: 'id' })
    if (error) {
      setSaveErr(error.message)
      return
    }
    setModalOpen(false)
    setDraft(null)
    void refreshPopups()
  }

  async function toggleActive(row: PopupRow) {
    if (!sb) return
    const { error } = await sb
      .from('campaign_popups')
      .update({ active: !row.active })
      .eq('id', row.id)
    if (error) setErr(error.message)
    else void refreshPopups()
  }

  async function confirmDeletePopup() {
    if (!sb || !deleteId) return
    const { error } = await sb.from('campaign_popups').delete().eq('id', deleteId)
    if (error) setErr(error.message)
    else {
      setDeleteId(null)
      void refresh()
    }
  }

  async function confirmDeleteSubmission() {
    if (!sb || !deleteSubmissionId) return
    const { error } = await sb.from('form_submissions').delete().eq('id', deleteSubmissionId)
    if (error) setErr(error.message)
    else {
      setDeleteSubmissionId(null)
      void refreshSubmissions()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeading title="Campaign popups" helpAriaLabel="About campaign popups">
          <p>
            Create marketing popups with image, copy, and a lead form. Control when they appear and
            review submissions in the Submissions tab.
          </p>
        </AdminPageHeading>
        {tab === 'popups' ? (
          <button type="button" onClick={openCreate} className={`inline-flex items-center gap-2 ${adminBtnPrimary}`}>
            <Plus className="size-4" aria-hidden />
            New popup
          </button>
        ) : null}
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <nav className="flex flex-wrap gap-2 border-b border-ink/10 pb-3" aria-label="Campaign popups sections">
        <button
          type="button"
          className={`${subTabClass} ${tab === 'popups' ? adminNavActive : adminNavInactive}`}
          onClick={() => setTab('popups')}
        >
          Popups
        </button>
        <button
          type="button"
          className={`${subTabClass} ${tab === 'submissions' ? adminNavActive : adminNavInactive}`}
          onClick={() => setTab('submissions')}
        >
          Submissions ({submissions.length})
        </button>
      </nav>

      {tab === 'popups' ? (
        <div className="overflow-x-auto rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.02] text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/50">
                <th className="px-3 py-3 md:px-4">Name</th>
                <th className="px-3 py-3 md:px-4">Title</th>
                <th className="px-3 py-3 md:px-4">Trigger</th>
                <th className="px-3 py-3 md:px-4">Active</th>
                <th className="px-3 py-3 md:px-4">Sort</th>
                <th className="px-3 py-3 text-right md:px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {popupPagination.pagedItems.map((row) => (
                <tr key={row.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-3 py-2.5 md:px-4">
                    <p className="font-medium text-ink">{row.internal_name}</p>
                  </td>
                  <td className="px-3 py-2.5 md:px-4">{row.title}</td>
                  <td className="px-3 py-2.5 text-ink/75 md:px-4">
                    {row.trigger_type === 'immediate' && 'Immediately'}
                    {row.trigger_type === 'delay' && `After ${row.trigger_delay_seconds ?? 0}s`}
                    {row.trigger_type === 'scroll' && `At ${row.trigger_scroll_percent ?? 0}% scroll`}
                  </td>
                  <td className="px-3 py-2.5 md:px-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                        row.active ? 'bg-emerald-50 text-emerald-800' : 'bg-ink/10 text-ink/55'
                      }`}
                    >
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 md:px-4">{row.sort_order}</td>
                  <td className="px-3 py-2.5 text-right md:px-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void toggleActive(row)}
                        className={`rounded-full p-2 ${row.active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                        aria-label={row.active ? 'Deactivate' : 'Activate'}
                        title={row.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-full p-2 text-ink/60 hover:bg-ink/5"
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(row.id)}
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
            visible={popupPagination.showPagination}
            page={popupPagination.page}
            totalPages={popupPagination.totalPages}
            total={popupPagination.total}
            rangeStart={popupPagination.rangeStart}
            rangeEnd={popupPagination.rangeEnd}
            onPageChange={popupPagination.setPage}
          />
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink/50">No campaign popups yet.</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex flex-col gap-1 text-xs text-ink/70">
              Filter by popup
              <select
                value={popupFilter}
                onChange={(e) => {
                  setPopupFilter(e.target.value)
                  submissionPagination.setPage(1)
                }}
                className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm"
              >
                {popupOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={filteredSubmissions.length === 0}
              onClick={() =>
                downloadCsv(
                  submissionsToCsv(filteredSubmissions),
                  `campaign-popup-submissions-${new Date().toISOString().slice(0, 10)}.csv`,
                )
              }
              className={`inline-flex items-center gap-2 ${adminBtnGhost}`}
            >
              <Download className="size-4" aria-hidden />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto rounded-[var(--admin-radius-lg,24px)] border border-ink/10 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-[0.6875rem] font-semibold uppercase tracking-wider text-ink/50">
                  <th className="px-3 py-3 md:px-4">Date</th>
                  <th className="px-3 py-3 md:px-4">Popup</th>
                  <th className="px-3 py-3 md:px-4">Name</th>
                  <th className="px-3 py-3 md:px-4">Email</th>
                  <th className="px-3 py-3 md:px-4">Phone</th>
                  <th className="px-3 py-3 text-right md:px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissionPagination.pagedItems.map((row) => {
                  const meta = parseSubmissionMeta(row.meta)
                  const popupLabel =
                    meta.popup_title ??
                    rows.find((p) => p.id === row.popup_id)?.internal_name ??
                    row.popup_id ??
                    '—'
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]"
                      onClick={() => {
                        setDetailRow(row)
                        setDetailOpen(true)
                      }}
                    >
                      <td className="px-3 py-2.5 text-ink/70 md:px-4">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 md:px-4">{popupLabel}</td>
                      <td className="px-3 py-2.5 font-medium md:px-4">{row.name}</td>
                      <td className="px-3 py-2.5 md:px-4">{row.email}</td>
                      <td className="px-3 py-2.5 md:px-4">{row.phone ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right md:px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteSubmissionId(row.id)
                          }}
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
              visible={submissionPagination.showPagination}
              page={submissionPagination.page}
              totalPages={submissionPagination.totalPages}
              total={submissionPagination.total}
              rangeStart={submissionPagination.rangeStart}
              rangeEnd={submissionPagination.rangeEnd}
              onPageChange={submissionPagination.setPage}
            />
            {filteredSubmissions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink/50">No popup submissions yet.</p>
            ) : null}
          </div>
        </div>
      )}

      <AdminModal
        open={modalOpen && !!draft}
        wide
        title={draft?.internal_name ? `Popup · ${draft.internal_name}` : 'New campaign popup'}
        onClose={() => {
          setModalOpen(false)
          setDraft(null)
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false)
                setDraft(null)
              }}
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
          <div className="space-y-4">
            {saveErr ? <p className="text-xs text-red-600">{saveErr}</p> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-ink/70">Internal name</label>
                <input
                  value={draft.internal_name}
                  onChange={(e) => setDraft((p) => (p ? { ...p, internal_name: e.target.value } : p))}
                  className={fieldClass()}
                  placeholder="Summer 2026 launch"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/70">Sort order</label>
                <input
                  type="number"
                  min={0}
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDraft((p) =>
                      p ? { ...p, sort_order: Math.max(0, Number(e.target.value) || 0) } : p,
                    )
                  }
                  className={fieldClass()}
                />
              </div>
            </div>
            <ImageUploadField
              label="Popup image (left panel)"
              folder="campaign-popups"
              value={draft.image_url}
              onChange={(url) => setDraft((p) => (p ? { ...p, image_url: url } : p))}
            />
            <div>
              <label className="text-xs font-medium text-ink/70">Public title</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft((p) => (p ? { ...p, title: e.target.value } : p))}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Description</label>
              <textarea
                value={draft.description ?? ''}
                onChange={(e) => setDraft((p) => (p ? { ...p, description: e.target.value } : p))}
                rows={4}
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Submit button label (optional)</label>
              <input
                value={draft.submit_button_label ?? ''}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, submit_button_label: e.target.value } : p))
                }
                className={fieldClass()}
                placeholder="Get in touch"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-ink/70">When to show</label>
                <select
                  value={draft.trigger_type}
                  onChange={(e) =>
                    setDraft((p) =>
                      p ? { ...p, trigger_type: e.target.value as TriggerType } : p,
                    )
                  }
                  className={fieldClass()}
                >
                  <option value="immediate">Immediately on page load</option>
                  <option value="delay">After delay (seconds)</option>
                  <option value="scroll">After scroll position</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-ink/70">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft((p) => (p ? { ...p, active: e.target.checked } : p))}
                  />
                  Active (visible on site)
                </label>
                <label className="mt-2 flex items-center gap-2 text-xs font-medium text-ink/70">
                  <input
                    type="checkbox"
                    checked={draft.show_once_per_session}
                    onChange={(e) =>
                      setDraft((p) => (p ? { ...p, show_once_per_session: e.target.checked } : p))
                    }
                  />
                  Show once per browser session
                </label>
              </div>
            </div>
            {draft.trigger_type === 'delay' ? (
              <div>
                <label className="text-xs font-medium text-ink/70">Delay (seconds after page load)</label>
                <input
                  type="number"
                  min={0}
                  value={draft.trigger_delay_seconds ?? 5}
                  onChange={(e) =>
                    setDraft((p) =>
                      p ? { ...p, trigger_delay_seconds: Math.max(0, Number(e.target.value) || 0) } : p,
                    )
                  }
                  className={fieldClass()}
                />
              </div>
            ) : null}
            {draft.trigger_type === 'scroll' ? (
              <div>
                <label className="text-xs font-medium text-ink/70">Scroll depth (% of page)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.trigger_scroll_percent ?? 50}
                  onChange={(e) =>
                    setDraft((p) =>
                      p
                        ? {
                            ...p,
                            trigger_scroll_percent: Math.min(
                              100,
                              Math.max(0, Number(e.target.value) || 0),
                            ),
                          }
                        : p,
                    )
                  }
                  className={fieldClass()}
                />
              </div>
            ) : null}
            <div>
              <label className="text-xs font-medium text-ink/70">
                Target pages (one path per line, empty = all pages)
              </label>
              <textarea
                value={targetPathsText}
                onChange={(e) => setTargetPathsText(e.target.value)}
                rows={4}
                placeholder={'/\n/for-sale\n/contact-us'}
                className={fieldClass()}
              />
              <p className="mt-1 text-[0.6875rem] text-ink/55">
                Use paths like <code className="text-ink/70">/</code> or <code className="text-ink/70">/for-sale</code>.
                Prefix matching applies for nested routes.
              </p>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={!!deleteId}
        title="Delete popup?"
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
              onClick={() => void confirmDeletePopup()}
              className="w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white md:w-auto"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-ink/75">This permanently removes the popup configuration.</p>
      </AdminModal>

      <AdminModal
        open={!!deleteSubmissionId}
        title="Delete submission?"
        onClose={() => setDeleteSubmissionId(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteSubmissionId(null)}
              className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteSubmission()}
              className="w-full rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white md:w-auto"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-ink/75">This removes the lead from the database.</p>
      </AdminModal>

      <SubmissionDetailSheet
        row={detailRow}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailRow(null)
        }}
      />
    </div>
  )
}
