import clsx from 'clsx'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { buttonClassNames } from '@/components/Button'
import { PhoneInputField } from '@/components/PhoneInputField'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import { getSupabase } from '@/integrations/supabase/client'
import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'

export type ProjectLeadIntent = 'inquiry' | 'brochure'

type Props = {
  projectId: string
  projectName: string
  salesperson: PublicSalesperson | null
  intent: ProjectLeadIntent
  submitLabel?: string
  onSuccess?: (submissionId: string) => void
  compact?: boolean
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function ProjectLeadForm({
  projectId,
  projectName,
  salesperson,
  intent,
  submitLabel,
  onSuccess,
  compact,
}: Props) {
  const { t } = useLocalePreferences()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const headline =
    intent === 'brochure'
      ? t('projectLead.headlineBrochure', { name: projectName })
      : salesperson
        ? t('projectLead.headlineWithAgent', { name: salesperson.name })
        : t('projectLead.headlineGeneric', { name: projectName })

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
    if (!n || !em || !isValidEmail(em)) return

    const sb = getSupabase()
    if (!sb) {
      setErr(t('lead.errorNotConnected'))
      return
    }
    setBusy(true)
    const source = intent === 'brochure' ? 'project_brochure' : 'project_enquiry'
    const { data, error } = await sb
      .from('form_submissions')
      .insert({
        source,
        project_id: projectId,
        project_name: projectName,
        name: n,
        email: em,
        phone: phone?.trim() || null,
        message: message.trim() || null,
        meta: {
          intent,
          salesperson_id: salesperson?.id ?? null,
          salesperson_name: salesperson?.name ?? null,
        },
      })
      .select('id')
      .single()
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setDone(true)
    onSuccess?.(data.id)
    if (intent === 'inquiry') {
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
      setAttempted(false)
    }
  }

  const field =
    'mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/40'

  const defaultSubmit =
    intent === 'brochure' ? t('projectLead.download') : t('projectLead.send')

  return (
    <div
      className={clsx(
        'rounded-2xl border border-terracotta/15 bg-white shadow-sm',
        compact ? 'p-4' : 'p-5 sm:p-6',
      )}
      style={{ color: '#4a2c28' }}
    >
      {!compact ? (
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
            {intent === 'inquiry' ? (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-wider text-ink/55">
                <Link
                  to="/about"
                  className="text-terracotta underline-offset-2 hover:underline"
                >
                  {salesperson ? t('lead.agentDetails') : t('lead.aboutBroker')}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mb-4 font-display text-base font-semibold leading-snug text-terracotta">
          {headline}
        </p>
      )}

      {done ? (
        <p className={compact ? 'text-sm leading-relaxed text-ink/75' : 'mt-6 text-sm leading-relaxed text-ink/75'}>
          {intent === 'brochure'
            ? t('projectLead.thankYouBrochure')
            : t('projectLead.thankYou')}
        </p>
      ) : (
        <form
          className={clsx('flex flex-col gap-4', compact ? '' : 'mt-5')}
          onSubmit={onSubmit}
          noValidate
        >
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
              htmlFor="project-lead-phone"
              className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/55"
            >
              {t('lead.phone')}
            </label>
            <PhoneInputField
              id="project-lead-phone"
              value={phone}
              onChange={(v) => setPhone(v ?? '')}
              variant="public"
              defaultCountry="AE"
              placeholder={t('lead.phonePh')}
            />
          </div>
          {intent === 'inquiry' ? (
            <div>
              <label className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink/55">
                {t('lead.message')}
              </label>
              <textarea
                className={clsx(field, 'min-h-[120px] resize-y')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('lead.messagePh')}
                rows={4}
              />
            </div>
          ) : null}
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className={`w-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${buttonClassNames('primary')}`}
          >
            {busy ? t('lead.sending') : submitLabel ?? defaultSubmit}
          </button>
        </form>
      )}
    </div>
  )
}
