import { Plus, Trash2 } from 'lucide-react'
import type { Database } from '@/integrations/supabase/database.types'
import { ImageUploadField } from './ImageUploadField'

export type FloorPlanDraft = {
  id: string
  name: string
  bedrooms: string
  bathrooms: string
  areaSqft: string
  startingPriceAed: string
  layoutImageUrl: string
  renderImageUrl: string
  altText: string
  published: boolean
}

export type MilestonePhase = 'booking' | 'construction' | 'handover' | 'post_handover'
export type DldFeePayer = 'buyer' | 'shared' | 'developer' | 'excluded'

export type MilestoneDraft = {
  id: string
  label: string
  percent: string
  phase: MilestonePhase
}

export type PaymentPlanDraft = {
  id: string
  name: string
  isDefault: boolean
  dldFeePayer: DldFeePayer
  milestones: MilestoneDraft[]
}

export type FaqDraft = { id: string; question: string; answer: string }

const PHASES: { value: MilestonePhase; label: string }[] = [
  { value: 'booking', label: 'On booking' },
  { value: 'construction', label: 'During construction' },
  { value: 'handover', label: 'On handover' },
  { value: 'post_handover', label: 'After handover' },
]

const PAYERS: { value: DldFeePayer; label: string }[] = [
  { value: 'buyer', label: 'Buyer pays 4%' },
  { value: 'shared', label: 'Shared (buyer pays 2%)' },
  { value: 'developer', label: 'Developer pays 4%' },
  { value: 'excluded', label: 'Leave the fee out' },
]

function fieldClass() {
  return 'mt-1 w-full rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink md:text-sm'
}

export function emptyFloorPlan(): FloorPlanDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    bedrooms: '1',
    bathrooms: '',
    areaSqft: '',
    startingPriceAed: '',
    layoutImageUrl: '',
    renderImageUrl: '',
    altText: '',
    published: false,
  }
}

export function emptyPaymentPlan(isDefault: boolean): PaymentPlanDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    isDefault,
    dldFeePayer: 'buyer',
    milestones: [
      { id: crypto.randomUUID(), label: 'Booking', percent: '10', phase: 'booking' },
      { id: crypto.randomUUID(), label: 'During construction', percent: '50', phase: 'construction' },
      { id: crypto.randomUUID(), label: 'On handover', percent: '40', phase: 'handover' },
    ],
  }
}

export function floorPlansFromRows(
  rows: Database['public']['Tables']['offplan_floor_plans']['Row'][],
): FloorPlanDraft[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      name: row.name,
      bedrooms: String(row.bedrooms),
      bathrooms: row.bathrooms == null ? '' : String(row.bathrooms),
      areaSqft: String(row.area_sqft),
      startingPriceAed: row.starting_price_aed == null ? '' : String(row.starting_price_aed),
      layoutImageUrl: row.layout_image_url,
      renderImageUrl: row.render_image_url,
      altText: row.alt_text,
      published: row.published,
    }))
}

export function paymentPlansFromRows(
  plans: Database['public']['Tables']['offplan_payment_plans']['Row'][],
  milestones: Database['public']['Tables']['offplan_payment_milestones']['Row'][],
): PaymentPlanDraft[] {
  return [...plans]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      isDefault: plan.is_default,
      dldFeePayer: plan.dld_fee_payer,
      milestones: milestones
        .filter((item) => item.plan_id === plan.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          label: item.label,
          percent: String(item.percent),
          phase: item.phase,
        })),
    }))
}

export function faqsFromJson(raw: unknown): FaqDraft[] {
  if (!Array.isArray(raw)) return []
  const faqs: FaqDraft[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const question = 'question' in item && typeof item.question === 'string' ? item.question : ''
    const answer = 'answer' in item && typeof item.answer === 'string' ? item.answer : ''
    if (!question && !answer) continue
    faqs.push({ id: crypto.randomUUID(), question, answer })
  }
  return faqs
}

export function validateFloorPlans(plans: FloorPlanDraft[]): string | null {
  for (const plan of plans) {
    const name = plan.name.trim() || 'Untitled floor plan'
    if (!plan.name.trim()) return 'Each floor plan needs a name.'
    const beds = Number(plan.bedrooms)
    if (!Number.isFinite(beds) || beds < 0) return `“${name}” needs a bedroom count (0 for studio).`
    if (plan.bathrooms.trim()) {
      const baths = Number(plan.bathrooms)
      if (!Number.isFinite(baths) || baths < 0) return `“${name}” has an invalid bathroom count.`
    }
    if (plan.startingPriceAed.trim()) {
      const price = Number(plan.startingPriceAed)
      if (!Number.isFinite(price) || price < 0) return `“${name}” has an invalid price.`
    }
    if (!plan.published) continue
    if (!plan.layoutImageUrl.trim() || !plan.renderImageUrl.trim()) {
      return `“${name}” needs a layout and a render before it can be published.`
    }
    if (!plan.altText.trim()) return `“${name}” needs alt text so the images can be indexed.`
    const area = Number(plan.areaSqft)
    if (!Number.isFinite(area) || area <= 0) return `“${name}” needs an area in sq ft.`
  }
  return null
}

