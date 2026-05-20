import type { Property } from '../components/PropertyCard'
import { catalogProperties } from '../data/properties'
import { hasListingTag } from './listingTags'

export type FilterDropdownOption = {
  value: string
  label: string
}

export type FilterParams = {
  q: string
  price: string
  beds: string
  baths: string
  exclusive: string
  neighbourhood: string
  emirate: string
  sort: string
}

export const defaultFilterParams: FilterParams = {
  q: '',
  price: 'any',
  beds: 'any',
  baths: 'any',
  exclusive: 'any',
  neighbourhood: 'any',
  emirate: 'any',
  sort: 'popular',
}

export const FILTER_PRICE_OPTIONS: FilterDropdownOption[] = [
  { value: 'any', label: 'Any price' },
  { value: 'under15', label: 'Under AED 15M' },
  { value: '15to25', label: 'AED 15M – 25M' },
  { value: 'over25', label: 'Over AED 25M' },
]

export const FILTER_BED_OPTIONS: FilterDropdownOption[] = [
  { value: 'any', label: 'Any beds' },
  { value: 'studio', label: 'Studio' },
  { value: '1', label: '1 bed' },
  { value: '2', label: '2 beds' },
  { value: '3', label: '3 beds' },
  { value: '4', label: '4 beds' },
  { value: '5', label: '5 beds' },
  { value: '6', label: '6 beds' },
]

export const FILTER_BATH_OPTIONS: FilterDropdownOption[] = [
  { value: 'any', label: 'Any baths' },
  { value: '1', label: '1 bath' },
  { value: '2', label: '2 baths' },
  { value: '3', label: '3 baths' },
  { value: '4', label: '4 baths' },
  { value: '5', label: '5 baths' },
]

export const FILTER_EXCLUSIVE_OPTIONS: FilterDropdownOption[] = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Exclusive with us' },
  { value: 'no', label: 'Not exclusive' },
]

export const FILTER_SORT_OPTIONS: FilterDropdownOption[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'new', label: 'New' },
  { value: 'priceAsc', label: 'Low to high' },
  { value: 'priceDesc', label: 'High to low' },
]

function buildNeighbourhoodOptions(): FilterDropdownOption[] {
  return neighbourhoodOptionsFromCatalog(catalogProperties)
}

function buildEmirateOptions(): FilterDropdownOption[] {
  return emirateOptionsFromCatalog(catalogProperties)
}

/** Build neighbourhood filter options from listings plus featured neighbourhood labels (CMS). */
export function neighbourhoodOptionsFromCatalog(
  list: Property[],
  featuredLabels: string[] = [],
): FilterDropdownOption[] {
  const set = new Set<string>()
  for (const raw of featuredLabels) {
    const n = raw?.trim()
    if (n) set.add(n)
  }
  for (const p of list) {
    const n = p.neighbourhood?.trim()
    if (n) set.add(n)
  }
  return [
    { value: 'any', label: 'Any neighbourhood' },
    ...[...set].sort((a, b) => a.localeCompare(b)).map((n) => ({ value: n, label: n })),
  ]
}

/** Merge canonical emirates from DB with values present on listings. */
export function emirateOptionsFromCatalog(
  list: Property[],
  canonicalNames: string[] = [],
): FilterDropdownOption[] {
  const set = new Set<string>()
  for (const raw of canonicalNames) {
    const e = raw?.trim()
    if (e) set.add(e)
  }
  for (const p of list) {
    const e = p.emirate?.trim()
    if (e) set.add(e)
  }
  return [
    { value: 'any', label: 'Any emirate' },
    ...[...set].sort((a, b) => a.localeCompare(b)).map((e) => ({ value: e, label: e })),
  ]
}

export const FILTER_NEIGHBOURHOOD_OPTIONS = buildNeighbourhoodOptions()
export const FILTER_EMIRATE_OPTIONS = buildEmirateOptions()

