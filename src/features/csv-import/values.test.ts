import { addCategory, getCategories, removeCategory } from '../../lib/categories'
import { detectDateFormat, matchCategory, parseImportAmount, parseImportDate, unescapeExportPrefix } from './values'

describe('unescapeExportPrefix', () => {
  it.each([
    ["'=SUM(A1)", '=SUM(A1)'],
    ["'+1", '+1'],
    ["'-5", '-5'],
    ["'@home", '@home'],
    ["'\tTabbed", '\tTabbed'],
    ["'\rCR", '\rCR'],
  ])('removes the export prefix from %j', (input, expected) => {
    expect(unescapeExportPrefix(input)).toBe(expected)
  })

  it('leaves other apostrophes alone', () => {
    expect(unescapeExportPrefix("'quoted'")).toBe("'quoted'")
    expect(unescapeExportPrefix("Rock 'n' roll")).toBe("Rock 'n' roll")
    expect(unescapeExportPrefix('=raw')).toBe('=raw')
  })
})

describe('detectDateFormat', () => {
  it('is "none" without slash dates', () => {
    expect(detectDateFormat(['2025-01-02', 'nonsense'])).toBe('none')
  })
  it('picks DD/MM when a first part is over 12', () => {
    expect(detectDateFormat(['01/02/2025', '25/03/2025'])).toBe('dmy')
  })
  it('picks MM/DD when a second part is over 12', () => {
    expect(detectDateFormat(['01/02/2025', '03/25/2025'])).toBe('mdy')
  })
  it('reports a conflict when both happen in one file', () => {
    expect(detectDateFormat(['25/03/2025', '03/25/2025'])).toBe('conflict')
  })
  it('is ambiguous when every part is 12 or less', () => {
    expect(detectDateFormat(['01/02/2025', '12/11/2025'])).toBe('ambiguous')
  })
})

describe('parseImportDate', () => {
  it('accepts real ISO dates', () => {
    expect(parseImportDate('2025-02-28', null)).toBe('2025-02-28')
    expect(parseImportDate(' 2024-02-29 ', null)).toBe('2024-02-29')
  })
  it('rejects impossible or malformed ISO dates', () => {
    expect(parseImportDate('2025-02-29', null)).toBeNull()
    expect(parseImportDate('2025-13-01', null)).toBeNull()
    expect(parseImportDate('2025-1-5', null)).toBeNull()
    expect(parseImportDate('yesterday', 'dmy')).toBeNull()
  })
  it('reads slash dates in the given format', () => {
    expect(parseImportDate('3/4/2025', 'dmy')).toBe('2025-04-03')
    expect(parseImportDate('3/4/2025', 'mdy')).toBe('2025-03-04')
    expect(parseImportDate('31/12/2025', 'dmy')).toBe('2025-12-31')
  })
  it('rejects slash dates while the format is unknown, and impossible ones', () => {
    expect(parseImportDate('03/04/2025', null)).toBeNull()
    expect(parseImportDate('31/04/2025', 'dmy')).toBeNull()
    expect(parseImportDate('02/30/2025', 'mdy')).toBeNull()
  })
})

describe('parseImportAmount', () => {
  it.each([
    ['12.50', 1250],
    ['$12.50', 1250],
    [' $ 12.5 ', 1250],
    ['1,234.50', 123450],
    ['$1,234,567', 123456700],
    ['7', 700],
  ])('parses %j', (input, cents) => {
    expect(parseImportAmount(input)).toEqual({ ok: true, cents })
  })

  it.each([
    ['abc', "amount 'abc' isn't a number"],
    ['12,50', "amount '12,50' isn't a number"],
    ['', 'amount is missing'],
    ['0', "amount '0' must be more than 0"],
    ['0.00', "amount '0.00' must be more than 0"],
    ['-5', "amount '-5' must be more than 0"],
    ['$-5.00', "amount '$-5.00' must be more than 0"],
    ['-$5.00', "amount '-$5.00' must be more than 0"],
    ['(5.00)', "amount '(5.00)' must be more than 0"],
    ['1.234', "amount '1.234' has more than 2 decimals"],
    ['99999999999', "amount '99999999999' is too large"],
  ])('rejects %j', (input, problem) => {
    expect(parseImportAmount(input)).toEqual({ ok: false, problem })
  })
})

describe('matchCategory', () => {
  it('matches labels and ids case-insensitively', () => {
    const categories = getCategories()
    expect(matchCategory('Food', categories)).toBe('food')
    expect(matchCategory(' TRANSPORT ', categories)).toBe('transport')
    expect(matchCategory('entertainment', categories)).toBe('entertainment')
  })

  it('returns null for unknown or empty names', () => {
    expect(matchCategory('Groceries', getCategories())).toBeNull()
    expect(matchCategory('', getCategories())).toBeNull()
  })

  it('uses the dynamic store: custom categories match, archived ones do not', () => {
    const pets = addCategory('Pets', 'p5')
    expect(matchCategory('pets', getCategories())).toBe(pets.id)
    removeCategory(pets.id)
    expect(matchCategory('Pets', getCategories())).toBeNull()
  })
})
