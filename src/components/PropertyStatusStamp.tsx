import type { AvailabilityStatus } from '@/lib/propertyAvailability'

const STAMP: Partial<Record<AvailabilityStatus, { label: string; sr: string }>> = {
  sold: { label: 'Sold', sr: 'Sold' },
  rented: { label: 'Rented', sr: 'Rented' },
  under_offer: { label: 'Reserved', sr: 'Under offer' },
}

export function PropertyStatusStamp({ status }: { status?: AvailabilityStatus | null }) {
  const stamp = status ? STAMP[status] : undefined
  if (!stamp) return null
  return (
    <span
      className="pointer-events-none absolute left-3 top-3 z-[3] border border-cream/80 bg-terracotta/92 px-2.5 py-1 font-compact text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cream shadow-sm sm:text-xs"
      aria-label={stamp.sr}
    >
      {stamp.label}
    </span>
  )
}
