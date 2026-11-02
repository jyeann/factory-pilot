import {
  MAX_OCCURRENCES_PER_RUN,
  describeRule,
  dueOccurrences,
  generateDue,
  isIsoDate,
  nextOccurrence,
  occurrenceId,
  ordinal,
  parseRules,
  type RecurringRule,
} from './recurring'

const rule = (overrides: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1',
  description: 'Rent',
  amountCents: 120000,
  category: 'housing',
  frequency: 'monthly',
  startDate: '2026-01-01',
  generatedThrough: null,
  ...overrides,
})

describe('dueOccurrences — monthly', () => {
  it('returns each month from the start date through today, inclusive', () => {
    expect(dueOccurrences(rule(), '2026-03-01')).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })

  it('excludes a date one day after today', () => {
    expect(dueOccurrences(rule(), '2026-02-28')).toEqual(['2026-01-01', '2026-02-01'])
  })

  it('clamps the 31st to the month end without drifting (computed from startDate)', () => {
    const r = rule({ startDate: '2026-01-31' })
    expect(dueOccurrences(r, '2026-05-31')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'])
  })

  it('uses Feb 29 in a leap year', () => {
    const r = rule({ startDate: '2028-01-31' })
    expect(dueOccurrences(r, '2028-03-31')).toEqual(['2028-01-31', '2028-02-29', '2028-03-31'])
  })

  it('handles a Feb 29 start across non-leap years', () => {
    const r = rule({ startDate: '2028-02-29' })
    expect(dueOccurrences(r, '2028-04-30')).toEqual(['2028-02-29', '2028-03-29', '2028-04-29'])
  })
})

describe('dueOccurrences — weekly', () => {
  it('returns every 7 days from the start date through today', () => {
    const r = rule({ frequency: 'weekly', startDate: '2026-10-05' })
    expect(dueOccurrences(r, '2026-10-26')).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
  })

  it('crosses month and year boundaries', () => {
    const r = rule({ frequency: 'weekly', startDate: '2026-12-24' })
    expect(dueOccurrences(r, '2027-01-10')).toEqual(['2026-12-24', '2026-12-31', '2027-01-07'])
  })
})

describe('dueOccurrences — date rules', () => {
  it('returns nothing before the start date', () => {
    expect(dueOccurrences(rule({ startDate: '2026-12-01' }), '2026-11-30')).toEqual([])
  })

  it('includes the start date when it is today', () => {
    expect(dueOccurrences(rule({ startDate: '2026-11-02' }), '2026-11-02')).toEqual(['2026-11-02'])
  })

  it('backfills every occurrence when the start date is in the past', () => {
    expect(dueOccurrences(rule({ startDate: '2025-11-15' }), '2026-11-02')).toHaveLength(12)
  })

  it('skips dates on or before generatedThrough', () => {
    const r = rule({ generatedThrough: '2026-02-01' })
    expect(dueOccurrences(r, '2026-04-15')).toEqual(['2026-03-01', '2026-04-01'])
  })

  it('returns nothing when generatedThrough is today', () => {
    expect(dueOccurrences(rule({ generatedThrough: '2026-03-01' }), '2026-03-01')).toEqual([])
  })

  it('treats a generatedThrough before the start date as no constraint beyond the start', () => {
    const r = rule({ startDate: '2026-03-01', generatedThrough: '2026-01-15' })
    expect(dueOccurrences(r, '2026-04-01')).toEqual(['2026-03-01', '2026-04-01'])
  })

  it(`caps a run at ${MAX_OCCURRENCES_PER_RUN} occurrences, oldest first`, () => {
    const r = rule({ frequency: 'weekly', startDate: '2010-01-04' })
    const due = dueOccurrences(r, '2026-11-02')
    expect(due).toHaveLength(MAX_OCCURRENCES_PER_RUN)
    expect(due[0]).toBe('2010-01-04')
  })
})

describe('generateDue', () => {
  it('creates expenses with deterministic ids and recurringId', () => {
    const { expenses, changed } = generateDue([rule()], '2026-02-10')
    expect(changed).toBe(true)
    expect(expenses).toEqual([
      { id: 'rec:r1:2026-01-01', amountCents: 120000, description: 'Rent', category: 'housing', date: '2026-01-01', recurringId: 'r1' },
      { id: 'rec:r1:2026-02-01', amountCents: 120000, description: 'Rent', category: 'housing', date: '2026-02-01', recurringId: 'r1' },
    ])
    expect(expenses[0].id).toBe(occurrenceId('r1', '2026-01-01'))
  })

  it('sets generatedThrough to the last generated date, not today', () => {
    const { rules } = generateDue([rule()], '2026-02-10')
    expect(rules[0].generatedThrough).toBe('2026-02-01')
  })

  it('leaves a rule unchanged (same object) when nothing is due', () => {
    const r = rule({ startDate: '2026-12-01' })
    const result = generateDue([r], '2026-11-02')
    expect(result).toEqual({ expenses: [], rules: [r], changed: false })
    expect(result.rules[0]).toBe(r)
  })

  it('does not mutate its input', () => {
    const r = rule()
    generateDue([r], '2026-02-10')
    expect(r.generatedThrough).toBeNull()
  })

  it('continues a capped run on the next run without gaps or repeats', () => {
    const today = '2026-11-02'
    const first = generateDue([rule({ frequency: 'weekly', startDate: '2010-01-04' })], today)
    expect(first.expenses).toHaveLength(MAX_OCCURRENCES_PER_RUN)
    const lastOfFirst = first.rules[0].generatedThrough!
    const second = generateDue(first.rules, today)
    expect(second.expenses[0].date > lastOfFirst).toBe(true)
    expect(second.expenses[0].date).toBe('2017-01-09')
    const firstIds = new Set(first.expenses.map((e) => e.id))
    expect(second.expenses.some((e) => firstIds.has(e.id))).toBe(false)
  })

  it('does not recreate an occurrence the user deleted (generatedThrough is past it)', () => {
    const first = generateDue([rule()], '2026-02-10')
    const again = generateDue(first.rules, '2026-02-10')
    expect(again.expenses).toEqual([])
  })

  it('is idempotent when run twice from the same rules (StrictMode)', () => {
    const rules = [rule()]
    expect(generateDue(rules, '2026-03-05')).toEqual(generateDue(rules, '2026-03-05'))
  })
})

describe('parseRules', () => {
  it('returns null for non-arrays', () => {
    expect(parseRules({})).toBeNull()
  })

  it('keeps valid rules and drops malformed ones', () => {
    const good = rule()
    const parsed = parseRules([
      good,
      { ...good, id: 'bad-amount', amountCents: 0 },
      { ...good, id: 'bad-frequency', frequency: 'daily' },
      { ...good, id: 'bad-date', startDate: '2026-02-30' },
      { ...good, id: 'bad-through', generatedThrough: 'yesterday' },
      { ...good, id: 'float', amountCents: 12.5 },
      null,
    ])
    expect(parsed).toEqual([good])
  })

  it('drops unknown extra fields', () => {
    expect(parseRules([{ ...rule(), extra: 1 }])).toEqual([rule()])
  })
})

describe('text helpers', () => {
  it('validates real ISO dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
    expect(isIsoDate('2026-1-01')).toBe(false)
  })

  it('formats ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st',
    ])
  })

  it('describes rules in words', () => {
    expect(describeRule(rule())).toBe('Rent, $1,200.00 every month on the 1st')
    expect(describeRule(rule({ startDate: '2026-01-31' }))).toBe('Rent, $1,200.00 every month on the 31st (or the last day)')
    expect(describeRule(rule({ frequency: 'weekly', startDate: '2026-11-02', amountCents: 999, description: 'Gym' }))).toBe(
      'Gym, $9.99 every week on Monday',
    )
  })

  it('finds the next occurrence after today', () => {
    expect(nextOccurrence(rule({ generatedThrough: '2026-11-01' }), '2026-11-02')).toBe('2026-12-01')
    expect(nextOccurrence(rule({ startDate: '2027-03-15' }), '2026-11-02')).toBe('2027-03-15')
  })
})
