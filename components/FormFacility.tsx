'use client';

import React, { useState, useEffect } from 'react';
import {
  DamageLevel,
  EducationSubcategory,
  FacilityCategory,
  FacilityDamageData,
  HealthSubcategory,
  LogEntry,
  RegionSelection,
} from '@/types/resku';
import { addLogEntry, getSpreadsheetConfig } from '@/lib/storage';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, googleDriveProvider } from '@/lib/firebase';
import { ensureSpreadsheetForRegency, syncEntryToGoogleSheets } from '@/lib/google-sheets';

interface Props {
  region: RegionSelection;
  onSuccess: () => void;
}

export default function FormFacility({ region, onSuccess }: Props) {
  const [config, setConfig] = useState(getSpreadsheetConfig(region.regencyCode));
  const [isConnecting, setIsConnecting] = useState(false);
  const [category, setCategory] = useState<FacilityCategory>('Pendidikan');
  const [eduSubcategory, setEduSubcategory] = useState<EducationSubcategory>('SD');
  const [healthSubcategory, setHealthSubcategory] = useState<HealthSubcategory>('Puskesmas');
  const [otherSubcategory, setOtherSubcategory] = useState('Jembatan / Jalan');

  const [facilityName, setFacilityName] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [damageLevel, setDamageLevel] = useState<DamageLevel>('Rusak Sedang');
  const [notesNeeded, setNotesNeeded] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const sync = () => setConfig(getSpreadsheetConfig(region.regencyCode));
    sync();
    window.addEventListener('resku-config-updated', sync);
    return () => window.removeEventListener('resku-config-updated', sync);
  }, [region.regencyCode]);

  const isConnected = Boolean(
    config.isConnected &&
    config.spreadsheetId &&
    !config.spreadsheetId.startsWith("resku-sheet-") &&
    config.spreadsheetUrl.includes("/spreadsheets/d/")
  );

  const handleConnectDriveInline = async () => {
    setIsConnecting(true);
    try {
      const result = await signInWithPopup(auth, googleDriveProvider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleToken = credential?.accessToken;

      if (googleToken && typeof window !== 'undefined') {
        localStorage.setItem('resku_google_access_token', googleToken);

        const newConfig = await ensureSpreadsheetForRegency(
          googleToken,
          region,
          user.email || '',
          user.displayName || 'Relawan'
        );
        setConfig(newConfig);
      }
    } catch (err) {
      console.error('Inline Drive connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const newId = `f-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const districtName = region.isManual ? (region.manualDistrict || region.districtName) : region.districtName;
    const villageName = region.isManual ? (region.manualVillage || region.villageName) : region.villageName;
    const regencyName = region.regencyName;
    const provinceName = region.provinceName;

    const regionSummary = `Kec. ${districtName || '-'}, Desa ${villageName || '-'}`;
    const categoryDetail = category === 'Pendidikan' ? eduSubcategory : category === 'Kesehatan' ? healthSubcategory : otherSubcategory;
    const subtitle = `${category} (${categoryDetail}) • ${damageLevel}`;

    const payload: FacilityDamageData = {
      id: newId,
      createdAt: timestamp,
      region,
      subLocation,
      category,
      subcategory: categoryDetail,
      facilityName,
      damageLevel,
      notesNeeded,
    };

    const logEntry: LogEntry = {
      id: newId,
      type: 'FACILITY_DAMAGE',
      timestamp,
      regionSummary,
      title: facilityName,
      subtitle,
      status: 'SYNCING',
      payload,
    };

    addLogEntry(logEntry);

    try {
      const syncRes = await syncEntryToGoogleSheets(logEntry, region.regencyCode);
      if (syncRes.success) {
        setFeedback({
          type: 'success',
          message: syncRes.message,
        });
        setConfig(getSpreadsheetConfig(region.regencyCode));
      } else {
        setFeedback({
          type: 'error',
          message: syncRes.message,
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: `Terjadi kesalahan saat menyinkronkan: ${e?.message || 'Gagal menghubungi server'}`,
      });
    } finally {
      setIsSubmitting(false);
    }

    setFacilityName('');
    setSubLocation('');
    setNotesNeeded('');

    onSuccess();

    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const damageOptions: { label: DamageLevel; bg: string; border: string; ring: string; text: string }[] = [
    { label: 'Tidak Ada Kerusakan', bg: 'bg-emerald-50', border: 'border-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-800' },
    { label: 'Rusak Ringan', bg: 'bg-blue-50', border: 'border-blue-500', ring: 'ring-blue-500', text: 'text-blue-800' },
    { label: 'Rusak Sedang', bg: 'bg-amber-50', border: 'border-amber-500', ring: 'ring-amber-500', text: 'text-amber-900' },
    { label: 'Rusak Berat', bg: 'bg-red-50', border: 'border-red-500', ring: 'ring-red-500', text: 'text-red-900' },
    { label: 'Runtuh', bg: 'bg-rose-100', border: 'border-rose-500', ring: 'ring-rose-500', text: 'text-rose-950 font-black' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SPREADSHEET AUTOMATIC STATUS BANNER */}
      <div
        className={`p-3.5 rounded-xl border text-xs shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
          isConnected
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-blue-50 border-blue-200 text-blue-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base shrink-0">
            {isConnected ? '✅' : '✨'}
          </span>
          <div>
            <p className="font-extrabold text-xs">
              {isConnected
                ? `Spreadsheet Terhubung (${region.regencyName})`
                : `Spreadsheet Otomatis: ${region.regencyName}`}
            </p>
            <p className="text-[11px] opacity-90 font-medium">
              {isConnected
                ? 'Data yang diisi akan otomatis disinkronkan ke file Google Sheet milik Anda.'
                : 'Saat Anda menekan tombol Simpan Data di bawah, file Google Sheet baru untuk wilayah ini akan otomatis dibuatkan di Google Drive Anda.'}
            </p>
          </div>
        </div>

        {isConnected ? (
          <a
            href={config.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow transition-all flex items-center justify-center gap-1 shrink-0 active:scale-95"
          >
            <span>↗ Buka Sheet</span>
          </a>
        ) : null}
      </div>
      
      {/* SECTION 1: KATEGORI & NAMA FASILITAS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base font-display">
            Kategori & Identitas Fasilitas Umum
          </h3>
        </div>

        {/* Category Switcher */}
        <div>
          <label className="form-label">Kategori Fasilitas Utama</label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(['Pendidikan', 'Kesehatan', 'Lainnya'] as FacilityCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2.5 px-2 text-xs font-bold rounded-lg transition-all ${
                  category === cat
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Subcategory & Name fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Subcategory Selection */}
          {category === 'Pendidikan' && (
            <div>
              <label className="form-label">Tipe Fasilitas Pendidikan</label>
              <select
                value={eduSubcategory}
                onChange={(e) => setEduSubcategory(e.target.value as EducationSubcategory)}
                className="form-select"
              >
                <option value="TK/PAUD">TK / PAUD</option>
                <option value="SD">SD / MI</option>
                <option value="SMP">SMP / MTs</option>
                <option value="SMA/SMK">SMA / SMK / MA</option>
              </select>
            </div>
          )}

          {category === 'Kesehatan' && (
            <div>
              <label className="form-label">Tipe Fasilitas Kesehatan</label>
              <select
                value={healthSubcategory}
                onChange={(e) => setHealthSubcategory(e.target.value as HealthSubcategory)}
                className="form-select"
              >
                <option value="Puskesmas">Puskesmas</option>
                <option value="Pustu">Pustu (Puskesmas Pembantu)</option>
                <option value="Poskesdes">Poskesdes / Polindes</option>
              </select>
            </div>
          )}

          {category === 'Lainnya' && (
            <div>
              <label className="form-label">Sub-Tipe / Jenis Infrastruktur</label>
              <input
                type="text"
                value={otherSubcategory}
                onChange={(e) => setOtherSubcategory(e.target.value)}
                className="form-input"
                placeholder="Contoh: Kantor Desa, Masjid, Gereja, Jembatan"
              />
            </div>
          )}

          {/* Facility Name Input */}
          <div>
            <label className="form-label">
              Nama Fasilitas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              className="form-input"
              placeholder={
                category === 'Pendidikan'
                  ? 'Contoh: SDN Waelengga 1'
                  : category === 'Kesehatan'
                  ? 'Contoh: Puskesmas Borong'
                  : 'Contoh: Kantor Desa Rana Loba / Jembatan Wae Musi'
              }
              required
            />
          </div>

        </div>

        <div>
          <label className="form-label">Alamat / Lokasi Spasial Fasilitas</label>
          <input
            type="text"
            value={subLocation}
            onChange={(e) => setSubLocation(e.target.value)}
            className="form-input text-xs"
            placeholder="Contoh: Jalan Raya Borong-Ruteng Km 3, Dusun Golo"
          />
        </div>
      </div>

      {/* SECTION 2: TINGKAT KERUSAKAN FASILITAS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base font-display">
            Tingkat Kerusakan Fasilitas
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {damageOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setDamageLevel(opt.label)}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 min-h-[72px] ${
                damageLevel === opt.label
                  ? `${opt.bg} ${opt.border} ${opt.ring} ${opt.text} font-bold ring-2 shadow-sm scale-[1.02]`
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="text-xs">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 3: KEBUTUHAN PERBAIKAN DARURAT */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
        <label className="form-label">Keterangan / Kebutuhan Perbaikan Darurat</label>
        <textarea
          rows={3}
          value={notesNeeded}
          onChange={(e) => setNotesNeeded(e.target.value)}
          className="form-textarea text-xs"
          placeholder="Tuliskan kondisi fisik kerusakan & kebutuhan darurat (misal: atap kelas terbawa angin, butuh seng & seng gelombang 50 lembar, genset darurat)..."
        />
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl font-semibold text-xs text-white shadow-md animate-slide-up flex items-center justify-between ${
            feedback.type === 'success' ? 'bg-emerald-600' : 'bg-amber-600'
          }`}
        >
          <span>{feedback.message}</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">Sheet 2</span>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        disabled={isSubmitting || !facilityName.trim()}
        title={!facilityName.trim() ? "Isi Nama Fasilitas terlebih dahulu" : ""}
        className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 border border-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Menyimpan ke Sheet 2...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Simpan Data Fasilitas Umum</span>
          </>
        )}
      </button>

    </form>
  );
}
