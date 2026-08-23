export type DamageLevel = 'Tidak Ada Kerusakan' | 'Rusak Ringan' | 'Rusak Sedang' | 'Rusak Berat' | 'Runtuh';

export type Gender = 'Laki-laki' | 'Perempuan';

export type FacilityCategory = 'Pendidikan' | 'Kesehatan' | 'Lainnya';

export type EducationSubcategory = 'TK/PAUD' | 'SD' | 'SMP' | 'SMA/SMK';
export type HealthSubcategory = 'Puskesmas' | 'Pustu' | 'Poskesdes';

export interface RegionSelection {
  provinceCode: string;
  provinceName: string;
  regencyCode: string;
  regencyName: string;
  districtCode: string;
  districtName: string;
  villageCode: string;
  villageName: string;
  isManual: boolean;
  manualDistrict?: string;
  manualVillage?: string;
}

export interface HousingCasualtyData {
  id: string;
  createdAt: string; // ISO String
  region: RegionSelection;
  subLocation: string; // Dusun / RT / RW
  headOfHousehold: string;
  gender: Gender;
  age: number;
  damageLevel: DamageLevel;
  casualties: {
    deceased: number;
    severeInjury: number;
    minorInjury: number;
    missing: number;
  };
  notes: string;
}

export interface FacilityDamageData {
  id: string;
  createdAt: string; // ISO String
  region: RegionSelection;
  subLocation: string; // Dusun / RT / RW
  category: FacilityCategory;
  subcategory: EducationSubcategory | HealthSubcategory | string;
  facilityName: string;
  damageLevel: DamageLevel;
  notesNeeded: string;
}

export type EntryType = 'HOUSING_CASUALTY' | 'FACILITY_DAMAGE';

export type SyncStatus = 'SYNCED' | 'PENDING_OFFLINE' | 'SYNCING' | 'ERROR';

export interface LogEntry {
  id: string;
  type: EntryType;
  timestamp: string;
  regionSummary: string; // e.g. "Kec. Borong, Desa Rana Loba"
  title: string; // e.g. "KK: Bpk. Yohanes" or "SDN Borong 1"
  subtitle: string; // e.g. "Rusak Berat • 1 Luka" or "Pendidikan • Rusak Sedang"
  status: SyncStatus;
  payload: HousingCasualtyData | FacilityDamageData;
  errorMessage?: string;
}

export interface Province {
  id: string;
  name: string;
}

export interface Regency {
  id: string;
  province_id: string;
  name: string;
}

export interface District {
  id: string;
  regency_id: string;
  name: string;
}

export interface Village {
  id: string;
  district_id: string;
  name: string;
}

export interface SpreadsheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetNameHousing: string;
  sheetNameFacility: string;
  isConnected: boolean;
  userEmail: string;
  userName: string;
}
