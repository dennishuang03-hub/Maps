import { useCallback, useRef, useState } from 'react'
import { MapView, type MapController } from './components/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { useDropPointFilters } from './hooks/useDropPointFilters'
import type { LatLng } from './lib/geo'
import type { DropPoint } from './types/dropPoint'
import './App.css'

type LocateStatus = 'idle' | 'locating' | 'located' | 'denied'

function App() {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const controllerRef = useRef<MapController | null>(null)

  const filters = useDropPointFilters(userLocation)

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      setLocateStatus('denied')
      return
    }
    setLocateStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocateStatus('located')
      },
      () => setLocateStatus('denied'),
      { timeout: 8000 },
    )
  }

  const handleSelectPoint = useCallback((point: DropPoint) => {
    controllerRef.current?.focusPoint(point)
    setSidebarOpen(false)
  }, [])

  return (
    <div className="app">
      <div className={`sidebar-shell ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          filters={filters}
          userLocation={userLocation}
          locateStatus={locateStatus}
          onLocateMe={handleLocateMe}
          onSelectPoint={handleSelectPoint}
        />
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
          <div className="concept-chip">DATA INTERNAL — JANGAN DISEBARLUASKAN</div>
        </div>
        <MapView points={filters.filtered} userLocation={userLocation} controllerRef={controllerRef} />
      </div>
    </div>
  )
}

export default App
