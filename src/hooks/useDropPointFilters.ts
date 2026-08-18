import { useMemo, useState } from 'react'
import { dropPoints } from '../data/dropPoints'
import { haversineDistanceKm, type LatLng } from '../lib/geo'
import { matchesDropPointQuery } from '../lib/search'
import type { DropPoint } from '../types/dropPoint'

export interface InitialFilters {
  search?: string
  province?: string
  model?: string
  fungsi?: string
  agent?: string
}

/** AGENT12 … AGENT40 — sorted by their numeric suffix, not lexically. */
function agentOrder(value: string): number {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) : Number.MAX_SAFE_INTEGER
}

export function useDropPointFilters(userLocation: LatLng | null, initial: InitialFilters = {}) {
  const [search, setSearch] = useState(initial.search ?? '')
  const [province, setProvince] = useState(initial.province ?? '')
  const [model, setModel] = useState(initial.model ?? '')
  const [fungsi, setFungsi] = useState(initial.fungsi ?? '')
  const [agent, setAgent] = useState(initial.agent ?? '')

  const provinces = useMemo(
    () => [...new Set(dropPoints.map((d) => d.province))].sort(),
    [],
  )
  const models = useMemo(() => [...new Set(dropPoints.map((d) => d.model))].sort(), [])
  const fungsis = useMemo(() => [...new Set(dropPoints.map((d) => d.fungsi))].sort(), [])
  const agents = useMemo(
    () =>
      [...new Set(dropPoints.map((d) => d.agent))]
        .filter(Boolean)
        .sort((a, b) => agentOrder(a) - agentOrder(b)),
    [],
  )

  const filtered = useMemo(() => {
    const matches = dropPoints.filter((d) => {
      const matchQ = matchesDropPointQuery(d, search)
      const matchP = !province || d.province === province
      const matchM = !model || d.model === model
      const matchF = !fungsi || d.fungsi === fungsi
      const matchA = !agent || d.agent === agent
      return matchQ && matchP && matchM && matchF && matchA
    })

    if (!userLocation) return matches

    return [...matches].sort(
      (a, b) => haversineDistanceKm(userLocation, a) - haversineDistanceKm(userLocation, b),
    )
  }, [search, province, model, fungsi, agent, userLocation])

  const resetFilters = () => {
    setSearch('')
    setProvince('')
    setModel('')
    setFungsi('')
    setAgent('')
  }

  const hasActiveFilters = Boolean(search || province || model || fungsi || agent)

  return {
    search,
    setSearch,
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
  }
}

export type DropPointFilters = ReturnType<typeof useDropPointFilters>
export type { DropPoint }
