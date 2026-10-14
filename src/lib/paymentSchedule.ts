import type { DldFeePayer, PublicPaymentMilestone } from '@/lib/cms/mapOffplanProject'

export type ScheduleRow = PublicPaymentMilestone & {
  amountAed: number
  runningAed: number
}

/** Buyer's share of the 4% DLD fee. Null means the illustration leaves the fee out. */
export function buyerDldRate(payer: DldFeePayer): number | null {
  if (payer === 'buyer') return 0.04
  if (payer === 'shared') return 0.02
  if (payer === 'developer') return 0
  return null
}

export function dldAmountAed(priceAed: number, payer: DldFeePayer): number | null {
  const rate = buyerDldRate(payer)
  if (rate == null) return null
  return Math.round(priceAed * rate)
}

/** Instalments in AED. When the stages total 100%, the last stage absorbs rounding. */
export function buildPaymentSchedule(
  priceAed: number,
  milestones: PublicPaymentMilestone[],
): ScheduleRow[] {
  const ordered = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder)
  const price = Math.max(0, Math.round(priceAed))
  const totalPercent = ordered.reduce((sum, item) => sum + item.percent, 0)
  const exact = Math.abs(totalPercent - 100) < 0.05
  let allocated = 0
  return ordered.map((item, index) => {
    const raw = Math.round((price * item.percent) / 100)
    const amountAed =
      exact && index === ordered.length - 1 ? Math.max(0, price - allocated) : raw
    allocated += amountAed
    return { ...item, amountAed, runningAed: allocated }
  })
}
