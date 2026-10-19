export const INVESTMENT_BUDGETS = [
  { value: '750k_1m', label: 'AED 750k–1m' },
  { value: '1m_3m', label: 'AED 1m–3m' },
  { value: '3m_5m', label: 'AED 3m–5m' },
  { value: '5m_plus', label: 'AED 5m+' },
] as const

export const INVEST_TIMELINES = [
  { value: 'immediate', label: 'Immediately' },
  { value: '1_2_months', label: '1 - 2 months' },
  { value: '3_6_months', label: '3–6 months' },
] as const

export const INVESTED_BEFORE = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const

export type QualificationAnswers = {
  budget: string
  timeline: string
  investedBefore: string
}

export const emptyQualification: QualificationAnswers = {
  budget: '',
  timeline: '',
  investedBefore: '',
}

function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
): string | null {
  return options.find((option) => option.value === value)?.label ?? null
}

export function qualificationAnswerLabel(
  field: 'budget' | 'timeline' | 'investedBefore',
  value: string | null | undefined,
): string | null {
  if (!value) return null
  const options =
    field === 'budget'
      ? INVESTMENT_BUDGETS
      : field === 'timeline'
        ? INVEST_TIMELINES
        : INVESTED_BEFORE
  return optionLabel(options, value) ?? value
}

export function qualificationComplete(answers: QualificationAnswers): boolean {
  return Boolean(
    optionLabel(INVESTMENT_BUDGETS, answers.budget) &&
      optionLabel(INVEST_TIMELINES, answers.timeline) &&
      optionLabel(INVESTED_BEFORE, answers.investedBefore),
  )
}

/** English summary stored on the submission so CRM notes stay consistent across languages. */
export function qualificationMessage(answers: QualificationAnswers): string {
  return [
    `Investment budget: ${optionLabel(INVESTMENT_BUDGETS, answers.budget)}`,
    `Looking to invest: ${optionLabel(INVEST_TIMELINES, answers.timeline)}`,
    `Invested in UAE property before: ${optionLabel(INVESTED_BEFORE, answers.investedBefore)}`,
  ].join('\n')
}

export function qualificationMeta(answers: QualificationAnswers) {
  return {
    investment_budget: answers.budget,
    invest_timeline: answers.timeline,
    invested_uae_before: answers.investedBefore,
  }
}
