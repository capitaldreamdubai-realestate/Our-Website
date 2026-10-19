import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import {
  INVESTED_BEFORE,
  INVESTMENT_BUDGETS,
  INVEST_TIMELINES,
  type QualificationAnswers,
} from '@/lib/leadQualification'
import { cn } from '@/lib/utils'

type Props = {
  idPrefix: string
  answers: QualificationAnswers
  onChange: (next: QualificationAnswers) => void
  attempted: boolean
  labelClass: string
  fieldClass: string
  errorClass: string
  stackClass?: string
}

type MenuBox = { top: number; left: number; width: number; maxHeight: number }

export function LeadQualificationFields({
  idPrefix,
  answers,
  onChange,
  attempted,
  labelClass,
  fieldClass,
  errorClass,
  stackClass = 'flex flex-col gap-4',
}: Props) {
  const { t } = useLocalePreferences()

  return (
    <div className={stackClass}>
      <SelectField
        id={`${idPrefix}-budget`}
        label={t('qualify.budget')}
        value={answers.budget}
        placeholder={t('qualify.budgetPlaceholder')}
        options={INVESTMENT_BUDGETS.map((option) => ({
          value: option.value,
          label: t(`qualify.budget.${option.value}`),
        }))}
        error={attempted && !answers.budget ? t('qualify.budgetRequired') : null}
        onChange={(budget) => onChange({ ...answers, budget })}
        labelClass={labelClass}
        fieldClass={fieldClass}
        errorClass={errorClass}
      />
      <SelectField
        id={`${idPrefix}-timeline`}
        label={t('qualify.timeline')}
        value={answers.timeline}
        placeholder={t('qualify.timelinePlaceholder')}
        options={INVEST_TIMELINES.map((option) => ({
          value: option.value,
          label: t(`qualify.timeline.${option.value}`),
        }))}
        error={attempted && !answers.timeline ? t('qualify.timelineRequired') : null}
        onChange={(timeline) => onChange({ ...answers, timeline })}
        labelClass={labelClass}
        fieldClass={fieldClass}
        errorClass={errorClass}
      />
      <SelectField
        id={`${idPrefix}-invested`}
        label={t('qualify.invested')}
        value={answers.investedBefore}
        placeholder={t('qualify.investedPlaceholder')}
        options={INVESTED_BEFORE.map((option) => ({
          value: option.value,
          label: t(`qualify.invested.${option.value}`),
        }))}
        error={attempted && !answers.investedBefore ? t('qualify.investedRequired') : null}
        onChange={(investedBefore) => onChange({ ...answers, investedBefore })}
        labelClass={labelClass}
        fieldClass={fieldClass}
        errorClass={errorClass}
      />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  placeholder,
  options,
  error,
  onChange,
  labelClass,
  fieldClass,
  errorClass,
}: {
  id: string
  label: string
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  error: string | null
  onChange: (value: string) => void
  labelClass: string
  fieldClass: string
  errorClass: string
}) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null)
  const selected = options.find((option) => option.value === value) ?? null

  function placeMenu() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12
    const spaceAbove = rect.top - gap - 12
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.max(140, Math.min(280, openUp ? spaceAbove : spaceBelow))
    setMenuBox({
      top: openUp ? Math.max(8, rect.top - gap - maxHeight) : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuBox(null)
      return
    }
    placeMenu()
    window.addEventListener('scroll', placeMenu, true)
    window.addEventListener('resize', placeMenu)
    return () => {
      window.removeEventListener('scroll', placeMenu, true)
      window.removeEventListener('resize', placeMenu)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const menu =
    open && menuBox ? (
      <ul
        ref={menuRef}
        id={listId}
        role="listbox"
        aria-labelledby={`${id}-label`}
        className="overflow-y-auto rounded-xl border border-[#6B3B34]/20 bg-white py-1 shadow-[0_16px_40px_rgba(28,20,18,0.16)]"
        style={{
          position: 'fixed',
          top: menuBox.top,
          left: menuBox.left,
          width: menuBox.width,
          maxHeight: menuBox.maxHeight,
          zIndex: 280,
        }}
      >
        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-terracotta font-medium text-cream'
                    : 'text-ink hover:bg-terracotta/10',
                )}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
              >
                {option.label}
              </button>
            </li>
          )
        })}
      </ul>
    ) : null

  return (
    <div className="flex flex-col gap-1.5">
      <label id={`${id}-label`} htmlFor={id} className={labelClass}>
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          fieldClass,
          'flex cursor-pointer items-center justify-between gap-3 text-left',
          !selected && 'text-ink/40',
          error && 'ring-2 ring-red-600/25',
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-terracotta/70 transition-transform', open && 'rotate-180')}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {menu && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
      {error ? (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
