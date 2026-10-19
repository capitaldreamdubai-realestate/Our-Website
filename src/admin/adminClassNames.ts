/** Primary CTA — uses CSS variables set on `.admin-portal` (Integrations + defaults). */
export const adminBtnPrimary =
  'rounded-2xl bg-[var(--admin-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--admin-primary)]/25 transition hover:brightness-90 disabled:opacity-50'

export const adminBtnPrimarySm =
  'rounded-2xl bg-[var(--admin-primary)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-90 disabled:opacity-50'

export const adminBtnGhost =
  'rounded-2xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-[var(--admin-accent-soft)]'

export const adminStepActive =
  'bg-[var(--admin-primary,#a67d32)] text-white shadow-sm shadow-[var(--admin-primary,#a67d32)]/20'

export const adminStepInactive = 'bg-ink/5 text-ink/60 hover:bg-ink/10'

export const adminNavActive =
  'bg-[var(--admin-primary)] text-white shadow-md shadow-[var(--admin-primary)]/25'

export const adminNavInactive = 'text-ink/75 hover:bg-[var(--admin-accent-soft)]'

/**
 * Native `<select>`: opening the control uses the **system** menu (OS / browser).
 * The closed field is framed like other admin inputs (rounded-2xl, ink border).
 */
export const adminNativeSelect =
  'admin-native-select min-h-9 w-full max-w-full cursor-pointer appearance-auto rounded-2xl border border-ink/15 bg-white px-3 py-2 text-xs text-ink [color-scheme:light] md:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-primary)] disabled:cursor-not-allowed disabled:opacity-50'

export const adminModalCloseBtn =
  'flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-primary)] text-white shadow-md transition hover:bg-[var(--admin-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-primary)]'
