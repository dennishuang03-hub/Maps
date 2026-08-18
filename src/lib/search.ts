import type { DropPoint } from '../types/dropPoint'

export function matchesDropPointQuery(point: DropPoint, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    point.name.toLowerCase().includes(q) ||
    point.id.toLowerCase().includes(q) ||
    point.hub.toLowerCase().includes(q) ||
    point.kecamatan.toLowerCase().includes(q) ||
    point.province.toLowerCase().includes(q) ||
    point.levelKota.toLowerCase().includes(q) ||
    point.address.toLowerCase().includes(q)
  )
}

export function searchDropPoints(points: DropPoint[], query: string, limit = 6): DropPoint[] {
  const q = query.trim()
  if (!q) return []
  return points.filter((point) => matchesDropPointQuery(point, q)).slice(0, limit)
}
