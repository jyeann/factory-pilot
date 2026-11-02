import { centsToInput, parseAmountToCents } from './money'

describe('parseAmountToCents', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['0.99', 99],
    [' 3.10 ', 310],
  ])('parses %s to %i cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected)
  })

  it.each(['', 'abc', '0', '-5', '1.234', '1,50'])('rejects %s', (input) => {
    expect(parseAmountToCents(input)).toBeNull()
  })
})

describe('centsToInput', () => {
  it.each([
    [1250, '12.50'],
    [5, '0.05'],
    [100, '1.00'],
    [123456, '1234.56'],
  ])('formats %i as %s and round-trips', (cents, text) => {
    expect(centsToInput(cents)).toBe(text)
    expect(parseAmountToCents(text)).toBe(cents)
  })
})
