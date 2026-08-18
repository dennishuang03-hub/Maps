import { useEffect, useRef, useState } from 'react'
import { MAP_STYLES } from '../../lib/mapStyles'

const STYLE_GLYPH: Record<string, string> = {
  minimal: '▤',
  standard: '🗺',
  dark: '🌑',
  satellite: '🛰',
}

interface MapStyleSwitcherProps {
  value: string
  onChange: (id: string) => void
}

export function MapStyleSwitcher({ value, onChange }: MapStyleSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`map-style ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="map-style__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Ganti tampilan peta"
        title="Ganti tampilan peta"
      >
        <span aria-hidden="true">▦</span>
      </button>

      {open && (
        <div className="map-style__menu" role="listbox" aria-label="Tampilan peta">
          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              role="option"
              aria-selected={value === style.id}
              className={`map-style__option ${value === style.id ? 'is-active' : ''}`}
              onClick={() => {
                onChange(style.id)
                setOpen(false)
              }}
            >
              <span className="map-style__glyph" aria-hidden="true">
                {STYLE_GLYPH[style.id] ?? '▦'}
              </span>
              {style.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
