import type { EmblaCarouselType } from 'embla-carousel'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'

export function CarouselNav({
  emblaApi,
  className = '',
}: {
  emblaApi: EmblaCarouselType | undefined
  className?: string
}) {
  const { t } = useLocalePreferences()
  const [prevDisabled, setPrevDisabled] = useState(true)
  const [nextDisabled, setNextDisabled] = useState(true)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setPrevDisabled(!emblaApi.canScrollPrev())
    setNextDisabled(!emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('reInit', onSelect)
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('reInit', onSelect)
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const btnBase =
    'btn-icon-ink inline-flex size-11 shrink-0 items-center justify-center rounded-full border text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none'

  return (
    <div
      className={clsx('flex shrink-0 items-center gap-2', className)}
      role="group"
      aria-label={t('carousel.navAria')}
    >
      <button
        type="button"
        className={clsx(
          btnBase,
          prevDisabled
            ? 'border-ink/15 bg-cream text-ink/30 opacity-60 focus-visible:outline-ink/20'
            : 'border-transparent bg-ink text-cream focus-visible:outline-cream/40',
        )}
        aria-label={t('carousel.prev')}
        onClick={scrollPrev}
        disabled={prevDisabled}
      >
        <ChevronLeft className="size-5" strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={clsx(
          btnBase,
          nextDisabled
            ? 'border-ink/15 bg-cream text-ink/30 opacity-60 focus-visible:outline-ink/20'
            : 'border-transparent bg-ink text-cream focus-visible:outline-cream/40',
        )}
        aria-label={t('carousel.next')}
        onClick={scrollNext}
        disabled={nextDisabled}
      >
        <ChevronRight className="size-5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
