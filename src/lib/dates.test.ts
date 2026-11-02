import { addDays, addMonthsClamped, friendlyDay, parseIsoDate, toIsoDate } from './dates'

const now = new Date(2026, 10, 2) // Mon 2 Nov 2026

describe('friendlyDay', () => {
  it('names today and yesterday', () => {
    expect(friendlyDay('2026-11-02', now)).toBe('Today')
    expect(friendlyDay('2026-11-01', now)).toBe('Yesterday')
  })

  it('handles yesterday across a month boundary', () => {
    expect(friendlyDay('2026-10-31', new Date(2026, 10, 1))).toBe('Yesterday')
  })

  it('formats older dates, adding the year only when it differs', () => {
    expect(friendlyDay('2026-10-30', now)).not.toMatch(/2026/)
    expect(friendlyDay('2025-10-30', now)).toMatch(/2025/)
  })
})

describe('toIsoDate', () => {
  it('pads month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-01-01', 7)).toBe('2026-01-08')
  })
})

describe('addMonthsClamped', () => {
  it('clamps the 31st to the last day of shorter months', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonthsClamped('2026-01-31', 3)).toBe('2026-04-30')
  })

  it('does not drift when computed from the start date', () => {
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31')
  })

  it('crosses years and handles n = 0', () => {
    expect(addMonthsClamped('2026-11-15', 3)).toBe('2027-02-15')
    expect(addMonthsClamped('2026-11-15', 0)).toBe('2026-11-15')
  })
})

describe('parseIsoDate', () => {
  it('parses as a local date', () => {
    const d = parseIsoDate('2026-03-05')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 5])
  })
})
