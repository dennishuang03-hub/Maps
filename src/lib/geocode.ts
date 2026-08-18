export interface GeocodeResult {
  id: string
  label: string
  secondary: string
  category?: string
  lat: number
  lng: number
}

interface NominatimAddress {
  amenity?: string
  shop?: string
  mall?: string
  building?: string
  office?: string
  tourism?: string
  road?: string
  pedestrian?: string
  neighbourhood?: string
  suburb?: string
  village?: string
  city_district?: string
  city?: string
  town?: string
  municipality?: string
  county?: string
  state?: string
}

interface NominatimItem {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type?: string
  class?: string
  address?: NominatimAddress
  namedetails?: { name?: string }
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
// Rough bounding box around Jawa & Bali, used only to bias (not restrict) results.
const JAWA_BALI_VIEWBOX = '104.5,-5.5,116.0,-9.2'

// Friendly category labels for common Nominatim class/type pairs, so results
// read more like a Google Maps-style place list ("Mal", "Restoran", ...)
// instead of raw OSM tag names.
const CATEGORY_LABEL: Record<string, string> = {
  'shop:mall': 'Mal',
  'shop:supermarket': 'Supermarket',
  'shop:convenience': 'Minimarket',
  'amenity:mall': 'Mal',
  'amenity:marketplace': 'Pasar',
  'amenity:restaurant': 'Restoran',
  'amenity:cafe': 'Kafe',
  'amenity:fast_food': 'Restoran Cepat Saji',
  'amenity:hospital': 'Rumah Sakit',
  'amenity:clinic': 'Klinik',
  'amenity:school': 'Sekolah',
  'amenity:university': 'Universitas',
  'amenity:place_of_worship': 'Tempat Ibadah',
  'amenity:bank': 'Bank',
  'amenity:fuel': 'SPBU',
  'tourism:hotel': 'Hotel',
  'tourism:attraction': 'Tempat Wisata',
  'tourism:museum': 'Museum',
  'office:yes': 'Kantor',
  'building:residential': 'Perumahan',
  'building:apartments': 'Apartemen',
  'highway:residential': 'Jalan',
  'highway:primary': 'Jalan',
  'highway:secondary': 'Jalan',
  'place:suburb': 'Kelurahan/Kecamatan',
  'place:village': 'Desa',
  'place:town': 'Kota',
  'place:city': 'Kota',
  boundary: 'Wilayah Administratif',
}

function buildLabel(item: NominatimItem): { label: string; secondary: string } {
  const addr = item.address ?? {}
  const primary =
    item.namedetails?.name ||
    addr.amenity ||
    addr.shop ||
    addr.mall ||
    addr.tourism ||
    addr.office ||
    addr.building ||
    addr.road ||
    addr.pedestrian ||
    item.display_name.split(',')[0].trim()

  const localityParts = [
    addr.suburb || addr.neighbourhood || addr.village,
    addr.city_district,
    addr.city || addr.town || addr.municipality || addr.county,
    addr.state,
  ].filter((part): part is string => Boolean(part))

  const secondary = localityParts.length > 0 ? localityParts.join(', ') : item.display_name

  return { label: primary, secondary }
}

function buildCategory(item: NominatimItem): string | undefined {
  if (item.class === 'boundary') return CATEGORY_LABEL.boundary
  if (item.class && item.type) {
    return CATEGORY_LABEL[`${item.class}:${item.type}`]
  }
  return undefined
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    limit: '6',
    countrycodes: 'id',
    'accept-language': 'id',
    viewbox: JAWA_BALI_VIEWBOX,
    bounded: '0',
  })

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, { signal })
  if (!res.ok) throw new Error('Geocoding failed')

  const data = (await res.json()) as NominatimItem[]

  return data.map((item) => {
    const { label, secondary } = buildLabel(item)
    return {
      id: String(item.place_id),
      label,
      secondary,
      category: buildCategory(item),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }
  })
}
