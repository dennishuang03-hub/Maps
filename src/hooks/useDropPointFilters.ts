import { useMemo, useState } from 'react'
import { dropPoints } from '../data/dropPoints'
import { haversineDistanceKm, type LatLng } from '../lib/geo'
import type { DropPoint } from '../types/dropPoint'

export function useDropPointFilters(userLocation: LatLng | null) {
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('')
  const [model, setModel] = useState('')
  const [fungsi, setFungsi] = useState('')

  const provinces = useMemo(
    () => [...new Set(dropPoints.map((d) => d.province))].sort(),
    [],
  )
  const models = useMemo(() => [...new Set(dropPoints.map((d) => d.model))].sort(), [])
  const fungsis = useMemo(() => [...new Set(dropPoints.map((d) => d.fungsi))].sort(), [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = dropPoints.filter((d) => {
      const matchQ =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.hub.toLowerCase().includes(q) ||
        d.kecamatan.toLowerCase().includes(q)
      const matchP = !province || d.province === province
      const matchM = !model || d.model === model
      const matchF = !fungsi || d.fungsi === fungsi
      return matchQ && matchP && matchM && matchF
    })

    if (!userLocation) return matches

    return [...matches].sort(
      (a, b) => haversineDistanceKm(userLocation, a) - haversineDistanceKm(userLocation, b),
    )
  }, [search, province, model, fungsi, userLocation])

  const resetFilters = () => {
    setSearch('')
    setProvince('')
    setModel('')
    setFungsi('')
  }

  const hasActiveFilters = Boolean(search || province || model || fungsi)

  return {
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
  }
}

export type DropPointFilters = ReturnType<typeof useDropPointFilters>
export type { DropPoint }
