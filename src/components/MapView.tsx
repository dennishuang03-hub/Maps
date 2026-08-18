import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import type { DropPoint } from '../types/dropPoint'
import type { LatLng } from '../lib/geo'
import type { MapStyle } from '../lib/mapStyles'

export interface MapController {
  focusPoint: (point: DropPoint) => void
  focusHighlighted: (point: DropPoint) => void
  fitPoints: (points: LatLng[]) => void
}

const MODEL_COLOR_VAR: Record<string, string> = {
  Franchise: 'var(--franchise)',
  Agent: 'var(--agent)',
  'TC Agent': 'var(--tc)',
}

const RANK_RING_VAR = ['var(--gold)', 'var(--silver)', 'var(--bronze)']

function pointIcon(model: string) {
  const color = MODEL_COLOR_VAR[model] ?? 'var(--muted)'
  return L.divIcon({
    className: '',
    html: `<span class="dp-pin" style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  })
}

function userIcon() {
  return L.divIcon({
    className: '',
    html: '<span class="dp-user-dot"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function highlightIcon(rank: number) {
  const ring = RANK_RING_VAR[rank] ?? 'var(--jt-red)'
  return L.divIcon({
    className: '',
    html: `<span class="dp-highlight-pin" style="--ring:${ring}"><span class="dp-highlight-pin__dot"></span><span class="dp-highlight-pin__rank">${rank + 1}</span></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

function originIcon() {
  return L.divIcon({
    className: '',
    html: '<span class="dp-origin-pin"><span class="dp-origin-pin__glyph">&#9733;</span></span>',
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    popupAnchor: [0, -34],
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function popupHtml(point: DropPoint): string {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`
  return `
    <div class="dp-popup">
      <span class="dp-popup__badge" style="background:${MODEL_COLOR_VAR[point.model] ?? 'var(--muted)'}">${escapeHtml(point.model)}</span>
      <div class="dp-popup__title">${escapeHtml(point.name)}</div>
      <div class="dp-popup__row"><span>Kode</span><strong>${escapeHtml(point.id)}</strong></div>
      <div class="dp-popup__row"><span>Hub</span><strong>${escapeHtml(point.hub)}</strong></div>
      <div class="dp-popup__row"><span>Kecamatan</span><strong>${escapeHtml(point.kecamatan)}</strong></div>
      <div class="dp-popup__address">${escapeHtml(point.address)}</div>
      <div class="dp-popup__row"><span>Fungsi</span><strong>${escapeHtml(point.fungsi)}</strong></div>
      <div class="dp-popup__row"><span>Jam</span><strong>${escapeHtml(point.hours)}</strong></div>
      <a class="dp-popup__link" target="_blank" rel="noopener noreferrer" href="${mapsUrl}">Buka di Google Maps</a>
    </div>
  `
}

interface ClusterLayerProps {
  points: DropPoint[]
  highlightPoints: DropPoint[]
  controllerRef: React.MutableRefObject<MapController | null>
}

function ClusterLayer({ points, highlightPoints, controllerRef }: ClusterLayerProps) {
  const map = useMap()
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersById = useRef<Map<string, L.Marker>>(new Map())
  const highlightGroupRef = useRef<L.LayerGroup | null>(null)
  const highlightMarkersById = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      iconCreateFunction: (c) =>
        L.divIcon({
          html: `<div>${c.getChildCount()}</div>`,
          className: 'dp-cluster',
          iconSize: [38, 38],
        }),
    })
    clusterRef.current = cluster
    map.addLayer(cluster)

    const highlightGroup = L.layerGroup()
    highlightGroupRef.current = highlightGroup
    map.addLayer(highlightGroup)

    return () => {
      map.removeLayer(cluster)
      map.removeLayer(highlightGroup)
      clusterRef.current = null
      highlightGroupRef.current = null
    }
  }, [map])

  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return

    cluster.clearLayers()
    markersById.current.clear()

    const markers = points.map((point) => {
      const marker = L.marker([point.lat, point.lng], { icon: pointIcon(point.model) })
      marker.bindPopup(popupHtml(point))
      markersById.current.set(point.id, marker)
      return marker
    })
    cluster.addLayers(markers)
  }, [points])

  useEffect(() => {
    const group = highlightGroupRef.current
    if (!group) return

    group.clearLayers()
    highlightMarkersById.current.clear()

    highlightPoints.forEach((point, rank) => {
      const marker = L.marker([point.lat, point.lng], { icon: highlightIcon(rank), zIndexOffset: 1000 })
      marker.bindPopup(popupHtml(point))
      marker.addTo(group)
      highlightMarkersById.current.set(point.id, marker)
    })
  }, [highlightPoints])

  useEffect(() => {
    controllerRef.current = {
      focusPoint: (point) => {
        const cluster = clusterRef.current
        const marker = markersById.current.get(point.id)
        if (cluster && marker) {
          cluster.zoomToShowLayer(marker, () => marker.openPopup())
        } else {
          map.flyTo([point.lat, point.lng], 15)
        }
      },
      focusHighlighted: (point) => {
        map.flyTo([point.lat, point.lng], 16)
        // Looked up lazily: by the time the flight ends, the highlight
        // layer will have already rebuilt down to just this one marker.
        map.once('moveend', () => {
          highlightMarkersById.current.get(point.id)?.openPopup()
        })
      },
      fitPoints: (pts) => {
        if (pts.length === 0) return
        if (pts.length === 1) {
          map.flyTo([pts[0].lat, pts[0].lng], 15)
          return
        }
        const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number]))
        map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 16 })
      },
    }
    return () => {
      controllerRef.current = null
    }
  }, [map, controllerRef])

  return null
}

function UserLocationLayer({ location }: { location: LatLng | null }) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!location) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
      return
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([location.lat, location.lng], { icon: userIcon() })
        .bindPopup('Lokasi Anda')
        .addTo(map)
    } else {
      markerRef.current.setLatLng([location.lat, location.lng])
    }
    map.flyTo([location.lat, location.lng], 15)
  }, [location, map])

  useEffect(
    () => () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
    },
    [map],
  )

  return null
}

interface NearestOverlayLayerProps {
  origin: LatLng | null
  originLabel: string
  showOriginPin: boolean
  /** Points to draw dashed connectors to; empty in radius mode. */
  targets: DropPoint[]
  radiusKm: number | null
}

function NearestOverlayLayer({ origin, originLabel, showOriginPin, targets, radiusKm }: NearestOverlayLayerProps) {
  const map = useMap()
  const groupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const group = L.layerGroup()
    groupRef.current = group
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
      groupRef.current = null
    }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    group.clearLayers()
    if (!origin) return

    if (radiusKm !== null) {
      L.circle([origin.lat, origin.lng], {
        radius: radiusKm * 1000,
        className: 'dp-radius-circle',
        weight: 2,
        dashArray: '7 7',
        interactive: false,
      }).addTo(group)
    }

    targets.forEach((point) => {
      const path: [number, number][] = [
        [origin.lat, origin.lng],
        [point.lat, point.lng],
      ]
      // A soft, wider "halo" line under the real dashed line gives a subtle
      // 3D lift without relying on an SVG drop-shadow filter, which renders
      // as a solid smear on tightly-dashed long paths in Chromium.
      L.polyline(path, {
        className: 'dp-connector-halo',
        weight: 7,
        lineCap: 'round',
        interactive: false,
      }).addTo(group)
      L.polyline(path, {
        className: 'dp-connector-line',
        weight: 2.5,
        dashArray: '9 8',
        lineCap: 'round',
        interactive: false,
      }).addTo(group)
    })

    if (showOriginPin) {
      L.marker([origin.lat, origin.lng], { icon: originIcon(), zIndexOffset: 900 })
        .bindPopup(`<div class="dp-popup"><div class="dp-popup__title">${escapeHtml(originLabel)}</div></div>`)
        .addTo(group)
    }
  }, [origin, originLabel, showOriginPin, targets, radiusKm])

  return null
}

interface MapViewProps {
  points: DropPoint[]
  highlightPoints: DropPoint[]
  userLocation: LatLng | null
  origin: LatLng | null
  originLabel: string
  showOriginPin: boolean
  radiusKm: number | null
  mapStyle: MapStyle
  controllerRef: React.MutableRefObject<MapController | null>
}

const JAWA_BALI_CENTER: [number, number] = [-7.3, 109.5]

export function MapView({
  points,
  highlightPoints,
  userLocation,
  origin,
  originLabel,
  showOriginPin,
  radiusKm,
  mapStyle,
  controllerRef,
}: MapViewProps) {
  return (
    <MapContainer
      center={JAWA_BALI_CENTER}
      zoom={8}
      className="map-view"
      zoomControl={false}
    >
      <TileLayer
        key={mapStyle.id}
        attribution={mapStyle.attribution}
        url={mapStyle.url}
        maxZoom={mapStyle.maxZoom}
        {...(mapStyle.subdomains ? { subdomains: mapStyle.subdomains } : {})}
      />
      <ClusterLayer points={points} highlightPoints={highlightPoints} controllerRef={controllerRef} />
      <UserLocationLayer location={userLocation} />
      <NearestOverlayLayer
        origin={origin}
        originLabel={originLabel}
        showOriginPin={showOriginPin}
        targets={highlightPoints}
        radiusKm={radiusKm}
      />
    </MapContainer>
  )
}
