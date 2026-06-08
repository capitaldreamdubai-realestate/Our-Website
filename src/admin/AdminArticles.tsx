import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AdminTablePagination } from './components/AdminTablePagination'
import { useAdminTablePagination } from './useAdminTablePagination'
import { useCms } from '@/contexts/CmsContext'
import {
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnPrimarySm,
  adminStepActive,
  adminStepInactive,
} from './adminClassNames'
import { AdminModal } from './components/AdminModal'
import { EntityDetailSheet } from './components/EntityDetailSheet'
import { AdminPageHeading } from './components/AdminPageHeading'
import { ImageUploadField } from './components/ImageUploadField'
import { AdminRichTextField } from './components/AdminRichTextField'
import { getSupabase } from '@/integrations/supabase/client'
import {
  bodyHtmlToSections,
  defaultArticleToc,
  sectionsToBodyHtml,
} from '@/lib/cms/articleBody'
import {
  articleDetailToUpsert,
  mapArticleDetailRow,
  type ArticleDetailFromDb,
} from '@/lib/cms/mapArticle'

function emptyArticle(): ArticleDetailFromDb {
  return {
    id: `a-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    slug: '',
    title: '',
    dateLabel: '',
    author: 'Capital Dream',
    image: '',
    alt: '',
    excerpt: '',
    published: true,
    dateLong: '',
    lastUpdated: '',
    toc: [{ id: 'body', label: 'Article' }],
    sections: [{ id: 'body', heading: '', paragraphs: [''] }],
  }
}

function fieldClass() {
  return 'mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm'
}

const steps = ['Basics', 'Body'] as const

export function AdminArticles() {
  const { refetch: refetchCms } = useCms()
  const sb = getSupabase()
  const [rows, setRows] = useState<ArticleDetailFromDb[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<ArticleDetailFromDb | null>(null)
  const [bodyHtml, setBodyHtml] = useState('')
  const [step, setStep] = useState(0)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null)
  const [slugLocked, setSlugLocked] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [viewRow, setViewRow] = useState<ArticleDetailFromDb | null>(null)

  const refresh = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb.from('articles').select('*').order('sort_order')
    if (error) {
      setErr(error.message)
      return
    }
    setErr(null)
    setRows((data ?? []).map(mapArticleDetailRow))
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
    const a = emptyArticle()
    setDraft(a)
    setBodyHtml(sectionsToBodyHtml(a.sections))
    setSlugLocked(false)
    setSortOrder(rows.length)
    setStep(0)
    setSaveErr(null)
    setModalOpen(true)
  }

  function openEdit(a: ArticleDetailFromDb) {
    setDraft({ ...a })
    setBodyHtml(sectionsToBodyHtml(a.sections))
    setSlugLocked(true)
    const ix = rows.findIndex((r) => r.slug === a.slug)
    setSortOrder(ix >= 0 ? ix : rows.length)
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
    if (!draft.slug.trim() || !draft.title.trim()) {
      setSaveErr('Slug and title are required.')
      return
    }
    if (!draft.image.trim()) {
      setSaveErr('Cover image is required.')
      return
    }
    if (!bodyHtml.trim()) {
      setSaveErr('Article body is required.')
      setStep(1)
      return
    }
    const merged: ArticleDetailFromDb = {
      ...draft,
      toc: defaultArticleToc(draft.title),
      sections: bodyHtmlToSections(bodyHtml),
    }
    const payload = articleDetailToUpsert(merged, sortOrder)
    const { error } = await sb.from('articles').upsert(payload, { onConflict: 'slug' })
    if (error) {
      setSaveErr(error.message)
      return
    }
    closeModal()
    void refresh()
    void refetchCms()
  }

  async function confirmDelete() {
    if (!sb || !deleteSlug) return
    const { error } = await sb.from('articles').delete().eq('slug', deleteSlug)
    if (error) {
      setErr(error.message)
      return
    }
    setDeleteSlug(null)
    void refresh()
    void refetchCms()
  }

  function upd<K extends keyof ArticleDetailFromDb>(key: K, v: ArticleDetailFromDb[K]) {
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
    const { error } = await sb.from('articles').update({ published }).in('id', selectedList)
    setBulkBusy(false)
    if (error) setErr(error.message)
    else {
      clearSelection()
      void refresh()
      void refetchCms()
    }
  }

  async function runBulkDelete() {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb.from('articles').delete().in('id', selectedList)
    setBulkBusy(false)
    setBulkDeleteOpen(false)
    if (error) setErr(error.message)
    else {
      clearSelection()
      void refresh()
      void refetchCms()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeading title="Articles" helpAriaLabel="About articles">
          <p>
            Long-form editorial for the public articles page. Add cover details on Basics, then write the article body
            in the rich-text editor.
          </p>
        </AdminPageHeading>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex items-center justify-center gap-2 self-end sm:self-start ${adminBtnPrimary}`}
        >
          <Plus className="size-4" aria-hidden />
          New article
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
        <table className="w-full min-w-[640px] text-left text-xs md:text-sm">
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
              <th className="px-3 py-3 md:px-4">Title</th>
              <th className="px-3 py-3 md:px-4">Slug</th>
              <th className="px-3 py-3 md:px-4">Date</th>
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
                    aria-label={`Select ${r.title}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-medium md:px-4">{r.title}</td>
                <td className="px-3 py-2.5 text-ink/65 md:px-4">{r.slug}</td>
                <td className="px-3 py-2.5 text-ink/65 md:px-4">{r.dateLabel}</td>
                <td className="px-3 py-2.5 text-ink/65 md:px-4">
                  {r.published ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-800">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[0.6875rem] font-medium text-ink/60">
                      Draft
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
                        setDeleteSlug(r.slug)
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
          <p className="px-4 py-6 text-center text-sm text-ink/50">No articles yet.</p>
        ) : null}
      </div>

      <AdminModal
        open={modalOpen && !!draft}
        wide
        title={draft?.title ? `Article · ${draft.title}` : 'New article'}
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
                  <label className="text-xs font-medium text-ink/70">Slug (URL)</label>
                  <input
                    value={draft.slug}
                    onChange={(e) => upd('slug', e.target.value)}
                    disabled={slugLocked}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Sort order</label>
                  <input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Math.max(0, Number(e.target.value) || 0))}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Title</label>
                  <input value={draft.title} onChange={(e) => upd('title', e.target.value)} className={fieldClass()} />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Date label</label>
                  <input
                    value={draft.dateLabel}
                    onChange={(e) => upd('dateLabel', e.target.value)}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Author</label>
                  <input
                    value={draft.author}
                    onChange={(e) => upd('author', e.target.value)}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Date long</label>
                  <input
                    value={draft.dateLong}
                    onChange={(e) => upd('dateLong', e.target.value)}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Last updated</label>
                  <input
                    value={draft.lastUpdated}
                    onChange={(e) => upd('lastUpdated', e.target.value)}
                    className={fieldClass()}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ImageUploadField
                    label="Cover image"
                    folder="articles"
                    value={draft.image}
                    onChange={(url) => upd('image', url)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Cover alt</label>
                  <input value={draft.alt} onChange={(e) => upd('alt', e.target.value)} className={fieldClass()} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink/70">Excerpt</label>
                  <textarea
                    value={draft.excerpt}
                    onChange={(e) => upd('excerpt', e.target.value)}
                    rows={3}
                    className={fieldClass()}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="article-published"
                    type="checkbox"
                    checked={draft.published}
                    onChange={(e) => upd('published', e.target.checked)}
                    className="size-4 rounded border-ink/20"
                  />
                  <label htmlFor="article-published" className="text-xs font-medium text-ink/70">
                    Published (visible on site)
                  </label>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <label className="text-xs font-medium text-ink/70">Article body</label>
                <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-ink/50">
                  Use headings, lists, and links for the full article shown on the public page.
                </p>
                <AdminRichTextField
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  minHeight={360}
                  placeholder="Write the article body…"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={bulkDeleteOpen}
        title={`Delete ${selectedList.length} articles?`}
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
        <p className="text-sm text-ink/75">This cannot be undone.</p>
      </AdminModal>

      <AdminModal
        open={!!deleteSlug}
        title="Delete article?"
        onClose={() => setDeleteSlug(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteSlug(null)}
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
        <p className="text-sm text-ink/75">This permanently removes the article.</p>
      </AdminModal>

      <EntityDetailSheet
        open={!!viewRow}
        title={viewRow?.title ? `Article · ${viewRow.title}` : 'Article details'}
        onClose={() => setViewRow(null)}
        fields={
          viewRow
            ? [
                { label: 'Slug', value: viewRow.slug },
                { label: 'Author', value: viewRow.author || '—' },
                { label: 'Date label', value: viewRow.dateLabel || '—' },
                { label: 'Status', value: viewRow.published ? 'Live' : 'Draft' },
                { label: 'Excerpt', value: viewRow.excerpt || '—' },
                { label: 'Sections', value: String(viewRow.sections.length) },
              ]
            : []
        }
      />
    </div>
  )
}
