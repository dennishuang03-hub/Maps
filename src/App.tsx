import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapView, type MapController } from './components/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TopSearchBar } from './components/Search/TopSearchBar'
import { DiscoveryBanner } from './components/Search/DiscoveryBanner'
import { ResultsModal, type NearestResult } from './components/Search/ResultsModal'
import { MapStyleSwitcher } from './components/Map/MapStyleSwitcher'
import { dropPoints } from './data/dropPoints'
import { useDropPointFilters } from './hooks/useDropPointFilters'
import type { GeocodeResult } from './lib/geocode'
import { haversineDistanceKm, type LatLng } from './lib/geo'
import { DEFAULT_DARK_STYLE, DEFAULT_LIGHT_STYLE, resolveMapStyle } from './lib/mapStyles'
import { readUrlState, writeUrlState } from './lib/urlState'
import type { DropPoint } from './types/dropPoint'
import './App.css'

const NEAREST_COUNT = 3
const THEME_KEY = 'jt-theme'
const MAP_STYLE_KEY = 'jt-map-style'

type Theme = 'light' | 'dark'

interface Discovery {
  origin: LatLng
  originLabel: string
  originSecondary?: string
  /** GPS results already have the blue "you are here" dot, so they skip the landmark pin. */
  showOriginPin: boolean
  /** null = "3 nearest" mode; a number = show everything inside that radius. */
  radiusKm: number | null
  selectedId: string | null
}

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
      <path d="M3 11l8-8 10 10-8 8L3 11z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M12 8.5v4l3 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RecenterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function initialTheme(fromUrl: string): Theme {
  if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialMapStyle(fromUrl: string, theme: Theme): string {
  if (fromUrl) return resolveMapStyle(fromUrl).id
  const stored = localStorage.getItem(MAP_STYLE_KEY)
  if (stored) return resolveMapStyle(stored).id
  return theme === 'dark' ? DEFAULT_DARK_STYLE : DEFAULT_LIGHT_STYLE
}

