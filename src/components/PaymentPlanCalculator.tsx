import { useState } from 'react'
import { useLocalePreferences } from '@/contexts/LocalePreferencesContext'
import type { DldFeePayer, PublicPaymentPlan } from '@/lib/cms/mapOffplanProject'
import { formatPriceFromAed } from '@/lib/formatCurrency'
import { buildPaymentSchedule, dldAmountAed } from '@/lib/paymentSchedule'

type Props = {
  plans: PublicPaymentPlan[]
  priceAed: number | null
  onPriceChange: (price: number | null) => void
}

export function PaymentPlanCalculator({ plans, priceAed, onPriceChange }: Props) {
  const { t, currency, rates, intlLocale } = useLocalePreferences()
  const [planId, setPlanId] = useState(plans.find((plan) => plan.isDefault)?.id ?? plans[0]?.id ?? '')
  const plan = plans.find((item) => item.id === planId) ?? plans[0]
  if (!plan) return null

  const price = priceAed != null && priceAed > 0 ? priceAed : 0
  const rows = price > 0 ? buildPaymentSchedule(price, plan.milestones) : []
  const dld = price > 0 ? dldAmountAed(price, plan.dldFeePayer) : null

  return (
    <section aria-label={t('offplan.detail.paymentPlan')} className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-ink">{t('offplan.detail.paymentPlan')}</h2>
      {plans.length > 1 ? (
        <label className="mt-4 block text-sm font-medium text-ink/70">
          {t('offplan.detail.planName')}
          <select
            value={plan.id}
            onChange={(event) => setPlanId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink sm:max-w-sm"
          >
            {plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-2 text-sm font-medium text-ink/70">{plan.name}</p>
      )}

      <label className="mt-4 block text-sm font-medium text-ink/70">
        {t('offplan.detail.unitPrice')}
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={priceAed ?? ''}
          onChange={(event) => {
            const next = event.target.value.trim()
            onPriceChange(next ? Number(next) : null)
          }}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink sm:max-w-xs"
        />
      </label>

      {rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wider text-ink/50">
                <th className="py-2 pr-3">{t('offplan.detail.stage')}</th>
                <th className="py-2 pr-3">{t('offplan.detail.when')}</th>
                <th className="py-2 pr-3">{t('offplan.detail.percent')}</th>
                <th className="py-2 pr-3">{t('offplan.detail.amount')}</th>
                <th className="py-2">{t('offplan.detail.running')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink/5">
                  <td className="py-2.5 pr-3 font-medium text-ink">{row.label}</td>
                  <td className="py-2.5 pr-3 text-ink/70">{t(`offplan.detail.phase.${row.phase}`)}</td>
                  <td className="py-2.5 pr-3 text-ink/70">{formatPercent(row.percent)}</td>
                  <td className="py-2.5 pr-3 text-ink">
                    {formatPriceFromAed(row.amountAed, currency, rates, intlLocale)}
                  </td>
                  <td className="py-2.5 text-ink">
                    {formatPriceFromAed(row.runningAed, currency, rates, intlLocale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink/60">{t('offplan.detail.enterPrice')}</p>
      )}

      <DldNote payer={plan.dldFeePayer} amount={dld} />
      <p className="mt-3 text-sm leading-relaxed text-ink/60">{t('offplan.detail.disclaimer')}</p>
    </section>
  )
}

function DldNote({ payer, amount }: { payer: DldFeePayer; amount: number | null }) {
  const { t, currency, rates, intlLocale } = useLocalePreferences()
  if (payer === 'excluded') {
    return <p className="mt-4 text-sm text-ink/75">{t('offplan.detail.dldExcluded')}</p>
  }
  if (payer === 'developer') {
    return <p className="mt-4 text-sm text-ink/75">{t('offplan.detail.dldDeveloper')}</p>
  }
  if (amount == null) return null
  const label = payer === 'shared' ? t('offplan.detail.dldShared') : t('offplan.detail.dld')
  return (
    <p className="mt-4 text-sm text-ink/80">
      {label}: {formatPriceFromAed(amount, currency, rates, intlLocale)}
    </p>
  )
}

function formatPercent(percent: number) {
  const rounded = Math.round(percent * 100) / 100
  return `${rounded}%`
}
