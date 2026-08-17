interface SearchAndLocateProps {
  value: string
  onChange: (value: string) => void
  onLocateMe: () => void
  locateStatus: 'idle' | 'locating' | 'located' | 'denied'
}

const LOCATE_LABEL: Record<SearchAndLocateProps['locateStatus'], string> = {
  idle: 'Gunakan lokasi saya',
  locating: 'Mencari lokasi…',
  located: 'Urutkan ulang dari lokasi saya',
  denied: 'Lokasi tidak tersedia — coba lagi',
}

export function SearchAndLocate({ value, onChange, onLocateMe, locateStatus }: SearchAndLocateProps) {
  return (
    <div className="search-wrap">
      <div className="search-box">
        <span className="search-icon">&#128269;</span>
        <input
          id="searchInput"
          type="text"
          placeholder="Cari nama, kode DP, atau hub"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <button
        type="button"
        className={`locate-btn locate-btn--${locateStatus}`}
        onClick={onLocateMe}
        disabled={locateStatus === 'locating'}
      >
        <span className="locate-btn__dot" aria-hidden="true" />
        {LOCATE_LABEL[locateStatus]}
      </button>
    </div>
  )
}
