import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { getSupabase } from '@/integrations/supabase/client'

type TourCard = {
  id: string
  slug: string
  title: string
  summary: string | null
  thumb: string | null
}

export function ToursIndexPage() {
  const [tours, setTours] = useState<TourCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setError('Tours are not available right now.')
      setTours([])
      return
    }
    let cancelled = false
    void (async () => {
      const { data, error: tourError } = await supabase
        .from('virtual_tours')
        .select('id, slug, title, summary, cover_url, sort_order')
        .eq('published', true)
        .order('sort_order')
      if (cancelled) return
      if (tourError) {
        setError(tourError.message)
        setTours([])
        return
      }
      const rows = data ?? []
      const ids = rows.map((row) => row.id)
      const thumbs = new Map<string, { url: string; order: number }>()
      if (ids.length > 0) {
        const { data: scenes } = await supabase
          .from('virtual_tour_scenes')
          .select('tour_id, thumb_url, sort_order')
          .in('tour_id', ids)
          .eq('active', true)
          .order('sort_order')
        if (cancelled) return
        for (const scene of scenes ?? []) {
          const current = thumbs.get(scene.tour_id)
          if (!current || scene.sort_order < current.order) {
            thumbs.set(scene.tour_id, { url: scene.thumb_url, order: scene.sort_order })
          }
        }
      }
      setTours(
        rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          summary: row.summary,
          thumb: row.cover_url?.trim() || thumbs.get(row.id)?.url || null,
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ready = tours !== null

  return (
    <main
      id="page-tours"
      data-prerender-ready={ready ? 'true' : undefined}
      className="w-full min-w-0 pb-8 pt-0 sm:pb-10 lg:pb-12"
    >
      <Seo
        title="360 tours"
        description="Walk through Capital Dream villas in 360 degrees."
      />
      <section className="w-full min-w-0 rounded-2xl bg-[#FAF7F2] px-4 py-6 text-[#6B3B34] sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <header className="max-w-3xl">
          <h1 className="type-section-header font-display tracking-[0.02em] text-terracotta">
            360 tours
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-terracotta/90 sm:text-[length:var(--brand-font-body-lg)]">
            Select a villa and walk through it. Drag to look around, and move from view to view.
          </p>
        </header>

        {error ? <p className="mt-8 text-sm text-terracotta/80">{error}</p> : null}

        {!ready ? (
          <p className="mt-8 text-[length:var(--brand-font-body-lg)] text-terracotta/70">Loading villas…</p>
        ) : tours.length === 0 ? (
          <p className="mt-8 max-w-xl text-[length:var(--brand-font-body-lg)] leading-relaxed text-terracotta/85">
            No villa tours are published yet.
          </p>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <li key={tour.id}>
                <Link
                  to={`/tours/${tour.slug}`}
                  className="group relative block aspect-square overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {tour.thumb ? (
                    <img
                      src={tour.thumb}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#12202a]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10">
                    <h2 className="font-display text-lg leading-snug text-white">{tour.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-white/80">
                      {tour.summary?.trim() || '360° walkthrough'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
