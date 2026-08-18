export interface UrlState {
  q: string
  province: string
  model: string
  fungsi: string
  agent: string
  /** Searched-location origin, when a discovery session is active. */
  lat: number | null
  lng: number | null
  loc: string
  loc2: string
  /** Radius in km; null means "3 nearest" mode. */
  radius: number | null
  /** Currently drilled-into Drop Point id. */
  dp: string
  theme: string
  map: string
}

const EMPTY: UrlState = {
  q: '',
  province: '',
  model: '',
  fungsi: '',
  agent: '',
  lat: null,
  lng: null,
  loc: '',
  loc2: '',
  radius: null,
  dp: '',
  theme: '',
  map: '',
}

function num(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function readUrlState(): UrlState {
  if (typeof window === 'undefined') return { ...EMPTY }
  const p = new URLSearchParams(window.location.search)
  return {
    q: p.get('q') ?? '',
    province: p.get('prov') ?? '',
    model: p.get('model') ?? '',
    fungsi: p.get('fungsi') ?? '',
    agent: p.get('agent') ?? '',
    lat: num(p.get('lat')),
    lng: num(p.get('lng')),
    loc: p.get('loc') ?? '',
    loc2: p.get('loc2') ?? '',
    radius: num(p.get('r')),
    dp: p.get('dp') ?? '',
    theme: p.get('theme') ?? '',
    map: p.get('map') ?? '',
  }
}

export function writeUrlState(state: Partial<UrlState>): void {
  if (typeof window === 'undefined') return
  const p = new URLSearchParams()

  const put = (key: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined) return
    const s = String(value)
    if (s === '') return
    p.set(key, s)
  }

  put('q', state.q)
  put('prov', state.province)
  put('model', state.model)
  put('fungsi', state.fungsi)
  put('agent', state.agent)
  if (state.lat !== null && state.lat !== undefined && state.lng !== null && state.lng !== undefined) {
    // 5 decimals ≈ 1 m precision, keeps shared links short.
    put('lat', state.lat.toFixed(5))
    put('lng', state.lng.toFixed(5))
    put('loc', state.loc)
    put('loc2', state.loc2)
    put('r', state.radius)
  }
  put('dp', state.dp)
  put('theme', state.theme)
  put('map', state.map)

  const query = p.toString()
  const next = `${window.location.pathname}${query ? `?${query}` : ''}`
  window.history.replaceState(null, '', next)
}
