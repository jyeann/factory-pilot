/** UTF-8 byte order mark so Excel detects the encoding of non-ASCII descriptions. */
const UTF8_BOM = '﻿'

/** Triggers a browser download of `content` as a CSV file named `filename`. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([UTF8_BOM, content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
