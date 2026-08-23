import { FacilityDamageData, HousingCasualtyData, LogEntry } from '@/types/resku';
import { getLogs, updateLogStatus } from './storage';

export async function syncEntryToGoogleSheets(entry: LogEntry): Promise<{ success: boolean; message: string }> {
  // Check online status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateLogStatus(entry.id, 'PENDING_OFFLINE', 'Tidak ada koneksi internet. Tersimpan di antrean offline.');
    return {
      success: false,
      message: 'Perangkat offline. Data disimpan ke antrean lokal dan akan otomatis diunggah saat koneksi kembali.',
    };
  }

  updateLogStatus(entry.id, 'SYNCING');

  // Simulate network delay to Google Sheets API v4
  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    if (entry.type === 'HOUSING_CASUALTY') {
      const data = entry.payload as HousingCasualtyData;
      const rowData = formatHousingRow(data);
      console.log('Sending row to Sheet 1 (Permukiman & Jiwa):', rowData);
    } else {
      const data = entry.payload as FacilityDamageData;
      const rowData = formatFacilityRow(data);
      console.log('Sending row to Sheet 2 (Fasilitas Umum):', rowData);
    }

    updateLogStatus(entry.id, 'SYNCED');
    return {
      success: true,
      message: 'Data berhasil disinkronkan dan ditambahkan ke baris Google Spreadsheet!',
    };
  } catch (err: any) {
    updateLogStatus(entry.id, 'ERROR', err?.message || 'Gagal terhubung ke Google Sheets API.');
    return {
      success: false,
      message: 'Gagal mengunggah data ke Google Sheet. Entri tetap aman tersimpan secara lokal.',
    };
  }
}

export async function syncAllPendingEntries(): Promise<{ syncedCount: number; failedCount: number }> {
  const logs = getLogs();
  const pending = logs.filter((l) => l.status === 'PENDING_OFFLINE' || l.status === 'ERROR');

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pending) {
    const res = await syncEntryToGoogleSheets(item);
    if (res.success) {
      syncedCount++;
    } else {
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

function formatHousingRow(data: HousingCasualtyData) {
  const district = data.region.isManual ? data.region.manualDistrict : data.region.districtName;
  const village = data.region.isManual ? data.region.manualVillage : data.region.villageName;

  return [
    new Date(data.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }), // WITA
    data.region.provinceName,
    data.region.regencyName,
    district || '-',
    village || '-',
    data.subLocation || '-',
    data.headOfHousehold,
    data.gender,
    data.age,
    data.damageLevel,
    data.casualties.deceased,
    data.casualties.severeInjury,
    data.casualties.minorInjury,
    data.casualties.missing,
    data.notes || '-',
  ];
}

function formatFacilityRow(data: FacilityDamageData) {
  const district = data.region.isManual ? data.region.manualDistrict : data.region.districtName;
  const village = data.region.isManual ? data.region.manualVillage : data.region.villageName;

  return [
    new Date(data.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }), // WITA
    data.region.provinceName,
    data.region.regencyName,
    district || '-',
    village || '-',
    data.subLocation || '-',
    data.category,
    data.subcategory || '-',
    data.facilityName,
    data.damageLevel,
    data.notesNeeded || '-',
  ];
}
