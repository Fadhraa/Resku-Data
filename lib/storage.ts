import { LogEntry, SpreadsheetConfig } from '@/types/resku';

const STORAGE_KEYS = {
  LOGS: 'resku_data_logs_v1',
  SPREADSHEET_CONFIG: 'resku_spreadsheet_config_v1',
  USER_SESSION: 'resku_user_session_v1',
  LAST_REGION: 'resku_last_region_v1',
};

export const DEFAULT_SPREADSHEET_CONFIG: SpreadsheetConfig = {
  spreadsheetId: '1ReskuData_Matim2026_OfficialSpreadsheet_Demo',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1ReskuData_Matim2026_OfficialSpreadsheet_Demo/edit#gid=0',
  sheetNameHousing: 'Permukiman & Jiwa',
  sheetNameFacility: 'Fasilitas Umum',
  isConnected: true,
  userEmail: 'relawan.posko@matim2026.go.id',
  userName: 'Relawan Posko Matim',
};

// Internal safe browser check
const isBrowser = typeof window !== 'undefined';

export function getLogs(): LogEntry[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    return raw ? JSON.parse(raw) : getSeedInitialLogs();
  } catch {
    return getSeedInitialLogs();
  }
}

export function saveLogs(logs: LogEntry[]) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    window.dispatchEvent(new Event('resku-storage-updated'));
  } catch (e) {
    console.error('Failed to save logs:', e);
  }
}

export function addLogEntry(entry: LogEntry) {
  const current = getLogs();
  const updated = [entry, ...current];
  saveLogs(updated);
}

export function updateLogStatus(id: string, status: LogEntry['status'], errorMessage?: string) {
  const current = getLogs();
  const updated = current.map((item) =>
    item.id === id ? { ...item, status, errorMessage } : item
  );
  saveLogs(updated);
}

export function getSpreadsheetConfig(): SpreadsheetConfig {
  if (!isBrowser) return DEFAULT_SPREADSHEET_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_CONFIG);
    return raw ? JSON.parse(raw) : DEFAULT_SPREADSHEET_CONFIG;
  } catch {
    return DEFAULT_SPREADSHEET_CONFIG;
  }
}

export function saveSpreadsheetConfig(config: SpreadsheetConfig) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new Event('resku-config-updated'));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

export function getUserSession() {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (raw) return JSON.parse(raw);
    // Default active session for fast field use
    return {
      email: 'relawan.matim@reskudata.id',
      name: 'Relawan BPBD Matim 2026',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isLoggedIn: true,
    };
  } catch {
    return null;
  }
}

export function setUserSession(user: { email: string; name: string; photoUrl?: string } | null) {
  if (!isBrowser) return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  } else {
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify({ ...user, isLoggedIn: true }));
  }
  window.dispatchEvent(new Event('resku-session-updated'));
}

// Initial demo seed logs for quick visual feedback
function getSeedInitialLogs(): LogEntry[] {
  return [
    {
      id: 'demo-1',
      type: 'HOUSING_CASUALTY',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      regionSummary: 'Kec. Borong, Desa Rana Loba',
      title: 'KK: Bpk. Damianus Nggolang',
      subtitle: 'Rusak Berat • 1 Luka Berat, 2 Luka Ringan',
      status: 'SYNCED',
      payload: {
        id: 'demo-1',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        region: {
          provinceCode: '53',
          provinceName: 'NUSA TENGGARA TIMUR',
          regencyCode: '5319',
          regencyName: 'KABUPATEN MANGGARAI TIMUR',
          districtCode: '531901',
          districtName: 'BORONG',
          villageCode: '5319011001',
          villageName: 'RANA LOBA',
          isManual: false,
        },
        subLocation: 'Dusun Golo Karot, RT 04 / RW 02',
        headOfHousehold: 'Damianus Nggolang',
        gender: 'Laki-laki',
        age: 48,
        damageLevel: 'Rusak Berat',
        casualties: {
          deceased: 0,
          severeInjury: 1,
          minorInjury: 2,
          missing: 0,
        },
        notes: 'Dinding dapur roboh akibat tanah longsor, membutuhkan bantuan terpal darurat & obat-obatan.',
      },
    },
    {
      id: 'demo-2',
      type: 'FACILITY_DAMAGE',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      regionSummary: 'Kec. Kota Komba, Desa Waelengga',
      title: 'SDN Waelengga 1',
      subtitle: 'Pendidikan (SD) • Rusak Sedang',
      status: 'SYNCED',
      payload: {
        id: 'demo-2',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        region: {
          provinceCode: '53',
          provinceName: 'NUSA TENGGARA TIMUR',
          regencyCode: '5319',
          regencyName: 'KABUPATEN MANGGARAI TIMUR',
          districtCode: '531902',
          districtName: 'KOTA KOMBA',
          villageCode: '5319022001',
          villageName: 'WAELENGGA',
          isManual: false,
        },
        subLocation: 'Dusun Waelengga Barat',
        category: 'Pendidikan',
        subcategory: 'SD',
        facilityName: 'SDN Waelengga 1',
        damageLevel: 'Rusak Sedang',
        notesNeeded: 'Atap 2 ruang kelas terlepas diterpa angin kencang. Kegiatan belajar sementara dipindah ke posko.',
      },
    },
  ];
}
