import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { FormSuccessPanel } from '@/components/FormSuccessPanel'
import { LeadQualificationFields } from '@/components/LeadQualificationFields'
import { PhoneInputField } from '@/components/PhoneInputField'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'
import {
  emptyQualification,
  qualificationComplete,
  qualificationMessage,
  qualificationMeta,
  type QualificationAnswers,
} from '@/lib/leadQualification'
import type { WebsiteFormSource } from '@/lib/submitWebsiteForm'
import { submitWebsiteForm } from '@/lib/submitWebsiteForm'
import { agentWhatsappUrl, openAgentWhatsapp } from '@/lib/whatsapp'

type Props = {
  propertyId?: string | null
  propertyTitle?: string | null
  salesperson?: PublicSalesperson | null
  source?: WebsiteFormSource
  headlineOverride?: string
  submitLabel?: string
  enquiryChoices?: { label: string; source: WebsiteFormSource }[]
  similarHref?: string
  similarLabel?: string
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function PropertyLeadForm({
  propertyId,
  propertyTitle,
  salesperson = null,
  source = 'property_enquiry',
  headlineOverride,
  submitLabel,
  enquiryChoices,
  similarHref,
  similarLabel,
}: Props) {
  const { t } = useLocalePreferences()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [qualification, setQualification] = useState<QualificationAnswers>(emptyQualification)
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [choice, setChoice] = useState(0)
  const activeSource = enquiryChoices?.[choice]?.source ?? source

  const wa = agentWhatsappUrl(salesperson)
  const headline =
    headlineOverride ??
    (salesperson
      ? t('lead.headlineWithAgent', { name: salesperson.name })
      : t('lead.headlineGeneric'))

  const thumb =
    salesperson?.profile_image_url?.trim() ||
    'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="#6B3B34" width="64" height="64" rx="32"/><text x="32" y="38" text-anchor="middle" fill="#FAF7F2" font-size="20" font-family="system-ui">CD</text></svg>',
      )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setAttempted(true)
    setErr(null)
    const n = name.trim()
    const em = email.trim()
    if (!n || !em || !isValidEmail(em) || !qualificationComplete(qualification)) return

    setBusy(true)
    const { error } = await submitWebsiteForm({
      source: activeSource,
      propertyId: propertyId ?? null,
      propertyTitle: propertyTitle ?? null,
      name: n,
      email: em,
      phone: phone?.trim() || null,
      message: qualificationMessage(qualification),
      meta: {
        salesperson_id: salesperson?.id ?? null,
        salesperson_name: salesperson?.name ?? null,
        ...qualificationMeta(qualification),
      },
    })
    setBusy(false)
    if (error) {
      setErr(error.message === 'Supabase not configured' ? t('lead.errorNotConnected') : error.message)
      return
    }
    setDone(true)
    setName('')
    setEmail('')
    setPhone('')
    setQualification(emptyQualification)
    setAttempted(false)
  }

  const field =
    'mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/40'

  return (
    <div
      className="rounded-2xl border border-terracotta/15 bg-white p-5 shadow-sm sm:p-6"
      style={{ color: '#4a2c28' }}
    >
      <div className="flex gap-3 border-b border-ink/10 pb-4">
        <img
          src={thumb}
          alt=""
          className="size-12 shrink-0 rounded-full object-cover"
          width={48}
          height={48}
        />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-snug text-terracotta">
            {headline}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-wider text-ink/55">
            {wa ? (
              <button
                type="button"
                onClick={() =>
                  void openAgentWhatsapp(salesperson, {
                    propertyId,
                    propertyTitle,
                    pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
                  })
                }
                className="text-terracotta underline-offset-2 hover:underline"
              >
                {t('lead.whatsapp')}
              </button>
            ) : null}
            {salesperson ? (
              <Link
                to="/about"
                className="text-terracotta underline-offset-2 hover:underline"
              >
                {t('lead.agentDetails')}
              </Link>
            ) : (
              <Link
                to="/about"
                className="text-terracotta underline-offset-2 hover:underline"
              >
                {t('lead.aboutBroker')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {enquiryChoices && enquiryChoices.length > 1 ? (
        <div className="mt-4 flex flex-col gap-2">
          {enquiryChoices.map((item, index) => (
            <button
              key={item.source}
              type="button"
              onClick={() => setChoice(index)}
              className={
                index === choice
                  ? buttonClassNames('primary', 'w-full')
                  : buttonClassNames('outlineTerracotta', 'w-full')
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {done ? (
        <FormSuccessPanel variant="enquiry" className="mt-6" />
      ) : (
        <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/55">
              {t('lead.name')}
            </label>
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('lead.namePh')}
              autoComplete="name"
              aria-invalid={attempted && !name.trim()}
            />
            {attempted && !name.trim() ? (
              <p className="mt-1 text-xs text-red-600">{t('lead.nameRequired')}</p>
            ) : null}
          </div>
          <div>
            <label className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/55">
              {t('lead.email')}
            </label>
            <input
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('lead.emailPh')}
              autoComplete="email"
              aria-invalid={
                attempted && (!email.trim() || !isValidEmail(email.trim()))
              }
            />
            {attempted && !email.trim() ? (
              <p className="mt-1 text-xs text-red-600">{t('lead.emailRequired')}</p>
            ) : null}
            {attempted && email.trim() && !isValidEmail(email.trim()) ? (
              <p className="mt-1 text-xs text-red-600">{t('lead.emailInvalid')}</p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="property-lead-phone"
              className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/55"
            >
              {t('lead.phone')}
            </label>
            <PhoneInputField
              id="property-lead-phone"
              value={phone}
              onChange={(v) => setPhone(v ?? '')}
              variant="public"
              defaultCountry="AE"
              placeholder={t('lead.phonePh')}
            />
          </div>
          <LeadQualificationFields
            idPrefix="property-lead"
            answers={qualification}
            onChange={setQualification}
            attempted={attempted}
            labelClass="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/55"
            fieldClass="w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink"
            errorClass="mt-1 text-xs text-red-600"
          />
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className={`w-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${buttonClassNames('primary')}`}
          >
            {busy ? t('lead.sending') : (submitLabel ?? t('lead.send'))}
          </button>
          {similarHref && similarLabel ? (
            <Link
              to={similarHref}
              className={buttonClassNames('outlineTerracotta', 'w-full text-center')}
            >
              {similarLabel}
            </Link>
          ) : null}
        </form>
      )}
    </div>
  )
}
