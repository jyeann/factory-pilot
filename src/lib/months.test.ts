import { formatShortMonth, monthOfIso, monthRange, shiftMonth } from './months'

describe('months', () => {
  it('shifts across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('builds ranges oldest first', () => {
    expect(monthRange('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('reads the month of a date and short labels', () => {
    expect(monthOfIso('2026-11-02')).toBe('2026-11')
    expect(formatShortMonth('2026-03')).toMatch(/Mar/)
  })
})