export function validatePaymentPlans(plans: PaymentPlanDraft[]): string | null {
  if (plans.length === 0) return null
  if (plans.filter((plan) => plan.isDefault).length !== 1) {
    return 'Choose one default payment plan.'
  }
  for (const plan of plans) {
    const name = plan.name.trim() || 'Untitled payment plan'
    if (!plan.name.trim()) return 'Each payment plan needs a name.'
    if (plan.milestones.length === 0) return `“${name}” needs at least one stage.`
    let total = 0
    for (const stage of plan.milestones) {
      if (!stage.label.trim()) return `“${name}” has a stage without a label.`
      const percent = Number(stage.percent)
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return `“${name}” has a stage outside 1–100%.`
      }
      total += percent
    }
    if (Math.abs(total - 100) >= 0.05) {
      const shown = Math.round(total * 100) / 100
      return `“${name}” stages must add up to 100% (currently ${shown}%).`
    }
  }
  return null
}

export function FloorPlanEditor({
  plans,
  onChange,
}: {
  plans: FloorPlanDraft[]
  onChange: (plans: FloorPlanDraft[]) => void
}) {
  function update(id: string, patch: Partial<FloorPlanDraft>) {
    onChange(plans.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)))
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-2xl border border-ink/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Floor plans</p>
        <button
          type="button"
          onClick={() => onChange([...plans, emptyFloorPlan()])}
          className="inline-flex items-center gap-1 text-xs font-medium text-terracotta"
        >
          <Plus className="size-3.5" aria-hidden />
          Add plan
        </button>
      </div>
      {plans.length === 0 ? (
        <p className="text-xs text-ink/50">No floor plans yet. A published plan needs a layout, a render, alt text, beds, and area.</p>
      ) : null}
      {plans.map((plan, index) => (
        <div key={plan.id} className="space-y-2 rounded-2xl border border-ink/10 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink/60">Plan {index + 1}</p>
            <button
              type="button"
              aria-label="Remove floor plan"
              onClick={() => onChange(plans.filter((item) => item.id !== plan.id))}
              className="rounded-full p-1.5 text-red-600/80 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <label className="block text-xs font-medium text-ink/70">
            Name
            <input value={plan.name} onChange={(e) => update(plan.id, { name: e.target.value })} className={fieldClass()} />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs font-medium text-ink/70">
              Beds
              <input value={plan.bedrooms} onChange={(e) => update(plan.id, { bedrooms: e.target.value })} className={fieldClass()} />
            </label>
            <label className="text-xs font-medium text-ink/70">
              Baths
              <input value={plan.bathrooms} onChange={(e) => update(plan.id, { bathrooms: e.target.value })} className={fieldClass()} />
            </label>
            <label className="text-xs font-medium text-ink/70">
              Area (sq ft)
              <input value={plan.areaSqft} onChange={(e) => update(plan.id, { areaSqft: e.target.value })} className={fieldClass()} />
            </label>
            <label className="text-xs font-medium text-ink/70">
              From price (AED)
              <input
                value={plan.startingPriceAed}
                onChange={(e) => update(plan.id, { startingPriceAed: e.target.value })}
                className={fieldClass()}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-ink/70">
            Image alt text
            <input value={plan.altText} onChange={(e) => update(plan.id, { altText: e.target.value })} className={fieldClass()} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ImageUploadField
              compact
              label="Layout"
              folder="projects/floor-plans"
              value={plan.layoutImageUrl}
              onChange={(url) => update(plan.id, { layoutImageUrl: url })}
            />
            <ImageUploadField
              compact
              label="Render"
              folder="projects/floor-plans"
              value={plan.renderImageUrl}
              onChange={(url) => update(plan.id, { renderImageUrl: url })}
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-ink/70">
            <input
              type="checkbox"
              checked={plan.published}
              onChange={(e) => update(plan.id, { published: e.target.checked })}
              className="size-4 rounded border-ink/20"
            />
            Published on the launch page
          </label>
        </div>
      ))}
    </div>
  )
}

