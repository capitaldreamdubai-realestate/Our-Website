import type { PublicSalesperson } from '@/lib/cms/loadCmsSnapshot'
import { submitWebsiteForm } from '@/lib/submitWebsiteForm'

/** Build a wa.me URL from a stored phone string (digits only), optional prefilled text. */
export function whatsappHref(
  phone: string | null | undefined,
  text?: string | null,
): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  const base = `https://wa.me/${digits}`
  const trimmed = text?.trim()
  if (!trimmed) return base
  return `${base}?text=${encodeURIComponent(trimmed)}`
}

export type WhatsappLeadContext = {
  phone: string
  text: string
  pagePath?: string
  propertyId?: string | null
  propertyTitle?: string | null
  projectId?: string | null
  projectName?: string | null
  projectSlug?: string | null
  salespersonId?: string | null
  salespersonName?: string | null
}

/** Default Capital Dream WhatsApp prefill. */
export function buildWhatsappPrefill(opts: {
  propertyTitle?: string | null
  projectName?: string | null
  pagePath?: string | null
  pageUrl?: string | null
}): string {
  const interest =
    opts.propertyTitle?.trim() ||
    opts.projectName?.trim() ||
    opts.pagePath?.trim() ||
    'your listings'
  const url = opts.pageUrl?.trim() || (typeof window !== 'undefined' ? window.location.href : '')
  const urlPart = url ? ` (${url})` : ''
  return `Hi Capital Dream, I'm interested in ${interest}${urlPart}`
}

/**
 * Log a whatsapp_click to form_submissions (syncs to CRM via DB trigger), then open WhatsApp.
 * Chat always opens even if logging fails.
 */
export async function openWhatsappWithLead(ctx: WhatsappLeadContext): Promise<void> {
  const href = whatsappHref(ctx.phone, ctx.text)
  if (!href) return

  try {
    await submitWebsiteForm({
      source: 'whatsapp_click',
      name: 'WhatsApp Click',
      email: null,
      phone: ctx.phone.replace(/\D/g, '') || ctx.phone,
      message: ctx.text,
      propertyId: ctx.propertyId ?? null,
      propertyTitle: ctx.propertyTitle ?? null,
      projectId: ctx.projectId ?? null,
      projectName: ctx.projectName ?? null,
      meta: {
        intent: 'whatsapp',
        page_path: ctx.pagePath ?? (typeof window !== 'undefined' ? window.location.pathname : null),
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        project_slug: ctx.projectSlug ?? null,
        salesperson_id: ctx.salespersonId ?? null,
        salesperson_name: ctx.salespersonName ?? null,
      },
    })
  } catch {
    // never block WhatsApp
  }

  window.open(href, '_blank', 'noopener,noreferrer')
}

/** WhatsApp URL for an agent: explicit `social_links.whatsapp` or fallback to phone. */
export function agentWhatsappUrl(
  sp: PublicSalesperson | null,
  text?: string | null,
): string | null {
  if (!sp) return null
  const raw = sp.social_links.whatsapp
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (t.startsWith('http')) {
      // Preserve existing full URLs; append text if wa.me without query
      if (text?.trim() && t.includes('wa.me') && !t.includes('text=')) {
        const sep = t.includes('?') ? '&' : '?'
        return `${t}${sep}text=${encodeURIComponent(text.trim())}`
      }
      return t
    }
    return whatsappHref(t, text)
  }
  return whatsappHref(sp.phone, text)
}

/** Log + open agent WhatsApp with property/page context. */
export async function openAgentWhatsapp(
  sp: PublicSalesperson | null,
  ctx?: {
    propertyId?: string | null
    propertyTitle?: string | null
    projectId?: string | null
    projectName?: string | null
    projectSlug?: string | null
    pagePath?: string | null
  },
): Promise<void> {
  if (!sp) return
  const text = buildWhatsappPrefill({
    propertyTitle: ctx?.propertyTitle,
    projectName: ctx?.projectName,
    pagePath: ctx?.pagePath,
  })
  const raw = typeof sp.social_links.whatsapp === 'string' ? sp.social_links.whatsapp.trim() : ''
  const phone = raw && !raw.startsWith('http') ? raw : sp.phone
  if (!phone) {
    const href = agentWhatsappUrl(sp, text)
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  await openWhatsappWithLead({
    phone,
    text,
    pagePath: ctx?.pagePath ?? undefined,
    propertyId: ctx?.propertyId,
    propertyTitle: ctx?.propertyTitle,
    projectId: ctx?.projectId,
    projectName: ctx?.projectName,
    projectSlug: ctx?.projectSlug,
    salespersonId: sp.id,
    salespersonName: sp.name,
  })
}
