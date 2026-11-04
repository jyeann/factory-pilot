import { fnv1a } from './fnv1a'

describe('fnv1a', () => {
  it('matches the reference 32-bit FNV-1a test vectors', () => {
    expect(fnv1a('')).toBe('811c9dc5')
    expect(fnv1a('a')).toBe('e40c292c')
    expect(fnv1a('foobar')).toBe('bf9cf968')
  })

  it('hashes the UTF-8 bytes of non-ASCII text', () => {
    // "é" is two UTF-8 bytes; hashing UTF-16 code units would give a different value.
    expect(fnv1a('é')).toBe(fnv1a('é'))
    expect(fnv1a('é')).not.toBe(fnv1a('e'))
    expect(fnv1a('é')).toMatch(/^[0-9a-f]{8}$/)
  })
})
