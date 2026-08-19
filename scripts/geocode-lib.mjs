// Shared address parsing + Nominatim lookup used by the geocode audit scripts.
// Indonesian DP addresses follow a loose "JL. X NO. Y, KEL. Z, KEC. W, KAB. V"
// shape, so we parse the parts out and query from most to least specific. The
// tier that answers tells us how much to trust the coordinate.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const UA = 'jnt-maps-coordinate-audit/1.0 (internal drop point data QA)';
const MIN_INTERVAL_MS = 1100; // Nominatim usage policy: max 1 request/second.

let lastCall = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- address parts

const ADMIN_NOISE = /\b(?:rt|rw)\b\.?\s*\d+(?:\s*\/\s*(?:rt|rw)?\b\.?\s*\d+)?/gi;

// Longest key first: "MAYJEND" must beat "JEND". The `\.?` sits AFTER the word
// boundary, which is what actually consumes the trailing dot — `\bJL\.?\b` does
// not, because "." and " " are both non-word so no boundary follows the dot.
const STREET_ABBREV = [
  ['MAYJEND', 'Mayor Jenderal'],
  ['LETJEND', 'Letnan Jenderal'],
  ['JEND', 'Jenderal'],
  ['PERUM', 'Perumahan'],
  ['KOMP', 'Komplek'],
  ['PROF', 'Prof'],
  ['JLN', 'Jalan'],
  ['JL', 'Jalan'],
  ['GG', 'Gang'],
  ['RY', 'Raya'],
  ['GN', 'Gunung'],
  ['TKD', 'Tukad'],
  ['PS', 'Pasar'],
  ['DR', 'Dr'],
];

// Compass abbreviations inside admin names ("Bogor Sel." -> "Bogor Selatan").
const COMPASS = [
  ['SEL', 'Selatan'],
  ['UT', 'Utara'],
  ['TIM', 'Timur'],
  ['BAR', 'Barat'],
  ['TENG', 'Tengah'],
  ['PUS', 'Pusat'],
];

function squash(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function titleish(value) {
  return squash(value)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function expandCompass(value) {
  let s = value;
  for (const [abbr, full] of COMPASS) {
    s = s.replace(new RegExp(String.raw`\b${abbr}\b\.`, 'gi'), full);
  }
  return s;
}

/** Expand the abbreviations OSM does not index well. */
function normaliseStreet(value) {
  let s = ` ${value} `;
  for (const [abbr, full] of STREET_ABBREV) {
    s = s.replace(new RegExp(String.raw`\b${abbr}\b\.?`, 'gi'), full);
  }
  s = s.replace(ADMIN_NOISE, ' ');
  return squash(s);
}

/** Drop "(BARAT SMKN 4)" style landmark hints — they never match OSM. */
function stripLandmark(value) {
  return String(value ?? '').replace(/\([^)]*\)/g, ' ');
}

// Alternations list the long form first, or "KAB" swallows "KABUPATEN" and
// leaves "UPATEN BADUNG" behind.
const KEL_RE = /\b(?:KELURAHAN|KEL\/DESA|DESA|KEL|DS)\b\.?\s*([^,]+)/i;
const KEC_RE = /\b(?:KECAMATAN|KEC)\b\.?\s*([^,]+)/i;
const KAB_RE = /\b(?:KABUPATEN|KOTAMADYA|KOTA|KAB)\b\.?\s*([^,]+)/i;

export function parseAddress(raw) {
  const cleaned = squash(stripLandmark(raw));
  const segments = cleaned.split(',').map((s) => s.trim()).filter(Boolean);

  const kelurahan = cleaned.match(KEL_RE)?.[1];
  const kecamatan = cleaned.match(KEC_RE)?.[1];
  const kabupaten = cleaned.match(KAB_RE)?.[1];

  // The street is the first segment that is not itself an admin label.
  const streetSeg =
    segments.find(
      (s) => !KEL_RE.test(s) && !KEC_RE.test(s) && !KAB_RE.test(s) && /[a-z]/i.test(s),
    ) ??
    segments[0] ??
    '';

  const houseNumber = streetSeg.match(/\bNO\b\.?\s*([0-9]+[A-Za-z]?)/i)?.[1];
  const streetOnly = normaliseStreet(
    streetSeg.replace(/\bNO\b\.?\s*[0-9]+[A-Za-z]?.*$/i, '').replace(/\bKM\b\.?\s*[\d.]+/i, ''),
  );

  return {
    street: normaliseStreet(streetSeg),
    streetOnly,
    houseNumber,
    kelurahan: kelurahan ? titleish(expandCompass(kelurahan)) : undefined,
    kecamatan: kecamatan ? titleish(expandCompass(kecamatan)) : undefined,
    kabupaten: kabupaten ? titleish(expandCompass(kabupaten)) : undefined,
  };
}

// ---------------------------------------------------------------- nominatim

async function rateLimitedFetch(url) {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  let res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 429 || res.status === 503) {
    await sleep(5000);
    lastCall = Date.now();
    res = await fetch(url, { headers: { 'User-Agent': UA } });
  }
  return res;
}

