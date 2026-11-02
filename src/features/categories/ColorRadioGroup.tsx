import { useId, type CSSProperties } from 'react'
import { CATEGORY_PALETTE, type PaletteKey } from '../../lib/categories'
import { PALETTE_NAMES, paletteColor } from './categoryHelpers'

export interface ColorRadioGroupProps {
  /** Accessible name of the group, e.g. "Colour for Food". */
  label: string
  /** Selected palette key, or undefined when the category uses its built-in colour. */
  value: PaletteKey | undefined
  onChange: (color: PaletteKey) => void
}

/** The 10 theme-aware palette colours as a native radio group (arrow keys move between swatches). */
export function ColorRadioGroup({ label, value, onChange }: ColorRadioGroupProps) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className="cat-swatches">
      {CATEGORY_PALETTE.map((key) => (
        <label key={key} className="cat-swatch" style={{ '--dot': paletteColor(key) } as CSSProperties}>
          <input
            type="radio"
            className="visually-hidden"
            name={name}
            value={key}
            checked={value === key}
            onChange={() => onChange(key)}
          />
          <span className="cat-swatch-dot" aria-hidden="true" />
          <span className="visually-hidden">{PALETTE_NAMES[key]}</span>
        </label>
      ))}
    </div>
  )
}
