export interface DropPoint {
  id: string;
  name: string;
  hub: string;
  province: string;
  levelKota: string;
  kecamatan: string;
  model: string;
  fungsi: string;
  /** "Pusat Finansial" grouping from the source sheet: AGENT12..AGENT40. */
  agent: string;
  levelAgent: string;
  jemari: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
}
