import { FacilityDamageData, HousingCasualtyData, LogEntry, RegencySpreadsheetItem, RegionSelection, SpreadsheetConfig } from '@/types/resku';
import { getLogs, getSpreadsheetConfig, saveRegencySpreadsheetItem, saveSpreadsheetConfig, updateLogStatus } from './storage';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function ensureSpreadsheetForRegency(
  accessToken: string,
  region: RegionSelection,
  userEmail: string = '',
  userName: string = ''
): Promise<SpreadsheetConfig> {
  const regencyCode = region.regencyCode || '5319';
  const regencyName = region.regencyName || 'KABUPATEN MANGGARAI TIMUR';

  // 1. Check local storage config first
  const existingConfig = getSpreadsheetConfig(regencyCode);
  if (existingConfig.isConnected && existingConfig.spreadsheetId && !existingConfig.spreadsheetId.startsWith('resku-sheet-')) {
    return existingConfig;
  }

  // 2. Search Google Drive API for existing file named: "ReskuData Tanggap Bencana 2026 - ${regencyName}"
  try {
    const searchTitle = `ReskuData Tanggap Bencana 2026 - ${regencyName}`;
    const query = encodeURIComponent(`name = '${searchTitle}' and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const foundFile = searchData.files[0];
        const config: SpreadsheetConfig = {
          spreadsheetId: foundFile.id,
          spreadsheetUrl: foundFile.webViewLink || `https://docs.google.com/spreadsheets/d/${foundFile.id}/edit`,
          sheetNameHousing: 'Permukiman & Jiwa',
          sheetNameFacility: 'Fasilitas Umum',
          isConnected: true,
          userEmail,
          userName,
        };

        saveSpreadsheetConfig(config, regencyCode);

        // Save to regency registry list
        const regItem: RegencySpreadsheetItem = {
          regencyCode,
          regencyName,
          spreadsheetId: foundFile.id,
          spreadsheetUrl: config.spreadsheetUrl,
          userEmail,
          userName,
          createdAt: new Date().toISOString(),
        };
        saveRegencySpreadsheetItem(regItem);
        await saveRegencySpreadsheetToFirestore(regItem);

        return config;
      }
    }
  } catch (e) {
    console.warn('Google Drive search failed, falling back to creation:', e);
  }

  // 3. If not found in Drive, create new spreadsheet for this Regency!
  const newConfig = await createGoogleSpreadsheetForUser(accessToken, userName, userEmail, region);

  const regItem: RegencySpreadsheetItem = {
    regencyCode,
    regencyName,
    spreadsheetId: newConfig.spreadsheetId,
    spreadsheetUrl: newConfig.spreadsheetUrl,
    userEmail,
    userName,
    createdAt: new Date().toISOString(),
  };
  saveRegencySpreadsheetItem(regItem);
  await saveRegencySpreadsheetToFirestore(regItem);

  return newConfig;
}

async function saveRegencySpreadsheetToFirestore(item: RegencySpreadsheetItem) {
  try {
    await setDoc(doc(db, 'regency_spreadsheets', item.regencyCode), item, { merge: true });
  } catch (e) {
    console.warn('Could not save regency spreadsheet to Firestore (offline or unauthenticated):', e);
  }
}

export async function createGoogleSpreadsheetForUser(
  accessToken: string,
  userName: string,
  userEmail: string = '',
  region?: RegionSelection
): Promise<SpreadsheetConfig> {
  const regencyName = region?.regencyName || 'KABUPATEN MANGGARAI TIMUR';
  const title = `ReskuData Tanggap Bencana 2026 - ${regencyName}`;

  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [
          { properties: { title: 'Permukiman & Jiwa', gridProperties: { frozenRowCount: 10 } } },
          { properties: { title: 'Fasilitas Umum', gridProperties: { frozenRowCount: 10 } } },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const spreadsheetId = data.spreadsheetId;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      const sheets = data.sheets || [];

      const sheet1Id = sheets[0]?.properties?.sheetId ?? 0;
      const sheet2Id = sheets[1]?.properties?.sheetId ?? 1;

      const config: SpreadsheetConfig = {
        spreadsheetId,
        spreadsheetUrl,
        sheetNameHousing: 'Permukiman & Jiwa',
        sheetNameFacility: 'Fasilitas Umum',
        isConnected: true,
        userEmail,
        userName,
      };

      saveSpreadsheetConfig(config, region?.regencyCode);

      // Save to regency registry list (local & Firestore)
      if (region?.regencyCode) {
        const regItem: RegencySpreadsheetItem = {
          regencyCode: region.regencyCode,
          regencyName: region.regencyName,
          spreadsheetId,
          spreadsheetUrl,
          userEmail,
          userName,
          createdAt: new Date().toISOString(),
        };
        saveRegencySpreadsheetItem(regItem);
        await saveRegencySpreadsheetToFirestore(regItem);
      }

      // Initialize Official 3-Row BPBD Table Matrix & Formatting dynamically
      await initializeOfficialBPBDFormat(accessToken, spreadsheetId, sheet1Id, sheet2Id, region);

      return config;
    } else {
      const errText = await res.text();
      console.error('Google Sheets API creation error:', res.status, errText);
      throw new Error(`Google API Error (${res.status}): ${errText || 'Gagal membuat spreadsheet'}`);
    }
  } catch (e: any) {
    console.error('Failed to create Google Spreadsheet via API:', e);
    throw e;
  }
}

