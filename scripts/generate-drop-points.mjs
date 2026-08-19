import ExcelJS from 'exceljs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_XLSX = path.join(__dirname, '..', 'src', 'Excel', 'JAWA_BALI_MAPS_UPDATED.xlsx');
const OUT_JSON = path.join(__dirname, '..', 'src', 'data', 'dropPoints.json');

// The workbook carries audit/log sheets alongside the master data. Read the master
// sheet by name — worksheets[0] is an audit log, not the drop point table.
const DATA_SHEET = 'Sheet1';

const COL = {
  hub: 2,
  kodeDp: 3,
  namaDp: 4,
  modelBisnis: 8,
  provinsi: 10,
  kota: 11,
  kecamatan: 12,
  fungsiDp: 16,
  // "Pusat Finansial" — the AGENT12..AGENT40 grouping shown in the Agent filter.
  agent: 17,
  levelAgent: 7,
  jemari: 24,
  alamat: 36,
  longitude: 37,
  latitude: 38,
  jamOperasional: 40,
};

function titleCase(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function cleanHub(value) {
  if (!value) return '';
  // Strip trailing non-Latin script (some hub names carry a Chinese translation appended).
  return String(value).replace(/[^\x00-\x7F]/g, '').trim();
}

function cleanName(value) {
  if (!value) return '';
  return String(value).replace(/_/g, ' ').trim();
}

function formatHours(value) {
  if (!value || value === '--') return 'Tidak tersedia';
  const [start, end] = String(value).split('--');
  const trim = (t) => (t ? t.slice(0, 5) : '');
  if (!start || !end) return 'Tidak tersedia';
  return `${trim(start)} – ${trim(end)}`;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE_XLSX);
  const sheet = workbook.getWorksheet(DATA_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${DATA_SHEET}" not found in ${path.basename(SOURCE_XLSX)}`);
  }

  const points = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    const id = row.getCell(COL.kodeDp).value;
    if (!id) return;

    const province = row.getCell(COL.provinsi).value;
    if (!province) return;

    const lat = row.getCell(COL.latitude).value;
    const lng = row.getCell(COL.longitude).value;
    if (lat === null || lat === undefined || lng === null || lng === undefined) return;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return;

    points.push({
      id: String(id).trim(),
      name: cleanName(row.getCell(COL.namaDp).value),
      hub: cleanHub(row.getCell(COL.hub).value),
      province: titleCase(province),
      levelKota: titleCase(row.getCell(COL.kota).value),
      kecamatan: titleCase(row.getCell(COL.kecamatan).value),
      model: row.getCell(COL.modelBisnis).value ?? '',
      fungsi: row.getCell(COL.fungsiDp).value ?? '',
      agent: String(row.getCell(COL.agent).value ?? '').trim(),
      levelAgent: row.getCell(COL.levelAgent).value ?? '',
      jemari: row.getCell(COL.jemari).value ?? 'Tidak',
      address: (row.getCell(COL.alamat).value ?? '').toString().trim(),
      lat: latNum,
      lng: lngNum,
      hours: formatHours(row.getCell(COL.jamOperasional).value),
    });
  });

  await writeFile(OUT_JSON, JSON.stringify(points), 'utf-8');
  console.log(`Wrote ${points.length} drop points to ${path.relative(process.cwd(), OUT_JSON)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
