import { readFile } from 'node:fs/promises';
import { geocodeAddress } from '../geocode-lib.mjs';

const pts = JSON.parse(await readFile('src/data/dropPoints.json', 'utf-8'));
const R = 6371;
const dist = (a, b) => {
  const t = (d) => (d * Math.PI) / 180;
  const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const dec = (v) => { const s = String(v); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };

const flagged = ['NRG01A','DPS54','WHO13','WHO22','GER03','KEF01','BGR40','SBG15A'];
const sample = [
  ...pts.filter(p => flagged.includes(p.id)),
  ...pts.filter(p => !flagged.includes(p.id) && p.address && Math.min(dec(p.lat),dec(p.lng)) >= 5)
       .filter((_, i) => i % 79 === 0).slice(0, 22),
];

console.log('id\ttier\tprec\tdist_km\tprov\taddr');
const rows = [];
for (const p of sample) {
  const g = await geocodeAddress(p.address, p);
  const d = g.lat != null ? dist(p, g) : null;
  rows.push({ id: p.id, tier: g.tier, prec: g.precision, d });
  console.log(`${p.id}\t${g.tier}\t${g.precision}\t${d == null ? '-' : d.toFixed(2)}\t${p.province}\t${p.address.slice(0,45)}`);
  if (g.displayName) console.log(`\t\t-> ${g.displayName.slice(0,90)}`);
}
const ok = rows.filter(r => r.d != null);
const med = (a) => { const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
console.log('\n--- summary ---');
console.log('hit rate:', ok.length + '/' + rows.length);
for (const t of ['street+number','street+kec','street+kota','kelurahan','kecamatan','none']) {
  const g = rows.filter(r => r.tier === t);
  if (!g.length) continue;
  const ds = g.filter(r=>r.d!=null).map(r=>r.d);
  console.log(`${t}: n=${g.length} median=${ds.length?med(ds).toFixed(2):'-'}km max=${ds.length?Math.max(...ds).toFixed(2):'-'}km`);
}
console.log('overall median dist:', med(ok.map(r=>r.d)).toFixed(2), 'km');