async function initializeOfficialBPBDFormat(
  accessToken: string,
  spreadsheetId: string,
  sheet1Id: number,
  sheet2Id: number,
  region?: RegionSelection
) {
  try {
    const regencyName = region?.regencyName || 'KABUPATEN MANGGARAI TIMUR';
    const districtName = region ? (region.isManual ? region.manualDistrict : region.districtName) : 'BORONG';
    const villageName = region ? (region.isManual ? region.manualVillage : region.villageName) : 'RANA LOBA';

    // 1. Populate Sheet 1 (Permukiman & Jiwa) Values (15 Columns: A - O)
    const sheet1Values = [
      [''], // Row 1
      ['DATA TERDAMPAK TANGGAP BENCANA'], // Row 2 Title
      [`${regencyName} 2026`], // Row 3 Subtitle
      [''], // Row 4
      ['KECAMATAN :', districtName || 'BORONG'], // Row 5
      ['DESA / KELURAHAN :', villageName || 'RANA LOBA'], // Row 6
      [''], // Row 7
      // Row 8: Top Headers
      ['NO', 'TANGGAL / WAKTU', 'NAMA KK', 'JENIS KELAMIN', '', 'USIA', 'ALAMAT (DUSUN, RT/RW)', 'JENIS KERUSAKAN', '', '', 'KORBAN JIWA', '', '', '', 'KETERANGAN / KEBUTUHAN'],
      // Row 9: Mid Headers
      ['', '', '', '', '', '', '', 'RUMAH / PERMUKIMAN PRIBADI', '', '', 'MENINGGAL', 'LUKA LUKA', '', 'HILANG', ''],
      // Row 10: Sub Headers
      ['', '', '', 'LAKI-LAKI', 'PEREMPUAN', '', '', 'RINGAN', 'SEDANG', 'BERAT', '', 'BERAT', 'RINGAN', '', ''],
    ];

    // 2. Populate Sheet 2 (Fasilitas Umum) Values (11 Columns: A - K)
    const sheet2Values = [
      [''],
      ['DATA KERUSAKAN FASILITAS UMUM'],
      [`${regencyName} 2026`],
      [''],
      ['KECAMATAN :', districtName || 'BORONG'],
      ['DESA / KELURAHAN :', villageName || 'RANA LOBA'],
      [''],
      ['NO', 'TANGGAL / WAKTU', 'NAMA FASILITAS UMUM', 'KATEGORI', 'SUB-TIPE / JENIS', 'ALAMAT / LOKASI', 'JENIS KERUSAKAN', '', '', '', 'KETERANGAN / KEBUTUHAN PERBAIKAN'],
      ['', '', '', '', '', '', 'FASILITAS UMUM', '', '', '', ''],
      ['', '', '', '', '', '', 'RINGAN', 'SEDANG', 'BERAT', 'RUNTUH', ''],
    ];

    const range1 = encodeURIComponent("'Permukiman & Jiwa'!A1:O10");
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range1}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: sheet1Values }),
    });

    const range2 = encodeURIComponent("'Fasilitas Umum'!A1:K10");
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range2}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: sheet2Values }),
    });

    // 3. BatchUpdate for 3-Row Merges, Borders, Alignment, & Column Widths
    const solidBorder = { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } };
    const headerBgColor = { red: 0.94, green: 0.96, blue: 0.98 }; // Light Slate Gray

    const batchRequests: any[] = [
      // --- SHEET 1 (PERMUKIMAN & JIWA) MERGES ---
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 15 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 15 }, mergeType: 'MERGE_ALL' } },

      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 1 }, mergeType: 'MERGE_ALL' } }, // NO
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 2 }, mergeType: 'MERGE_ALL' } }, // TANGGAL
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 2, endColumnIndex: 3 }, mergeType: 'MERGE_ALL' } }, // NAMA KK
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 9, startColumnIndex: 3, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' } }, // JENIS KELAMIN
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 5, endColumnIndex: 6 }, mergeType: 'MERGE_ALL' } }, // USIA
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 6, endColumnIndex: 7 }, mergeType: 'MERGE_ALL' } }, // ALAMAT

      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 7, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } }, // JENIS KERUSAKAN
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 8, endRowIndex: 9, startColumnIndex: 7, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } }, // RUMAH / PERMUKIMAN PRIBADI

      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 10, endColumnIndex: 14 }, mergeType: 'MERGE_ALL' } }, // KORBAN JIWA
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 8, endRowIndex: 10, startColumnIndex: 10, endColumnIndex: 11 }, mergeType: 'MERGE_ALL' } }, // MENINGGAL
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 8, endRowIndex: 9, startColumnIndex: 11, endColumnIndex: 13 }, mergeType: 'MERGE_ALL' } }, // LUKA LUKA
      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 8, endRowIndex: 10, startColumnIndex: 13, endColumnIndex: 14 }, mergeType: 'MERGE_ALL' } }, // HILANG

      { mergeCells: { range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 14, endColumnIndex: 15 }, mergeType: 'MERGE_ALL' } }, // KETERANGAN

      // --- SHEET 2 (FASILITAS UMUM) MERGES ---
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 11 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 11 }, mergeType: 'MERGE_ALL' } },

      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 1 }, mergeType: 'MERGE_ALL' } }, // NO
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 2 }, mergeType: 'MERGE_ALL' } }, // TANGGAL
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 2, endColumnIndex: 3 }, mergeType: 'MERGE_ALL' } }, // NAMA FASILITAS
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 3, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } }, // KATEGORI
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 4, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' } }, // SUB-TIPE
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 5, endColumnIndex: 6 }, mergeType: 'MERGE_ALL' } }, // ALAMAT

      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 6, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } }, // JENIS KERUSAKAN
      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 8, endRowIndex: 9, startColumnIndex: 6, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } }, // FASILITAS UMUM

      { mergeCells: { range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 10, endColumnIndex: 11 }, mergeType: 'MERGE_ALL' } }, // KETERANGAN

      // --- STYLES FOR SHEET 1 ---
      {
        repeatCell: {
          range: { sheetId: sheet1Id, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 15 },
          cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 12 }, horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
        },
      },
      {
        repeatCell: {
          range: { sheetId: sheet1Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 15 },
          cell: {
            userEnteredFormat: {
              backgroundColor: headerBgColor,
              textFormat: { bold: true, fontSize: 9 },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              wrapStrategy: 'WRAP',
              borders: { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder },
            },
          },
          fields: 'userEnteredFormat',
        },
      },

      // --- STYLES FOR SHEET 2 ---
      {
        repeatCell: {
          range: { sheetId: sheet2Id, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 11 },
          cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 12 }, horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
        },
      },
      {
        repeatCell: {
          range: { sheetId: sheet2Id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 11 },
          cell: {
            userEnteredFormat: {
              backgroundColor: headerBgColor,
              textFormat: { bold: true, fontSize: 9 },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              wrapStrategy: 'WRAP',
              borders: { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder },
            },
          },
          fields: 'userEnteredFormat',
        },
      },

      // Set Column Widths Sheet 1 (15 Columns)
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 45 }, fields: 'pixelSize' } }, // NO
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 130 }, fields: 'pixelSize' } }, // TANGGAL
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 190 }, fields: 'pixelSize' } }, // NAMA KK
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 3, endIndex: 5 }, properties: { pixelSize: 90 }, fields: 'pixelSize' } }, // GENDER
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 55 }, fields: 'pixelSize' } }, // USIA
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } }, // ALAMAT
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 7, endIndex: 10 }, properties: { pixelSize: 75 }, fields: 'pixelSize' } }, // KERUSAKAN
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 10, endIndex: 14 }, properties: { pixelSize: 90 }, fields: 'pixelSize' } }, // KORBAN JIWA
      { updateDimensionProperties: { range: { sheetId: sheet1Id, dimension: 'COLUMNS', startIndex: 14, endIndex: 15 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } }, // KETERANGAN

      // Set Column Widths Sheet 2 (11 Columns)
      { updateDimensionProperties: { range: { sheetId: sheet2Id, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 45 }, fields: 'pixelSize' } }, // NO
      { updateDimensionProperties: { range: { sheetId: sheet2Id, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 130 }, fields: 'pixelSize' } }, // TANGGAL
      { updateDimensionProperties: { range: { sheetId: sheet2Id, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } }, // NAMA FASILITAS
      { updateDimensionProperties: { range: { sheetId: sheet2Id, dimension: 'COLUMNS', startIndex: 3, endIndex: 5 }, properties: { pixelSize: 130 }, fields: 'pixelSize' } }, // KATEGORI & SUB
      { updateDimensionProperties: { range: { sheetId: sheet2Id, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } }, // ALAMAT
      { updateDimensionProperties: { range: { sheetId: sheet2Id, dimension: 'COLUMNS', startIndex: 6, endIndex: 10 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } }, // KERUSAKAN
      { updateDimensionProperties: { range: { sheetId: sheet2Id, dimension: 'COLUMNS', startIndex: 10, endIndex: 11 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } }, // KETERANGAN
    ];

    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: batchRequests }),
    });

    if (!batchRes.ok) {
      const errText = await batchRes.text();
      console.error('BatchUpdate format error:', batchRes.status, errText);
    }
  } catch (e) {
    console.warn('Could not format official BPBD 3-row sheet matrix:', e);
  }
}

