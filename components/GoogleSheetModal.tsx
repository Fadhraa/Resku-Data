"use client";

import React, { useState } from "react";
import {
  getSpreadsheetConfig,
  getUserSession,
  saveSpreadsheetConfig,
} from "@/lib/storage";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleDriveProvider } from "@/lib/firebase";
import { createGoogleSpreadsheetForUser, ensureSpreadsheetForRegency } from "@/lib/google-sheets";
import { RegionSelection, SpreadsheetConfig } from "@/types/resku";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: SpreadsheetConfig;
  region?: RegionSelection;
}

export default function GoogleSheetModal({ isOpen, onClose, config, region }: Props) {
  const [urlInput, setUrlInput] = useState(config.spreadsheetUrl);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveErrorMsg, setDriveErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentConfig = getSpreadsheetConfig(region?.regencyCode);
  const userSession = getUserSession();
  const isRealSheetConnected =
    currentConfig.isConnected &&
    currentConfig.spreadsheetUrl.includes("/spreadsheets/d/") &&
    !currentConfig.spreadsheetUrl.includes("resku-sheet-");

  const connectedEmail =
    currentConfig.userEmail || userSession?.email || "Akun Google Terhubung";

  const handleCopy = () => {
    navigator.clipboard.writeText(urlInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : "";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractSpreadsheetId(urlInput);
    const updated: SpreadsheetConfig = {
      ...config,
      spreadsheetId: id || config.spreadsheetId,
      spreadsheetUrl: urlInput,
      isConnected: true,
      userEmail: connectedEmail,
    };
    saveSpreadsheetConfig(updated, region?.regencyCode);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleConnectDriveOnDemand = async () => {
    setIsConnectingDrive(true);
    setDriveErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleDriveProvider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleToken = credential?.accessToken;

      if (googleToken && typeof window !== "undefined") {
        localStorage.setItem("resku_google_access_token", googleToken);

        if (region) {
          const newConfig = await ensureSpreadsheetForRegency(
            googleToken,
            region,
            user.email || "",
            user.displayName || "Relawan"
          );
          if (newConfig.spreadsheetUrl) {
            setUrlInput(newConfig.spreadsheetUrl);
          }
        } else {
          const updated: SpreadsheetConfig = {
            ...currentConfig,
            isConnected: true,
            userEmail: user.email || "",
            userName: user.displayName || "Relawan",
          };
          saveSpreadsheetConfig(updated);
        }

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error("Drive connection error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setDriveErrorMsg("Otorisasi dibatalkan oleh pengguna.");
      } else {
        setDriveErrorMsg(
          err?.message || "Gagal menghubungkan ke Google Drive."
        );
      }
    } finally {
      setIsConnectingDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 border border-emerald-400 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">
                Pengaturan Google Spreadsheet
              </h3>
              <p className="text-xs text-emerald-100">
                Format Resmi 2-Sheet (Permukiman & Fasilitas)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Condition 1: Connected Email Display + Change Email Button */}
          {currentConfig.isConnected ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2.5 animate-slide-up">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                  ✓
                </div>
                <div className="text-xs text-emerald-950 leading-relaxed min-w-0 flex-1">
                  <p className="font-extrabold text-emerald-900">
                    Google Drive &amp; Akun Terhubung
                  </p>
                  <p className="mt-0.5 text-emerald-800 font-medium truncate">
                    Email Aktif:{" "}
                    <strong className="underline text-slate-900 font-bold">
                      {connectedEmail}
                    </strong>
                  </p>
                </div>
              </div>

              {driveErrorMsg && (
                <div className="bg-red-100 border border-red-200 text-red-800 text-xs p-2 rounded-md font-semibold">
                  {driveErrorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleConnectDriveOnDemand}
                disabled={isConnectingDrive}
                className="w-full py-2 px-3 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnectingDrive
                  ? "Membuka Izin Akun Google..."
                  : "Ganti Akun Google / Email"}
              </button>
            </div>
          ) : (
            /* Condition 2: Initial Unconnected Drive Card */
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-2 animate-slide-up">
              <div className="flex items-start gap-2.5">
                <svg
                  className="w-5 h-5 text-blue-700 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11a7.96 7.96 0 001.071 4.022"
                  />
                </svg>
                <div className="text-xs text-blue-900 leading-relaxed">
                  <p className="font-bold">
                    Hubungkan Ke Google Drive Akun Saya
                  </p>
                  <p className="mt-0.5 text-blue-800">
                    Klik tombol di bawah untuk mengotorisasi &amp; menyinkronkan data langsung ke Google Drive pribadi Anda.
                  </p>
                </div>
              </div>

              {driveErrorMsg && (
                <div className="bg-red-100 border border-red-200 text-red-800 text-xs p-2 rounded-md font-semibold">
                  {driveErrorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleConnectDriveOnDemand}
                disabled={isConnectingDrive}
                className="w-full mt-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnectingDrive
                  ? "Membuka Otorisasi Drive..."
                  : "🔑 Otorisasi Akses Google Drive Saya"}
              </button>
            </div>
          )}

          <div>
            <label className="form-label">URL / Link Google Spreadsheet Target</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="form-input text-xs font-mono"
                placeholder="Spreadsheet otomatis terisi saat otorisasi..."
                required
              />
              <button
                type="button"
                onClick={handleCopy}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-lg text-xs border border-slate-300 transition-colors shrink-0 flex items-center gap-1"
              >
                {copied ? "Tersalin!" : "Salin"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-medium">
                Sheet 1 (Permukiman):
              </span>
              <p className="font-bold text-slate-800">
                {config.sheetNameHousing}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">
                Sheet 2 (Fasilitas):
              </span>
              <p className="font-bold text-slate-800">
                {config.sheetNameFacility}
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="bg-emerald-600 text-white text-xs font-bold p-2.5 rounded-lg text-center animate-slide-up">
              Pengaturan Spreadsheet Berhasil Diperbarui!
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {/* Tombol Buka di Tab Baru hanya muncul jika URL valid di docs.google.com/spreadsheets/d/ */}
            {isRealSheetConnected && (
              <a
                href={currentConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs px-4 py-2.5 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1.5"
              >
                <span>Buka di Tab Baru</span>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
