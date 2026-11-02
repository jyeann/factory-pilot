import { downloadCsv } from './download'

describe('downloadCsv', () => {
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
  })

  it('clicks a temporary link to the CSV blob and cleans up', () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob
      return 'blob:mock'
    })
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('expenses-2026-11-02.csv')
      expect(this.href).toBe('blob:mock')
      expect(document.body.contains(this)).toBe(true)
    })

    downloadCsv('expenses-2026-11-02.csv', 'a,b\r\n')

    expect(click).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
