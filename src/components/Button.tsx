import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant =
  | 'primary'
  | 'ghost'
  | 'outline'
  | 'outlineTerracotta'
  | 'creamOnTerracotta'
  | 'whiteSolid'
  | 'inkSolid'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
  className?: string
}

export const buttonBaseClass =
  'type-button font-display inline-flex items-center justify-center rounded-xl px-6 py-2.5 font-medium tracking-wide transition-[color,background-color,border-color,transform,box-shadow,filter] duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50'

const base = buttonBaseClass

const variants: Record<Variant, string> = {
  primary:
    'border border-transparent bg-terracotta text-cream hover:bg-ink hover:text-cream focus-visible:outline-terracotta',
  ghost:
    'border border-transparent bg-transparent text-cream underline-offset-4 hover:bg-cream/15 hover:text-cream hover:underline focus-visible:outline-cream',
  outline:
    'border border-cream/80 bg-transparent text-cream hover:border-cream hover:bg-cream hover:text-ink focus-visible:outline-cream',
  outlineTerracotta:
    'border border-terracotta bg-transparent text-terracotta hover:border-terracotta hover:bg-terracotta hover:text-cream focus-visible:outline-terracotta',
  creamOnTerracotta:
    'border border-transparent bg-cream text-terracotta hover:bg-ink hover:text-cream focus-visible:outline-cream',
  whiteSolid:
    'border border-transparent bg-white text-terracotta hover:bg-ink hover:text-cream focus-visible:outline-white',
  inkSolid:
    'border border-transparent bg-ink text-cream hover:bg-terracotta hover:text-cream focus-visible:outline-ink',
}

export function buttonClassNames(
  variant: Variant = 'primary',
  className = '',
) {
  return `${base} ${variants[variant]} ${className}`.trim()
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: Props) {
  const isCoolCta = className.split(' ').includes('btn-cool-cta')
  const coolCtaVariantClass = isCoolCta ? `btn-cool-cta--${variant}` : ''

  return (
    <button
      type={type}
      className={buttonClassNames(
        variant,
        [className, coolCtaVariantClass].filter(Boolean).join(' '),
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
