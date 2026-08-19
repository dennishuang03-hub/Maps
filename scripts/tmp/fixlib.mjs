import { readFile, writeFile } from 'node:fs/promises';
const p='scripts/geocode-lib.mjs';
let s=await readFile(p,'utf-8');
const rep=(a,b)=>{ if(!s.includes(a)) throw new Error('no match: '+a.slice(0,50)); s=s.split(a).join(b); };

// `\bX\.?\b` never consumes the trailing dot (no boundary between "." and " ").
// Anchor on a lookahead instead so "JL." becomes "Jalan", not "Jalan.".
rep(`  let s = ` + "`" + ` \${value} ` + "`" + `;
  s = s.replace(/\bJL\.?\b/gi, 'Jalan');
  s = s.replace(/\bJLN\.?\b/gi, 'Jalan');
  s = s.replace(/\bGG\.?\b/gi, 'Gang');
  s = s.replace(/\bRY\.?\b/gi, 'Raya');
  s = s.replace(/\bKOMP\.?\b/gi, 'Komplek');
  s = s.replace(/\bPERUM\.?\b/gi, 'Perumahan');
  s = s.replace(/\bJEND\.?\b/gi, 'Jenderal');
  s = s.replace(/\bMAYJEND\.?\b/gi, 'Mayor Jenderal');
  s = s.replace(/\bLETJEND\.?\b/gi, 'Letnan Jenderal');
  s = s.replace(/\bKH\.?\b/g, 'KH');
  s = s.replace(/\bDR\.?\b/gi, 'Dr');
  s = s.replace(/\bPROF\.?\b/gi, 'Prof');
  s = s.replace(/\bGN\.?\b/gi, 'Gunung');
  s = s.replace(/\bTKD\.?\b/gi, 'Tukad');
  s = s.replace(/\bPS\.?\b/gi, 'Pasar');
  s = s.replace(ADMIN_NOISE, ' ');
  return stripDiacriticsAndNoise(s);`,
`  let s = ` + "`" + ` \${value} ` + "`" + `;
  for (const [abbr, full] of STREET_ABBREV) {
    s = s.replace(new RegExp(String.raw` + "`" + `\\b\${abbr}\\b\\.?` + "`" + `, 'gi'), full);
  }
  s = s.replace(ADMIN_NOISE, ' ');
  return stripDiacriticsAndNoise(s);`);

rep(`/** Expand the abbreviations OSM does not index well. */`,
`// Longest key first: "MAYJEND" must win over "JEND". Note \`\b\${abbr}\b\.?\` —
// putting \`\.?\` after the boundary is what actually consumes the trailing dot.
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

// Compass abbreviations in kecamatan names ("Bogor Sel." -> "Bogor Selatan").
const COMPASS = [
  ['SEL', 'Selatan'],
  ['UT', 'Utara'],
  ['TIM', 'Timur'],
  ['BAR', 'Barat'],
  ['TENG', 'Tengah'],
  ['PUS', 'Pusat'],
];

function expandCompass(value) {
  let s = value;
  for (const [abbr, full] of COMPASS) {
    s = s.replace(new RegExp(String.raw` + "`" + `\\b\${abbr}\\b\\.` + "`" + `, 'gi'), full);
  }
  return s;
}

/** Expand the abbreviations OSM does not index well. */`);

// Alternations must list the long form first or "KAB" swallows "KABUPATEN".
rep(`const KEL_RE = /\b(?:KEL|KELURAHAN|DESA|DS|KEL\/DESA)\.?\s*([^,]+)/i;
const KEC_RE = /\b(?:KEC|KECAMATAN)\.?\s*([^,]+)/i;
const KAB_RE = /\b(?:KAB|KABUPATEN|KOTA|KOTAMADYA)\.?\s*([^,]+)/i;`,
`const KEL_RE = /\b(?:KELURAHAN|KEL\/DESA|DESA|KEL|DS)\b\.?\s*([^,]+)/i;
const KEC_RE = /\b(?:KECAMATAN|KEC)\b\.?\s*([^,]+)/i;
const KAB_RE = /\b(?:KABUPATEN|KOTAMADYA|KOTA|KAB)\b\.?\s*([^,]+)/i;`);

rep(`    kelurahan: kelurahan ? titleish(kelurahan) : undefined,
    kecamatan: kecamatan ? titleish(kecamatan) : undefined,
    kabupaten: kabupaten ? titleish(kabupaten) : undefined,`,
`    kelurahan: kelurahan ? titleish(expandCompass(kelurahan)) : undefined,
    kecamatan: kecamatan ? titleish(expandCompass(kecamatan)) : undefined,
    kabupaten: kabupaten ? titleish(expandCompass(kabupaten)) : undefined,`);

await writeFile(p,s,'utf-8');
console.log('ok');
