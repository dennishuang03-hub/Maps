interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
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
        {value && (
          <button
            type="button"
            className="search-clear"
            aria-label="Bersihkan pencarian"
            onClick={() => onChange('')}
          >
            &#10005;
          </button>
        )}
      </div>
    </div>
  )
}
