import type { DropPointFilters } from '../../hooks/useDropPointFilters'
import type { LatLng } from '../../lib/geo'
import type { DropPoint } from '../../types/dropPoint'
import { Brand } from './Brand'
import { SearchAndLocate } from './SearchAndLocate'
import { FilterSelect } from './FilterSelect'
import { StatsCards } from './StatsCards'
import { Legend } from './Legend'
import { ResultsList } from './ResultsList'

interface SidebarProps {
  filters: DropPointFilters
  userLocation: LatLng | null
  locateStatus: 'idle' | 'locating' | 'located' | 'denied'
  onLocateMe: () => void
  onSelectPoint: (point: DropPoint) => void
}

export function Sidebar({ filters, userLocation, locateStatus, onLocateMe, onSelectPoint }: SidebarProps) {
  const {
    search,
    setSearch,
    province,
    setProvince,
    model,
    setModel,
    fungsi,
    setFungsi,
    provinces,
    models,
    fungsis,
    filtered,
    resetFilters,
    hasActiveFilters,
  } = filters

  return (
    <div className="sidebar" id="sidebar">
      <Brand />

      <SearchAndLocate value={search} onChange={setSearch} onLocateMe={onLocateMe} locateStatus={locateStatus} />

      <div className="filters">
        <FilterSelect label="Provinsi" value={province} options={provinces} allLabel="Semua Provinsi" onChange={setProvince} />
        <FilterSelect label="Model Bisnis" value={model} options={models} allLabel="Semua Model" onChange={setModel} />
        <FilterSelect label="Fungsi DP" value={fungsi} options={fungsis} allLabel="Semua Fungsi" onChange={setFungsi} />
        {hasActiveFilters && (
          <button type="button" className="reset-btn" onClick={resetFilters}>
            Reset filter
          </button>
        )}
      </div>

      <StatsCards points={filtered} />
      <Legend />
      <ResultsList points={filtered} userLocation={userLocation} onSelect={onSelectPoint} />

      <div className="note">
        <b>Data operasional J&amp;T sesungguhnya</b> (1.790 DP, Jawa &amp; Bali) — bukan data ilustrasi. Belum
        melalui review keamanan/persetujuan publikasi. Jangan disebarluaskan di luar kanal internal atau
        di-deploy ke domain publik tanpa persetujuan IT &amp; atasan.
      </div>
    </div>
  )
}
