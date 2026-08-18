import { useEffect } from 'react'
import { formatDistance } from '../../lib/geo'
import type { DropPoint } from '../../types/dropPoint'

const MODEL_BADGE_CLASS: Record<string, string> = {
  Franchise: 'nearest-card__badge--franchise',
  Agent: 'nearest-card__badge--agent',
  'TC Agent': 'nearest-card__badge--tc',
}

const FUNGSI_ICON: Record<string, string> = {
  'Pickup Delivery': '⇄',
  Delivery: '\u{1F4E5}',
  Pickup: '\u{1F4E4}',
}

/** Rendering every point inside a wide radius would stall the modal. */
const MAX_RENDERED = 60

export interface NearestResult {
  point: DropPoint
  distanceKm: number
}

interface ResultsModalProps {
  open: boolean
  onClose: () => void
  originLabel: string
  originSecondary?: string
  radiusKm: number | null
  results: NearestResult[]
  onSelectPoint: (point: DropPoint) => void
}

export function ResultsModal({
  open,
  onClose,
  originLabel,
  originSecondary,
  radiusKm,
  results,
  onSelectPoint,
}: ResultsModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const isRadius = radiusKm !== null
  const visible = results.slice(0, MAX_RENDERED)
  const eyebrow = isRadius
    ? `${results.length.toLocaleString('id-ID')} DP/CP dalam radius ${radiusKm} km`
    : 'Drop Point / Collection Point Terdekat'

  return (
    <div className="nearest-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nearest-modal" role="dialog" aria-modal="true" aria-label="Hasil Drop Point">
        <div className="nearest-modal__header">
          <div className="nearest-modal__heading">
            <span className="nearest-modal__eyebrow">{eyebrow}</span>
            <span className="nearest-modal__origin">{originLabel}</span>
            {originSecondary && <span className="nearest-modal__origin-sub">{originSecondary}</span>}
          </div>
          <button type="button" className="nearest-modal__close" aria-label="Tutup" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <div className="nearest-modal__list">
          {results.length === 0 && (
            <div className="nearest-modal__empty">
              {isRadius
                ? `Tidak ada Drop Point dalam radius ${radiusKm} km.`
                : 'Tidak ada Drop Point yang ditemukan.'}
            </div>
          )}

          {visible.map((result, i) => (
            <button
              type="button"
              key={result.point.id}
              className={`nearest-card ${isRadius ? 'nearest-card--plain' : `nearest-card--rank${i + 1}`}`}
              onClick={() => onSelectPoint(result.point)}
            >
              <span className="nearest-card__rank">{i + 1}</span>
              <span className="nearest-card__body">
                <span className="nearest-card__top">
                  <span className={`nearest-card__badge ${MODEL_BADGE_CLASS[result.point.model] ?? ''}`}>
                    {result.point.model}
                  </span>
                  <span className="nearest-card__distance">{formatDistance(result.distanceKm)}</span>
                </span>
                <span className="nearest-card__name">{result.point.name}</span>
                <span className="nearest-card__meta">
                  {result.point.id} · {result.point.hub} · {result.point.kecamatan}
                </span>
                <span className="nearest-card__address">{result.point.address}</span>
                <span className="nearest-card__tags">
                  <span className="nearest-card__tag">
                    <span aria-hidden="true">{FUNGSI_ICON[result.point.fungsi] ?? '\u{1F4E6}'}</span>{' '}
                    {result.point.fungsi}
                  </span>
                  <span className="nearest-card__tag">&#128337; {result.point.hours}</span>
                  <span className="nearest-card__tag">{result.point.agent}</span>
                </span>
                <span className="nearest-card__footer">
                  <span className="nearest-card__cta">Lihat di peta &amp; detail &rarr;</span>
                </span>
              </span>
            </button>
          ))}

          {results.length > MAX_RENDERED && (
            <div className="nearest-modal__more">
              Menampilkan {MAX_RENDERED} terdekat dari {results.length.toLocaleString('id-ID')} hasil.
              Perkecil radius untuk hasil yang lebih spesifik.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
