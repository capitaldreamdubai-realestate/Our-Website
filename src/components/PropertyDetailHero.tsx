import useEmblaCarousel from 'embla-carousel-react'
import clsx from 'clsx'
import { Play } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Property, PropertyGalleryItem } from './PropertyCard'
import { CarouselNav } from './CarouselNav'
import { ImagePrimaryOverlay } from './ImagePrimaryOverlay'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { formatPriceFromAed } from '../lib/formatCurrency'

type Props = {
  property: Property
  gallery: PropertyGalleryItem[]
}

export function PropertyDetailHero({ property, gallery }: Props) {
  const { currency, rates, intlLocale } = useLocalePreferences()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [property.id])
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
  }, [emblaApi, gallery.length, property.id])

  const priceText =
    property.priceAed != null
      ? formatPriceFromAed(property.priceAed, currency, rates, intlLocale)
      : property.meta.split('·')[0]?.trim() ?? property.meta
  const locationText =
    property.location ?? property.meta.split('·')[1]?.trim() ?? ''

  const thumbBasis =
    'min-w-0 shrink-0 grow-0 basis-[calc((100%-0.75rem*2)/3)] mr-3 last:mr-0'

  return (
    <section
      className="relative min-h-[95vh] min-h-[95dvh] w-full overflow-hidden rounded-[1.5rem]"
      aria-label="Property hero"
    >
      {active?.type === 'video' ? (
        <video
          key={active.src}
          className="absolute inset-0 z-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          poster={active.poster}
          aria-label=""
        >
          <source src={active.src} type="video/mp4" />
        </video>
      ) : (
        <img
          key={active?.src ?? property.image}
          src={active?.src ?? property.image}
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover object-center"
          width={2400}
          height={1029}
          fetchPriority="high"
          decoding="async"
        />
      )}
      <ImagePrimaryOverlay />
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-t from-ink/75 via-ink/45 to-ink/25"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[95vh] min-h-[95dvh] flex-col p-[1.5rem] pb-16 pt-24 sm:pb-20 sm:pt-28 md:flex-row md:items-stretch md:justify-between md:pb-24 md:pt-32">
        <div className="flex min-h-0 w-full flex-1 flex-col justify-end md:w-[30%] md:flex-none md:shrink-0">
          <div className="w-full min-w-0 max-w-full">
            <h1 className="type-hero font-compact text-balance font-light tracking-[-0.02em] text-cream [text-shadow:0_2px_24px_rgba(28,20,18,0.55)]">
              {property.title}
            </h1>
            <p className="mt-5 max-w-full font-compact text-xl font-semibold tracking-wide text-cream/95 [text-shadow:0_1px_12px_rgba(28,20,18,0.45)] sm:text-2xl">
              {priceText}
            </p>
            {locationText ? (
              <p className="mt-2 max-w-xl font-light leading-relaxed text-cream/90 [text-shadow:0_1px_12px_rgba(28,20,18,0.45)]">
                {locationText}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-10 flex min-h-0 w-full flex-col justify-end md:mt-0 md:w-[50%] md:flex-none md:shrink-0 md:pl-4 lg:pl-6">
          <div
            className="flex w-full max-w-xl flex-col gap-3 md:max-w-none"
            role="region"
            aria-label="Property media"
          >
            {gallery.length > 3 ? (
              <div className="flex justify-end">
                <CarouselNav
                  emblaApi={emblaApi}
                  className="[&_button]:border-cream/30 [&_button]:bg-ink/35 [&_button]:text-cream [&_button:not(:disabled):hover]:border-cream/40 [&_button:not(:disabled):hover]:bg-terracotta [&_button:not(:disabled):hover]:text-cream [&_button:disabled]:border-cream/15 [&_button:disabled]:text-cream/35"
                />
              </div>
            ) : null}
            <div
              className="overflow-hidden rounded-[1.125rem] p-1.5"
              ref={emblaRef}
            >
              <div className="flex touch-pan-y [-webkit-tap-highlight-color:transparent]">
                {gallery.map((item, index) => (
                  <div key={`${item.type}-${item.src}-${index}`} className={thumbBasis}>
                    <button
                      type="button"
                      onClick={() => onThumbClick(index)}
                      className={clsx(
                        // ring-inset keeps the focus ring inside the thumb so Embla’s overflow-hidden does not clip it
                        'relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-2 ring-inset transition duration-200',
                        index === selectedIndex
                          ? 'ring-cream'
                          : 'ring-transparent opacity-90 hover:opacity-100',
                      )}
                      aria-label={
                        item.type === 'video'
                          ? `Show video ${index + 1} of ${gallery.length}`
                          : `Show image ${index + 1} of ${gallery.length}`
                      }
                      aria-current={index === selectedIndex ? 'true' : undefined}
                    >
                      {item.type === 'video' ? (
                        <>
                          <img
                            src={item.poster ?? property.image}
                            alt=""
                            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                            loading="lazy"
                          />
                          <span className="absolute inset-0 z-[1] flex items-center justify-center bg-ink/35">
                            <Play
                              className="size-10 text-cream drop-shadow-md"
                              strokeWidth={1.25}
                              fill="currentColor"
                              aria-hidden
                            />
                          </span>
                        </>
                      ) : (
                        <img
                          src={item.src}
                          alt=""
                          className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                          loading="lazy"
                        />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