function App() {
  const [initialUrl] = useState(readUrlState)

  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const controllerRef = useRef<MapController | null>(null)

  const [theme, setTheme] = useState<Theme>(() => initialTheme(initialUrl.theme))
  const [mapStyleId, setMapStyleId] = useState(() => initialMapStyle(initialUrl.map, initialTheme(initialUrl.theme)))

  const [discovery, setDiscovery] = useState<Discovery | null>(() => {
    if (initialUrl.lat === null || initialUrl.lng === null) return null
    return {
      origin: { lat: initialUrl.lat, lng: initialUrl.lng },
      originLabel: initialUrl.loc || 'Lokasi tersimpan',
      originSecondary: initialUrl.loc2 || undefined,
      showOriginPin: true,
      radiusKm: initialUrl.radius,
      selectedId: initialUrl.dp || null,
    }
  })

  const filters = useDropPointFilters(userLocation, {
    search: initialUrl.q,
    province: initialUrl.province,
    model: initialUrl.model,
    fungsi: initialUrl.fungsi,
    agent: initialUrl.agent,
  })

  const mapStyle = useMemo(() => resolveMapStyle(mapStyleId), [mapStyleId])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(MAP_STYLE_KEY, mapStyleId)
  }, [mapStyleId])

  // Every result for the active discovery session, nearest first.
  const discoveryResults = useMemo<NearestResult[]>(() => {
    if (!discovery) return []
    const ranked = dropPoints
      .map((point) => ({ point, distanceKm: haversineDistanceKm(discovery.origin, point) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
    if (discovery.radiusKm === null) return ranked.slice(0, NEAREST_COUNT)
    return ranked.filter((r) => r.distanceKm <= discovery.radiusKm!)
  }, [discovery])

  const selectedResult = useMemo(() => {
    if (!discovery?.selectedId) return null
    return discoveryResults.find((r) => r.point.id === discovery.selectedId) ?? null
  }, [discovery, discoveryResults])

  const isRadiusMode = discovery !== null && discovery.radiusKm !== null
  const hasDrilledIn = Boolean(selectedResult)

  // Ranked pins with connectors — only in "3 nearest" mode, or the single
  // drilled-into point. Radius mode uses ordinary clustered pins instead, so a
  // point is never drawn twice (which previously stacked two markers).
  const highlightPoints = useMemo(() => {
    if (!discovery) return []
    if (selectedResult) return [selectedResult.point]
    if (isRadiusMode) return []
    return discoveryResults.map((r) => r.point)
  }, [discovery, selectedResult, isRadiusMode, discoveryResults])

  const mapPoints = useMemo(() => {
    if (!discovery) return filters.filtered
    if (selectedResult) return []
    if (isRadiusMode) return discoveryResults.map((r) => r.point)
    return []
  }, [discovery, selectedResult, isRadiusMode, discoveryResults, filters.filtered])

  // The origin pin, radius circle and connectors all disappear once the user
  // drills into a single result. Connectors additionally need `highlightPoints`
  // to be non-empty, which radius mode already guarantees is the case.
  const overlayOrigin = discovery && !hasDrilledIn ? discovery.origin : null
  const showOriginPin = Boolean(overlayOrigin && discovery?.showOriginPin)
  const circleRadiusKm = overlayOrigin ? discovery!.radiusKm : null

  // Keep the address bar in sync so the current view is always shareable.
  useEffect(() => {
    writeUrlState({
      q: filters.search,
      province: filters.province,
      model: filters.model,
      fungsi: filters.fungsi,
      agent: filters.agent,
      lat: discovery?.origin.lat ?? null,
      lng: discovery?.origin.lng ?? null,
      loc: discovery?.originLabel ?? '',
      loc2: discovery?.originSecondary ?? '',
      radius: discovery?.radiusKm ?? null,
      dp: discovery?.selectedId ?? '',
      theme,
      map: mapStyleId,
    })
  }, [
    filters.search,
    filters.province,
    filters.model,
    filters.fungsi,
    filters.agent,
    discovery,
    theme,
    mapStyleId,
  ])

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

  const handleRecenter = useCallback(() => controllerRef.current?.resetView(), [])

  const exitDiscovery = useCallback(() => {
    setDiscovery(null)
    setModalOpen(false)
  }, [])

  const handleSelectPoint = useCallback((point: DropPoint) => {
    controllerRef.current?.focusPoint(point)
    setSidebarOpen(false)
    setModalOpen(false)
    setDiscovery(null)
  }, [])

  const handleSelectResultCard = useCallback((point: DropPoint) => {
    setDiscovery((prev) => (prev ? { ...prev, selectedId: point.id } : prev))
    controllerRef.current?.focusHighlighted(point)
    setModalOpen(false)
  }, [])

  const openDiscovery = useCallback(
    (loc: LatLng, originLabel: string, originSecondary: string | undefined, showPin: boolean) => {
      setDiscovery({
        origin: loc,
        originLabel,
        originSecondary,
        showOriginPin: showPin,
        radiusKm: null,
        selectedId: null,
      })
      setModalOpen(true)
      const nearest = dropPoints
        .map((point) => ({ point, distanceKm: haversineDistanceKm(loc, point) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, NEAREST_COUNT)
        .map((r) => r.point)
      // Deferred so this fit wins over any in-flight flyTo triggered by a
      // userLocation update from the same gesture (e.g. first-time GPS locate).
      setTimeout(() => controllerRef.current?.fitPoints([loc, ...nearest]), 0)
    },
    [],
  )

  const handleFindNearest = useCallback(() => {
    if (userLocation) {
      openDiscovery(userLocation, 'Lokasi Anda saat ini', undefined, false)
    } else {
      requestLocation((loc) => openDiscovery(loc, 'Lokasi Anda saat ini', undefined, false))
    }
  }, [openDiscovery, requestLocation, userLocation])

  const handleSelectPlace = useCallback(
    (place: GeocodeResult) => {
      openDiscovery({ lat: place.lat, lng: place.lng }, place.label, place.secondary, true)
    },
    [openDiscovery],
  )

  const handleChangeRadius = useCallback(
    (radiusKm: number | null) => {
      setDiscovery((prev) => (prev ? { ...prev, radiusKm, selectedId: null } : prev))
      setModalOpen(true)
      if (!discovery) return
      const origin = discovery.origin
      const ranked = dropPoints
        .map((point) => ({ point, distanceKm: haversineDistanceKm(origin, point) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
      const inScope =
        radiusKm === null
          ? ranked.slice(0, NEAREST_COUNT)
          : ranked.filter((r) => r.distanceKm <= radiusKm)
      const targets: LatLng[] = [origin, ...inScope.map((r) => r.point)]
      setTimeout(() => controllerRef.current?.fitPoints(targets), 0)
    },
    [discovery],
  )

  const handleShowList = useCallback(() => {
    setDiscovery((prev) => (prev ? { ...prev, selectedId: null } : prev))
    setModalOpen(true)
  }, [])

  const resultCountLabel = useMemo(
    () => filters.filtered.length.toLocaleString('id-ID'),
    [filters.filtered.length],
  )

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      // Keep the paired default basemaps in step with the theme, but never
      // override a deliberate choice like satellite.
      setMapStyleId((style) => {
        if (next === 'dark' && style === DEFAULT_LIGHT_STYLE) return DEFAULT_DARK_STYLE
        if (next === 'light' && style === DEFAULT_DARK_STYLE) return DEFAULT_LIGHT_STYLE
        return style
      })
      return next
    })
  }, [])

  return (
    <div className="app">
      <div className={`sidebar-shell ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          filters={filters}
          userLocation={userLocation}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSelectPoint={handleSelectPoint}
          onFilterInteract={exitDiscovery}
        />
      </div>

      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

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
          <div className="updated-chip">Jawa &amp; Bali · {resultCountLabel} titik</div>
        </div>

        <div className="map-search-dock">
          <TopSearchBar
            value={filters.search}
            onChange={filters.setSearch}
            allPoints={dropPoints}
            onSelectPoint={handleSelectPoint}
            onSelectPlace={handleSelectPlace}
            onClear={exitDiscovery}
          />
          {discovery && (
            <DiscoveryBanner
              label={discovery.originLabel}
              resultCount={discoveryResults.length}
              radiusKm={discovery.radiusKm}
              selectedName={selectedResult?.point.name ?? null}
              onChangeRadius={handleChangeRadius}
              onShowList={handleShowList}
              onExit={exitDiscovery}
            />
          )}
        </div>

        <div className="map-fabs">
          <MapStyleSwitcher value={mapStyleId} onChange={setMapStyleId} />
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
            className="fab-btn fab-btn--icon"
            onClick={handleRecenter}
            title="Kembali ke tampilan Jawa &amp; Bali"
            aria-label="Kembali ke tampilan Jawa &amp; Bali"
          >
            <RecenterIcon />
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

        <MapView
          points={mapPoints}
          highlightPoints={highlightPoints}
          userLocation={userLocation}
          origin={overlayOrigin}
          originLabel={discovery?.originLabel ?? ''}
          showOriginPin={showOriginPin}
          radiusKm={circleRadiusKm}
          mapStyle={mapStyle}
          controllerRef={controllerRef}
        />
      </div>

      <ResultsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        originLabel={discovery?.originLabel ?? ''}
        originSecondary={discovery?.originSecondary}
        radiusKm={discovery?.radiusKm ?? null}
        results={discoveryResults}
        onSelectPoint={handleSelectResultCard}
      />
    </div>
  )
}

export default App
