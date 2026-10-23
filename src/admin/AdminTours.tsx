import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase } from '@/integrations/supabase/client'
import { AdminPageHeading } from './components/AdminPageHeading'
import { adminBtnPrimarySm } from './adminClassNames'

type VillaRow = {
  id: string
  slug: string
  title: string
  published: boolean
  sceneCount: number
}

export function AdminTours() {
  const [rows, setRows] = useState<VillaRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    setLoading(true)
    const [{ data: tours, error: tourError }, { data: scenes, error: sceneError }] = await Promise.all([
      supabase.from('virtual_tours').select('id, slug, title, published, sort_order').order('sort_order'),
      supabase.from('virtual_tour_scenes').select('tour_id'),
    ])
    if (tourError || sceneError) {
      setError(tourError?.message || sceneError?.message || 'Could not load villas.')
      setLoading(false)
      return
    }
    const counts = new Map<string, number>()
    for (const scene of scenes ?? []) {
      counts.set(scene.tour_id, (counts.get(scene.tour_id) ?? 0) + 1)
    }
    setRows(
      (tours ?? []).map((tour) => ({
        id: tour.id,
        slug: tour.slug,
        title: tour.title,
        published: tour.published,
        sceneCount: counts.get(tour.id) ?? 0,
      })),
    )
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <AdminPageHeading title="360 tour" helpAriaLabel="About 360 tours">
        Each villa is one tour. Select a villa to rename views, change their order, or hide views from the
        public walkthrough. A new villa is added by importing its export folder.
      </AdminPageHeading>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-ink/60">Loading villas…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-5 py-8 text-sm leading-relaxed text-ink/70">
          No villas yet. From the project folder, import an export package with{' '}
          <code className="rounded bg-ink/5 px-1">npm run import-villa -- path/to/villa-folder</code>.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 border-b border-ink/10 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{row.title}</p>
                <p className="mt-1 text-xs text-ink/55">
                  /tours/{row.slug} · {row.sceneCount} views · {row.published ? 'Published' : 'Hidden'}
                </p>
              </div>
              <Link to={`/admin/tours/${row.id}`} className={adminBtnPrimarySm}>
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
