const RADIUS_OPTIONS = [1, 3, 5, 10] as const

interface DiscoveryBannerProps {
  label: string
  resultCount: number
  radiusKm: number | null
  /** Set while the user has drilled into a single Drop Point. */
  selectedName: string | null
  onChangeRadius: (radius: number | null) => void
  onShowList: () => void
  onExit: () => void
}

export function DiscoveryBanner({
  label,
  resultCount,
  radiusKm,
  selectedName,
  onChangeRadius,
  onShowList,
  onExit,
}: DiscoveryBannerProps) {
  return (
    <div className="discovery-banner">
      <div className="discovery-banner__main">
        <span className="discovery-banner__pin" aria-hidden="true">
          &#128205;
        </span>
        <div className="discovery-banner__text">
          <span className="discovery-banner__label">{label}</span>
          <span className="discovery-banner__meta">
            {selectedName
              ? selectedName
              : radiusKm === null
                ? `${resultCount} terdekat`
                : `${resultCount.toLocaleString('id-ID')} DP/CP · radius ${radiusKm} km`}
          </span>
        </div>

        <button
          type="button"
          className="discovery-banner__exit"
          onClick={onExit}
          aria-label="Keluar dari mode pencarian terdekat"
          title="Keluar dari mode pencarian terdekat"
        >
          &#10005;
        </button>
      </div>

      <div className="discovery-banner__controls">
        <div className="discovery-banner__radius" role="group" aria-label="Radius pencarian">
          <button
            type="button"
            className={`radius-chip ${radiusKm === null ? 'is-active' : ''}`}
            onClick={() => onChangeRadius(null)}
          >
            3 Terdekat
          </button>
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              className={`radius-chip ${radiusKm === km ? 'is-active' : ''}`}
              onClick={() => onChangeRadius(km)}
            >
              {km} km
            </button>
          ))}
        </div>

        <button type="button" className="discovery-banner__list" onClick={onShowList}>
          {selectedName ? 'Kembali ke hasil' : 'Lihat daftar'}
        </button>
      </div>
    </div>
  )
}
