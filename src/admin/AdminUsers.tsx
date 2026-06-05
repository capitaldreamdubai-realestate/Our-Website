import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnPrimarySm,
} from './adminClassNames'
import { AdminTablePagination } from './components/AdminTablePagination'
import { AdminModal } from './components/AdminModal'
import { EntityDetailSheet } from './components/EntityDetailSheet'
import { AdminPageHeading } from './components/AdminPageHeading'
import { useAdminTablePagination } from './useAdminTablePagination'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'

type Row = Database['public']['Tables']['admin_users']['Row']
type Role = Row['role']

function emptyRow(): Row {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    auth_user_id: null,
    email: '',
    full_name: '',
    role: 'editor',
    is_active: true,
    notes: null,
    created_at: now,
    updated_at: now,
  }
}

function fieldClass(extra = '') {
  return `mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm ${extra}`
}

const roleOptions: Role[] = ['owner', 'admin', 'editor', 'viewer']

function assignableRoles(currentRole: Role | null): Role[] {
  if (currentRole === 'owner') return roleOptions
  return roleOptions.filter((role) => role !== 'owner')
}

export function AdminUsers() {
  const sb = getSupabase()
  const [rows, setRows] = useState<Row[]>([])
  const [currentRole, setCurrentRole] = useState<Role | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Row | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [passwordDraft, setPasswordDraft] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkRole, setBulkRole] = useState<Role>('editor')
  const [viewRow, setViewRow] = useState<Row | null>(null)

  const ensureCurrentUserRecord = useCallback(async () => {
    if (!sb) return
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user?.email) return

    const email = user.email.trim().toLowerCase()
    const { data: existing, error: lookupErr } = await sb
      .from('admin_users')
      .select('id, auth_user_id, full_name')
      .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
      .limit(1)
      .maybeSingle()

    if (lookupErr) return

    const displayName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
      ''

    if (!existing) {
      await sb.from('admin_users').insert({
        id: crypto.randomUUID(),
        auth_user_id: user.id,
        email,
        full_name: displayName,
        role: 'owner',
        is_active: true,
      })
      return
    }

    if (!existing.auth_user_id || !existing.full_name) {
      await sb
        .from('admin_users')
        .update({
          auth_user_id: existing.auth_user_id ?? user.id,
          full_name: existing.full_name || displayName,
        })
        .eq('id', existing.id)
    }
  }, [sb])

  const loadCurrentRole = useCallback(async (): Promise<Role | null> => {
    if (!sb) return null
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return null

    const email = (user.email ?? '').trim().toLowerCase()
    const { data: roleRow } = await sb
      .from('admin_users')
      .select('role')
      .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
      .limit(1)
      .maybeSingle()

    const role = (roleRow?.role as Role | undefined) ?? null
    setCurrentRole(role)
    return role
  }, [sb])

  const refresh = useCallback(async () => {
    if (!sb) return
    await ensureCurrentUserRecord()
    const role = await loadCurrentRole()

    let query = sb.from('admin_users').select('*').order('created_at', { ascending: false })
    if (role && role !== 'owner') {
      query = query.neq('role', 'owner')
    }

    const { data, error } = await query
    if (error) {
      setErr(error.message)
      return
    }
    setErr(null)
    setRows(data ?? [])
    setSelectedIds(new Set())
  }, [sb, ensureCurrentUserRecord, loadCurrentRole])

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

  const roleChoices = useMemo(() => assignableRoles(currentRole), [currentRole])

  function openCreate() {
    setDraft(emptyRow())
    setPasswordDraft('')
    setSaveErr(null)
    setModalOpen(true)
  }

  function openEdit(r: Row) {
    setDraft({ ...r })
    setPasswordDraft('')
    setSaveErr(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setDraft(null)
    setPasswordDraft('')
    setPasswordBusy(false)
  }

  async function invokeAdminUserAuth(
    body:
      | { action: 'create_user'; email: string; password: string; fullName?: string }
      | { action: 'set_password'; userId: string; password: string },
  ): Promise<{ ok: boolean; user?: { id: string | null; email: string | null }; error?: string }> {
    if (!sb) return { ok: false, error: 'Supabase is not configured.' }
    const { data: refreshed, error: refreshError } = await sb.auth.refreshSession()
    const session = refreshed.session
    if (refreshError || !session) {
      return { ok: false, error: 'Admin session expired. Please sign in again.' }
    }

    const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
    if (!baseUrl || !anonKey) {
      return {
        ok: false,
        error: 'Supabase env missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      }
    }

    const res = await fetch(`${baseUrl}/functions/v1/admin-user-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    })

    const json = (await res.json().catch(() => null)) as
      | { ok?: boolean; user?: { id: string | null; email: string | null }; error?: string }
      | null
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error ?? `Request failed (${res.status}).` }
    }
    return { ok: true, user: json.user }
  }

  async function save() {
    if (!sb || !draft) return
    setSaveErr(null)
    setPasswordBusy(false)
    const email = draft.email.trim().toLowerCase()
    if (!email) {
      setSaveErr('Email is required.')
      return
    }
    const isEdit = rows.some((r) => r.id === draft.id)
    if (currentRole !== 'owner' && draft.role === 'owner') {
      setSaveErr('Only owners can create or assign the owner role.')
      return
    }
    const password = passwordDraft.trim()
    if (!isEdit && password.length < 8) {
      setSaveErr('Password is required and must be at least 8 characters for new users.')
      return
    }

    let authUserId = draft.auth_user_id?.trim() || null
    if (!isEdit && !authUserId) {
      setPasswordBusy(true)
      const createRes = await invokeAdminUserAuth({
        action: 'create_user',
        email,
        password,
        fullName: draft.full_name.trim(),
      })
      setPasswordBusy(false)
      if (!createRes.ok) {
        setSaveErr(createRes.error ?? 'Failed creating auth user.')
        return
      }
      authUserId = createRes.user?.id ?? null
    } else if (isEdit && password.length > 0) {
      if (!authUserId) {
        setSaveErr('Cannot set password: this user has no linked Auth user ID.')
        return
      }
      setPasswordBusy(true)
      const passRes = await invokeAdminUserAuth({
        action: 'set_password',
        userId: authUserId,
        password,
      })
      setPasswordBusy(false)
      if (!passRes.ok) {
        setSaveErr(passRes.error ?? 'Failed setting password.')
        return
      }
    }

    const payload: Database['public']['Tables']['admin_users']['Insert'] = {
      id: draft.id,
      auth_user_id: authUserId,
      email,
      full_name: draft.full_name.trim(),
      role: draft.role,
      is_active: draft.is_active,
      notes: draft.notes?.trim() || null,
    }
    const { error } = await sb.from('admin_users').upsert(payload, { onConflict: 'id' })
    if (error) {
      setSaveErr(error.message)
      return
    }
    closeModal()
    void refresh()
  }

  async function confirmDelete() {
    if (!sb || !deleteId) return
    const { error } = await sb.from('admin_users').delete().eq('id', deleteId)
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

  async function runBulkActive(is_active: boolean) {
    if (!sb || selectedList.length === 0) return
    setBulkBusy(true)
    const { error } = await sb.from('admin_users').update({ is_active }).in('id', selectedList)
    setBulkBusy(false)
    if (error) setErr(error.message)
    else {
      clearSelection()
      void refresh()
    }
  }

  async function runBulkRole() {
    if (!sb || selectedList.length === 0) return
    if (currentRole !== 'owner' && bulkRole === 'owner') {
      setErr('Only owners can assign the owner role.')
      return
    }
    setBulkBusy(true)
    const { error } = await sb.from('admin_users').update({ role: bulkRole }).in('id', selectedList)
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
    const { error } = await sb.from('admin_users').delete().in('id', selectedList)
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
        <AdminPageHeading title="User management" helpAriaLabel="About user management">
          <p>
            Manage CMS user records, roles, and activity status. This module stores metadata in{' '}
            <code className="rounded bg-ink/5 px-1">admin_users</code> and can create/update login passwords in
            Supabase Auth.
          </p>
        </AdminPageHeading>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex items-center justify-center gap-2 self-end sm:self-start ${adminBtnPrimary}`}
        >
          <Plus className="size-4" aria-hidden />
          New user
        </button>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {selectedList.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[var(--admin-radius-lg,24px)] border border-[var(--admin-primary)]/25 bg-[var(--admin-accent-soft)] p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="text-xs font-medium text-ink md:text-sm">{selectedList.length} selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkActive(true)}
              className={adminBtnPrimarySm}
            >
              Activate
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkActive(false)}
              className={adminBtnGhost}
            >
              Deactivate
            </button>
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as Role)}
              className="min-h-9 rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm"
            >
              {roleChoices.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button type="button" disabled={bulkBusy} onClick={() => void runBulkRole()} className={adminBtnGhost}>
              Set role
            </button>
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
        <table className="w-full min-w-[760px] border-collapse text-left text-xs md:text-sm">
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
              <th className="px-3 py-3 md:px-4">Email</th>
              <th className="px-3 py-3 md:px-4">Role</th>
              <th className="px-3 py-3 md:px-4">Status</th>
              <th className="px-3 py-3 md:px-4">Updated</th>
              <th className="w-28 px-3 py-3 text-right md:px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink/55">
                  No users yet.
                </td>
              </tr>
            ) : (
              pagedRows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-ink/10 transition hover:bg-ink/[0.02] last:border-b-0"
                  onClick={() => setViewRow(r)}
                >
                  <td className="px-2 py-3 align-top md:px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-4 rounded border-ink/20"
                      aria-label={`Select ${r.email}`}
                    />
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <div className="font-medium text-ink">{r.full_name || '—'}</div>
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <div className="text-ink/80">{r.email}</div>
                  </td>
                  <td className="px-3 py-3 capitalize md:px-4">{r.role}</td>
                  <td className="px-3 py-3 md:px-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[0.6875rem] font-semibold ${
                        r.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-ink/10 text-ink/60'
                      }`}
                    >
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink/60 md:px-4">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink/80 transition hover:bg-ink/5"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(r)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 transition hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(r.id)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminTablePagination
        page={tablePage}
        totalPages={tableTotalPages}
        total={tableTotal}
        rangeStart={tableRangeStart}
        rangeEnd={tableRangeEnd}
        visible={showTablePagination}
        onPageChange={setTablePage}
      />

      <AdminModal
        open={modalOpen}
        title={draft ? (rows.some((r) => r.id === draft.id) ? 'Edit user' : 'New user') : 'User'}
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
              disabled={passwordBusy}
              onClick={() => void save()}
              className={`w-full md:w-auto ${adminBtnPrimary} disabled:opacity-60`}
            >
              {passwordBusy ? 'Saving auth…' : 'Save'}
            </button>
          </>
        }
      >
        {draft ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">Full name</label>
              <input
                value={draft.full_name}
                onChange={(e) => upd('full_name', e.target.value)}
                className={fieldClass()}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">Email</label>
              <input
                type="email"
                required
                value={draft.email}
                onChange={(e) => upd('email', e.target.value)}
                className={fieldClass()}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">
                {rows.some((r) => r.id === draft.id)
                  ? 'Set new password (optional, min 8 chars)'
                  : 'Password (required, min 8 chars)'}
              </label>
              <input
                type="password"
                value={passwordDraft}
                onChange={(e) => setPasswordDraft(e.target.value)}
                className={fieldClass()}
                placeholder={
                  rows.some((r) => r.id === draft.id)
                    ? 'Leave blank to keep current password'
                    : 'Enter password'
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Role</label>
              <select
                value={draft.role}
                onChange={(e) => upd('role', e.target.value as Role)}
                className={fieldClass()}
              >
                {roleChoices.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70">Auth user ID (optional)</label>
              <input
                value={draft.auth_user_id ?? ''}
                onChange={(e) => upd('auth_user_id', e.target.value || null)}
                className={fieldClass()}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink/70">Notes</label>
              <textarea
                rows={4}
                value={draft.notes ?? ''}
                onChange={(e) => upd('notes', e.target.value || null)}
                className={fieldClass()}
              />
            </div>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => upd('is_active', e.target.checked)}
                className="size-4 rounded border-ink/20"
              />
              <span className="text-xs font-medium text-ink/75">User is active</span>
            </label>
            {saveErr ? <p className="sm:col-span-2 text-xs text-red-600">{saveErr}</p> : null}
          </div>
        ) : null}
      </AdminModal>

      <EntityDetailSheet
        open={!!viewRow}
        title={viewRow?.full_name ? `User · ${viewRow.full_name}` : 'User details'}
        onClose={() => setViewRow(null)}
        fields={
          viewRow
            ? [
                { label: 'Email', value: viewRow.email },
                { label: 'Role', value: viewRow.role },
                { label: 'Status', value: viewRow.is_active ? 'Active' : 'Inactive' },
                { label: 'Auth user ID', value: viewRow.auth_user_id ?? '—' },
                { label: 'Notes', value: viewRow.notes || '—' },
                { label: 'Created', value: new Date(viewRow.created_at).toLocaleString() },
                { label: 'Updated', value: new Date(viewRow.updated_at).toLocaleString() },
              ]
            : []
        }
      />

      <AdminModal
        open={bulkDeleteOpen}
        title={`Delete ${selectedList.length} users?`}
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
        open={!!deleteId}
        title="Delete user?"
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
        <p className="text-sm text-ink/75">This cannot be undone.</p>
      </AdminModal>
    </div>
  )
}
