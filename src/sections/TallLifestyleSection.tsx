import { Button } from '../components/Button'
import { ImagePrimaryOverlay } from '../components/ImagePrimaryOverlay'
import { SectionShell } from '../components/SectionShell'

const photo =
  'https://images.pexels.com/photos/29267520/pexels-photo-29267520.jpeg'

const cols = [
  {
    title: 'Acquisition',
    body: 'We build a disciplined shortlist from on- and off-market inventory, with comparables you can trace and a timeline you can plan around.',
    showCta: true,
  },
  {
    title: 'Disposal',
    body: 'Editorial storytelling, discreet previews, and buyer qualification — so your home is seen by the right people, not the loudest feed.',
    showCta: false,
  },
  {
    title: 'Residency',
    body: 'Introductions to legal, tax, and build partners who know island code — coordinated as one mandate, not a patchwork of DMs.',
    showCta: false,
  },
] as const

type TallProps = {
  id?: string
  'aria-label'?: string
  showServicesOverlay?: boolean
}

export function TallLifestyleSection({
  id = 'lifestyle',
  'aria-label': ariaLabel = 'Lifestyle',
  showServicesOverlay = false,
}: TallProps = {}) {
  return (
    <SectionShell
      variant="cream"
      id={id}
      aria-label={ariaLabel}
      compactMobilePad
    >
      <div className="w-full py-1 sm:py-2">
        <div
          className={`relative w-full overflow-hidden rounded-[1.125rem] [aspect-ratio:4/5] max-h-[min(92vh,980px)] min-h-[280px] sm:min-h-[380px] lg:[aspect-ratio:16/9] lg:min-h-[620px] ${showServicesOverlay ? 'about-lifestyle-reveal' : ''}`}
        >
          <img
            src={photo}
            alt="Group seated on a large outdoor sofa"
            className="absolute inset-0 z-0 h-full w-full object-cover object-[center_25%]"
            width={1600}
            height={2000}
            loading="lazy"
          />
          <ImagePrimaryOverlay />
          {showServicesOverlay ? (
            <>
              <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/60 via-black/15 to-black/10" />
              <div className="absolute inset-0 z-[3] p-4 sm:p-6 lg:p-8">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex justify-start lg:justify-end">
                    <h2 className="type-heading-display type-heading-display--services max-w-xl font-display font-semibold leading-tight text-cream drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
                      UAE&apos;s leading private-client practice
                    </h2>
                  </div>
                  <div className="hidden gap-4 sm:grid sm:gap-5 lg:grid-cols-3 lg:gap-6">
                    {cols.map((c) => (
                      <div
                        key={c.title}
                        className="flex min-h-[190px] flex-col justify-between rounded-2xl bg-white/18 p-4 text-cream backdrop-blur-md sm:min-h-[210px] sm:p-5"
                      >
                        <div>
                          <h3 className="nav-caps text-cream/85">{c.title}</h3>
                          <p className="mt-3 font-light leading-relaxed text-cream/95">
                            {c.body}
                          </p>
                        </div>
                        {c.showCta ? (
                          <div className="mt-6">
                            <Button type="button" variant="whiteSolid" className="btn-cool-cta">
                              Start a brief
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </SectionShell>
  )
}
