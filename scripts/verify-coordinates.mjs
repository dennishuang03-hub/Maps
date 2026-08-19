// Cross-checks every drop point coordinate against an independent geocode of its
// own address, and writes a review report.
//
// It deliberately does NOT overwrite coordinates. Measured on a 30-point sample,
// Nominatim sits a median 1.16 km from the existing pins, and the existing pins
// are 5-8 decimal Google Maps captures — so a blanket replace would degrade the
// map. Geocoding is used here as a second opinion: it can only ever confirm a
// pin, or flag it for a human to re-capture.
//
// Results are cached on disk, so re-runs are cheap and an interrupted run
// resumes where it stopped.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geocodeAddress, loadCache, saveCache } from './geocode-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POINTS = path.join(__dirname, '..', 'src', 'data', 'dropPoints.json');
const CACHE = path.join(__dirname, '.geocode-cache.json');
const REPORT_JSON = path.join(__dirname, '..', 'src', 'data', 'coordinate-review.json');
const REPORT_CSV = path.join(__dirname, '..', 'coordinate-review.csv');

// How far a geocode of a given quality may sit from the existing pin before we
// treat the disagreement as real. A locality hit is a kecamatan centroid, which
// is legitimately kilometres from any given address, so it can never convict.
const TOLERANCE_KM = { building: 0.5, street: 1.5, locality: 6 };

const EARTH_RADIUS_KM = 6371;

function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function decimals(value) {
  const s = String(value);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

function classify(point, geo, duplicateOf) {
  const existingDecimals = Math.min(decimals(point.lat), decimals(point.lng));
  // 2 decimals is about 1.1 km of slack, 3 about 110 m.
  const existingIsCoarse = existingDecimals <= 3;

  if (!point.address) return { verdict: 'no-address', action: 'need address' };
  if (geo.tier === 'none') {
    if (existingIsCoarse) return { verdict: 'unverified-coarse', action: 'recapture pin manually' };
    if (duplicateOf) return { verdict: 'unverified-duplicate', action: 'confirm shared pin' };
    return { verdict: 'unverified', action: 'none' };
  }

  const km = distanceKm(point, geo);
  const tolerance = TOLERANCE_KM[geo.precision];

  if (km <= tolerance) {
    return { verdict: 'confirmed', action: 'none', km };
  }

  // Disagreement. Whether it convicts the pin depends on how good the geocode is.
  if (geo.precision === 'locality') {
    // Only a gross error survives a locality-level check.
    return km > 15
      ? { verdict: 'suspect-gross', action: 'recapture pin manually', km }
      : { verdict: 'inconclusive', action: 'none', km };
  }

  if (existingIsCoarse) {
    // The geocode is street-or-better and the existing pin is a rounded number:
    // the geocode is the better of the two.
    return { verdict: 'replace-candidate', action: 'geocode beats coarse pin', km };
  }

  return { verdict: 'suspect', action: 'review against Google Maps', km };
}

async function main() {
  const points = JSON.parse(await readFile(POINTS, 'utf-8'));
  const cache = await loadCache(CACHE);

  // Points sharing one coordinate — a copy-paste smell worth carrying into the report.
  const byCoord = new Map();
  for (const p of points) {
    const key = `${p.lat},${p.lng}`;
    if (!byCoord.has(key)) byCoord.set(key, []);
    byCoord.get(key).push(p.id);
  }

  const rows = [];
  let done = 0;
  let fetched = 0;

  for (const p of points) {
    const key = `${p.id}::${p.address}`;
    let geo = cache[key];
    if (!geo) {
      geo = p.address ? await geocodeAddress(p.address, p) : { tier: 'none', precision: 'none' };
      cache[key] = geo;
      fetched += 1;
      if (fetched % 25 === 0) await saveCache(CACHE, cache);
    }

    const shared = byCoord.get(`${p.lat},${p.lng}`).filter((id) => id !== p.id);
    const { verdict, action, km } = classify(p, geo, shared.length > 0);

    rows.push({
      id: p.id,
      name: p.name,
      province: p.province,
      kota: p.levelKota,
      kecamatan: p.kecamatan,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      geocodeLat: geo.lat ?? null,
      geocodeLng: geo.lng ?? null,
      geocodeTier: geo.tier,
      geocodePrecision: geo.precision,
      geocodeMatch: geo.displayName ?? '',
      distanceKm: km == null ? null : Number(km.toFixed(3)),
      sharesCoordinateWith: shared,
      verdict,
      action,
      googleMaps: `https://www.google.com/maps?q=${p.lat},${p.lng}`,
    });

    done += 1;
    if (done % 50 === 0) console.log(`  ${done}/${points.length} (${fetched} fetched)`);
  }

  await saveCache(CACHE, cache);

  const order = [
    'suspect-gross',
    'suspect',
    'replace-candidate',
    'unverified-coarse',
    'no-address',
    'unverified-duplicate',
    'inconclusive',
    'unverified',
    'confirmed',
  ];
  rows.sort((a, b) => order.indexOf(a.verdict) - order.indexOf(b.verdict));

  await writeFile(REPORT_JSON, JSON.stringify(rows, null, 2), 'utf-8');

  const cols = [
    'id', 'name', 'province', 'kota', 'kecamatan', 'address',
    'lat', 'lng', 'geocodeLat', 'geocodeLng', 'geocodeTier', 'geocodePrecision',
    'geocodeMatch', 'distanceKm', 'sharesCoordinateWith', 'verdict', 'action', 'googleMaps',
  ];
  const csvCell = (v) => {
    const s = Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(',')]
    .concat(rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')))
    .join('\n');
  await writeFile(REPORT_CSV, '\ufeff' + csv, 'utf-8');

  const tally = {};
  for (const r of rows) tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;
  console.log('\n--- verdicts ---');
  for (const v of order) if (tally[v]) console.log(`${v}: ${tally[v]}`);
  console.log(`\nreport: ${path.relative(process.cwd(), REPORT_CSV)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