async function saveLogToFirestore(entry: LogEntry) {
  try {
    await setDoc(doc(db, 'disaster_logs', entry.id), entry, { merge: true });
  } catch (e) {
    console.warn('Could not save disaster log to Firestore:', e);
  }
}

export async function syncEntryToGoogleSheets(entry: LogEntry, regencyCode?: string): Promise<{ success: boolean; message: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateLogStatus(entry.id, 'PENDING_OFFLINE', 'Tidak ada koneksi internet. Tersimpan di antrean offline.');
    return {
      success: false,
      message: 'Perangkat offline. Data disimpan ke antrean lokal dan akan otomatis diunggah saat koneksi kembali.',
    };
  }

  updateLogStatus(entry.id, 'SYNCING');

  // Save log entry to Firestore first
  await saveLogToFirestore(entry);

  const regCode = regencyCode || entry.payload.region?.regencyCode;
  let config = getSpreadsheetConfig(regCode);
  let token = typeof window !== 'undefined' ? localStorage.getItem('resku_google_access_token') : null;

  // Auto-prompt Google Auth popup on the fly if token is missing
  if (!token && typeof window !== 'undefined') {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const { auth, googleDriveProvider } = await import('./firebase');
      const result = await signInWithPopup(auth, googleDriveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      token = credential?.accessToken || null;
      if (token) {
        localStorage.setItem('resku_google_access_token', token);
      }
    } catch (authErr) {
      console.warn('Auto auth popup during submit failed or cancelled:', authErr);
    }
  }

  if (!token) {
    updateLogStatus(entry.id, 'ERROR', 'Otorisasi Google Drive diperlukan untuk menyimpan data.');
    return {
      success: false,
      message: 'Gagal menyinkronkan: Otorisasi Google Drive diperlukan untuk membuat & menyimpan spreadsheet.',
    };
  }

  // Auto-ensure spreadsheet for Regency on-demand if not created yet for this Regency!
  if ((!config.spreadsheetId || config.spreadsheetId.startsWith('resku-sheet-')) && entry.payload.region) {
    try {
      config = await ensureSpreadsheetForRegency(token, entry.payload.region);
    } catch (e: any) {
      console.error('Could not auto-ensure spreadsheet for regency during sync:', e);
      const errMsg = `Gagal membuat/menemukan Spreadsheet (${e?.message || 'Error API'})`;
      updateLogStatus(entry.id, 'ERROR', errMsg);
      return { success: false, message: errMsg };
    }
  }

  if (config.spreadsheetId && !config.spreadsheetId.startsWith('resku-sheet-')) {
    try {
      const isHousing = entry.type === 'HOUSING_CASUALTY';
      const sheetName = isHousing ? config.sheetNameHousing : config.sheetNameFacility;
      const logs = getLogs();
      const typeLogs = logs.filter((l) => l.type === entry.type);
      const rowNum = typeLogs.length;

      const rowData = isHousing
        ? formatHousingRow(entry.payload as HousingCasualtyData, rowNum)
        : formatFacilityRow(entry.payload as FacilityDamageData, rowNum);

      const encodedRange = encodeURIComponent(`'${sheetName}'!A:O`);

      // Append row to official table matrix starting below row 10
      let appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [rowData] }),
        }
      );

      // Auto-heal if HTTP 404 (Spreadsheet ID or Sheet tab not found in Google Drive)
      if (appendRes.status === 404 && entry.payload.region) {
        console.warn('Spreadsheet or sheet tab returned 404 NOT_FOUND. Auto-creating fresh spreadsheet for regency...');
        try {
          const freshConfig = await createGoogleSpreadsheetForUser(token, '', '', entry.payload.region);
          const freshRange = encodeURIComponent(`'${isHousing ? freshConfig.sheetNameHousing : freshConfig.sheetNameFacility}'!A:O`);
          appendRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${freshConfig.spreadsheetId}/values/${freshRange}:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [rowData] }),
            }
          );
        } catch (healErr) {
          console.error('Auto-heal spreadsheet failed:', healErr);
        }
      }

      if (appendRes.ok) {
        updateLogStatus(entry.id, 'SYNCED');
        return {
          success: true,
          message: 'Data berhasil disinkronkan langsung ke format tabel Google Sheet Anda!',
        };
      } else {
        const errText = await appendRes.text();
        console.error('Direct Google Sheet append failed:', appendRes.status, errText);

        let userMsg = `Gagal menyimpan ke Google Spreadsheet (HTTP ${appendRes.status})`;
        if (appendRes.status === 401) {
          userMsg = 'Sesi Google Drive telah kadaluarsa. Silakan klik tombol "Akun Google" di header untuk menghubungkan ulang.';
        } else if (appendRes.status === 403) {
          userMsg = 'Izin Google Sheets ditolak. Pastikan mengizinkan akses Google Drive saat login.';
        } else if (appendRes.status === 404) {
          userMsg = 'File Google Sheet tidak ditemukan di Drive Anda. Silakan buat ulang via tombol "Akun Google".';
        }

        updateLogStatus(entry.id, 'ERROR', userMsg);
        return { success: false, message: userMsg };
      }
    } catch (e: any) {
      console.error('Direct Google Sheet append exception:', e);
      const errMsg = `Gagal menghubungi API Google Sheets: ${e?.message || 'Error jaringan'}`;
      updateLogStatus(entry.id, 'ERROR', errMsg);
      return { success: false, message: errMsg };
    }
  }

  return {
    success: false,
    message: 'Spreadsheet belum siap. Silakan klik tombol "Akun Google" di header.',
  };
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

