import { useMemo, useState, type FormEvent } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { buttonClassNames } from '@/components/Button'
import { CarouselNav } from '@/components/CarouselNav'
import { useCms } from '@/contexts/CmsContext'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { getSupabase } from '@/integrations/supabase/client'
import { usePageSeo } from '@/hooks/usePageSeo'
import type { Database } from '@/integrations/supabase/database.types'

const panelBg = '#FAF7F2'
const panelInk = '#6B3B34'

type FormState = {
  quote: string
  name: string
  role: string
  location: string
  rating: number
}

const initialState: FormState = {
  quote: '',
  name: '',
  role: '',
  location: '',
  rating: 5,
}

export function TestimonialsPage() {
  const { testimonials } = useCms()
  const { t } = useLocalePreferences()
  const [form, setForm] = useState<FormState>(initialState)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  usePageSeo({
    title: t('seo.testimonials.title'),
    description: t('seo.testimonials.description'),
  })

  const errors = useMemo(
    () => ({
      quote: attempted && form.quote.trim().length === 0,
      name: attempted && form.name.trim().length === 0,
    }),
    [attempted, form],
  )
  const hasError = errors.quote || errors.name
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: testimonials.length > 1,
      skipSnaps: false,
      dragFree: false,
    },
    [],
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    if (hasError) return
    const sb = getSupabase()
    if (!sb) {
      setSubmitErr(t('testimonials.submitError'))
      return
    }
    setSubmitting(true)
    setSubmitErr(null)
    const payload: Database['public']['Tables']['testimonials']['Insert'] = {
      quote: form.quote.trim(),
      author_name: form.name.trim(),
      author_role: form.role.trim() || null,
      author_location: form.location.trim() || null,
      rating: Math.min(5, Math.max(1, form.rating)),
      status: 'pending',
    }
    const { error } = await sb.from('testimonials').insert(payload)
    setSubmitting(false)
    if (error) {
      setSubmitErr(error.message || t('testimonials.submitError'))
      return
    }
    setSubmitted(true)
    setForm(initialState)
    setAttempted(false)
  }

  return (
    <main
      aria-label={t('testimonials.aria.main')}
      className="w-full min-w-0 rounded-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-10 xl:px-12 xl:py-12"
      style={{ backgroundColor: panelBg, color: panelInk }}
    >
      <div className="space-y-10">
        <header className="max-w-3xl space-y-3">
          <p className="font-compact text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-terracotta/75">
            {t('testimonials.eyebrow')}
          </p>
          <h1 className="type-heading-founders font-display font-medium leading-tight tracking-tight text-terracotta">
            {t('testimonials.h1')}
          </h1>
          <p className="font-sans text-[length:var(--brand-font-body-lg)] leading-relaxed text-terracotta/90">
            {t('testimonials.intro')}
          </p>
        </header>

        <section className="space-y-5" aria-label={t('testimonials.listAria')}>
          {testimonials.length === 0 ? (
            <p className="text-sm text-terracotta/75">{t('testimonials.empty')}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CarouselNav emblaApi={emblaApi} />
              </div>
              <div
                className="overflow-hidden"
                ref={emblaRef}
                role="region"
                aria-roledescription="carousel"
                aria-label={t('testimonials.listAria')}
              >
                <div className="flex touch-pan-y [-webkit-tap-highlight-color:transparent]">
                  {testimonials.map((item) => (
                    <div key={item.id} className="min-w-0 shrink-0 grow-0 basis-full pr-4">
                      <article className="rounded-2xl border border-[#6B3B34]/14 bg-white/60 p-5 shadow-sm">
                        <p className="mb-3 text-base leading-relaxed text-terracotta/90">"{item.quote}"</p>
                        <p className="text-sm font-medium text-terracotta">{'★'.repeat(item.rating)}</p>
                        <p className="mt-3 text-sm text-terracotta/90">
                          — {item.authorName}
                          {item.authorRole ? `, ${item.authorRole}` : ''}
                          {item.authorLocation ? ` | ${item.authorLocation}` : ''}
                        </p>
                      </article>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-[#6B3B34]/14 bg-white/60 p-5 shadow-sm sm:p-6"
          aria-label={t('testimonials.formAria')}
        >
          <h2 className="type-card-title font-display text-terracotta">{t('testimonials.formTitle')}</h2>
          <p className="mt-2 text-sm text-terracotta/80">{t('testimonials.formIntro')}</p>
          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-1.5">
              <label htmlFor="testimonial-quote" className="font-sans text-sm font-medium text-terracotta/90">
                {t('testimonials.quote')}
              </label>
              <textarea
                id="testimonial-quote"
                value={form.quote}
                onChange={(e) => setForm((prev) => ({ ...prev, quote: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-[#6B3B34]/28 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20"
              />
              {errors.quote ? <p className="text-sm text-terracotta">{t('testimonials.errorQuote')}</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="testimonial-name"
                label={t('testimonials.name')}
                value={form.name}
                onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                error={errors.name ? t('testimonials.errorName') : null}
              />
              <Field
                id="testimonial-role"
                label={t('testimonials.role')}
                value={form.role}
                onChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
              />
              <Field
                id="testimonial-location"
                label={t('testimonials.location')}
                value={form.location}
                onChange={(value) => setForm((prev) => ({ ...prev, location: value }))}
              />
              <div className="space-y-1.5">
                <label htmlFor="testimonial-rating" className="font-sans text-sm font-medium text-terracotta/90">
                  {t('testimonials.rating')}
                </label>
                <select
                  id="testimonial-rating"
                  value={form.rating}
                  onChange={(e) => setForm((prev) => ({ ...prev, rating: Number(e.target.value) || 5 }))}
                  className="w-full rounded-xl border border-[#6B3B34]/28 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20"
                >
                  <option value={5}>5</option>
                  <option value={4}>4</option>
                  <option value={3}>3</option>
                  <option value={2}>2</option>
                  <option value={1}>1</option>
                </select>
              </div>
            </div>

            {submitErr ? <p className="text-sm text-red-600">{submitErr}</p> : null}
            {submitted ? <p className="text-sm text-emerald-700">{t('testimonials.submitSuccess')}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className={buttonClassNames('primary', 'min-h-11 px-5 py-2.5 disabled:cursor-not-allowed')}
            >
              {submitting ? t('testimonials.submitting') : t('testimonials.submit')}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error = null,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string | null
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="font-sans text-sm font-medium text-terracotta/90">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#6B3B34]/28 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-[#6B3B34]/55 focus:ring-2 focus:ring-[#6B3B34]/20"
      />
      {error ? <p className="text-sm text-terracotta">{error}</p> : null}
    </div>
  )
}
