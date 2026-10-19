import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function AdminEditorSheet({ open, title, onClose, children, footer, wide }: Props) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <SheetContent
        side="right"
        className={
          wide
            ? 'admin-portal w-full bg-[var(--admin-surface,#f8f3ef)] text-[var(--admin-ink,#1c1412)] data-[side=right]:w-full data-[side=right]:sm:!max-w-5xl sm:max-w-5xl'
            : 'admin-portal w-full bg-[var(--admin-surface,#f8f3ef)] text-[var(--admin-ink,#1c1412)] data-[side=right]:w-full data-[side=right]:sm:!max-w-xl sm:max-w-xl'
        }
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
        {footer ? <SheetFooter className="flex-row flex-wrap justify-end">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  )
}
