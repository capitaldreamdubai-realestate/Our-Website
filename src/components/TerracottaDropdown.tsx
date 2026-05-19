import { ChevronDown } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useAdminDropdownPortalHost } from '@/admin/AdminDropdownPortalContext'

export type TerracottaDropdownOption = {
  value: string
  label: string
}

type MenuBox = { top: number; left: number; width: number }

export type TerracottaDropdownVariant = 'site' | 'admin'

type Props = {
  id?: string
  /** Field name (always used for a11y; shown in trigger unless `showTriggerLabel` is false) */
  label: string
  options: TerracottaDropdownOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  /**
   * Render the listbox in a portal with `position: fixed` so it is not clipped
   * by overflow on ancestors (e.g. modals / sheets).
   */
  listPortal?: boolean
  /**
   * `site` — public filters (underline trigger, terracotta + cream).
   * `admin` — CMS: same **popover UX** as the site (rounded panel, brand accent) using `--admin-*` vars;
   * avoids the browser’s default `<select>` menu.
   */
  variant?: TerracottaDropdownVariant
  /**
   * When false (default for `variant="admin"`), the trigger shows only the current value + chevron;
   * put a visible `<label>` above in the form like other inputs.
   */
  showTriggerLabel?: boolean
}

const LISTBOX_SITE =
  'max-h-[min(18rem,50vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-terracotta bg-cream shadow-[0_12px_40px_rgba(28,20,18,0.12)]'

/** Fallback hexes match `admin-theme.css` when portaled outside `.admin-portal` (should be rare). */
const LISTBOX_ADMIN =
  'max-h-[min(18rem,50vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--admin-primary,#a67d32)] bg-[var(--admin-surface,#f8f3ef)] shadow-[0_12px_40px_rgba(28,20,18,0.14)]'

export function TerracottaDropdown({
  id: propId,
  label,
  options,
  value,
  onChange,
  className = '',
  disabled,
  listPortal = false,
  variant = 'site',
  showTriggerLabel: showTriggerLabelProp,
}: Props) {
  const isAdmin = variant === 'admin'
  const showTriggerLabel = showTriggerLabelProp ?? !isAdmin
  const adminPortalHost = useAdminDropdownPortalHost()

  const genId = useId()
  const baseId = propId ?? `terra-dd-${genId}`
  const labelId = `${baseId}-lbl`
  const listboxId = `${baseId}-list`
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null)

  const listboxClassName = isAdmin ? LISTBOX_ADMIN : LISTBOX_SITE

  const selected = options.find((o) => o.value === value) ?? options[0]
  const selectedLabel = selected?.label ?? '—'

  const updateMenuBox = useCallback(() => {
    const btn = triggerRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    setMenuBox({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open || !listPortal) {
      if (!open) setMenuBox(null)
      return
    }
    updateMenuBox()
    window.addEventListener('scroll', updateMenuBox, true)
    window.addEventListener('resize', updateMenuBox)
    return () => {
      window.removeEventListener('scroll', updateMenuBox, true)
      window.removeEventListener('resize', updateMenuBox)
    }
  }, [open, listPortal, updateMenuBox])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (containerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = useCallback(() => {
    if (!disabled) setOpen((o) => !o)
  }, [disabled])

  const pick = useCallback(
    (v: string) => {
      onChange(v)
      setOpen(false)
    },
    [onChange],
  )

  const optionBtnClass = (isSel: boolean) => {
    if (isAdmin) {
      return isSel
        ? 'bg-[var(--admin-primary,#a67d32)] font-semibold text-white'
        : 'text-ink hover:bg-[var(--admin-primary,#a67d32)]/12'
    }
    return isSel
      ? 'bg-terracotta font-semibold text-cream'
      : 'text-terracotta hover:bg-terracotta hover:text-cream'
  }

  const triggerClass = isAdmin
    ? 'type-button flex w-full min-w-0 items-center gap-2 rounded-2xl border border-[var(--admin-primary,#a67d32)]/40 bg-white px-3 py-2 text-left text-xs transition hover:border-[var(--admin-primary,#a67d32)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-primary,#a67d32)] disabled:opacity-50 md:text-sm'
    : 'type-button flex w-full min-w-0 items-center gap-2 border-b border-terracotta pb-2.5 text-left transition hover:border-terracotta/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:opacity-50'

  const labelTextClass = isAdmin
    ? 'shrink-0 font-semibold text-[var(--admin-primary,#a67d32)]'
    : 'shrink-0 font-semibold text-terracotta'

  const valueMutedClass = isAdmin
    ? 'truncate text-sm text-ink'
    : 'truncate text-sm text-terracotta/50'

  const chevronClass = isAdmin
    ? `size-4 shrink-0 text-[var(--admin-primary,#a67d32)] transition-transform ${open ? 'rotate-180' : ''}`
    : `size-4 shrink-0 text-terracotta transition-transform ${open ? 'rotate-180' : ''}`

  const listContent = (
    <ul
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-labelledby={labelId}
      className={
        listPortal
          ? listboxClassName
          : `absolute left-0 right-0 top-full z-[80] mt-1 ${listboxClassName}`
      }
      style={
        listPortal && menuBox
          ? {
              position: 'fixed',
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              zIndex: 270,
            }
          : undefined
      }
    >
      {options.map((opt) => {
        const isSel = opt.value === value
        return (
          <li key={`${opt.value}-${opt.label}`} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isSel}
              className={`type-button w-full px-4 py-3 text-left text-sm transition-[color,background-color] duration-300 ease-out ${optionBtnClass(isSel)}`}
              onClick={() => pick(opt.value)}
            >
              {opt.label}
            </button>
          </li>
        )
      })}
    </ul>
  )

  const listPortalTarget =
    listPortal && typeof document !== 'undefined'
      ? isAdmin && adminPortalHost
        ? adminPortalHost
        : document.body
      : null

  const showList = open && (!listPortal || menuBox != null)

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={!showTriggerLabel ? label : undefined}
        className={triggerClass}
        onClick={toggle}
      >
        {!showTriggerLabel ? (
          <>
            <span id={labelId} className="sr-only">
              {label}
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className={valueMutedClass}>{selectedLabel}</span>
              <ChevronDown className={chevronClass} strokeWidth={2} aria-hidden />
            </span>
          </>
        ) : (
          <>
            <span id={labelId} className={labelTextClass}>
              {label}
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className={valueMutedClass}>{selectedLabel}</span>
              <ChevronDown className={chevronClass} strokeWidth={2} aria-hidden />
            </span>
          </>
        )}
      </button>

      {showList && listPortal && listPortalTarget
        ? createPortal(listContent, listPortalTarget)
        : null}
      {showList && !listPortal ? listContent : null}
    </div>
  )
}
