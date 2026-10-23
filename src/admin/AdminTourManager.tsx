import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSupabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/database.types'
import { adminBtnGhost, adminBtnPrimary } from './adminClassNames'
import { ImageUploadField } from './components/ImageUploadField'

type SceneRow = Database['public']['Tables']['virtual_tour_scenes']['Row']

type DraftScene = {
  id: string
  title: string
  zone: string
  active: boolean
  thumb_url: string
}

function fieldClass() {
  return 'mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm'
}

export function AdminTourManager() {
  const { tourId = '' } = useParams()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [slug, setSlug] = useState('')
  const [published, setPublished] = useState(false)
  const [coverUrl, setCoverUrl] = useState('')
  const [scenes, setScenes] = useState<DraftScene[]>([])
  const [saved, setSaved] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const applyScenes = (rows: SceneRow[]) =>
    rows
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({
        id: row.id,
        title: row.title,
        zone: row.zone,
        active: row.active,
        thumb_url: row.thumb_url,
      }))

  const refresh = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase || !tourId) return
    setLoading(true)
    const [{ data: tour, error: tourError }, { data: sceneRows, error: sceneError }] = await Promise.all([
      supabase.from('virtual_tours').select('title, summary, slug, published, cover_url').eq('id', tourId).maybeSingle(),
      supabase.from('virtual_tour_scenes').select('*').eq('tour_id', tourId).order('sort_order'),
    ])
    if (tourError || sceneError || !tour) {
      setError(tourError?.message || sceneError?.message || 'Villa not found.')
      setLoading(false)
      return
    }
    setTitle(tour.title)
    setSummary(tour.summary ?? '')
    setSlug(tour.slug)
    setPublished(tour.published)
    setCoverUrl(tour.cover_url ?? '')
    setScenes(applyScenes(sceneRows ?? []))
    setSaved(
      JSON.stringify({
        title: tour.title,
        summary: tour.summary ?? '',
        published: tour.published,
        coverUrl: tour.cover_url ?? '',
        scenes: applyScenes(sceneRows ?? []),
      }),
    )
    setError(null)
    setLoading(false)
  }, [tourId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= scenes.length) return
    setScenes((current) => {
      const next = current.slice()
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  function dropOn(index: number) {
    if (dragIndex === null || dragIndex === index) return
    setScenes((current) => {
      const next = current.slice()
      const [item] = next.splice(dragIndex, 1)
      next.splice(index, 0, item)
      return next
    })
    setDragIndex(null)
  }

  async function save() {
    const supabase = getSupabase()
    if (!supabase) return
    const cleanTitle = title.trim()
    if (!cleanTitle || cleanTitle.length > 120) {
      setError('Villa name must be 1–120 characters.')
      return
    }
    if (scenes.some((scene) => !scene.title.trim() || scene.title.trim().length > 120)) {
      setError('Each view name must be 1–120 characters.')
      return
    }
    if (scenes.length > 0 && scenes.every((scene) => !scene.active)) {
      setError('Keep at least one view active.')
      return
    }
    setSaving(true)
    const { error: tourError } = await supabase
      .from('virtual_tours')
      .update({
        title: cleanTitle,
        summary: summary.trim() || null,
        published,
        cover_url: coverUrl.trim() || null,
      })
      .eq('id', tourId)
    if (tourError) {
      setSaving(false)
      setError(tourError.message)
      return
    }
    const updates = await Promise.all(
      scenes.map((scene, index) =>
        supabase
          .from('virtual_tour_scenes')
          .update({ title: scene.title.trim(), active: scene.active, sort_order: index })
          .eq('id', scene.id),
      ),
    )
    setSaving(false)
    const failed = updates.find((result) => result.error)
    if (failed?.error) {
      setError(failed.error.message)
      return
    }
    setTitle(cleanTitle)
    setSummary(summary.trim())
    setCoverUrl(coverUrl.trim())
    setSaved(
      JSON.stringify({
        title: cleanTitle,
        summary: summary.trim(),
        published,
        coverUrl: coverUrl.trim(),
        scenes,
      }),
    )
    setError(null)
  }

  const dirty =
    saved !==
    JSON.stringify({
      title: title.trim(),
      summary: summary.trim(),
      published,
      coverUrl: coverUrl.trim(),
      scenes,
    })

  if (loading) return <p className="text-sm text-ink/60">Loading villa…</p>

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/tours" className="text-sm text-ink/60 hover:text-ink">
          All villas
        </Link>
        {slug ? (
          <a href={`/tours/${slug}`} className="text-sm text-[var(--admin-primary)]" target="_blank" rel="noreferrer">
            Open public tour
          </a>
        ) : null}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-4 md:p-5">
        <label className="block text-xs font-medium text-ink/70">
          Villa name
          <input className={fieldClass()} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="mt-3 block text-xs font-medium text-ink/70">
          Summary
          <textarea
            className={fieldClass()}
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>
        <div className="mt-4">
          <ImageUploadField
            label="Card thumbnail"
            folder="tours/covers"
            value={coverUrl}
            onChange={setCoverUrl}
          />
          <p className="mt-2 text-xs text-ink/50">
            Square image shown on the tours page. If empty, the first view thumbnail is used.
          </p>
        </div>
        <p className="mt-3 text-xs text-ink/50">Public address /tours/{slug}</p>
        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
          Published
        </label>
      </div>

      <ol className="flex flex-col gap-2">
        {scenes.map((scene, index) => (
          <li
            key={scene.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(index)}
            className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-3 py-3"
          >
            <GripVertical className="size-4 shrink-0 text-ink/30" aria-hidden />
            <img src={scene.thumb_url} alt="" className="h-12 w-24 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <input
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink"
                value={scene.title}
                aria-label={`View ${index + 1} name`}
                onChange={(event) =>
                  setScenes((current) =>
                    current.map((item) => (item.id === scene.id ? { ...item, title: event.target.value } : item)),
                  )
                }
              />
              <p className="mt-1 text-[0.6875rem] uppercase tracking-wide text-ink/45">
                {index + 1}. {scene.zone}
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-ink/70">
              <input
                type="checkbox"
                checked={scene.active}
                onChange={(event) =>
                  setScenes((current) =>
                    current.map((item) => (item.id === scene.id ? { ...item, active: event.target.checked } : item)),
                  )
                }
              />
              Active
            </label>
            <div className="flex shrink-0 flex-col">
              <button type="button" className="p-1 text-ink/50 hover:text-ink" aria-label="Move view up" onClick={() => move(index, -1)}>
                <ChevronUp className="size-4" />
              </button>
              <button type="button" className="p-1 text-ink/50 hover:text-ink" aria-label="Move view down" onClick={() => move(index, 1)}>
                <ChevronDown className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={adminBtnPrimary} disabled={saving || !dirty} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className={adminBtnGhost} disabled={saving || !dirty} onClick={() => void refresh()}>
          Discard
        </button>
      </div>
    </div>
  )
}
