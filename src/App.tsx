import { useCallback, useRef, useState } from 'react'
import { MapView, type MapController } from './components/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { useDropPointFilters } from './hooks/useDropPointFilters'
import { haversineDistanceKm, type LatLng } from './lib/geo'
import type { DropPoint } from './types/dropPoint'
import './App.css'

type LocateStatus = 'idle' | 'locating' | 'located' | 'denied'

const LOCATE_TITLE: Record<LocateStatus, string> = {
  idle: 'Gunakan lokasi saya',
  locating: 'Mencari lokasi…',
  located: 'Lokasi Anda ditemukan',
  denied: 'Lokasi tidak tersedia — coba lagi',
}

function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v3M12 19v3M22 12h-3M5 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function NearestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11l8-8 10 10-8 8L3 11z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M12 8.5v4l3 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function App() {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const controllerRef = useRef<MapController | null>(null)

  const filters = useDropPointFilters(userLocation)

  const requestLocation = useCallback((onSuccess: (loc: LatLng) => void) => {
    if (!('geolocation' in navigator)) {
      setLocateStatus('denied')
      return
    }
    setLocateStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setLocateStatus('located')
        onSuccess(loc)
      },
      () => setLocateStatus('denied'),
      { timeout: 8000 },
    )
  }, [])

  const handleLocateMe = useCallback(() => requestLocation(() => {}), [requestLocation])

  const handleSelectPoint = useCallback((point: DropPoint) => {
    controllerRef.current?.focusPoint(point)
    setSidebarOpen(false)
  }, [])

  const handleFindNearest = useCallback(() => {
    const focusNearest = (loc: LatLng) => {
      const list = filters.filtered
      if (list.length === 0) return
      const nearest = list.reduce((best, point) =>
        haversineDistanceKm(loc, point) < haversineDistanceKm(loc, best) ? point : best,
      )
      handleSelectPoint(nearest)
    }

    if (userLocation) {
      focusNearest(userLocation)
    } else {
      requestLocation(focusNearest)
    }
  }, [filters.filtered, handleSelectPoint, requestLocation, userLocation])

  return (
    <div className="app">
      <div className={`sidebar-shell ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar filters={filters} userLocation={userLocation} onSelectPoint={handleSelectPoint} />
      </div>

      <button
        type="button"
        className="menu-btn"
        aria-label="Buka daftar Drop Point"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        &#9776;
      </button>

      <div className="map-wrap">
        <div className="map-topbar">
          <div className="updated-chip">Jawa &amp; Bali · {filters.filtered.length.toLocaleString('id-ID')} titik</div>
        </div>

        <div className="map-fabs">
          <button
            type="button"
            className="fab-btn fab-btn--nearest"
            onClick={handleFindNearest}
            disabled={locateStatus === 'locating'}
            title="Cari DP/CP terdekat"
          >
            <NearestIcon />
            <span>DP/CP Terdekat</span>
          </button>
          <button
            type="button"
            className={`fab-btn fab-btn--icon locate-fab--${locateStatus}`}
            onClick={handleLocateMe}
            disabled={locateStatus === 'locating'}
            title={LOCATE_TITLE[locateStatus]}
            aria-label={LOCATE_TITLE[locateStatus]}
          >
            <LocateIcon />
          </button>
        </div>

        <MapView points={filters.filtered} userLocation={userLocation} controllerRef={controllerRef} />
      </div>
    </div>
  )
}

export default App
