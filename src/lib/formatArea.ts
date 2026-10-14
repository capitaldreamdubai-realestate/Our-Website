/** Canonical storage is m² (`interior_m2` / `plot_m2`). */
export type AreaDisplayMode = 'm2' | 'sqm' | 'sqft'

const M2_TO_SQFT = 10.76391041670972

export function squareMetresToSqFt(m2: number): number {
  return m2 * M2_TO_SQFT
}

export function sqFtToSquareMetres(sqft: number): number {
  return sqft / M2_TO_SQFT
}

export function formatAreaFromM2(
  m2: number,
  mode: AreaDisplayMode,
  locale: string,
): string {
  if (mode === 'sqft') {
    const v = squareMetresToSqFt(m2)
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v)} sq ft`
  }
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(m2)
  if (mode === 'sqm') return `${n} sq m`
  return `${n} m²`
}
