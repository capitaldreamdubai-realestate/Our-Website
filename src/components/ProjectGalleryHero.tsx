import useEmblaCarousel from 'embla-carousel-react'
import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import type { PropertyGalleryItem } from './PropertyCard'
import { CarouselNav } from './CarouselNav'
import { ImagePrimaryOverlay } from './ImagePrimaryOverlay'

type Props = {
  title: string
  gallery: PropertyGalleryItem[]
}

export function ProjectGalleryHero({ title, gallery }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const active = gallery[selectedIndex] ?? gallery[0]

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: gallery.length > 3,
      skipSnaps: false,
      dragFree: false,
    },
    [],
  )

  const onThumbClick = useCallback(
    (index: number) => {
      setSelectedIndex(index)
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    const i = emblaApi.selectedScrollSnap()
    if (gallery[i]) setSelectedIndex(i)
  }, [emblaApi, gallery])

  useEffect(() => {
    setSelectedIndex(0)
  }, [title])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    emblaApi?.reInit()
    emblaApi?.scrollTo(0, true)
  }, [emblaApi, gallery])

  if (!active) {
    return (
      <section className="relative w-full bg-ink/5">
        <div className="flex min-h-[min(52vw,28rem)] items-center justify-center px-6 py-16">
          <h1 className="text-center font-display text-3xl font-semibold text-terracotta sm:text-4xl">
            {title}
          </h1>
        </div>
      </section>
    )
  }

  return (
    <section className="relative w-full" aria-label={title}>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink/10 sm:aspect-[16/9] md:aspect-[21/9]">
        {active.type === 'image' ? (
          <img
            src={active.src}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <video
            src={active.src}
            poster={active.poster}
            className="size-full object-cover"
            controls
            playsInline
          />
        )}
        <ImagePrimaryOverlay />
        <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-ink/70 via-ink/25 to-transparent px-4 pb-5 pt-16 sm:px-8 sm:pb-8">
          <h1 className="max-w-4xl font-display text-2xl font-semibold text-cream sm:text-4xl">
            {title}
          </h1>
        </div>
      </div>

      {gallery.length > 1 ? (
        <div className="border-b border-ink/10 bg-cream px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/50">
              Gallery
            </p>
            <CarouselNav emblaApi={emblaApi} />
          </div>
          <div className="mt-3 overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y gap-2">
              {gallery.map((item, i) => (
                <button
                  key={`${item.src}-${i}`}
                  type="button"
                  onClick={() => onThumbClick(i)}
                  className={clsx(
                    'relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-28',
                    i === selectedIndex
                      ? 'border-terracotta'
                      : 'border-transparent opacity-75 hover:opacity-100',
                  )}
                >
                  <img src={item.src} alt="" className="size-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
