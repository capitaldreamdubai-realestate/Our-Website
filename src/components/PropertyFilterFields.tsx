import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { useCms } from '../contexts/CmsContext'
import type { FilterParams } from '../lib/propertyFilters'
import {
  buildBathFilterOptions,
  buildBedFilterOptions,
  buildEmirateOptionsLocalized,
  buildExclusiveFilterOptions,
  buildNeighbourhoodOptionsLocalized,
  buildPriceFilterOptions,
  buildSortFilterOptions,
} from '../lib/buildLocalizedFilterOptions'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { Button } from './Button'
import { FilterTerracottaDropdown } from './FilterTerracottaDropdown'

type Props = {
  value: FilterParams
  onChange: (patch: Partial<FilterParams>) => void
  onClear: () => void
  /** Dock: show “More filters” as navigation. Hidden on full listing page. */
  showMoreFilters?: boolean
  onMoreFilters?: () => void
  showSort?: boolean
  /** Stack search above row (page) vs compact (dock). */
  layout?: 'page' | 'dock'
  /** Hide text-style clear control (e.g. when page shows a corner clear button). */
  hideClearButton?: boolean
  /** When false, Clear / More links are omitted (parent renders them, e.g. dock footer row). */
  showFilterActionLinks?: boolean
}

export function PropertyFilterFields({
  value,
  onChange,
  onClear,
  showMoreFilters,
  onMoreFilters,
  showSort = true,
  layout = 'page',
  hideClearButton = false,
  showFilterActionLinks = true,
}: Props) {
  const { language, currency, rates, t } = useLocalePreferences()
  const { catalogProperties, heroNeighbourhoods, uaeEmirateNames } = useCms()

  const featuredNeighbourhoodLabels = useMemo(
    () => heroNeighbourhoods.map((h) => h.label),
    [heroNeighbourhoods],
  )

  const priceOptions = useMemo(
    () => buildPriceFilterOptions(language, currency, rates),
    [language, currency, rates],
  )
  const bedOptions = useMemo(
    () => buildBedFilterOptions(language),
    [language],
  )
  const bathOptions = useMemo(
    () => buildBathFilterOptions(language),
    [language],
  )
  const exclusiveOptions = useMemo(
    () => buildExclusiveFilterOptions(language),
    [language],
  )
  const neighbourhoodOptions = useMemo(
    () =>
      buildNeighbourhoodOptionsLocalized(
        language,
        catalogProperties,
        featuredNeighbourhoodLabels,
      ),
    [language, catalogProperties, featuredNeighbourhoodLabels],
  )
  const emirateOptions = useMemo(
    () =>
      buildEmirateOptionsLocalized(
        language,
        catalogProperties,
        uaeEmirateNames,
      ),
    [language, catalogProperties, uaeEmirateNames],
  )
  const sortOptions = useMemo(
    () => buildSortFilterOptions(language),
    [language],
  )

  const filtersGrid = (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <FilterTerracottaDropdown
        id="filter-price"
        label={t('filter.label.price')}
        options={priceOptions}
        value={value.price}
        onChange={(price) => onChange({ price })}
      />
      <FilterTerracottaDropdown
        id="filter-beds"
        label={t('filter.label.beds')}
        options={bedOptions}
        value={value.beds}
        onChange={(beds) => onChange({ beds })}
      />
      <FilterTerracottaDropdown
        id="filter-baths"
        label={t('filter.label.baths')}
        options={bathOptions}
        value={value.baths}
        onChange={(baths) => onChange({ baths })}
      />
      <FilterTerracottaDropdown
        id="filter-exclusive"
        label={t('filter.label.exclusive')}
        options={exclusiveOptions}
        value={value.exclusive}
        onChange={(exclusive) => onChange({ exclusive })}
      />
      <FilterTerracottaDropdown
        id="filter-neighbourhood"
        label={t('filter.label.neighbourhood')}
        options={neighbourhoodOptions}
        value={value.neighbourhood}
        onChange={(neighbourhood) => onChange({ neighbourhood })}
      />
      <FilterTerracottaDropdown
        id="filter-emirate"
        label={t('filter.label.emirate')}
        options={emirateOptions}
        value={value.emirate}
        onChange={(emirate) => onChange({ emirate })}
      />
      {showSort ? (
        <FilterTerracottaDropdown
          id="filter-sort"
          label={t('filter.label.sort')}
          options={sortOptions}
          value={value.sort}
          onChange={(sort) => onChange({ sort })}
        />
      ) : null}
    </div>
  )

  const showActionsRow =
    showFilterActionLinks && (!hideClearButton || showMoreFilters)
  const actions = showActionsRow ? (
    <div className="flex flex-row flex-wrap items-center justify-start gap-x-4 gap-y-2">
      {!hideClearButton ? (
        <button
          type="button"
          className="btn-filter-action btn-filter-clear type-button text-left text-sm font-medium text-ink/55"
          onClick={onClear}
        >
          {t('filter.clear')}
        </button>
      ) : null}
      {showMoreFilters ? (
        <button
          type="button"
          className="btn-filter-action btn-filter-more type-button text-left text-sm font-medium text-terracotta"
          onClick={onMoreFilters}
        >
          {t('filter.more')}
        </button>
      ) : null}
    </div>
  ) : null

  return (
    <div
      className={
        layout === 'page'
          ? 'w-full space-y-5 border-y border-ink/10 py-6'
          : 'w-full space-y-5'
      }
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-0 top-1/2 size-4 -translate-y-1/2 text-ink/40"
          strokeWidth={2}
          aria-hidden
        />
        <label className="sr-only" htmlFor="filter-q">
          {t('filter.searchLabel')}
        </label>
        <input
          id="filter-q"
          type="search"
          autoComplete="off"
          placeholder={t('filter.searchPlaceholder')}
          className="type-button w-full border-0 border-b border-ink/30 bg-transparent py-2.5 ps-9 pe-1 text-ink placeholder:text-ink/40 outline-none transition focus-visible:border-terracotta"
          value={value.q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
      </div>
      {filtersGrid}
      {actions}
    </div>
  )
}

export function FilterSearchSubmit({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="primary"
      className={`w-full sm:w-auto ${className ?? ''}`.trim()}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
