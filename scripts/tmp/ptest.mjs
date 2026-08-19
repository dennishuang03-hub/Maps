import { parseAddress } from '../geocode-lib.mjs';
const cases = [
  'JL. RAYA KUTA, KEL. KUTA, KEC. KUTA, KABUPATEN BADUNG',
  'Jl. Bogor Nirwana Residence Ruko Orchad Walk Blok B No.8, RT 01/RW 05, Mulyaharja, Kec. Bogor Sel., Kota Bogor',
  'JL. MAYJEND SUNGKONO, PERGUDANGAN WIRULUSAN BLOK G-6 (BARAT SMKN 1), DS. SEGOROMADU, KEC. KEBOMAS, KAB. GRESIK',
  'Jl. Raya Bekasi Timur KM 18 No. 1, Jatinegara Kaum, Kec. Pulo Gadung, Jakarta Timur',
  'JL. GN. KALIMUTU 4, KEL. TEGAL HARUM, KEC. DENPASAR BARAT, KOTA DENPASAR',
  'JL. KAPTEN SAESTUHADI NO.5A, KELURAHAN BANJARTENGAH, KECAMATAN NEGARA, KABUPATEN JEMBRANA',
];
for (const c of cases) console.log(JSON.stringify(parseAddress(c)));
