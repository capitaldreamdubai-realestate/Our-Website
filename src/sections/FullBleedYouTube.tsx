import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { ImagePrimaryOverlay } from '@/components/ImagePrimaryOverlay'
import { SectionShell } from '../components/SectionShell'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'

function ytCommand(iframe: HTMLIFrameElement, func: string) {
  const win = iframe.contentWindow
  if (!win) return
  win.postMessage(
    JSON.stringify({
      event: 'command',
      func,
      args: [] as unknown[],
    }),
    '*',
  )
}

function buildEmbedSrc(videoId: string): string {
  const p = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    loop: '1',
    playlist: videoId,
    enablejsapi: '1',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
  })
  return `https://www.youtube.com/embed/${videoId}?${p.toString()}`
}

type Props = {
  videoId: string
  embedInstanceId: string
  sectionId?: string
  'aria-label'?: string
  compactMobilePad?: boolean
}

/**
 * Background film: a normal YouTube **embed iframe** (same as copying from Share → Embed).
 * No IFrame API / `YT.Player` — that path was breaking layout and playback for you.
 * Pause / mute use `postMessage` (needs `enablejsapi=1` on the URL, which we set).
 */
export function FullBleedYouTube({
  videoId,
  embedInstanceId,
  sectionId,
  'aria-label': ariaLabel,
  compactMobilePad,
}: Props) {
  const { t } = useLocalePreferences()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)

  const src = useMemo(() => buildEmbedSrc(videoId), [videoId])

  const run = useCallback((fn: (el: HTMLIFrameElement) => void) => {
    const el = iframeRef.current
    if (el) fn(el)
  }, [])

  const togglePlay = useCallback(() => {
    run((iframe) => {
      if (playing) {
        ytCommand(iframe, 'pauseVideo')
        setPlaying(false)
      } else {
        ytCommand(iframe, 'playVideo')
        setPlaying(true)
      }
    })
  }, [playing, run])

  const toggleMute = useCallback(() => {
    run((iframe) => {
      if (muted) {
        ytCommand(iframe, 'unMute')
        setMuted(false)
      } else {
        ytCommand(iframe, 'mute')
        setMuted(true)
      }
    })
  }, [muted, run])

  const ctrlClass =
    'btn-icon-ink type-button flex size-11 shrink-0 items-center justify-center rounded-full border border-cream/25 bg-ink/75 text-cream shadow-lg backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream disabled:pointer-events-none disabled:opacity-40'

  return (
    <SectionShell
      variant="cream"
      compactMobilePad={compactMobilePad}
      id={sectionId}
      aria-label={ariaLabel}
    >
      <figure
        className="relative w-full overflow-hidden rounded-[1.125rem] bg-ink/10"
        aria-label={ariaLabel ?? t('youtube.defaultAria')}
      >
        <div className="relative aspect-video w-full overflow-hidden">
          <iframe
            ref={iframeRef}
            id={embedInstanceId}
            key={`${embedInstanceId}-${videoId}`}
            title={t('youtube.bgTitle')}
            className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full border-0"
            src={src}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={false}
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setIframeLoaded(true)}
          />
          <ImagePrimaryOverlay />
          <div className="absolute bottom-3 right-3 z-[2] flex flex-wrap items-center justify-end gap-2 sm:bottom-4 sm:right-4">
            <button
              type="button"
              className={ctrlClass}
              aria-label={playing ? t('youtube.pause') : t('youtube.play')}
              disabled={!iframeLoaded}
              onClick={togglePlay}
            >
              {playing ? (
                <Pause className="size-5" strokeWidth={2} aria-hidden />
              ) : (
                <Play className="size-5" strokeWidth={2} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className={ctrlClass}
              aria-label={muted ? t('youtube.unmute') : t('youtube.mute')}
              disabled={!iframeLoaded}
              onClick={toggleMute}
            >
              {muted ? (
                <VolumeX className="size-5" strokeWidth={2} aria-hidden />
              ) : (
                <Volume2 className="size-5" strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </figure>
    </SectionShell>
  )
}
