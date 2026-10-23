import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { getSupabase } from '@/integrations/supabase/client'
import { mountTourViewer, type TourSceneView } from '@/tours/mountTourViewer'
import '@/tours/villa-tour.css'

type LoadedTour = {
  title: string
  summary: string | null
  scenes: TourSceneView[]
}

export function TourPage() {
  const { slug = '' } = useParams()
  const [tour, setTour] = useState<LoadedTour | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        .select('title, zone, grade, image_url, thumb_url, capture, sort_order')
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
          title: scene.title,
          zone: scene.zone,
          grade: scene.grade,
          image: scene.image_url,
          thumb: scene.thumb_url,
          capture: scene.capture ?? '',
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
    return mountTourViewer(root, { title: tour.title, scenes: tour.scenes })
  }, [tour])

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
