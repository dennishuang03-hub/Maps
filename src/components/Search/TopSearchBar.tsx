import { useEffect, useMemo, useRef, useState } from 'react'
import { searchPlaces, type GeocodeResult } from '../../lib/geocode'
import { searchDropPoints } from '../../lib/search'
import type { DropPoint } from '../../types/dropPoint'

type SuggestionItem =
  | { kind: 'point'; key: string; point: DropPoint }
  | { kind: 'place'; key: string; place: GeocodeResult }

const MODEL_DOT_CLASS: Record<string, string> = {
  Franchise: 'result-dot--franchise',
  Agent: 'result-dot--agent',
  'TC Agent': 'result-dot--tc',
}

interface TopSearchBarProps {
  /** External filter value (e.g. cleared by the sidebar's "reset filter"). */
  value: string
  /** Drives live map/sidebar filtering — only fed with real Drop Point queries. */
  onChange: (value: string) => void
  allPoints: DropPoint[]
  onSelectPoint: (point: DropPoint) => void
  onSelectPlace: (place: GeocodeResult) => void
  onClear: () => void
}

export function TopSearchBar({ value, onChange, allPoints, onSelectPoint, onSelectPlace, onClear }: TopSearchBarProps) {
  // Text shown in the input. Kept separate from `value` so picking a
  // geocoded place can show its label without filtering every Drop Point
  // off the map (the place text won't match any point's fields).
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [places, setPlaces] = useState<GeocodeResult[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the last value *we* pushed via onChange, so the sync below can
  // tell a genuinely external reset (e.g. sidebar "reset filter") apart
  // from our own onChange('') when a place is selected (which intentionally
  // clears the filter while keeping the place label on screen).
  const [lastPushed, setLastPushed] = useState(value)

  // Mirror external resets into the visible text, without looping back on
  // our own pushes — updating state during render like this is React's
  // documented way to sync from props.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== lastPushed) setText(value)
  }

  function pushChange(next: string) {
    setLastPushed(next)
    onChange(next)
  }

  const pointMatches = useMemo(() => searchDropPoints(allPoints, text, 5), [allPoints, text])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  function handleValueChange(next: string) {
    setText(next)
    pushChange(next)
    setOpen(true)
    setActiveIndex(-1)

    abortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = next.trim()
    if (q.length === 0) {
      onClear()
    }
    if (q.length < 3) {
      setPlaces([])
      setLoadingPlaces(false)
      return
    }

    setLoadingPlaces(true)
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller
      searchPlaces(q, controller.signal)
        .then((results) => {
          setPlaces(results)
          setActiveIndex(-1)
        })
        .catch((err) => {
          if ((err as Error)?.name !== 'AbortError') setPlaces([])
        })
        .finally(() => setLoadingPlaces(false))
    }, 400)
  }

  const items: SuggestionItem[] = useMemo(
    () => [
      ...pointMatches.map((point): SuggestionItem => ({ kind: 'point', key: `p-${point.id}`, point })),
      ...places.map((place): SuggestionItem => ({ kind: 'place', key: `l-${place.id}`, place })),
    ],
    [pointMatches, places],
  )

  const showDropdown = open && text.trim().length > 0

  function selectItem(item: SuggestionItem) {
    if (item.kind === 'point') {
      setText(item.point.name)
      pushChange(item.point.name)
      onSelectPoint(item.point)
    } else {
      // A place is a map location, not a Drop Point filter — keep the
      // underlying list/map filter untouched so every pin stays visible.
      setText(item.place.label)
      pushChange('')
      onSelectPlace(item.place)
    }
    setPlaces([])
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + items.length) % items.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[activeIndex] ?? items[0]
      if (item) selectItem(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="top-search" ref={containerRef}>
      <div className="top-search__box">
        <span className="top-search__icon" aria-hidden="true">
          &#128269;
        </span>
        <input
          type="text"
          value={text}
          placeholder="Cari kelurahan, kabupaten, jalan, atau nama Drop Point…"
          onChange={(e) => handleValueChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Cari lokasi atau Drop Point"
          aria-expanded={showDropdown}
          role="combobox"
          aria-autocomplete="list"
        />
        {loadingPlaces && <span className="top-search__spinner" aria-hidden="true" />}
        {text && !loadingPlaces && (
          <button
            type="button"
            className="top-search__clear"
            aria-label="Bersihkan pencarian"
            onClick={() => {
              setText('')
              pushChange('')
              setPlaces([])
              setOpen(false)
              onClear()
            }}
          >
            &#10005;
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="top-search__panel" role="listbox">
          {pointMatches.length > 0 && (
            <div className="top-search__section">
              <div className="top-search__section-title">Drop Point &amp; Collection Point</div>
              {pointMatches.map((point, i) => {
                const idx = i
                return (
                  <button
                    type="button"
                    key={`p-${point.id}`}
                    className={`top-search__item ${activeIndex === idx ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectItem({ kind: 'point', key: point.id, point })}
                  >
                    <span className={`result-dot ${MODEL_DOT_CLASS[point.model] ?? 'result-dot--tc'}`} />
                    <span className="top-search__item-body">
                      <span className="top-search__item-title">{point.name}</span>
                      <span className="top-search__item-sub">
                        {point.id} · {point.hub} · {point.kecamatan}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {places.length > 0 && (
            <div className="top-search__section">
              <div className="top-search__section-title">Lokasi</div>
              {places.map((place, i) => {
                const idx = pointMatches.length + i
                return (
                  <button
                    type="button"
                    key={`l-${place.id}`}
                    className={`top-search__item ${activeIndex === idx ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectItem({ kind: 'place', key: place.id, place })}
                  >
                    <span className="top-search__pin" aria-hidden="true">
                      &#128205;
                    </span>
                    <span className="top-search__item-body">
                      <span className="top-search__item-title">
                        {place.label}
                        {place.category && <span className="top-search__category">{place.category}</span>}
                      </span>
                      <span className="top-search__item-sub">{place.secondary}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {pointMatches.length === 0 && !loadingPlaces && places.length === 0 && (
            <div className="top-search__empty">
              {text.trim().length < 3
                ? 'Ketik minimal 3 huruf untuk mencari lokasi…'
                : 'Tidak ada hasil yang cocok.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
