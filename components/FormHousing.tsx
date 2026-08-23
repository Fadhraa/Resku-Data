"use client";

import React, { useState, useEffect } from "react";
import {
  DamageLevel,
  Gender,
  HousingCasualtyData,
  LogEntry,
  RegionSelection,
} from "@/types/resku";
import { addLogEntry, getSpreadsheetConfig } from "@/lib/storage";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, googleDriveProvider } from "@/lib/firebase";
import { ensureSpreadsheetForRegency, syncEntryToGoogleSheets } from "@/lib/google-sheets";

interface Props {
  region: RegionSelection;
  onSuccess: () => void;
}

export default function FormHousing({ region, onSuccess }: Props) {
  const [config, setConfig] = useState(getSpreadsheetConfig(region.regencyCode));
  const [isConnecting, setIsConnecting] = useState(false);
  const [headOfHousehold, setHeadOfHousehold] = useState("");
  const [gender, setGender] = useState<Gender>("Laki-laki");
  const [age, setAge] = useState<number | "">("");
  const [subLocation, setSubLocation] = useState("");
  const [damageLevel, setDamageLevel] = useState<DamageLevel>("Rusak Sedang");

  useEffect(() => {
    const sync = () => setConfig(getSpreadsheetConfig(region.regencyCode));
    sync();
    window.addEventListener("resku-config-updated", sync);
    return () => window.removeEventListener("resku-config-updated", sync);
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

      if (googleToken && typeof window !== "undefined") {
        localStorage.setItem("resku_google_access_token", googleToken);

        const newConfig = await ensureSpreadsheetForRegency(
          googleToken,
          region,
          user.email || "",
          user.displayName || "Relawan"
        );
        setConfig(newConfig);
      }
    } catch (err) {
      console.error("Inline Drive connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Casualty Counters
  const [deceased, setDeceased] = useState<number>(0);
  const [severeInjury, setSevereInjury] = useState<number>(0);
  const [minorInjury, setMinorInjury] = useState<number>(0);
  const [missing, setMissing] = useState<number>(0);

  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headOfHousehold.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const newId = `h-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const districtName = region.isManual
      ? (region.manualDistrict || region.districtName)
      : region.districtName;
    const villageName = region.isManual
      ? (region.manualVillage || region.villageName)
      : region.villageName;
    const regencyName = region.regencyName;
    const provinceName = region.provinceName;

    const regionSummary = `Kec. ${districtName || "-"}, Desa ${villageName || "-"}`;

    const casualtySummaryList = [];
    if (deceased > 0) casualtySummaryList.push(`${deceased} MD`);
    if (severeInjury > 0) casualtySummaryList.push(`${severeInjury} LB`);
    if (minorInjury > 0) casualtySummaryList.push(`${minorInjury} LR`);
    if (missing > 0) casualtySummaryList.push(`${missing} Hilang`);

    const casualtyText =
      casualtySummaryList.length > 0
        ? casualtySummaryList.join(", ")
        : "Nihil Korban";
    const subtitle = `${damageLevel} • ${casualtyText}`;

    const payload: HousingCasualtyData = {
      id: newId,
      createdAt: timestamp,
      region,
      subLocation,
      headOfHousehold,
      gender,
      age: Number(age) || 0,
      damageLevel,
      casualties: {
        deceased,
        severeInjury,
        minorInjury,
        missing,
      },
      notes: additionalNotes,
    };

    const logEntry: LogEntry = {
      id: newId,
      type: "HOUSING_CASUALTY",
      timestamp,
      regionSummary,
      title: `KK: ${headOfHousehold}`,
      subtitle,
      status: "SYNCING",
      payload,
    };

    addLogEntry(logEntry);

    try {
      const syncRes = await syncEntryToGoogleSheets(logEntry, region.regencyCode);
      if (syncRes.success) {
        setFeedback({
          type: "success",
          message: syncRes.message,
        });
        setConfig(getSpreadsheetConfig(region.regencyCode));
      } else {
        setFeedback({
          type: "error",
          message: syncRes.message,
        });
      }
    } catch (e: any) {
      setFeedback({
        type: "error",
        message: `Terjadi kesalahan saat menyinkronkan: ${e?.message || "Gagal menghubungi server"}`,
      });
    } finally {
      setIsSubmitting(false);
    }

    // Reset Form
    setHeadOfHousehold("");
    setAge("");
    setSubLocation("");
    setAdditionalNotes("");
    setDeceased(0);
    setSevereInjury(0);
    setMinorInjury(0);
    setMissing(0);

    onSuccess();

    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const damageOptions: {
    label: DamageLevel;
    bg: string;
    border: string;
    ring: string;
    text: string;
  }[] = [
    {
      label: "Tidak Ada Kerusakan",
      bg: "bg-emerald-50",
      border: "border-emerald-500",
      ring: "ring-emerald-500",
      text: "text-emerald-800",
    },
    {
      label: "Rusak Ringan",
      bg: "bg-blue-50",
      border: "border-blue-500",
      ring: "ring-blue-500",
      text: "text-blue-800",
    },
    {
      label: "Rusak Sedang",
      bg: "bg-amber-50",
      border: "border-amber-500",
      ring: "ring-amber-500",
      text: "text-amber-900",
    },
    {
      label: "Rusak Berat",
      bg: "bg-red-50",
      border: "border-red-500",
      ring: "ring-red-500",
      text: "text-red-900",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* SPREADSHEET AUTOMATIC STATUS BANNER */}
      <div
        className={`p-3.5 rounded-xl border text-xs shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
          isConnected
            ? "bg-emerald-50 border-emerald-300 text-emerald-950"
            : "bg-blue-50 border-blue-200 text-blue-950"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base shrink-0">
            {isConnected ? "✅" : "✨"}
          </span>
          <div>
            <p className="font-extrabold text-xs">
              {isConnected
                ? `Spreadsheet Terhubung (${region.regencyName})`
                : `Spreadsheet Otomatis: ${region.regencyName}`}
            </p>
            <p className="text-[11px] opacity-90 font-medium">
              {isConnected
                ? "Data yang diisi akan otomatis disinkronkan ke file Google Sheet milik Anda."
                : "Saat Anda menekan tombol Simpan Data di bawah, file Google Sheet baru untuk wilayah ini akan otomatis dibuatkan di Google Drive Anda."}
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

      {/* SECTION 1: IDENTITAS KK */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base font-display">
            Identitas Kepala Keluarga (KK)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              Nama Kepala Keluarga (KK) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={headOfHousehold}
              onChange={(e) => setHeadOfHousehold(e.target.value)}
              className="form-input"
              placeholder="Contoh: Yohanes Nggolang"
              required
            />
          </div>

          <div>
            <label className="form-label">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(["Laki-laki", "Perempuan"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                    gender === g
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Usia (Tahun)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) =>
                setAge(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="form-input"
              placeholder="Contoh: 45"
            />
          </div>

          <div>
            <label className="form-label">Alamat / Dusun, RT / RW</label>
            <input
              type="text"
              value={subLocation}
              onChange={(e) => setSubLocation(e.target.value)}
              className="form-input"
              placeholder="Contoh: Dusun Golo Karot, RT 02 / RW 01"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: TINGKAT KERUSAKAN RUMAH */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base font-display">
            Tingkat Kerusakan Rumah / Permukiman Pribadi
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
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
              }`}
            >
              <span className="text-xs">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 3: DAMPAK KORBAN JIWA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base font-display">
            Dampak Korban Jiwa Dalam KK Ini
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Meninggal */}
          <div className=" p-3 rounded-xl shadow-sm hover:shadow-lg text-center">
            <label className="block text-xs font-bold text-red-900 mb-1">
              Meninggal Dunia
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeceased((prev) => Math.max(0, prev - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-red-300 text-red-800 font-bold text-sm hover:bg-red-100 active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                value={deceased}
                onChange={(e) =>
                  setDeceased(Math.max(0, Number(e.target.value)))
                }
                className="w-12 text-center font-extrabold text-lg text-red-900 bg-white border border-red-300 rounded-lg py-1"
              />
              <button
                type="button"
                onClick={() => setDeceased((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-red-700 text-white font-bold text-sm hover:bg-red-800 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Luka Berat */}
          <div className=" p-3 rounded-xl shadow-sm hover:shadow-lg text-center">
            <label className="block text-xs font-bold text-amber-900 mb-1">
              Luka Berat
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSevereInjury((prev) => Math.max(0, prev - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold text-sm hover:bg-amber-100 active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                value={severeInjury}
                onChange={(e) =>
                  setSevereInjury(Math.max(0, Number(e.target.value)))
                }
                className="w-12 text-center font-extrabold text-lg text-amber-900 bg-white border border-amber-300 rounded-lg py-1"
              />
              <button
                type="button"
                onClick={() => setSevereInjury((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Luka Ringan */}
          <div className=" p-3 rounded-xl shadow-sm hover:shadow-lg text-center">
            <label className="block text-xs font-bold text-blue-900 mb-1">
              Luka Ringan
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setMinorInjury((prev) => Math.max(0, prev - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-blue-300 text-blue-800 font-bold text-sm hover:bg-blue-100 active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                value={minorInjury}
                onChange={(e) =>
                  setMinorInjury(Math.max(0, Number(e.target.value)))
                }
                className="w-12 text-center font-extrabold text-lg text-blue-900 bg-white border border-blue-300 rounded-lg py-1"
              />
              <button
                type="button"
                onClick={() => setMinorInjury((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Hilang */}
          <div className=" p-3 rounded-xl shadow-sm hover:shadow-lg text-center">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Hilang
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setMissing((prev) => Math.max(0, prev - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold text-sm hover:bg-slate-200 active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                value={missing}
                onChange={(e) =>
                  setMissing(Math.max(0, Number(e.target.value)))
                }
                className="w-12 text-center font-extrabold text-lg text-slate-900 bg-white border border-slate-300 rounded-lg py-1"
              />
              <button
                type="button"
                onClick={() => setMissing((prev) => prev + 1)}
                className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-sm hover:bg-slate-800 active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: KETERANGAN TAMBAHAN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
        <label className="form-label">
          Keterangan Tambahan / Kebutuhan Darurat
        </label>
        <textarea
          rows={3}
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          className="form-textarea text-xs"
          placeholder="Tuliskan kebutuhan spesifik korban (misal: butuh tenda, selimut, air bersih, penanganan medis darurat)..."
        />
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl font-semibold text-xs text-white shadow-md animate-slide-up flex items-center justify-between ${
            feedback.type === "success" ? "bg-emerald-600" : "bg-amber-600"
          }`}
        >
          <span>{feedback.message}</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">
            Sheet 1
          </span>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        disabled={isSubmitting || !headOfHousehold.trim()}
        title={!headOfHousehold.trim() ? "Isi nama Kepala Keluarga terlebih dahulu" : ""}
        className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg shadow-blue-600/25 border border-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg
              className="w-5 h-5 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>Menyimpan ke Sheet 1...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 text-blue-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <span>Simpan Data Permukiman & Jiwa</span>
          </>
        )}
      </button>
    </form>
  );
}
