export const AVAILABILITY_STATUSES = [
  'available',
  'under_offer',
  'sold',
  'rented',
  'withdrawn',
] as const

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]

export function isAvailabilityStatus(value: string | null | undefined): value is AvailabilityStatus {
  return AVAILABILITY_STATUSES.includes(value as AvailabilityStatus)
}

export function availabilityStatusOf(property: {
  availabilityStatus?: AvailabilityStatus | null
}): AvailabilityStatus {
  return property.availabilityStatus ?? 'available'
}

export function isAvailableStatus(property: {
  availabilityStatus?: AvailabilityStatus | null
}): boolean {
  return availabilityStatusOf(property) === 'available'
}

export function isCompletedStatus(property: {
  availabilityStatus?: AvailabilityStatus | null
}): boolean {
  const status = availabilityStatusOf(property)
  return status === 'sold' || status === 'rented'
}

/** Price a visitor may see. Asking prices stay hidden after a completed transaction. */
export function publicPriceAed(property: {
  availabilityStatus?: AvailabilityStatus | null
  priceAed?: number
  achievedPriceAed?: number
  publishAchievedPrice?: boolean
}): number | undefined {
  if (isCompletedStatus(property)) {
    if (
      property.publishAchievedPrice &&
      typeof property.achievedPriceAed === 'number' &&
      property.achievedPriceAed > 0
    ) {
      return property.achievedPriceAed
    }
    return undefined
  }
  return property.priceAed
}
