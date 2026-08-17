import { haversineDistanceKm, formatDistance, type LatLng } from '../../lib/geo'
import type { DropPoint } from '../../types/dropPoint'

const MAX_VISIBLE = 200

interface ResultsListProps {
  points: DropPoint[]
  userLocation: LatLng | null
  onSelect: (point: DropPoint) => void
}

export function ResultsList({ points, userLocation, onSelect }: ResultsListProps) {
  const visible = points.slice(0, MAX_VISIBLE)

  return (
    <div className="results">
      <div className="results-header">
        <span>Hasil</span>
        <span className="results-count">
          {points.length > MAX_VISIBLE
            ? `Menampilkan ${MAX_VISIBLE} dari ${points.length.toLocaleString('id-ID')}`
            : `${points.length.toLocaleString('id-ID')} titik`}
        </span>
      </div>
      <ul className="results-list">
        {visible.map((point) => (
          <li key={point.id}>
            <button type="button" className="result-item" onClick={() => onSelect(point)}>
              <span className={`result-dot result-dot--${point.model === 'Franchise' ? 'franchise' : point.model === 'Agent' ? 'agent' : 'tc'}`} />
              <span className="result-item__body">
                <span className="result-item__name">{point.name}</span>
                <span className="result-item__meta">
                  {point.id} · {point.hub}
                </span>
              </span>
              {userLocation && (
                <span className="result-item__distance">
                  {formatDistance(haversineDistanceKm(userLocation, point))}
                </span>
              )}
            </button>
          </li>
        ))}
        {visible.length === 0 && <li className="results-empty">Tidak ada Drop Point yang cocok.</li>}
      </ul>
    </div>
  )
}