async function query(params) {
  const url = `${NOMINATIM}?${new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'id',
    'accept-language': 'id',
    ...params,
  })}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return data[0] ?? null;
}

// The tier caps how good a hit can be; what came back caps it further. A
// structured street+number query still answers with `addresstype: "road"` when
// OSM has no house number on that street, and a road hit is a centroid of the
// whole road — on a long road that is kilometres from the real door. So the
// final precision is the weaker of the two.
const TIER_CAP = {
  'street+number': 'building',
  'street+kec': 'street',
  'street+kota': 'street',
  kelurahan: 'locality',
  kecamatan: 'locality',
};

const BUILDING_TYPES = new Set(['building', 'house', 'amenity', 'shop', 'place', 'commercial']);
const STREET_TYPES = new Set(['road', 'street']);

const RANK = { building: 3, street: 2, locality: 1, none: 0 };

function precisionOf(tier, addresstype) {
  const cap = TIER_CAP[tier] ?? 'locality';
  let actual = 'locality';
  if (BUILDING_TYPES.has(addresstype)) actual = 'building';
  else if (STREET_TYPES.has(addresstype)) actual = 'street';
  return RANK[actual] < RANK[cap] ? actual : cap;
}

export async function geocodeAddress(raw, point) {
  const p = parseAddress(raw);
  const city = p.kabupaten || point.levelKota;
  const state = point.province;

  const attempts = [];
  if (p.streetOnly && p.houseNumber) {
    attempts.push([
      'street+number',
      { street: `${p.houseNumber} ${p.streetOnly}`, city, state, country: 'Indonesia' },
    ]);
  }
  if (p.streetOnly && p.kecamatan) {
    attempts.push([
      'street+kec',
      { q: `${p.streetOnly}, ${p.kecamatan}, ${city}, ${state}, Indonesia` },
    ]);
  }
  if (p.streetOnly) {
    attempts.push(['street+kota', { q: `${p.streetOnly}, ${city}, ${state}, Indonesia` }]);
  }
  if (p.kelurahan && p.kecamatan) {
    attempts.push([
      'kelurahan',
      { q: `${p.kelurahan}, ${p.kecamatan}, ${city}, ${state}, Indonesia` },
    ]);
  }
  if (p.kecamatan) {
    attempts.push(['kecamatan', { q: `${p.kecamatan}, ${city}, ${state}, Indonesia` }]);
  }

  for (const [tier, params] of attempts) {
    let hit = null;
    try {
      hit = await query(params);
    } catch {
      continue;
    }
    if (!hit) continue;
    return {
      tier,
      precision: precisionOf(tier, hit.addresstype),
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      addresstype: hit.addresstype,
      placeRank: hit.place_rank,
      displayName: hit.display_name,
      parsed: p,
    };
  }
  return { tier: 'none', precision: 'none', parsed: p };
}

// ---------------------------------------------------------------- disk cache

export async function loadCache(file) {
  if (!existsSync(file)) return {};
  return JSON.parse(await readFile(file, 'utf-8'));
}

export async function saveCache(file, cache) {
  await writeFile(file, JSON.stringify(cache), 'utf-8');
}