function formatHousingRow(data: HousingCasualtyData, rowNum: number = 1) {
  const isMale = data.gender === 'Laki-laki';
  const isFemale = data.gender === 'Perempuan';
  const isMinor = data.damageLevel === 'Rusak Ringan';
  const isModerate = data.damageLevel === 'Rusak Sedang';
  const isSevere = data.damageLevel === 'Rusak Berat';

  const dateStr = new Date(data.createdAt).toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return [
    rowNum,
    dateStr,
    data.headOfHousehold,
    isMale ? '✓' : '',
    isFemale ? '✓' : '',
    data.age || '-',
    data.subLocation || '-',
    isMinor ? '✓' : '',
    isModerate ? '✓' : '',
    isSevere ? '✓' : '',
    data.casualties.deceased || 0,
    data.casualties.severeInjury || 0,
    data.casualties.minorInjury || 0,
    data.casualties.missing || 0,
    data.notes || '-',
  ];
}

function formatFacilityRow(data: FacilityDamageData, rowNum: number = 1) {
  const isMinor = data.damageLevel === 'Rusak Ringan';
  const isModerate = data.damageLevel === 'Rusak Sedang';
  const isSevere = data.damageLevel === 'Rusak Berat';
  const isCollapsed = data.damageLevel === 'Runtuh';

  const dateStr = new Date(data.createdAt).toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return [
    rowNum,
    dateStr,
    data.facilityName,
    data.category,
    data.subcategory || '-',
    data.subLocation || '-',
    isMinor ? '✓' : '',
    isModerate ? '✓' : '',
    isSevere ? '✓' : '',
    isCollapsed ? '✓' : '',
    data.notesNeeded || '-',
  ];
}
