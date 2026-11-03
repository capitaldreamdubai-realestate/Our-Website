import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { getSupabase } from '@/integrations/supabase/client'
import { mountTourViewer, type TourSceneView, type TourStartView } from '@/tours/mountTourViewer'
import '@/tours/villa-tour.css'

type LoadedTour = {
  title: string
  summary: string | null
  scenes: TourSceneView[]
}

async function saveStartView(sceneId: string | undefined, view: TourStartView): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !sceneId) return false
  // Row-level security only lets CMS editors update scenes; anyone else gets zero rows back.
  const { data, error } = await supabase
    .from('virtual_tour_scenes')
    .update({ initial_yaw: view.yaw, initial_pitch: view.pitch, initial_fov: view.fov })
    .eq('id', sceneId)
    .select('id')
  return !error && (data?.length ?? 0) > 0
}

export function TourPage() {
  const { slug = '' } = useParams()
  const [tour, setTour] = useState<LoadedTour | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setCanEdit(Boolean(data.session))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !slug) {
      setError('This tour is not available right now.')
      setMissing(true)
      return
    }
    let cancelled = false
    void (async () => {
      const { data: row, error: tourError } = await supabase
        .from('virtual_tours')
        .select('id, title, summary')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()
      if (cancelled) return
      if (tourError) {
        setError(tourError.message)
        setMissing(true)
        return
      }
      if (!row) {
        setMissing(true)
        return
      }
      const { data: scenes, error: sceneError } = await supabase
        .from('virtual_tour_scenes')
        .select('*')
        .eq('tour_id', row.id)
        .eq('active', true)
        .order('sort_order')
      if (cancelled) return
      if (sceneError) {
        setError(sceneError.message)
        setMissing(true)
        return
      }
      setTour({
        title: row.title,
        summary: row.summary,
        scenes: (scenes ?? []).map((scene) => ({
          id: scene.id,
          title: scene.title,
          zone: scene.zone,
          grade: scene.grade,
          image: scene.image_url,
          thumb: scene.thumb_url,
          capture: scene.capture ?? '',
          initialYaw: scene.initial_yaw ?? null,
          initialPitch: scene.initial_pitch ?? null,
          initialFov: scene.initial_fov ?? null,
        })),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!tour) return
    const root = document.getElementById('villa-tour-root')
    if (!root) return
    return mountTourViewer(root, {
      title: tour.title,
      scenes: tour.scenes,
      onSaveStartView: canEdit
        ? (index, view) => saveStartView(tour.scenes[index]?.id, view)
        : undefined,
    })
  }, [tour, canEdit])

  if (!tour) {
    return (
      <main
        className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#101820] px-6 text-center text-white"
        data-prerender-ready={missing ? 'true' : undefined}
      >
        <Seo title="360 tour" description="Walk through a Capital Dream villa in 360 degrees." />
        <h1 className="font-display text-3xl">{missing ? 'Tour not found' : 'Preparing your view…'}</h1>
        {error ? <p className="max-w-md text-sm text-white/70">{error}</p> : null}
        {missing ? (
          <Link to="/tours" className="text-sm text-[#c9e7eb] underline">
            All villas
          </Link>
        ) : null}
      </main>
    )
  }

  return (
    <>
      <Seo
        title={`${tour.title} · 360° Tour`}
        description={tour.summary || `Walk through ${tour.title} in 360 degrees.`}
        image={tour.scenes[0]?.thumb}
      />
      <main
        id="villa-tour-root"
        className="villa-tour"
        data-prerender-ready="true"
        aria-label={`${tour.title} 360 tour`}
      />
    </>
  )
}
