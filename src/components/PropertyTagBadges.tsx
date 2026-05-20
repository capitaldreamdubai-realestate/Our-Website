import clsx from 'clsx'
import { normalizePropertyTags } from '@/lib/listingTags'

type Props = {
  tag?: string
  tags?: string[]
  className?: string
}

/** One or more listing tag pills (image overlay or inline). */
export function PropertyTagBadges({ tag, tags, className = '' }: Props) {
  const labels = normalizePropertyTags(tags, tag)
  if (labels.length === 0) return null

  return (
    <div className={`flex max-w-[85%] flex-wrap justify-end gap-1 ${className}`.trim()}>
      {labels.map((label) => (
        <span
          key={label}
          className={clsx(
            'type-badge rounded-md px-2.5 py-1 font-semibold uppercase tracking-widest text-white',
            label.toLowerCase() === 'deals' ? 'bg-red-600' : 'bg-badge-blue',
          )}
        >
          {label}
        </span>
      ))}
    </div>
  )
}
