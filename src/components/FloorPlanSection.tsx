import clsx from 'clsx'
import { useState } from 'react'
import { buttonClassNames } from '@/components/Button'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import type { PublicFloorPlan } from '@/lib/cms/mapOffplanProject'
import { formatAreaFromM2, sqFtToSquareMetres } from '@/lib/formatArea'
import { formatPriceFromAed } from '@/lib/formatCurrency'

type Props = {
  plans: PublicFloorPlan[]
  selectedId: string | null
  onSelect: (plan: PublicFloorPlan) => void
  onEnquire: (plan: PublicFloorPlan) => void
}

export function FloorPlanSection({ plans, selectedId, onSelect, onEnquire }: Props) {
  const { t, currency, rates, intlLocale, areaUnit } = useLocalePreferences()
  const bedroomCounts = [...new Set(plans.map((plan) => plan.bedrooms))].sort((a, b) => a - b)
  const [filter, setFilter] = useState<number | null>(null)
  const visible =
    filter == null ? plans : plans.filter((plan) => plan.bedrooms === filter)

  if (plans.length === 0) return null

  return (
    <section aria-label={t('offplan.detail.floorPlansAria')} className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-ink">{t('offplan.detail.floorPlans')}</h2>
      {bedroomCounts.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            active={filter == null}
            label={t('offplan.detail.allBeds')}
            onClick={() => setFilter(null)}
          />
          {bedroomCounts.map((count) => (
            <FilterChip
              key={count}
              active={filter === count}
              label={bedroomLabel(count, t)}
              onClick={() => setFilter(count)}
            />
          ))}
        </div>
      ) : null}
      <div className="mt-6 grid grid-cols-1 gap-6">
        {visible.map((plan) => {
          const selected = plan.id === selectedId
          const price =
            plan.startingPriceAed != null && plan.startingPriceAed > 0
              ? formatPriceFromAed(plan.startingPriceAed, currency, rates, intlLocale)
              : null
          return (
            <article
              key={plan.id}
              className={clsx(
                'rounded-2xl border bg-white p-4 shadow-sm sm:p-5',
                selected ? 'border-terracotta' : 'border-ink/10',
              )}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <figure>
                  <img
                    src={plan.layoutImageUrl}
                    alt={plan.altText}
                    className="aspect-[4/3] w-full rounded-xl object-cover"
                  />
                  <figcaption className="mt-1.5 text-xs font-medium uppercase tracking-wider text-ink/50">
                    {t('offplan.detail.layout')}
                  </figcaption>
                </figure>
                <figure>
                  <img
                    src={plan.renderImageUrl}
                    alt={plan.altText}
                    className="aspect-[4/3] w-full rounded-xl object-cover"
                  />
                  <figcaption className="mt-1.5 text-xs font-medium uppercase tracking-wider text-ink/50">
                    {t('offplan.detail.render')}
                  </figcaption>
                </figure>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">{plan.name}</h3>
              <p className="mt-1 text-sm text-ink/75">
                {bedroomLabel(plan.bedrooms, t)}
                {plan.bathrooms != null
                  ? ` · ${plan.bathrooms === 1 ? t('offplan.detail.bath', { count: String(plan.bathrooms) }) : t('offplan.detail.baths', { count: String(plan.bathrooms) })}`
                  : ''}
                {' · '}
                {formatAreaFromM2(sqFtToSquareMetres(plan.areaSqft), areaUnit, intlLocale)}
                {price ? ` · ${t('offplan.detail.fromPrice', { price })}` : ''}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(plan)}
                  className={buttonClassNames(selected ? 'primary' : 'outlineTerracotta')}
                >
                  {selected ? t('offplan.detail.planSelected') : t('offplan.detail.selectPlan')}
                </button>
                <button
                  type="button"
                  onClick={() => onEnquire(plan)}
                  className={buttonClassNames('primary')}
                >
                  {t('offplan.detail.enquirePlan')}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function bedroomLabel(count: number, t: (key: string, vars?: Record<string, string>) => string) {
  if (count <= 0) return t('offplan.detail.studio')
  if (count === 1) return t('offplan.detail.bed', { count: '1' })
  return t('offplan.detail.beds', { count: String(count) })
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1.5 text-sm font-medium',
        active
          ? 'border-terracotta bg-terracotta text-cream'
          : 'border-ink/15 bg-white text-ink/80 hover:border-terracotta/40',
      )}
    >
      {label}
    </button>
  )
}
