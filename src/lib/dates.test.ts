import { friendlyDay, toIsoDate } from './dates'

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