export function PaymentPlanEditor({
  plans,
  onChange,
}: {
  plans: PaymentPlanDraft[]
  onChange: (plans: PaymentPlanDraft[]) => void
}) {
  function update(id: string, patch: Partial<PaymentPlanDraft>) {
    onChange(
      plans.map((plan) => {
        if (patch.isDefault && plan.id !== id) return { ...plan, isDefault: false }
        return plan.id === id ? { ...plan, ...patch } : plan
      }),
    )
  }

  function updateStage(planId: string, stageId: string, patch: Partial<MilestoneDraft>) {
    onChange(
      plans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              milestones: plan.milestones.map((stage) =>
                stage.id === stageId ? { ...stage, ...patch } : stage,
              ),
            }
          : plan,
      ),
    )
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-2xl border border-ink/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Payment plans</p>
        <button
          type="button"
          onClick={() => onChange([...plans, emptyPaymentPlan(plans.length === 0)])}
          className="inline-flex items-center gap-1 text-xs font-medium text-terracotta"
        >
          <Plus className="size-3.5" aria-hidden />
          Add plan
        </button>
      </div>
      <p className="text-xs text-ink/50">Stages must add up to 100%. The 4% DLD fee stays outside the stages.</p>
      {plans.map((plan) => (
        <div key={plan.id} className="space-y-2 rounded-2xl border border-ink/10 p-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium text-ink/70">
              <input
                type="radio"
                name="default-payment-plan"
                checked={plan.isDefault}
                onChange={() => update(plan.id, { isDefault: true })}
              />
              Default
            </label>
            <button
              type="button"
              aria-label="Remove payment plan"
              onClick={() => {
                const next = plans.filter((item) => item.id !== plan.id)
                if (next.length > 0 && !next.some((item) => item.isDefault)) next[0] = { ...next[0], isDefault: true }
                onChange(next)
              }}
              className="rounded-full p-1.5 text-red-600/80 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink/70">
              Plan name
              <input value={plan.name} onChange={(e) => update(plan.id, { name: e.target.value })} className={fieldClass()} />
            </label>
            <label className="text-xs font-medium text-ink/70">
              DLD fee
              <select
                value={plan.dldFeePayer}
                onChange={(e) => update(plan.id, { dldFeePayer: e.target.value as DldFeePayer })}
                className={fieldClass()}
              >
                {PAYERS.map((payer) => (
                  <option key={payer.value} value={payer.value}>
                    {payer.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {plan.milestones.map((stage) => (
            <div key={stage.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6rem_10rem_auto]">
              <input
                value={stage.label}
                aria-label="Stage label"
                onChange={(e) => updateStage(plan.id, stage.id, { label: e.target.value })}
                className={fieldClass()}
              />
              <input
                value={stage.percent}
                aria-label="Stage percent"
                onChange={(e) => updateStage(plan.id, stage.id, { percent: e.target.value })}
                className={fieldClass()}
              />
              <select
                value={stage.phase}
                aria-label="Stage timing"
                onChange={(e) => updateStage(plan.id, stage.id, { phase: e.target.value as MilestonePhase })}
                className={fieldClass()}
              >
                {PHASES.map((phase) => (
                  <option key={phase.value} value={phase.value}>
                    {phase.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Remove stage"
                onClick={() =>
                  update(plan.id, {
                    milestones: plan.milestones.filter((item) => item.id !== stage.id),
                  })
                }
                className="self-end rounded-full p-2 text-red-600/80 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update(plan.id, {
                milestones: [
                  ...plan.milestones,
                  { id: crypto.randomUUID(), label: '', percent: '', phase: 'construction' },
                ],
              })
            }
            className="text-xs font-medium text-terracotta"
          >
            Add stage
          </button>
        </div>
      ))}
    </div>
  )
}

export function FaqEditor({
  faqs,
  onChange,
}: {
  faqs: FaqDraft[]
  onChange: (faqs: FaqDraft[]) => void
}) {
  return (
    <div className="sm:col-span-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink/70">Questions</p>
        <button
          type="button"
          onClick={() => onChange([...faqs, { id: crypto.randomUUID(), question: '', answer: '' }])}
          className="text-xs font-medium text-terracotta"
        >
          Add question
        </button>
      </div>
      {faqs.map((faq) => (
        <div key={faq.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={faq.question}
            placeholder="Question"
            onChange={(e) =>
              onChange(faqs.map((item) => (item.id === faq.id ? { ...item, question: e.target.value } : item)))
            }
            className={fieldClass()}
          />
          <input
            value={faq.answer}
            placeholder="Answer"
            onChange={(e) =>
              onChange(faqs.map((item) => (item.id === faq.id ? { ...item, answer: e.target.value } : item)))
            }
            className={fieldClass()}
          />
          <button
            type="button"
            aria-label="Remove question"
            onClick={() => onChange(faqs.filter((item) => item.id !== faq.id))}
            className="self-end rounded-full p-2 text-red-600/80 hover:bg-red-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
