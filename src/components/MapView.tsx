import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import type { DropPoint } from '../types/dropPoint'
import type { LatLng } from '../lib/geo'

export interface MapController {
  focusPoint: (point: DropPoint) => void
}

const MODEL_COLOR_VAR: Record<string, string> = {
  Franchise: 'var(--franchise)',
  Agent: 'var(--agent)',
  'TC Agent': 'var(--tc)',
}

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
  controllerRef: React.MutableRefObject<MapController | null>
}

function ClusterLayer({ points, controllerRef }: ClusterLayerProps) {
  const map = useMap()
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersById = useRef<Map<string, L.Marker>>(new Map())

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
    return () => {
      map.removeLayer(cluster)
      clusterRef.current = null
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
    map.flyTo([location.lat, location.lng], 12)
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

interface MapViewProps {
  points: DropPoint[]
  userLocation: LatLng | null
  controllerRef: React.MutableRefObject<MapController | null>
}

const JAWA_BALI_CENTER: [number, number] = [-7.3, 109.5]

export function MapView({ points, userLocation, controllerRef }: MapViewProps) {
  return (
    <MapContainer
      center={JAWA_BALI_CENTER}
      zoom={8}
      className="map-view"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClusterLayer points={points} controllerRef={controllerRef} />
      <UserLocationLayer location={userLocation} />
    </MapContainer>
  )
}
