export const OFFPLAN_LAUNCH_STATUSES = ['new', 'existing', 'upcoming'] as const

export type OffplanLaunchStatus = (typeof OFFPLAN_LAUNCH_STATUSES)[number]

export const OFFPLAN_LAUNCH_STATUS_LABELS: Record<OffplanLaunchStatus, string> = {
  new: 'New Launches',
  existing: 'Existing Launches',
  upcoming: 'Upcoming Launches',
}

export function isOffplanLaunchStatus(v: string): v is OffplanLaunchStatus {
  return (OFFPLAN_LAUNCH_STATUSES as readonly string[]).includes(v)
}