export function filterParamsFromSearchParams(
  sp: URLSearchParams,
): FilterParams {
  return {
    q: sp.get('q') ?? '',
    price: sp.get('price') ?? 'any',
    beds: sp.get('beds') ?? 'any',
    baths: sp.get('baths') ?? 'any',
    exclusive: sp.get('exclusive') ?? 'any',
    neighbourhood: sp.get('neighbourhood') ?? 'any',
    emirate: sp.get('emirate') ?? 'any',
    sort: sp.get('sort') ?? 'popular',
  }
}

export function filterParamsToSearchParams(
  f: FilterParams,
): Record<string, string> {
  const o: Record<string, string> = {}
  if (f.q) o.q = f.q
  if (f.price !== 'any') o.price = f.price
  if (f.beds !== 'any') o.beds = f.beds
  if (f.baths !== 'any') o.baths = f.baths
  if (f.exclusive !== 'any') o.exclusive = f.exclusive
  if (f.neighbourhood !== 'any') o.neighbourhood = f.neighbourhood
  if (f.emirate !== 'any') o.emirate = f.emirate
  if (f.sort && f.sort !== 'popular') o.sort = f.sort
  return o
}

function priceBandOk(priceAed: number | undefined, band: string): boolean {
  if (band === 'any') return true
  if (priceAed == null || !Number.isFinite(priceAed)) return false
  const m = priceAed / 1_000_000
  if (band === 'under15') return m < 15
  if (band === '15to25') return m >= 15 && m <= 25
  if (band === 'over25') return m > 25
  return true
}

function exclusiveOk(p: Property, exclusive: string): boolean {
  if (exclusive === 'any') return true
  const isEx = Boolean(p.exclusiveWithUs)
  if (exclusive === 'yes') return isEx
  if (exclusive === 'no') return !isEx
  return true
}

function normFilterArea(s: string | undefined): string {
  return (s ?? '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function neighbourhoodOk(p: Property, neighbourhood: string): boolean {
  if (neighbourhood === 'any') return true
  return normFilterArea(p.neighbourhood) === normFilterArea(neighbourhood)
}

function emirateOk(p: Property, emirate: string): boolean {
  if (emirate === 'any') return true
  return normFilterArea(p.emirate) === normFilterArea(emirate)
}

export function filterProperties(
  list: Property[],
  f: FilterParams,
): Property[] {
  let out = list.filter((p) => {
    const hay = `${p.id} ${p.title} ${p.meta} ${p.location ?? ''} ${p.neighbourhood ?? ''} ${p.emirate ?? ''}`.toLowerCase()
    if (f.q.trim() && !hay.includes(f.q.trim().toLowerCase())) return false
    if (f.beds !== 'any') {
      if (f.beds === 'studio') {
        if ((p.beds ?? -1) !== 0) return false
      } else {
        const min = Number(f.beds)
        if (Number.isFinite(min) && (p.beds ?? 0) < min) return false
      }
    }
    if (f.baths !== 'any') {
      const min = Number(f.baths)
      if (Number.isFinite(min) && (p.baths ?? 0) < min) return false
    }
    if (!priceBandOk(p.priceAed, f.price)) return false
    if (!exclusiveOk(p, f.exclusive)) return false
    if (!neighbourhoodOk(p, f.neighbourhood)) return false
    if (!emirateOk(p, f.emirate)) return false
    return true
  })

  if (f.sort === 'priceAsc') {
    out = [...out].sort(
      (a, b) => (a.priceAed ?? 0) - (b.priceAed ?? 0),
    )
  } else if (f.sort === 'priceDesc') {
    out = [...out].sort(
      (a, b) => (b.priceAed ?? 0) - (a.priceAed ?? 0),
    )
  } else if (f.sort === 'new') {
    out = [...out].sort((a, b) => {
      const an = hasListingTag(a, 'Offplan') ? 1 : 0
      const bn = hasListingTag(b, 'Offplan') ? 1 : 0
      return bn - an
    })
  }
  return out
}
