import type { DropPointFilters } from '../../hooks/useDropPointFilters'
import type { LatLng } from '../../lib/geo'
import type { DropPoint } from '../../types/dropPoint'
import { Brand } from './Brand'
import { FilterSelect } from './FilterSelect'
import { StatsCards } from './StatsCards'
import { Legend } from './Legend'
import { ResultsList } from './ResultsList'

interface SidebarProps {
  filters: DropPointFilters
  userLocation: LatLng | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onSelectPoint: (point: DropPoint) => void
  /** Called before any filter change so the app can leave nearest-search mode. */
  onFilterInteract: () => void
}

export function Sidebar({
  filters,
  userLocation,
  theme,
  onToggleTheme,
  onSelectPoint,
  onFilterInteract,
}: SidebarProps) {
  const {
    province,
    setProvince,
    model,
    setModel,
    fungsi,
    setFungsi,
    agent,
    setAgent,
    provinces,
    models,
    fungsis,
    agents,
    filtered,
    resetFilters,
    hasActiveFilters,
  } = filters

  // Every filter change also drops the user out of nearest-search mode, so the
  // map can never be left showing 3 pins while the dropdowns say otherwise.
  const withExit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      onFilterInteract()
      setter(value)
    }

  return (
    <div className="sidebar" id="sidebar">
      <Brand theme={theme} onToggleTheme={onToggleTheme} />

      <div className="filters">
        <FilterSelect
          label="Provinsi"
          value={province}
          options={provinces}
          allLabel="Semua Provinsi"
          onChange={withExit(setProvince)}
        />
        <FilterSelect
          label="Model Bisnis"
          value={model}
          options={models}
          allLabel="Semua Model"
          onChange={withExit(setModel)}
        />
        <FilterSelect
          label="Fungsi DP"
          value={fungsi}
          options={fungsis}
          allLabel="Semua Fungsi"
          onChange={withExit(setFungsi)}
        />
        <FilterSelect
          label="Agent"
          value={agent}
          options={agents}
          allLabel="Semua Agent"
          onChange={withExit(setAgent)}
        />
        {hasActiveFilters && (
          <button
            type="button"
            className="reset-btn"
            onClick={() => {
              onFilterInteract()
              resetFilters()
            }}
          >
            Reset filter
          </button>
        )}
      </div>

      <StatsCards points={filtered} />
      <Legend />
      <ResultsList points={filtered} userLocation={userLocation} onSelect={onSelectPoint} />
    </div>
  )
}
