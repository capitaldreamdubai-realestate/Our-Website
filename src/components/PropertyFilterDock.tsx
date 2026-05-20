import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  createSearchParams,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import {
  defaultFilterParams,
  filterParamsFromSearchParams,
  filterParamsToSearchParams,
  type FilterParams,
} from '../lib/propertyFilters'
import { useLocalePreferences } from '../contexts/LocalePreferencesContext'
import { usePropertyFilterDock } from '../contexts/PropertyFilterDockContext'
import { FilterSearchSubmit, PropertyFilterFields } from './PropertyFilterFields'

/** Routes that support the same URL query filters as `/all-properties`. */
const PROPERTY_LISTING_PATHS = [
  '/all-properties',
  '/for-sale',
  '/for-rent',
  '/offplan',
  '/deals',
] as const

function mergeToUrl(f: FilterParams) {
  return createSearchParams(filterParamsToSearchParams(f)).toString()
}

function isDeveloperListingPath(pathname: string): boolean {
  return pathname.startsWith('/developers/') && pathname.length > '/developers/'.length
}

function propertyListingPath(pathname: string): string {
  if (isDeveloperListingPath(pathname)) return pathname
  return (PROPERTY_LISTING_PATHS as readonly string[]).includes(pathname)
    ? pathname
    : '/all-properties'
}

function onPropertyListingPage(pathname: string): boolean {
  if ((PROPERTY_LISTING_PATHS as readonly string[]).includes(pathname)) return true
  return isDeveloperListingPath(pathname)
}

export function PropertyFilterDock() {
  const { t } = useLocalePreferences()
  const { open, closeDock } = usePropertyFilterDock()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sp, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState<FilterParams>(defaultFilterParams)

  useEffect(() => {
    if (!open) return
    setDraft(filterParamsFromSearchParams(sp))
  }, [open, sp])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDock()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeDock])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const applyFiltersToListing = useCallback(
    (f: FilterParams) => {
      const next = filterParamsToSearchParams(f)
      const target = propertyListingPath(pathname)
      if (pathname === target) {
        setSearchParams(next, { replace: true })
      } else {
        const q = mergeToUrl(f)
        navigate(q ? `${target}?${q}` : target)
      }
      closeDock()
    },
    [pathname, navigate, closeDock, setSearchParams],
  )

  const onListingPage = onPropertyListingPage(pathname)

  const onChange = useCallback((patch: Partial<FilterParams>) => {
    setDraft((d) => ({ ...d, ...patch }))
  }, [])

  const onClear = useCallback(() => {
    setDraft(defaultFilterParams)
  }, [])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[110] bg-ink/40 backdrop-blur-[2px]"
        aria-label={t('dock.closeSearchAria')}
        onClick={closeDock}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[120] max-h-[min(92vh,720px)] overflow-y-auto rounded-t-[1.5rem] border-t border-ink/10 bg-cream shadow-[0_-12px_40px_rgba(28,20,18,0.12)] motion-safe:animate-[adminSheetUp_0.32s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-filter-dock-title"
      >
        <div className="flex w-full flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5 lg:px-10">
          <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-3">
            <div className="min-w-0">
              <h2
                id="property-filter-dock-title"
                className="type-section-title font-display text-lg font-semibold text-ink sm:text-xl"
              >
                {t('dock.title')}
              </h2>
              <p className="mt-1 hidden text-sm text-ink/55 sm:block">
                {onListingPage
                  ? t('dock.subtitleListing')
                  : t('dock.subtitleBrowse')}
              </p>
            </div>
            <button
              type="button"
              className="btn-icon-terracotta inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta text-cream shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              aria-label={t('dock.closeIconAria')}
              onClick={closeDock}
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <PropertyFilterFields
            layout="dock"
            value={draft}
            onChange={onChange}
            onClear={onClear}
            showMoreFilters={!onListingPage}
            onMoreFilters={() => applyFiltersToListing(draft)}
            showSort
            showFilterActionLinks={false}
          />

          <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-4 sm:gap-4">
            <div className="min-w-0 flex flex-row items-center justify-start gap-x-4 gap-y-2">
              <button
                type="button"
                className="btn-filter-action btn-filter-clear type-button text-left text-sm font-medium text-ink/55"
                onClick={onClear}
              >
                {t('filter.clear')}
              </button>
              {!onListingPage ? (
                <button
                  type="button"
                  className="btn-filter-action btn-filter-more type-button text-left text-sm font-medium text-terracotta"
                  onClick={() => applyFiltersToListing(draft)}
                >
                  {t('filter.more')}
                </button>
              ) : null}
            </div>
            <div className="shrink-0">
              <FilterSearchSubmit
                label={t('dock.viewResults')}
                onClick={() => applyFiltersToListing(draft)}
                className="w-auto min-w-[8.5rem]"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
