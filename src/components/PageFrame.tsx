import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Page gutter: ~10px (0.625rem) inset from the viewport; sections stack with the same gap.
 */
export function PageFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-[0.625rem] p-[0.625rem]',
        className,
      )}
    >
      {children}
    </div>
  )
}
