import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function AdminConfirmDialog({ open, title, onClose, children, footer }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">{title}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-sm text-muted-foreground">{children}</div>
        {footer ? <AlertDialogFooter>{footer}</AlertDialogFooter> : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}
