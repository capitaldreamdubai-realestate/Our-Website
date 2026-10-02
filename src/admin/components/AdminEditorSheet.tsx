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
        className={wide ? 'w-full sm:max-w-3xl' : 'w-full sm:max-w-xl'}
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
